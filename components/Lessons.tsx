"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Question } from "@/lib/lesson-prompt";
import type { ImprovementStyle, Lesson, Result } from "@/lib/lessons";
import type { Week } from "@/lib/content";
import { canGenerateMore, looksEnglish } from "@/lib/lesson-normalize";
import { Check } from "./Roadmap";
import { Pron, PronListButton } from "./Pron";
import { Speak } from "./SpeechButtons";
import StudySections from "./StudySections";
import TeacherChat from "./TeacherChat";
import { appendChat, PARTS, partIndexForDate, type ChatMessage, type WeekLessonView } from "@/lib/lesson-parts";
import { LicoesError, postJson, postLicoes, weekRequest } from "@/lib/licoes-client";

type HistItem = { date: string; completed: boolean; total: number; answered: number; correct: number };

type Payload = {
  signedIn: boolean;
  date?: string;
  total?: number;
  today?: Lesson | null;
  pending?: Lesson[];
  missing?: string[];
  history?: HistItem[];
  error?: string;
};

const NIVEL: Record<string, string> = { facil: "Fácil", media: "Média", dificil: "Difícil" };

const ESTILO: Record<ImprovementStyle, string> = {
  informal: "Informal",
  formal: "Formal",
  usual: "Mais usual",
};

/** Lacunas como "I ___ (work)" viram uma pausa na voz, em vez de "underscore". */
const falado = (t: string) => t.replace(/_{2,}/g, "...");

/** Frase em inglês com o botão de ouvir e a pronúncia aproximada. */
function EnLine({ text, noButton }: { text: string; noButton?: boolean }) {
  return (
    <span className="lesson-line">
      <span className="en">{text}</span> <Speak text={falado(text)} showIpa={false} />{" "}
      <Pron text={text} noButton={noButton} />
    </span>
  );
}

