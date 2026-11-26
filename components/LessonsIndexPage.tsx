"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { RawWeek } from "@/lib/content";
import { PARTS } from "@/lib/lesson-parts";
import { usePlanContext } from "@/lib/use-plan-context";
import LicoesTopbar from "./LicoesTopbar";

type Resumo = { weekN: number; topic: string; parts: number };

/** /licoes: uma linha por semana do plano, com a gramática e o estado da lição. */
export default function LessonsIndexPage({ sample, authEnabled }: { sample: RawWeek[]; authEnabled: boolean }) {
  const { weeks, currentWeek, planId, userId, ready } = usePlanContext(sample, authEnabled);
  const [resumos, setResumos] = useState<Record<number, Resumo> | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!userId || !ready) return;
    let cancelado = false;
    fetch(`/api/licoes?planId=${encodeURIComponent(planId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { lessons?: Resumo[] }) => {
        if (!cancelado) setResumos(Object.fromEntries((j.lessons ?? []).map((l) => [l.weekN, l])));
      })
      .catch(() => {
        if (!cancelado) setErro("Não consegui carregar as lições.");
      });
    return () => {
      cancelado = true;
    };
  }, [userId, ready, planId]);

  return (
    <>
      <LicoesTopbar title="Lições" authEnabled={authEnabled} />
      <main className="wrap study-page">
        <div className="panel">
          <section>
            <div className="section-title">
              <h2>Lições da semana</h2>
              <span>
                A aula completa da gramática de cada semana, em {PARTS} partes (uma por dia), com um professor
                para tirar dúvidas.
              </span>
            </div>

            {!ready ? (
              <p className="faint">Carregando…</p>
            ) : !userId ? (
              <p className="lesson-note">
                Entre com sua conta Google (botão no alto da página) para estudar as lições. Cada semana do plano
                ganha uma aula escrita para você, e as conversas com o professor ficam guardadas.
              </p>
            ) : (
              <>
                {erro && <p className="lesson-error">{erro}</p>}
                <ul className="licao-index">
                  {weeks.map((w) => {
                    const r = resumos?.[w.n];
                    const atual = w.n === currentWeek;
                    return (
                      <li key={w.n} className={atual ? "licao-current" : undefined}>
                        <div>
                          <strong>
                            Semana {w.n} · {r?.topic || w.grammar?.topic || w.theme}
                          </strong>
                          {atual && <span className="licao-badge">● semana atual</span>}
                          <p className="faint">
                            {w.theme} ·{" "}
                            {resumos === null ? "…" : r ? `${r.parts} de ${PARTS} partes` : "ainda não preparada"}
                          </p>
                        </div>
                        <Link className={`btn small${atual ? " primary" : ""}`} href={`/licoes/${w.n}`}>
                          Abrir
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
