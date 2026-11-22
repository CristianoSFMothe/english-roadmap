"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Question } from "@/lib/lesson-prompt";
import type { Lesson, Result } from "@/lib/lessons";
import type { Week } from "@/lib/content";
import { Check } from "./Roadmap";

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

function dataCurta(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a.slice(2)}`;
}

export default function Lessons({
  week,
  apiKey,
  accessCode,
  signedIn,
}: {
  week: Week | null;
  apiKey: string;
  accessCode: string;
  signedIn: boolean;
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [ativa, setAtiva] = useState<Lesson | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(false);
  const [corrigindo, setCorrigindo] = useState<string | null>(null);
  const [erro, setErro] = useState("");
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
    setCarregando(true);
    setErro("");
    try {
      const res = await fetch("/api/lesson", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          date,
          weekN: week?.n,
          tema: week?.theme,
          gramatica: week?.grammar?.topic,
          vocabulario: week?.cards?.slice(0, 25).map((c) => c.en),
          apiKey: apiKey || undefined,
          accessCode: accessCode || undefined,
        }),
      });
      const json = (await res.json()) as { lesson?: Lesson; error?: string };
      if (!res.ok || !json.lesson) throw new Error(json.error ?? "Falha ao gerar a lição.");
      setAtiva(json.lesson);
      setRespostas({});
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao gerar a lição.");
    } finally {
      setCarregando(false);
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
          <h2>Lição do dia</h2>
          <p>
            Entre com sua conta Google para receber as 5 questões diárias, guardar as respostas e
            acumular o que ficar para trás.
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
          <h2>Lição do dia</h2>
          <span>5 questões: 2 fáceis, 2 médias e 1 difícil. Você escreve a resposta em inglês.</span>
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
            <p>Nenhuma lição aberta para hoje.</p>
            <button className="btn primary" onClick={() => void gerar()} disabled={carregando}>
              {carregando ? "Gerando…" : "Gerar a lição de hoje"}
            </button>
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

            <ol className="lesson-list">
              {ativa.questions.map((q, i) => {
                const r = ativa.results?.[q.id];
                const respondida = Boolean(r);
                return (
                  <li key={q.id} className={`lesson-q${r ? (r.correct ? " ok" : " bad") : ""}`}>
                    <div className="lesson-q-top">
                      <span className={`lesson-tag ${q.difficulty}`}>{NIVEL[q.difficulty] ?? q.difficulty}</span>
                      <span className="lesson-type">{q.type}</span>
                      <span className="lesson-n">{i + 1}/{ativa.questions.length}</span>
                    </div>
                    <p className="lesson-prompt">{q.prompt}</p>
                    {q.content && <p className="lesson-content">{q.content}</p>}

                    {respondida ? (
                      <div className="lesson-answered">
                        <p className="lesson-mine">
                          <span>Sua resposta</span>
                          {ativa.answers?.[q.id]}
                        </p>
                        <p className={`lesson-verdict ${r!.correct ? "ok" : "bad"}`}>
                          {r!.correct ? "Acertou" : "Errou"} · {r!.feedback}
                        </p>
                        {r!.correction && (
                          <p className="lesson-fix">
                            <span>Correta</span>
                            {r!.correction}
                          </p>
                        )}
                        {r!.tip && <p className="lesson-tip">{r!.tip}</p>}
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
