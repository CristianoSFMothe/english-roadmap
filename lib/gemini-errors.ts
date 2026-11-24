// Sem imports em tempo de execução, para os testes carregarem direto no Node.

/** O 429 é o limite por dia (e não o por minuto, que passa sozinho em segundos)? */
export function isDailyQuota(status: number, detail: string): boolean {
  return status === 429 && /PerDay|per day/i.test(detail);
}

/** O modelo reserva, se houver um e ele for diferente do que acabou de esgotar. */
export function nextModel(atual: string, reserva: string): string | null {
  return reserva && reserva !== atual ? reserva : null;
}
