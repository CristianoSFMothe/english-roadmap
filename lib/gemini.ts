import { allowedUser } from "./access";
import { isDailyQuota, nextModel } from "./gemini-errors";

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
/** Usado quando a cota gratuita do dia do modelo principal acaba (cada modelo tem a sua). */
export const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL ?? "gemini-3.5-flash";

const apiUrl = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

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

  const doServidor = process.env.GEMINI_API_KEY ?? "";
  if (!doServidor) {
    return {
      error:
        "Nenhuma chave da API disponível. Configure GEMINI_API_KEY no servidor ou informe a sua própria chave.",
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function askGemini(args: {
  key: string;
  system: string;
  user: string;
  maxTokens: number;
  temperature?: number;
}): Promise<string> {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: args.system }] },
    contents: [{ role: "user", parts: [{ text: args.user }] }],
    generationConfig: {
      // O raciocínio do modelo também conta no limite de saída, então ele fica baixo.
      maxOutputTokens: args.maxTokens,
      temperature: args.temperature ?? 0.7,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: "low" },
    },
  });

  let res: Response | undefined;
  let detail = "";
  let model = GEMINI_MODEL;
  // Em horário de pico o Gemini devolve 503 por alguns segundos.
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(1500 * attempt);
    try {
      res = await fetch(apiUrl(model), {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": args.key },
        body,
      });
    } catch {
      throw new Error("Não foi possível falar com a API do Gemini. Verifique a conexão e tente de novo.");
    }
    if (res.ok) break;
    detail = await res.text().catch(() => "");
    // Acabou a cota do dia deste modelo: tenta uma vez o reserva, que tem cota própria.
    const reserva = isDailyQuota(res.status, detail) ? nextModel(model, GEMINI_FALLBACK_MODEL) : null;
    if (reserva) {
      model = reserva;
      attempt = -1;
      continue;
    }
    if (res.status < 500) break;
  }

  if (!res || !res.ok) {
    const status = res?.status ?? 0;
    if (status === 401 || status === 403 || detail.includes("API_KEY_INVALID"))
      throw new Error("Chave da API recusada. Confira se ela está correta e ativa.");
    if (isDailyQuota(status, detail))
      throw new Error(
        model === GEMINI_MODEL
          ? `O limite diário gratuito do modelo ${model} acabou. Ele volta a liberar no dia seguinte.`
          : `O limite diário gratuito acabou (nos modelos ${GEMINI_MODEL} e ${model}). Ele volta a liberar no dia seguinte.`,
      );
    if (status === 429) throw new Error("Limite de uso da API atingido. Espere um pouco e tente de novo.");
    if (status === 404) throw new Error(`O modelo ${model} não está disponível para esta chave.`);
    if (status >= 500)
      throw new Error("O Gemini está sobrecarregado no momento. Espere um minuto e tente de novo.");
    throw new Error(`A API respondeu com erro ${status}.`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  };
  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("");

  if (candidate?.finishReason === "MAX_TOKENS")
    throw new Error("A resposta foi cortada por tamanho. Tente de novo.");
  if (!text.trim()) throw new Error("A API respondeu vazio.");

  return text;
}
