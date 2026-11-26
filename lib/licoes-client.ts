// Chamadas das telas para /api/licoes. Sem imports em tempo de execução: o `npm test`
// carrega este arquivo direto.
import type { Week } from "./weeks";

/** O que as rotas das Lições precisam saber da semana do plano. */
export function weekRequest(week: Week): {
  weekN: number;
  tema: string;
  gramatica: string;
  dias: { label: string; focus: string }[];
  vocabulario: string[];
} {
  return {
    weekN: week.n,
    tema: week.theme,
    gramatica: week.grammar?.topic ?? "",
    dias: (week.days ?? []).map((d) => ({ label: d.label, focus: d.focus })),
    vocabulario: (week.cards ?? []).slice(0, 25).map((c) => c.en),
  };
}

/** Erro de /api/licoes ou /api/lesson, com o status e o aviso de roteiro faltando. */
export class LicoesError extends Error {
  status: number;
  needsOutline: boolean;
  constructor(message: string, status: number, needsOutline = false) {
    super(message);
    this.status = status;
    this.needsOutline = needsOutline;
  }
}

/** POST em JSON; lança LicoesError quando a resposta não é ok. */
export async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    /* resposta sem JSON: fica o erro genérico */
  }
  if (!res.ok) {
    const msg = typeof json.error === "string" ? json.error : "Não deu certo agora. Tente de novo.";
    throw new LicoesError(msg, res.status, Boolean(json.needsOutline));
  }
  return json as T;
}

export const postLicoes = <T>(body: Record<string, unknown>) => postJson<T>("/api/licoes", body);
