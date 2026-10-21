import { NextResponse } from "next/server";
import { clampProfile, type Profile } from "@/lib/profile";
import { extractJson, normalizeOutline, normalizeWeek, type OutlineItem } from "@/lib/normalize";
import { outlineMessage, systemPrompt, weekMessage } from "@/lib/prompt";
import { accessRestricted, allowedUser } from "@/lib/access";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent`;

/** Diz ao app como a geração está liberada: chave do servidor, código ou conta. */
export async function GET() {
  const user = await allowedUser();
  return NextResponse.json({
    serverKey: Boolean(process.env.GEMINI_API_KEY),
    requiresCode: Boolean(
      process.env.GEMINI_API_KEY && process.env.APP_ACCESS_CODE && !user,
    ),
    allowOwnKey: process.env.ALLOW_VISITOR_KEY !== "false",
    signedIn: Boolean(user),
    restricted: accessRestricted,
    model: DEFAULT_MODEL,
  });
}

type Body = {
  stage?: "outline" | "week";
  profile?: Profile;
  item?: OutlineItem;
  outlineThemes?: string[];
  apiKey?: string;
  accessCode?: string;
};

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGemini(key: string, system: string, user: string, maxTokens: number) {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      // O raciocínio do modelo também conta no limite de saída, então ele fica baixo.
      maxOutputTokens: maxTokens,
      temperature: 0.7,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: "low" },
    },
  });

  let res: Response | undefined;
  let detail = "";
  // Em horário de pico o Gemini devolve 503 por alguns segundos.
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(1500 * attempt);
    try {
      res = await fetch(API_URL, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body,
      });
    } catch {
      throw new Error("Não foi possível falar com a API do Gemini. Verifique a conexão e tente de novo.");
    }
    if (res.ok) break;
    detail = await res.text().catch(() => "");
    if (res.status < 500) break;
  }

  if (!res || !res.ok) {
    const status = res?.status ?? 0;
    if (status === 401 || status === 403 || detail.includes("API_KEY_INVALID"))
      throw new Error("Chave da API recusada. Confira se ela está correta e ativa.");
    if (status === 429 && detail.includes("PerDay"))
      throw new Error(
        `O limite diário gratuito do modelo ${DEFAULT_MODEL} acabou. Ele volta a liberar no dia seguinte.`,
      );
    if (status === 429) throw new Error("Limite de uso da API atingido. Espere um pouco e tente de novo.");
    if (status === 404) throw new Error(`O modelo ${DEFAULT_MODEL} não está disponível para esta chave.`);
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
    throw new Error("A resposta foi cortada por tamanho. Tente gerar com menos minutos por dia.");
  if (!text.trim()) throw new Error("A API respondeu vazio.");

  return text;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return fail("Requisição inválida.", 400);
  }

  const visitorKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const allowOwnKey = process.env.ALLOW_VISITOR_KEY !== "false";
  const serverKey = process.env.GEMINI_API_KEY ?? "";

  let key = "";
  if (visitorKey && allowOwnKey) {
    key = visitorKey;
  } else if (serverKey) {
    // A chave do servidor é liberada para quem entrou com conta autorizada
    // ou para quem souber o código de acesso.
    const expected = process.env.APP_ACCESS_CODE;
    const user = await allowedUser();
    const codigoConfere = Boolean(expected) && body.accessCode === expected;
    if (!user && !codigoConfere) {
      return fail(
        expected
          ? "Entre com a conta autorizada ou informe o código de acesso."
          : "Entre com a conta autorizada para gerar o plano.",
        403,
      );
    }
    key = serverKey;
  }

  if (!key) {
    return fail(
      "Nenhuma chave da API disponível. Configure GEMINI_API_KEY no servidor ou informe a sua própria chave.",
      400,
    );
  }

  if (!body.profile) return fail("Perfil não enviado.", 400);
  const profile = clampProfile(body.profile);

  try {
    if (body.stage === "outline") {
      const text = await callGemini(key, systemPrompt(profile), outlineMessage(profile), 8000);
      const outline = normalizeOutline(extractJson(text), profile.weeks);
      return NextResponse.json({ outline });
    }

    if (body.stage === "week") {
      if (!body.item) return fail("Semana não informada.", 400);
      const text = await callGemini(
        key,
        systemPrompt(profile),
        weekMessage(profile, body.item, body.outlineThemes ?? []),
        16000,
      );
      const week = normalizeWeek(
        extractJson(text),
        body.item.n,
        profile.daysPerWeek,
        profile.minutesPerDay,
      );
      return NextResponse.json({ week });
    }

    return fail("Etapa desconhecida.", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gerar o plano.";
    return fail(message, 502);
  }
}
