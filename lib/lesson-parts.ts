// Regras das Lições sem imports em tempo de execução: o `npm test` carrega este arquivo
// direto, sem bundler.

/** Uma lição da semana tem uma parte por dia, de segunda a sábado. */
export const PARTS = 6;

/** Mensagens da conversa que vão de contexto para o professor. */
export const CHAT_CONTEXT = 12;

/** Tamanho máximo de uma pergunta no chat. */
export const MAX_QUESTION = 1000;

export type OutlinePart = { day: string; focus: string; title: string; goal: string };
export type LessonOutline = { topic: string; intro: string; parts: OutlinePart[] };
export type PlanDay = { day: string; focus: string };

export type ChatRole = "aluno" | "professor";
export type ChatMessage = { id: string; role: ChatRole; text: string; createdAt: string };

/**
 * Parte do dia pela data (AAAA-MM-DD): segunda é a parte 1 (índice 0) e sábado a 6.
 * Domingo repete a 6 (revisão), com exercícios novos.
 */
export function partIndexForDate(iso: string): number {
  const dia = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return dia === 0 ? PARTS - 1 : Math.min(dia - 1, PARTS - 1);
}

/** Os 6 dias do roteiro, a partir dos dias do plano; o que faltar vira revisão. */
export function outlineDays(days: { label: string; focus: string }[]): PlanDay[] {
  return Array.from({ length: PARTS }, (_, i) => {
    const d = days[i];
    return d ? { day: d.label, focus: d.focus || "Revisão" } : { day: `Dia ${i + 1}`, focus: "Revisão" };
  });
}

/** `null` quando a pergunta pode ser enviada; senão, o motivo. */
export function validateQuestion(text: string): string | null {
  const t = text.trim();
  if (!t) return "Escreva a sua dúvida antes de enviar.";
  if (t.length > MAX_QUESTION) return `A pergunta pode ter até ${MAX_QUESTION} caracteres.`;
  return null;
}

/** A semana do endereço `/licoes/[semana]`, se ela existir no plano. */
export function parseWeekParam(v: string, weekNs: number[]): number | null {
  if (!/^\d+$/.test(v)) return null;
  const n = Number(v);
  return weekNs.includes(n) ? n : null;
}
