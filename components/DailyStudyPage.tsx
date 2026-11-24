"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RawWeek } from "@/lib/content";
import { buildWeeks } from "@/lib/content";
import { useSession } from "@/lib/auth-client";
import { usePersistentState } from "@/lib/storage";
import AuthBar from "./AuthBar";
import type { GeneratedPlan } from "./Generator";
import Lessons from "./Lessons";

type Remote = { plan: GeneratedPlan | null; weekN: number | null };

/**
 * Página do estudo do dia: teoria, dicas e exercícios da semana atual do plano.
 * O plano e a semana vêm do navegador; com login, o que está na conta vale (só em
 * memória — quem grava o progresso é a página do plano).
 */
export default function DailyStudyPage({
  sample,
  authEnabled,
}: {
  sample: RawWeek[];
  authEnabled: boolean;
}) {
  const [localPlan] = usePersistentState<GeneratedPlan | null>("plan", null);
  const [apiKey] = usePersistentState<string>("geminiApiKey", "");
  const [accessCode] = usePersistentState<string>("accessCode", "");
  const localPlanId = localPlan?.id ?? "sample";
  const [localWeekN] = usePersistentState<number>(`week:${localPlanId}`, 1);

  const { data: session } = useSession();
  const userId = authEnabled ? (session?.user?.id ?? null) : null;
  const [remote, setRemote] = useState<Remote | null>(null);
  const pulled = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || pulled.current === userId) return;
    pulled.current = userId;
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch("/api/data");
        const data = (await res.json()) as {
          signedIn?: boolean;
          plan?: GeneratedPlan | null;
          progress?: Record<string, { currentWeek?: number }>;
        };
        if (cancelado || !data.signedIn) return;
        const id = data.plan?.id ?? "sample";
        setRemote({ plan: data.plan ?? null, weekN: data.progress?.[id]?.currentWeek ?? null });
      } catch {
        /* sem rede: segue com o que está no navegador */
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [userId]);

  const plan = remote?.plan ?? localPlan;
  const weekN = remote?.weekN ?? (remote?.plan ? 1 : localWeekN);
  const weeks = useMemo(() => buildWeeks(plan?.weeks ?? sample), [plan, sample]);
  const week = weeks.find((w) => w.n === weekN) ?? weeks[0] ?? null;

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
        <Lessons week={week} apiKey={apiKey} accessCode={accessCode} signedIn={Boolean(userId)} />
      </main>
    </>
  );
}
