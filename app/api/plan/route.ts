import { NextResponse } from "next/server";
import { clampProfile, type Profile } from "@/lib/profile";
import { extractJson, normalizeOutline, normalizeWeek, type OutlineItem } from "@/lib/normalize";
import { outlineMessage, systemPrompt, weekMessage } from "@/lib/prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

/** Diz ao app se o servidor já tem uma chave configurada e se exige código de acesso. */
export async function GET() {
  return NextResponse.json({
    serverKey: Boolean(process.env.ANTHROPIC_API_KEY),
    requiresCode: Boolean(process.env.ANTHROPIC_API_KEY && process.env.APP_ACCESS_CODE),
    allowOwnKey: process.env.ALLOW_VISITOR_KEY !== "false",
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

async function callClaude(key: string, system: string, user: string, maxTokens: number) {
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: maxTokens,
        temperature: 0.7,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
  } catch {
    throw new Error("Não foi possível falar com a API da Anthropic. Verifique a conexão e tente de novo.");
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 401) throw new Error("Chave da API recusada. Confira se ela está correta e ativa.");
    if (res.status === 429) throw new Error("Limite de uso da API atingido. Espere um pouco e tente de novo.");
    if (res.status === 400 && detail.includes("credit"))
      throw new Error("A conta da API está sem créditos.");
    throw new Error(`A API respondeu com erro ${res.status}.`);
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
    stop_reason?: string;
  };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");

  if (!text.trim()) throw new Error("A API respondeu vazio.");
  if (data.stop_reason === "max_tokens")
    throw new Error("A resposta foi cortada por tamanho. Tente gerar com menos minutos por dia.");

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
  const serverKey = process.env.ANTHROPIC_API_KEY ?? "";

  let key = "";
  if (visitorKey && allowOwnKey) {
    key = visitorKey;
  } else if (serverKey) {
    const expected = process.env.APP_ACCESS_CODE;
    if (expected && body.accessCode !== expected) {
      return fail("Código de acesso incorreto.", 403);
    }
    key = serverKey;
  }

  if (!key) {
    return fail(
      "Nenhuma chave da API disponível. Configure ANTHROPIC_API_KEY no servidor ou informe a sua própria chave.",
      400,
    );
  }

  if (!body.profile) return fail("Perfil não enviado.", 400);
  const profile = clampProfile(body.profile);

  try {
    if (body.stage === "outline") {
      const text = await callClaude(key, systemPrompt(profile), outlineMessage(profile), 4000);
      const outline = normalizeOutline(extractJson(text), profile.weeks);
      return NextResponse.json({ outline });
    }

    if (body.stage === "week") {
      if (!body.item) return fail("Semana não informada.", 400);
      const text = await callClaude(
        key,
        systemPrompt(profile),
        weekMessage(profile, body.item, body.outlineThemes ?? []),
        8000,
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
