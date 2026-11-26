import { NextResponse } from "next/server";
import { allowedUser } from "@/lib/access";
import { askGemini, resolveKey } from "@/lib/gemini";
import { normalizeAnswer, normalizeLessonOutline, normalizeStudy } from "@/lib/lesson-normalize";
import { outlineDays, PARTS, validateQuestion, type WeekLessonView } from "@/lib/lesson-parts";
import {
  chatSystemPrompt,
  chatUserPrompt,
  outlineSystemPrompt,
  outlineUserPrompt,
  partSystemPrompt,
  partUserPrompt,
} from "@/lib/lesson-prompt";
import { extractJson } from "@/lib/normalize";
import { userProfile } from "@/lib/server-data";
import {
  addChatPair,
  chatHistory,
  chatsByPart,
  createWeekLesson,
  getPart,
  getParts,
  getWeekLesson,
  getWeekLessonById,
  listWeekLessons,
  savePart,
  type WeekLesson,
} from "@/lib/week-lessons";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status });

const planIdDe = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 100) : "sample");
const inteiro = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : Number.NaN);

async function paraView(userId: string, w: WeekLesson): Promise<WeekLessonView> {
  const [content, chats] = await Promise.all([getParts(w.id), chatsByPart(userId, w.id)]);
  return {
    id: w.id,
    weekN: w.weekN,
    topic: w.outline.topic,
    intro: w.outline.intro,
    parts: w.outline.parts,
    content,
    chats,
  };
}

export async function GET(request: Request) {
  const user = await allowedUser();
  if (!user) return NextResponse.json({ signedIn: false });

  const url = new URL(request.url);
  const planId = planIdDe(url.searchParams.get("planId"));
  const week = url.searchParams.get("week");

  try {
    if (week === null) {
      return NextResponse.json({ signedIn: true, lessons: await listWeekLessons(user.id, planId) });
    }
    const weekN = Number(week);
    if (!Number.isInteger(weekN) || weekN < 1) return fail("Semana inválida.", 400);
    const w = await getWeekLesson(user.id, planId, weekN);
    return NextResponse.json({ signedIn: true, lesson: w ? await paraView(user.id, w) : null });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao carregar as lições.", 500);
  }
}

type Body = {
  action?: "outline" | "part" | "ask";
  planId?: string;
  weekN?: number;
  tema?: string;
  gramatica?: string;
  dias?: { label?: string; focus?: string }[];
  vocabulario?: string[];
  weekLessonId?: string;
  idx?: number;
  partIdx?: number;
  question?: string;
  apiKey?: string;
  accessCode?: string;
};

export async function POST(request: Request) {
  const user = await allowedUser();
  if (!user) return fail("Entre com a conta autorizada para usar as lições.", 403);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return fail("Requisição inválida.", 400);
  }

  try {
    if (body.action === "outline") return await roteiro(user.id, body);
    if (body.action === "part") return await parte(user.id, body);
    if (body.action === "ask") return await perguntar(user.id, body);
    return fail("Ação desconhecida.", 400);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha na lição.", 502);
  }
}

/** A chave do Gemini só é resolvida quando vai mesmo chamar a IA. */
async function chave(body: Body): Promise<string | NextResponse> {
  const r = await resolveKey(body.apiKey, body.accessCode);
  return "error" in r ? fail(r.error, r.status) : r.key;
}

const vocabularioDe = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 25) : [];

async function roteiro(userId: string, body: Body) {
  const planId = planIdDe(body.planId);
  const weekN = inteiro(body.weekN);
  if (!Number.isInteger(weekN) || weekN < 1) return fail("Semana não informada.", 400);
  const gramatica = (body.gramatica ?? "").trim();
  if (!gramatica) return fail("A semana não tem assunto de gramática.", 400);

  const existente = await getWeekLesson(userId, planId, weekN);
  if (existente) return NextResponse.json({ lesson: await paraView(userId, existente) });

  const key = await chave(body);
  if (typeof key !== "string") return key;

  const profile = await userProfile(userId);
  const dias = outlineDays(
    (Array.isArray(body.dias) ? body.dias : []).map((d) => ({ label: String(d?.label ?? ""), focus: String(d?.focus ?? "") })),
  );
  const texto = await askGemini({
    key,
    system: outlineSystemPrompt(profile),
    user: outlineUserPrompt({
      level: profile.level,
      weekN,
      tema: body.tema,
      gramatica,
      dias,
      vocabulario: vocabularioDe(body.vocabulario),
    }),
    maxTokens: 3000,
    temperature: 0.7,
  });
  const outline = normalizeLessonOutline(extractJson(texto), dias);
  const w = await createWeekLesson({
    userId,
    planId,
    weekN,
    level: profile.level,
    theme: body.tema?.trim() || null,
    outline,
  });
  return NextResponse.json({ lesson: await paraView(userId, w) });
}

async function parte(userId: string, body: Body) {
  const idx = inteiro(body.idx);
  if (!Number.isInteger(idx) || idx < 0 || idx >= PARTS) return fail("Parte inválida.", 400);
  const w = body.weekLessonId ? await getWeekLessonById(userId, body.weekLessonId) : null;
  if (!w) return fail("Lição não encontrada.", 404);

  const pronta = await getPart(w.id, idx);
  if (pronta) return NextResponse.json({ idx, part: pronta });

  const key = await chave(body);
  if (typeof key !== "string") return key;

  const profile = await userProfile(userId);
  const texto = await askGemini({
    key,
    system: partSystemPrompt(profile),
    user: partUserPrompt({ outline: w.outline, idx, vocabulario: vocabularioDe(body.vocabulario) }),
    maxTokens: 8000,
    temperature: 0.8,
  });
  const part = await savePart(w.id, idx, normalizeStudy(extractJson(texto)));
  return NextResponse.json({ idx, part });
}

async function perguntar(userId: string, body: Body) {
  const partIdx = inteiro(body.partIdx);
  if (!Number.isInteger(partIdx) || partIdx < 0 || partIdx >= PARTS) return fail("Parte inválida.", 400);
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const invalida = validateQuestion(question);
  if (invalida) return fail(invalida, 400);

  const w = body.weekLessonId ? await getWeekLessonById(userId, body.weekLessonId) : null;
  if (!w) return fail("Lição não encontrada.", 404);
  const part = await getPart(w.id, partIdx);
  if (!part) return fail("Gere esta parte antes de perguntar.", 409);

  const key = await chave(body);
  if (typeof key !== "string") return key;

  const [profile, history] = await Promise.all([userProfile(userId), chatHistory(userId, w.id, partIdx)]);
  const texto = await askGemini({
    key,
    system: chatSystemPrompt(profile),
    user: chatUserPrompt({ outline: w.outline, idx: partIdx, part, history, question }),
    maxTokens: 1500,
    temperature: 0.5,
  });
  const answer = normalizeAnswer(extractJson(texto));
  const messages = await addChatPair({ userId, weekLessonId: w.id, partIdx, question, answer });
  return NextResponse.json({ messages });
}
