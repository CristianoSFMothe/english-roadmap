import { NextResponse } from "next/server";
import { allowedUser } from "@/lib/access";
import { askClaude, resolveKey } from "@/lib/claude";
import { clampProfile, emptyProfile, type Profile } from "@/lib/profile";
import { loadUserData } from "@/lib/server-data";
import {
  createLesson,
  errosRecentes,
  getLesson,
  historico,
  hojeSaoPaulo,
  pendentes,
  saveAnswer,
  type Lesson,
} from "@/lib/lessons";
import {
  gradeSystemPrompt,
  gradeUserPrompt,
  lessonSystemPrompt,
  lessonUserPrompt,
  ORDEM,
  TOTAL_QUESTOES,
} from "@/lib/lesson-prompt";
import { normalizeQuestions, normalizeResult } from "@/lib/lesson-normalize";
import { extractJson } from "@/lib/normalize";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const fail = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });

/** Dias dos últimos 14 em que nem lição foi criada: também contam como atraso. */
function diasSemLicao(datasComLicao: string[], hoje: string, dias = 14): string[] {
  const existentes = new Set(datasComLicao);
  const base = new Date(`${hoje}T12:00:00Z`);
  const faltantes: string[] = [];
  for (let i = 1; i < dias; i += 1) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    if (!existentes.has(iso)) faltantes.push(iso);
  }
  return faltantes;
}

export async function GET() {
  const user = await allowedUser();
  if (!user) {
    return NextResponse.json({ signedIn: false, today: null, pending: [], history: [] });
  }

  try {
    const hoje = hojeSaoPaulo();
    const [today, pending, history] = await Promise.all([
      getLesson(user.id, hoje),
      pendentes(user.id),
      historico(user.id, 14),
    ]);

    const primeira = history.length ? history[history.length - 1].date : hoje;
    const semLicao = diasSemLicao(
      history.map((h) => h.date),
      hoje,
    ).filter((d) => d >= primeira);

    return NextResponse.json({
      signedIn: true,
      date: hoje,
      total: TOTAL_QUESTOES,
      today,
      pending: pending.filter((l) => l.date !== hoje),
      missing: semLicao,
      history,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar as lições.";
    return fail(message, 500);
  }
}

type Body = {
  action?: "generate" | "answer";
  date?: string;
  weekN?: number;
  tema?: string;
  gramatica?: string;
  vocabulario?: string[];
  profile?: Profile;
  lessonId?: string;
  questionId?: string;
  answer?: string;
  apiKey?: string;
  accessCode?: string;
};

export async function POST(request: Request) {
  const user = await allowedUser();
  if (!user) return fail("Entre com a conta autorizada para fazer as lições.", 403);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return fail("Requisição inválida.", 400);
  }

  const chave = await resolveKey(body.apiKey, body.accessCode);
  if ("error" in chave) return fail(chave.error, chave.status);

  try {
    if (body.action === "generate") return await gerar(user.id, body, chave.key);
    if (body.action === "answer") return await corrigir(user.id, body, chave.key);
    return fail("Ação desconhecida.", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha na lição.";
    return fail(message, 502);
  }
}

async function perfilDoUsuario(userId: string, enviado?: Profile): Promise<Profile> {
  const salvo = (await loadUserData(userId)).profile;
  return clampProfile(salvo ?? enviado ?? emptyProfile);
}

async function gerar(userId: string, body: Body, key: string) {
  const data = /^\d{4}-\d{2}-\d{2}$/.test(body.date ?? "") ? (body.date as string) : hojeSaoPaulo();

  const existente = await getLesson(userId, data);
  if (existente && existente.questions.length) {
    return NextResponse.json({ lesson: existente, jaExistia: true });
  }

  const profile = await perfilDoUsuario(userId, body.profile);
  const erros = await errosRecentes(userId);

  const texto = await askClaude({
    key,
    system: lessonSystemPrompt(profile),
    user: lessonUserPrompt({
      level: profile.level,
      tema: body.tema,
      gramatica: body.gramatica,
      vocabulario: body.vocabulario,
      errosRecentes: erros,
      data,
    }),
    maxTokens: 3000,
    temperature: 0.9,
  });

  const questions = normalizeQuestions(extractJson(texto), ORDEM);
  const lesson = await createLesson({
    userId,
    date: data,
    level: profile.level,
    weekN: typeof body.weekN === "number" ? body.weekN : null,
    questions,
  });

  return NextResponse.json({ lesson, jaExistia: false });
}

async function corrigir(userId: string, body: Body, key: string) {
  if (!body.lessonId || !body.questionId) return fail("Lição ou questão não informada.", 400);
  const resposta = (body.answer ?? "").trim();
  if (!resposta) return fail("Escreva a resposta antes de corrigir.", 400);

  const data = /^\d{4}-\d{2}-\d{2}$/.test(body.date ?? "") ? (body.date as string) : hojeSaoPaulo();
  let lesson: Lesson | null = await getLesson(userId, data);
  if (!lesson || lesson.id !== body.lessonId) {
    const abertas = await pendentes(userId, 30);
    lesson = abertas.find((l) => l.id === body.lessonId) ?? null;
  }
  if (!lesson) return fail("Lição não encontrada.", 404);

  const questao = lesson.questions.find((q) => q.id === body.questionId);
  if (!questao) return fail("Questão não encontrada.", 404);

  const texto = await askClaude({
    key,
    system: gradeSystemPrompt(lesson.level),
    user: gradeUserPrompt(questao, resposta),
    maxTokens: 700,
    temperature: 0.2,
  });

  const result = normalizeResult(extractJson(texto));
  const atualizada = await saveAnswer({
    userId,
    lessonId: lesson.id,
    questionId: questao.id,
    answer: resposta,
    result,
    totalQuestoes: lesson.questions.length || TOTAL_QUESTOES,
  });

  return NextResponse.json({ result, lesson: atualizada ?? lesson });
}
