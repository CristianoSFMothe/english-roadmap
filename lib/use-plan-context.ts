"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GeneratedPlan } from "@/components/Generator";
import { useSession } from "./auth-client";
import { buildWeeks, type RawWeek, type Week } from "./content";
import { usePersistentState } from "./storage";

type Remote = { plan: GeneratedPlan | null; weekN: number | null };

export type PlanContext = {
  plan: GeneratedPlan | null;
  /** Id do plano para as Lições; o plano de exemplo é "sample". */
  planId: string;
  weeks: Week[];
  currentWeek: number;
  week: Week | null;
  apiKey: string;
  accessCode: string;
  userId: string | null;
  /** O `/api/data` já respondeu (ou não há login para esperar). */
  ready: boolean;
};

/**
 * O plano e a semana atual, como o Estudo do dia e as Lições enxergam: o que está no
 * navegador e, com login, o que está na conta (só em memória — quem grava o progresso é
 * a página do plano).
 */
export function usePlanContext(sample: RawWeek[], authEnabled: boolean): PlanContext {
  const [localPlan] = usePersistentState<GeneratedPlan | null>("plan", null);
  const [apiKey] = usePersistentState<string>("geminiApiKey", "");
  const [accessCode] = usePersistentState<string>("accessCode", "");
  const localPlanId = localPlan?.id ?? "sample";
  const [localWeekN] = usePersistentState<number>(`week:${localPlanId}`, 1);

  const { data: session, isPending } = useSession();
  const userId = authEnabled ? (session?.user?.id ?? null) : null;
  const [remote, setRemote] = useState<Remote | null>(null);
  const [pronto, setPronto] = useState(false);
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
      } finally {
        if (!cancelado) setPronto(true);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [userId]);

  const plan = remote?.plan ?? localPlan;
  const currentWeek = remote?.weekN ?? (remote?.plan ? 1 : localWeekN);
  const weeks = useMemo(() => buildWeeks(plan?.weeks ?? sample), [plan, sample]);
  const week = weeks.find((w) => w.n === currentWeek) ?? weeks[0] ?? null;
  const ready = !authEnabled || (!isPending && (!userId || pronto));

  return {
    plan,
    planId: plan?.id ?? "sample",
    weeks,
    currentWeek: week?.n ?? currentWeek,
    week,
    apiKey,
    accessCode,
    userId,
    ready,
  };
}
