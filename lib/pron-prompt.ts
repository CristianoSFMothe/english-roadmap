/**
 * Prompt e normalização da pronúncia gerada pelo Gemini (botão "Gerar pronúncia").
 * Sem imports: o `npm test` roda este arquivo direto no Node. Estilo, exemplos e a
 * função de chave chegam por parâmetro.
 */

/** Limites de um pedido a /api/pron. */
export const PRON_MAX_TEXTS = 40;
export const PRON_MAX_CHARS = 200;

export function pronSystemPrompt(style: string, examples: [string, string][]): string {
  return `Você escreve a pronúncia aproximada de textos em inglês para um brasileiro adulto
que não sabe nada de inglês e vai ler em voz alta.

Regras:
${style}

Exemplos:
${examples.map(([en, say]) => `${en} → ${say}`).join("\n")}

Responda só com um objeto JSON.`;
}

export function pronUserPrompt(texts: string[]): string {
  return `Escreva a pronúncia de cada texto abaixo.
Responda com um objeto JSON em que cada chave é o texto exatamente como foi enviado e o valor é a pronúncia:
{ "<texto exatamente como enviado>": "<pronúncia>" }

Textos:
${texts.map((t) => JSON.stringify(t)).join("\n")}`;
}

/** Fica só com as pronúncias dos textos pedidos, casados pela chave normalizada. */
export function normalizePronMap(
  raw: unknown,
  texts: string[],
  key: (t: string) => string,
): Record<string, string> {
  const wanted = new Set(texts.map(key));
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const nk = key(k);
    if (!wanted.has(nk) || typeof v !== "string") continue;
    const say = v.trim().slice(0, 300);
    if (say) out[nk] = say;
  }
  return out;
}

/** Tira textos vazios, longos demais e repetidos (pela chave) e divide em lotes. */
export function pronBatches(texts: string[], key: (t: string) => string, size = PRON_MAX_TEXTS): string[][] {
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const t of texts) {
    const text = typeof t === "string" ? t.trim() : "";
    if (!text || text.length > PRON_MAX_CHARS) continue;
    const k = key(text);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    clean.push(text);
  }
  const out: string[][] = [];
  for (let i = 0; i < clean.length; i += size) out.push(clean.slice(i, i + size));
  return out;
}

/**
 * A tabela de pronúncia é compartilhada por todos: só grava o que veio da chave do
 * servidor (que só é usada com login autorizado ou código de acesso). Com a chave do
 * próprio visitante, a pronúncia volta para ele mas não entra na tabela.
 */
export function shouldStoreShared(usedKey: string, serverKey: string | undefined): boolean {
  return Boolean(usedKey) && Boolean(serverKey) && usedKey === serverKey;
}

/** Separa o que pode ir para a geração (ok) do que é longo demais para a rota (skipped). */
export function splitGeneratable(texts: string[], key: (t: string) => string): { ok: string[]; skipped: string[] } {
  const ok = pronBatches(texts, key, Number.MAX_SAFE_INTEGER).flat();
  const skipped = texts.filter((t) => typeof t === "string" && t.trim().length > PRON_MAX_CHARS);
  return { ok, skipped };
}
