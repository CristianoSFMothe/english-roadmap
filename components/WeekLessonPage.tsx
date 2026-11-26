"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RawWeek } from "@/lib/content";
import type { Study } from "@/lib/lesson-prompt";
import {
  PARTS,
  parseWeekParam,
  partIndexForDate,
  todayInSaoPaulo,
  type WeekLessonView,
} from "@/lib/lesson-parts";
import { postLicoes, weekRequest } from "@/lib/licoes-client";
import { usePlanContext } from "@/lib/use-plan-context";
import LicoesTopbar from "./LicoesTopbar";
import StudySections from "./StudySections";
import TeacherChat from "./TeacherChat";

/** /licoes/[semana]: o roteiro das 6 partes, a parte aberta e o chat do professor. */
export default function WeekLessonPage({
  sample,
  authEnabled,
  semana,
}: {
  sample: RawWeek[];
  authEnabled: boolean;
  semana: string;
}) {
  const { weeks, currentWeek, planId, userId, ready, apiKey, accessCode } = usePlanContext(sample, authEnabled);
  const weekN = parseWeekParam(semana, weeks.map((w) => w.n));
  const week = weeks.find((w) => w.n === weekN) ?? null;
  const hojeIdx = partIndexForDate(todayInSaoPaulo());
  const ehAtual = weekN !== null && weekN === currentWeek;

  const [view, setView] = useState<WeekLessonView | null>(null);
  const [carregado, setCarregado] = useState(false);
  const [aberta, setAberta] = useState<number | null>(null);
  const [gerando, setGerando] = useState<number | "roteiro" | null>(null);
  const [progresso, setProgresso] = useState("");
  const [erro, setErro] = useState("");
  // Uma geração por vez: clique duplo não manda dois pedidos ao Gemini.
  const ocupado = useRef(false);

  const chave = { apiKey: apiKey || undefined, accessCode: accessCode || undefined };

  useEffect(() => {
    if (!userId || !ready || weekN === null) return;
    let cancelado = false;
    setCarregado(false);
    fetch(`/api/licoes?planId=${encodeURIComponent(planId)}&week=${weekN}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { lesson?: WeekLessonView | null; error?: string }) => {
        if (cancelado) return;
        if (j.error) setErro(j.error);
        setView(j.lesson ?? null);
      })
      .catch(() => {
        if (!cancelado) setErro("Não consegui carregar a lição.");
      })
      .finally(() => {
        if (!cancelado) setCarregado(true);
      });
    return () => {
      cancelado = true;
    };
  }, [userId, ready, planId, weekN]);

  // Abre na parte de hoje quando é a semana atual; senão, na primeira.
  useEffect(() => {
    if (view && aberta === null) setAberta(ehAtual ? hojeIdx : 0);
  }, [view, aberta, ehAtual, hojeIdx]);

  const prepararRoteiro = async () => {
    if (!week || ocupado.current) return;
    ocupado.current = true;
    setGerando("roteiro");
    setErro("");
    try {
      const r = await postLicoes<{ lesson: WeekLessonView }>({
        action: "outline",
        planId,
        ...weekRequest(week),
        ...chave,
      });
      setView(r.lesson);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não deu para preparar a lição.");
    } finally {
      ocupado.current = false;
      setGerando(null);
    }
  };

  const gerarParte = useCallback(
    async (lesson: WeekLessonView, idx: number): Promise<Study> => {
      const r = await postLicoes<{ idx: number; part: Study }>({
        action: "part",
        weekLessonId: lesson.id,
        idx,
        vocabulario: week ? weekRequest(week).vocabulario : [],
        apiKey: apiKey || undefined,
        accessCode: accessCode || undefined,
      });
      setView((v) => (v && v.id === lesson.id ? { ...v, content: { ...v.content, [idx]: r.part } } : v));
      return r.part;
    },
    [week, apiKey, accessCode],
  );

  const gerarUma = async (idx: number) => {
    if (!view || ocupado.current) return;
    ocupado.current = true;
    setGerando(idx);
    setErro("");
    try {
      await gerarParte(view, idx);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não deu para gerar esta parte.");
    } finally {
      ocupado.current = false;
      setGerando(null);
    }
  };

  /** Gera, uma de cada vez, as partes que faltam; se uma falhar, para e guarda as outras. */
  const gerarTudo = async () => {
    if (!view || ocupado.current) return;
    ocupado.current = true;
    setErro("");
    const faltam = Array.from({ length: PARTS }, (_, i) => i).filter((i) => !view.content[i]);
    try {
      for (const idx of faltam) {
        setGerando(idx);
        setProgresso(`Gerando a parte ${idx + 1} de ${PARTS}…`);
        await gerarParte(view, idx);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não deu para gerar.";
      setErro(`${msg} As partes prontas ficaram salvas; clique de novo para continuar.`);
    } finally {
      ocupado.current = false;
      setGerando(null);
      setProgresso("");
    }
  };

  const titulo = weekN ? `Lição da semana ${weekN}` : "Lição da semana";
  const prontas = view ? Object.keys(view.content).length : 0;
  const parteAberta = view && aberta !== null ? view.parts[aberta] : null;
  const conteudo = view && aberta !== null ? view.content[aberta] : undefined;

  let corpo: React.ReactNode;
  if (!ready) {
    corpo = <p className="faint">Carregando…</p>;
  } else if (!userId) {
    corpo = (
      <p className="lesson-note">
        Entre com sua conta Google (botão no alto da página) para estudar a lição da semana e conversar com o
        professor.
      </p>
    );
  } else if (weekN === null || !week) {
    corpo = (
      <p className="lesson-note">
        Essa semana não existe no seu plano. <Link href="/licoes">Ver todas as lições</Link>
      </p>
    );
  } else if (!carregado) {
    corpo = <p className="faint">Carregando a lição…</p>;
  } else if (!view) {
    corpo = (
      <div className="lesson-start">
        <p>
          A lição desta semana ensina <em>{week.grammar?.topic || week.theme}</em> em {PARTS} partes, uma por
          dia. Primeiro o professor prepara o roteiro; depois cada parte é escrita no dia dela, ou quando você
          pedir.
        </p>
        <button className="btn primary" onClick={() => void prepararRoteiro()} disabled={gerando !== null}>
          {gerando === "roteiro" ? "Preparando…" : "Preparar a lição"}
        </button>
        {gerando === "roteiro" && <p className="faint">Montando o roteiro da semana… leva alguns segundos.</p>}
      </div>
    );
  } else {
    corpo = (
      <>
        {view.intro && <p className="licao-intro">{view.intro}</p>}
        {prontas < PARTS && (
          <div className="licao-actions">
            <button className="btn primary" onClick={() => void gerarTudo()} disabled={gerando !== null}>
              Gerar a lição inteira
            </button>
            {progresso && <span className="faint">{progresso}</span>}
          </div>
        )}

        <ol className="licao-parts">
          {view.parts.map((p, i) => {
            const pronta = Boolean(view.content[i]);
            return (
              <li key={i} className={aberta === i ? "licao-open" : undefined}>
                <button className="licao-part-btn" onClick={() => setAberta(i)} aria-expanded={aberta === i}>
                  <span className="licao-num">{i + 1}</span>
                  <span className="licao-part-text">
                    <small>
                      {p.day} · {p.focus}
                      {ehAtual && i === hojeIdx ? " · hoje" : ""}
                    </small>
                    <strong>{p.title}</strong>
                  </span>
                  <span className={pronta ? "licao-ready" : "faint"}>
                    {pronta ? "✓ pronta" : gerando === i ? "gerando…" : "a gerar"}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {parteAberta && aberta !== null && (
          <div className="licao-part">
            <p className="licao-part-head">
              <span>
                Parte {aberta + 1} de {PARTS} · {parteAberta.day} · {parteAberta.focus}
              </span>
            </p>
            {conteudo ? (
              <>
                <StudySections study={conteudo} />
                <TeacherChat
                  weekLessonId={view.id}
                  partIdx={aberta}
                  initial={view.chats[aberta] ?? []}
                  apiKey={apiKey}
                  accessCode={accessCode}
                />
              </>
            ) : (
              <div className="lesson-start">
                <p>
                  <strong>{parteAberta.title}</strong>
                  {parteAberta.goal ? ` — ${parteAberta.goal}` : ""}
                </p>
                <button className="btn primary" onClick={() => void gerarUma(aberta)} disabled={gerando !== null}>
                  {gerando === aberta ? "Gerando…" : "Gerar esta parte"}
                </button>
                {gerando === aberta && <p className="faint">Escrevendo a aula… pode levar até um minuto.</p>}
              </div>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <LicoesTopbar title={titulo} authEnabled={authEnabled} />
      <main className="wrap study-page">
        <p className="study-week">
          <Link href="/licoes">Lições</Link>
          {week ? ` · Semana ${week.n} · ${view?.topic || week.grammar?.topic || week.theme}` : ""}
        </p>
        <div className="panel">
          <section>
            <div className="section-title">
              <h2>{view?.topic || week?.grammar?.topic || "Lição da semana"}</h2>
              {week && <span>{week.theme}</span>}
            </div>
            {erro && <p className="lesson-error">{erro}</p>}
            {corpo}
          </section>
        </div>
      </main>
    </>
  );
}