function dataCurta(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a.slice(2)}`;
}

export default function Lessons({
  week,
  planId,
  apiKey,
  accessCode,
  signedIn,
}: {
  week: Week | null;
  planId: string;
  apiKey: string;
  accessCode: string;
  signedIn: boolean;
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [ativa, setAtiva] = useState<Lesson | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(false);
  const [corrigindo, setCorrigindo] = useState<string | null>(null);
  const [melhorando, setMelhorando] = useState<string | null>(null);
  const [erroMelhoria, setErroMelhoria] = useState<Record<string, string>>({});
  // Trava na hora do clique: o "disabled" só chega no próximo render, e um clique duplo
  // mandaria dois pedidos (duas chamadas ao Gemini).
  const pedindoMais = useRef(false);
  const [erro, setErro] = useState("");
  const [etapa, setEtapa] = useState<"" | "roteiro" | "estudo">("");
  /** Conversa da parte da lição ativa, carregada da lição da semana. */
  const [chat, setChat] = useState<{ lessonId: string; messages: ChatMessage[] } | null>(null);
  const [lembrete, setLembrete] = useState<{ ativo: boolean; hora: string }>({
    ativo: false,
    hora: "19:00",
  });
  const [lembreteOcupado, setLembreteOcupado] = useState(false);

  const carregar = useCallback(async () => {
    if (!signedIn) return;
    try {
      const res = await fetch("/api/lesson", { cache: "no-store" });
      const json = (await res.json()) as Payload;
      setData(json);
      if (json.today) setAtiva((atual) => atual ?? json.today ?? null);
    } catch {
      setErro("Não consegui carregar as lições.");
    }
  }, [signedIn]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!signedIn) return;
    void fetch("/api/calendar/reminder", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { ativo?: boolean; hora?: string }) =>
        setLembrete({ ativo: Boolean(j.ativo), hora: j.hora ?? "19:00" }),
      )
      .catch(() => {});
  }, [signedIn]);

  const gerar = async (date?: string) => {
    if (!week) return;
    setCarregando(true);
    setErro("");
    const pedido = {
      action: "generate",
      planId,
      date,
      ...weekRequest(week),
      apiKey: apiKey || undefined,
      accessCode: accessCode || undefined,
    };
    try {
      setEtapa("estudo");
      let json: { lesson?: Lesson };
      try {
        json = await postJson<{ lesson?: Lesson }>("/api/lesson", pedido);
      } catch (e) {
        if (!(e instanceof LicoesError && e.needsOutline)) throw e;
        // Primeiro o roteiro da semana (uma requisição), depois o estudo (outra).
        setEtapa("roteiro");
        await postLicoes({ ...pedido, action: "outline" });
        setEtapa("estudo");
        json = await postJson<{ lesson?: Lesson }>("/api/lesson", pedido);
      }
      if (!json.lesson) throw new Error("Falha ao gerar a lição.");
      setAtiva(json.lesson);
      setRespostas({});
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao gerar a lição.");
    } finally {
      setCarregando(false);
      setEtapa("");
    }
  };

  // A conversa da parte: a mesma da página da lição da semana.
  useEffect(() => {
    if (!ativa?.weekLessonId || ativa.partIdx === null) return;
    if (chat?.lessonId === ativa.id) return;
    const { id, weekLessonId, partIdx } = ativa;
    let cancelado = false;
    void fetch(`/api/licoes?id=${encodeURIComponent(weekLessonId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { lesson?: WeekLessonView | null }) => {
        if (!cancelado) setChat({ lessonId: id, messages: j.lesson?.chats?.[partIdx] ?? [] });
      })
      .catch(() => {
        if (!cancelado) setChat({ lessonId: id, messages: [] });
      });
    return () => {
      cancelado = true;
    };
  }, [ativa, chat?.lessonId]);

  /** Mais 3 respostas (informal, formal e mais usual), somadas às que já existem. */
  const maisRespostas = async (q: Question) => {
    if (!ativa || pedindoMais.current) return;
    pedindoMais.current = true;
    setMelhorando(q.id);
    setErroMelhoria((e) => ({ ...e, [q.id]: "" }));
    try {
      const res = await fetch("/api/lesson", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "improve",
          lessonId: ativa.id,
          date: ativa.date,
          questionId: q.id,
          apiKey: apiKey || undefined,
          accessCode: accessCode || undefined,
        }),
      });
      const json = (await res.json()) as { lesson?: Lesson; error?: string };
      if (!res.ok || !json.lesson) throw new Error(json.error ?? "Não deu para gerar agora.");
      setAtiva(json.lesson);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não deu para gerar agora.";
      setErroMelhoria((er) => ({ ...er, [q.id]: msg }));
    } finally {
      pedindoMais.current = false;
      setMelhorando(null);
    }
  };

  const corrigir = async (q: Question) => {
    if (!ativa) return;
    const resposta = (respostas[q.id] ?? "").trim();
    if (!resposta) return;
    setCorrigindo(q.id);
    setErro("");
    try {
      const res = await fetch("/api/lesson", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "answer",
          lessonId: ativa.id,
          date: ativa.date,
          questionId: q.id,
          answer: resposta,
          apiKey: apiKey || undefined,
          accessCode: accessCode || undefined,
        }),
      });
      const json = (await res.json()) as { result?: Result; lesson?: Lesson; error?: string };
      if (!res.ok || !json.lesson) throw new Error(json.error ?? "Falha ao corrigir.");
      setAtiva(json.lesson);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao corrigir.");
    } finally {
      setCorrigindo(null);
    }
  };

  const alternarLembrete = async (remove: boolean, hora?: string) => {
    setLembreteOcupado(true);
    setErro("");
    try {
      const res = await fetch("/api/calendar/reminder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ remove, time: hora ?? lembrete.hora }),
      });
      const json = (await res.json()) as { ativo?: boolean; hora?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha no lembrete.");
      setLembrete({ ativo: Boolean(json.ativo), hora: json.hora ?? lembrete.hora });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no lembrete.");
    } finally {
      setLembreteOcupado(false);
    }
  };

  const atrasadas = useMemo(() => {
    const pend = (data?.pending ?? []).map((l) => ({ date: l.date, lesson: l }));
    const sem = (data?.missing ?? []).map((d) => ({ date: d, lesson: null as Lesson | null }));
    return [...pend, ...sem].sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  if (!signedIn) {
    return (
      <div className="panel">
        <section className="lesson-empty">
          <h2>Estudo do dia</h2>
          <p>
            Entre com sua conta Google (botão no alto da página) para receber todo dia uma
            explicação curta em português, dicas para não errar e 5 exercícios. As respostas ficam
            guardadas, e o que ficar para trás aparece para você terminar depois.
          </p>
        </section>
      </div>
    );
  }

  const hoje = data?.date ?? "";
  const respondidas = ativa ? Object.keys(ativa.results ?? {}).length : 0;
  const acertos = ativa
    ? Object.values(ativa.results ?? {}).filter((r) => r.correct).length
    : 0;

  return (
    <div className="panel">
      <section>
        <div className="section-title">
          <h2>Estudo do dia</h2>
          <span>Teoria, dicas e 5 exercícios: 2 fáceis, 2 médias e 1 difícil. Você escreve a resposta em inglês.</span>
        </div>

        {erro && <p className="lesson-error">{erro}</p>}

        {atrasadas.length > 0 && (
          <div className="lesson-backlog">
            <strong>Não completei {atrasadas.length === 1 ? "a lição de" : "as lições de"}:</strong>
            <div className="chips">
              {atrasadas.map(({ date, lesson }) => (
                <button
                  key={date}
                  className="chip"
                  aria-pressed={ativa?.date === date}
                  onClick={() => (lesson ? setAtiva(lesson) : void gerar(date))}
                >
                  {dataCurta(date)}
                  {lesson ? ` · ${Object.keys(lesson.results ?? {}).length}/${lesson.questions.length}` : " · gerar"}
                </button>
              ))}
            </div>
          </div>
        )}

        {!ativa && (
          <div className="lesson-start">
            {week && hoje ? (
              <p>
                Hoje: parte {partIndexForDate(hoje) + 1} de {PARTS} da lição de{" "}
                <em>{week.grammar?.topic || week.theme}</em>, com 5 exercícios.
              </p>
            ) : (
              <p>Hoje você recebe uma parte da lição da semana, com explicação, dicas e 5 exercícios.</p>
            )}
            <button className="btn primary" onClick={() => void gerar()} disabled={carregando || !week}>
              {carregando ? "Gerando…" : "Gerar o estudo de hoje"}
            </button>
            {carregando && (
              <p className="faint">
                {etapa === "roteiro"
                  ? "Preparando o roteiro da lição da semana…"
                  : "Preparando a aula e os exercícios… pode levar até um minuto."}
              </p>
            )}
          </div>
        )}

        {ativa && (
          <>
            <div className="lesson-head">
              <span className={`lesson-date${ativa.date === hoje ? " today" : " late"}`}>
                {ativa.date === hoje ? "Hoje" : `Atrasada · ${dataCurta(ativa.date)}`}
              </span>
              <span className="lesson-score">
                {respondidas}/{ativa.questions.length} respondidas · {acertos}{" "}
                {acertos === 1 ? "certa" : "certas"}
              </span>
              {ativa.completedAt && (
                <span className="lesson-ok">
                  <Check /> concluída
                </span>
              )}
              {ativa.date !== hoje && (
                <button className="btn" onClick={() => void gerar()} disabled={carregando}>
                  Ir para hoje
                </button>
              )}
            </div>

            {ativa.weekLessonId && ativa.partIdx !== null && (
              <p className="licao-part-head">
                <span>
                  Parte {ativa.partIdx + 1} de {PARTS}
                  {ativa.weekN ? ` · Semana ${ativa.weekN}` : ""}
                  {ativa.weekTopic ? ` · ${ativa.weekTopic}` : ""}
                </span>
                {ativa.weekN && <Link href={`/licoes/${ativa.weekN}`}>Ver a lição completa →</Link>}
              </p>
            )}

            <StudySections study={ativa.study ?? null} />

            {ativa.weekLessonId && ativa.partIdx !== null && ativa.study && (
              <TeacherChat
                weekLessonId={ativa.weekLessonId}
                partIdx={ativa.partIdx}
                initial={chat?.lessonId === ativa.id ? chat.messages : []}
                onMessages={(novas) =>
                  setChat((c) =>
                    c && c.lessonId === ativa.id ? { ...c, messages: appendChat({ 0: c.messages }, 0, novas)[0] } : c,
                  )
                }
                apiKey={apiKey}
                accessCode={accessCode}
              />
            )}

            <h2 className="study-exercises">Exercícios</h2>
            <ol className="lesson-list">
              {ativa.questions.map((q, i) => {
                const r = ativa.results?.[q.id];
                const respondida = Boolean(r);
                // Correções antigas não têm melhorias.
                const melhorias = r?.improvements ?? [];
                return (
                  <li key={q.id} className={`lesson-q${r ? (r.correct ? " ok" : " bad") : ""}`}>
                    <div className="lesson-q-top">
                      <span className={`lesson-tag ${q.difficulty}`}>{NIVEL[q.difficulty] ?? q.difficulty}</span>
                      <span className="lesson-type">{q.type}</span>
                      <span className="lesson-n">{i + 1}/{ativa.questions.length}</span>
                    </div>
                    <p className="lesson-prompt">{q.prompt}</p>
                    {q.content &&
                      (looksEnglish(q.content) ? (
                        <div className="lesson-content">
                          <EnLine text={q.content} />
                        </div>
                      ) : (
                        <p className="lesson-content">{q.content}</p>
                      ))}

                    {respondida ? (
                      <div className="lesson-answered">
                        <p className="lesson-mine">
                          <span>Sua resposta</span>
                          {ativa.answers?.[q.id]}
                        </p>
                        <p className={`lesson-verdict ${r!.correct ? "ok" : "bad"}`}>
                          {r!.correct ? "Acertou" : "Errou"} · {r!.feedback}
                        </p>
                        {(r!.correction || melhorias.length > 0) && (
                          <div className="lesson-tools">
                            <PronListButton
                              texts={[r!.correction, ...melhorias.map((m) => m.en)].filter(Boolean)}
                            />
                          </div>
                        )}
                        {r!.correction && (
                          <div className="lesson-fix">
                            <span>Correta</span>
                            <EnLine text={r!.correction} noButton />
                          </div>
                        )}
                        {r!.tip && <p className="lesson-tip">{r!.tip}</p>}
                        <div className="lesson-better">
                          <span className="lesson-better-title">
                            {melhorias.length === 0
                              ? "Outras formas de responder"
                              : melhorias.length === 1
                                ? "1 forma de melhorar a sua resposta"
                                : `${melhorias.length} formas de melhorar a sua resposta`}
                          </span>
                          {melhorias.length > 0 && (
                            <ol>
                              {melhorias.map((m, k) => (
                                <li key={k}>
                                  {m.style && (
                                    <span className={`lesson-style ${m.style}`}>{ESTILO[m.style]}</span>
                                  )}
                                  <EnLine text={m.en} noButton />
                                  {m.why && (
                                    <span className="lesson-why">
                                      {m.style ? `Dica: ${m.why}` : m.why}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ol>
                          )}
                          <div className="lesson-more">
                            <button
                              type="button"
                              className="btn small"
                              onClick={() => void maisRespostas(q)}
                              disabled={melhorando !== null || !canGenerateMore(r)}
                            >
                              {melhorando === q.id
                                ? "Gerando 3 respostas…"
                                : canGenerateMore(r)
                                  ? "Gerar 3 respostas"
                                  : "3 respostas geradas"}
                            </button>
                            <span className="faint">
                              {canGenerateMore(r)
                                ? "informal, formal e mais usual, com dica de cada uma (uma vez por questão)"
                                : "Já foram geradas as 3 respostas desta questão."}
                            </span>
                            {erroMelhoria[q.id] && (
                              <span className="say-result bad">{erroMelhoria[q.id]}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="lesson-answer">
                        <textarea
                          value={respostas[q.id] ?? ""}
                          onChange={(e) =>
                            setRespostas((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                          placeholder="Escreva em inglês…"
                          aria-label={`Resposta da questão ${i + 1}`}
                        />
                        <button
                          className="btn primary"
                          onClick={() => void corrigir(q)}
                          disabled={corrigindo === q.id || !(respostas[q.id] ?? "").trim()}
                        >
                          {corrigindo === q.id ? "Corrigindo…" : "Corrigir"}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </section>

      <section className="lesson-reminder">
        <div className="section-title">
          <h2>Lembrete diário</h2>
          <span>Um evento que se repete todo dia na sua Google Agenda</span>
        </div>
        <div className="lesson-reminder-row">
          <label>
            Horário
            <input
              type="time"
              value={lembrete.hora}
              onChange={(e) => setLembrete((l) => ({ ...l, hora: e.target.value }))}
            />
          </label>
          <button
            className="btn primary"
            onClick={() => void alternarLembrete(false)}
            disabled={lembreteOcupado}
          >
            {lembreteOcupado ? "Salvando…" : lembrete.ativo ? "Atualizar lembrete" : "Criar lembrete"}
          </button>
          {lembrete.ativo && (
            <button className="btn" onClick={() => void alternarLembrete(true)} disabled={lembreteOcupado}>
              Remover
            </button>
          )}
        </div>
        {lembrete.ativo && <p className="lesson-note">Ativo às {lembrete.hora}, todos os dias.</p>}
      </section>

      {(data?.history?.length ?? 0) > 0 && (
        <section>
          <div className="section-title">
            <h2>Últimos dias</h2>
            <span>O que foi concluído e o que ficou pela metade</span>
          </div>
          <div className="lesson-hist">
            {data!.history!.map((h) => (
              <span key={h.date} className={`lesson-hist-day${h.completed ? " ok" : " bad"}`}>
                <strong>{dataCurta(h.date)}</strong>
                {h.completed ? `${h.correct}/${h.total} certas` : `${h.answered}/${h.total} feitas`}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
