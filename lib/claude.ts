import { allowedUser } from "./access";

export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

const API_URL = "https://api.anthropic.com/v1/messages";

export type KeyResolution = { key: string } | { error: string; status: number };

/**
 * Decide qual chave usar: a do próprio visitante, se ele trouxe uma e isso é
 * permitido, ou a do servidor — esta só para conta autorizada ou código de acesso.
 */
export async function resolveKey(
  visitorKey?: string,
  accessCode?: string,
): Promise<KeyResolution> {
  const visitante = (visitorKey ?? "").trim();
  const permiteChavePropria = process.env.ALLOW_VISITOR_KEY !== "false";
  if (visitante && permiteChavePropria) return { key: visitante };

  const doServidor = process.env.ANTHROPIC_API_KEY ?? "";
  if (!doServidor) {
    return {
      error:
        "Nenhuma chave da API disponível. Configure ANTHROPIC_API_KEY no servidor ou informe a sua própria chave.",
      status: 400,
    };
  }

  const esperado = process.env.APP_ACCESS_CODE;
  const user = await allowedUser();
  const codigoConfere = Boolean(esperado) && accessCode === esperado;
  if (!user && !codigoConfere) {
    return {
      error: esperado
        ? "Entre com a conta autorizada ou informe o código de acesso."
        : "Entre com a conta autorizada para usar esta função.",
      status: 403,
    };
  }
  return { key: doServidor };
}

export async function askClaude(args: {
  key: string;
  system: string;
  user: string;
  maxTokens: number;
  temperature?: number;
}): Promise<string> {
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": args.key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: args.maxTokens,
        temperature: args.temperature ?? 0.7,
        system: args.system,
        messages: [{ role: "user", content: args.user }],
      }),
    });
  } catch {
    throw new Error(
      "Não foi possível falar com a API da Anthropic. Verifique a conexão e tente de novo.",
    );
  }

  if (!res.ok) {
    const detalhe = await res.text().catch(() => "");
    if (res.status === 401) throw new Error("Chave da API recusada. Confira se ela está correta e ativa.");
    if (res.status === 429) throw new Error("Limite de uso da API atingido. Espere um pouco e tente de novo.");
    if (res.status === 400 && /credit/i.test(detalhe)) {
      throw new Error(
        "A conta da chave da API está sem créditos. Adicione créditos em console.anthropic.com (Plans & Billing). A assinatura do Claude.ai não cobre o uso da API.",
      );
    }
    throw new Error(`A API respondeu com erro ${res.status}.`);
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
    stop_reason?: string;
  };
  const texto = (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");

  if (!texto.trim()) throw new Error("A API respondeu vazio.");
  if (data.stop_reason === "max_tokens")
    throw new Error("A resposta foi cortada por tamanho. Tente de novo.");
  return texto;
}
