import { NextResponse } from "next/server";
import { clampProfile, type Profile } from "@/lib/profile";
import { extractJson, normalizeOutline, normalizeWeek, type OutlineItem } from "@/lib/normalize";
import { outlineMessage, systemPrompt, weekMessage } from "@/lib/prompt";
import { accessRestricted, allowedUser } from "@/lib/access";
import { askClaude, CLAUDE_MODEL as DEFAULT_MODEL, resolveKey } from "@/lib/claude";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Diz ao app como a geração está liberada: chave do servidor, código ou conta. */
export async function GET() {
  const user = await allowedUser();
  return NextResponse.json({
    serverKey: Boolean(process.env.ANTHROPIC_API_KEY),
    requiresCode: Boolean(
      process.env.ANTHROPIC_API_KEY && process.env.APP_ACCESS_CODE && !user,
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

const callClaude = (key: string, system: string, user: string, maxTokens: number) =>
  askClaude({ key, system, user, maxTokens });

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return fail("Requisição inválida.", 400);
  }

  const chave = await resolveKey(body.apiKey, body.accessCode);
  if ("error" in chave) return fail(chave.error, chave.status);
  const key = chave.key;

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
