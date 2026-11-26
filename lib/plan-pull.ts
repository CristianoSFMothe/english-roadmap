// Busca o plano e a semana da conta em /api/data. Sem React: o `npm test` carrega direto.
import type { GeneratedPlan } from "../components/Generator";

export type RemotePlan = { plan: GeneratedPlan | null; weekN: number | null };
export type DataResponse = {
  signedIn?: boolean;
  plan?: GeneratedPlan | null;
  progress?: Record<string, { currentWeek?: number }>;
};

/**
 * Começa a busca; devolve a função que a cancela (o cleanup do efeito). Sem trava entre
 * montagens: no Strict Mode o efeito roda, é cancelado e roda de novo, e a 2ª busca
 * precisa terminar para a página sair de "Carregando…".
 */
export function startPlanPull(
  userId: string,
  fetchData: () => Promise<DataResponse>,
  apply: (r: { remote: RemotePlan | null; ready: boolean }) => void,
): () => void {
  let cancelado = false;
  (async () => {
    let remote: RemotePlan | null = null;
    try {
      const data = await fetchData();
      if (cancelado || !data.signedIn) return;
      const id = data.plan?.id ?? "sample";
      remote = { plan: data.plan ?? null, weekN: data.progress?.[id]?.currentWeek ?? null };
    } catch {
      /* sem rede: segue com o que está no navegador */
    } finally {
      if (!cancelado) apply({ remote, ready: true });
    }
  })();
  return () => {
    cancelado = true;
  };
}
