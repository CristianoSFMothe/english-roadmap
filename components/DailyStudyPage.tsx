"use client";

import Link from "next/link";
import type { RawWeek } from "@/lib/content";
import { usePlanContext } from "@/lib/use-plan-context";
import AuthBar from "./AuthBar";
import Lessons from "./Lessons";

/**
 * Página do estudo do dia: a parte de hoje da lição da semana atual do plano e os
 * exercícios sobre ela.
 */
export default function DailyStudyPage({
  sample,
  authEnabled,
  dataInicial = null,
}: {
  sample: RawWeek[];
  authEnabled: boolean;
  /** `?data=` do endereço, ainda sem validar. */
  dataInicial?: string | null;
}) {
  const { week, planId, apiKey, accessCode, userId } = usePlanContext(sample, authEnabled);

  return (
    <>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <div className="topbar-row">
            <div className="brand">
              <span>Trilha de inglês</span>
              <strong>Estudo do dia</strong>
            </div>
            <div className="head-actions">
              <Link className="btn small" href="/licoes">
                Lições
              </Link>
              <Link className="btn small" href="/vocabulario">
                Vocabulário
              </Link>
              <Link className="btn small" href="/preferencias">
                Preferências
              </Link>
              <Link className="btn small" href="/">
                ← Voltar ao plano
              </Link>
              <AuthBar enabled={authEnabled} syncing={false} canExport={false} onExport={() => {}} />
            </div>
          </div>
        </div>
      </header>

      <main className="wrap study-page">
        {week && (
          <p className="study-week">
            Semana {week.n} · {week.theme}
          </p>
        )}
        <Lessons
          week={week}
          planId={planId}
          apiKey={apiKey}
          accessCode={accessCode}
          signedIn={Boolean(userId)}
          dataInicial={dataInicial}
        />
      </main>
    </>
  );
}
