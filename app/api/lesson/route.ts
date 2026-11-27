import { NextResponse } from "next/server";
import { allowedUser } from "@/lib/access";
import { askGemini, resolveKey } from "@/lib/gemini";
import type { Profile } from "@/lib/profile";
import { userProfile } from "@/lib/server-data";
import {
  createLesson,
  errosRecentes,
  getLesson,
  historico,
  hojeSaoPaulo,
  pendentes,
  saveAnswer,
  setImprovements,
  type Lesson,
} from "@/lib/lessons";
import {
  gradeSystemPrompt,
  gradeUserPrompt,
  improveSystemPrompt,
  improveUserPrompt,
  lessonSystemPrompt,
  ORDEM,
  partAndQuestionsUserPrompt,
  questionsUserPrompt,
  TOTAL_QUESTOES,
} from "@/lib/lesson-prompt";
import {
  canGenerateMore,
  mergeImprovements,
  normalizeImprovements,
  normalizeQuestions,
  normalizeResult,
  normalizeStudy,
} from "@/lib/lesson-normalize";
import { extractJson } from "@/lib/normalize";
import { generateStep, HISTORY_PAGE, parseDateParam, partIndexForDate } from "@/lib/lesson-parts";
import { getPart, getWeekLesson, savePart } from "@/lib/week-lessons";

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

export async function GET(request: Request) {
  const user = await allowedUser();
  if (!user) {
    return NextResponse.json({ signedIn: false, today: null, lesson: null, pending: [], history: [] });
  }

  const params = new URL(request.url).searchParams;
  try {
    const hoje = hojeSaoPaulo();

    // Um dia só, para rever (ou para abrir pelo ?data= do endereço).
    if (params.has("data")) {
      const data = parseDateParam(params.get("data"));
      const lesson = data ? await getLesson(user.id, data) : null;
      return NextResponse.json({ signedIn: true, date: hoje, lesson });
    }

    // Próxima página de "Últimos dias".
    if (params.has("antes")) {
      const antes = parseDateParam(params.get("antes"));
      if (!antes) return fail("Data inválida.", 400);
      return NextResponse.json({ signedIn: true, history: await historico(user.id, HISTORY_PAGE, antes) });
    }

    const [today, pending, history] = await Promise.all([
      getLesson(user.id, hoje),
      pendentes(user.id),
      historico(user.id, HISTORY_PAGE),
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
  action?: "generate" | "answer" | "improve";
  planId?: string;
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
    if (body.action === "improve") return await maisRespostas(user.id, body, chave.key);
    return fail("Ação desconhecida.", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha na lição.";
    return fail(message, 502);
  }
}

/**
 * Estudo do dia: a parte da lição da semana do dia da semana da data (domingo repete a
 * parte 6) e 5 questões sobre ela. Sem roteiro da semana, pede ao cliente para gerá-lo
 * antes (409), para nenhuma requisição passar dos 60 s.
 */
async function gerar(userId: string, body: Body, key: string) {
  const data = /^\d{4}-\d{2}-\d{2}$/.test(body.date ?? "") ? (body.date as string) : hojeSaoPaulo();
  const weekN = typeof body.weekN === "number" && Number.isInteger(body.weekN) ? body.weekN : null;
  if (!weekN || weekN < 1) return fail("Semana do plano não informada.", 400);
  const planId = typeof body.planId === "string" && body.planId.trim() ? body.planId.trim() : "sample";
  const idx = partIndexForDate(data);

  const existente = await getLesson(userId, data);
  const semana = existente?.questions.length ? null : await getWeekLesson(userId, planId, weekN);
  const pronta = semana ? await getPart(semana.id, idx) : null;
  const passo = generateStep({
    lessonHasQuestions: Boolean(existente?.questions.length),
    hasWeekLesson: Boolean(semana),
    hasPart: Boolean(pronta),
  });

  if (passo === "existing") return NextResponse.json({ lesson: existente, jaExistia: true });
  if (passo === "needsOutline" || !semana) {
    return NextResponse.json(
      { needsOutline: true, error: "A lição da semana ainda não foi preparada." },
      { status: 409 },
    );
  }

  const profile = await userProfile(userId, body.profile);
  const erros = await errosRecentes(userId);
  const comum = { outline: semana.outline, idx, vocabulario: body.vocabulario, errosRecentes: erros, data };

  let parte = pronta;
  let questions;
  if (passo === "questionsOnly" && pronta) {
    const texto = await askGemini({
      key,
      system: lessonSystemPrompt(profile),
      user: questionsUserPrompt({ ...comum, part: pronta }),
      maxTokens: 4000,
      temperature: 0.9,
    });
    questions = normalizeQuestions(extractJson(texto), ORDEM);
  } else {
    const texto = await askGemini({
      key,
      system: lessonSystemPrompt(profile),
      user: partAndQuestionsUserPrompt(comum),
      // A parte da aula e as 5 questões numa resposta só.
      maxTokens: 12000,
      temperature: 0.9,
    });
    const bruto = extractJson(texto);
    // A teoria primeiro: sem ela, nada é salvo.
    const study = normalizeStudy(bruto);
    questions = normalizeQuestions(bruto, ORDEM);
    // Se outra aba gravou a parte antes, vale a dela: as duas telas mostram a mesma.
    parte = await savePart(semana.id, idx, study);
  }

  const lesson = await createLesson({
    userId,
    date: data,
    level: profile.level,
    weekN,
    questions,
    study: null,
    weekLessonId: semana.id,
    partIdx: idx,
  });
  return NextResponse.json({ lesson: { ...lesson, study: lesson.study ?? parte }, jaExistia: false });
}

/** A lição do pedido: a do dia informado ou uma das abertas dos últimos 30 dias. */
async function acharLicao(userId: string, body: Body): Promise<Lesson | null> {
  const data = /^\d{4}-\d{2}-\d{2}$/.test(body.date ?? "") ? (body.date as string) : hojeSaoPaulo();
  const lesson = await getLesson(userId, data);
  if (lesson && lesson.id === body.lessonId) return lesson;
  const abertas = await pendentes(userId, 30);
  return abertas.find((l) => l.id === body.lessonId) ?? null;
}

async function corrigir(userId: string, body: Body, key: string) {
  if (!body.lessonId || !body.questionId) return fail("Lição ou questão não informada.", 400);
  const resposta = (body.answer ?? "").trim();
  if (!resposta) return fail("Escreva a resposta antes de corrigir.", 400);

  const lesson = await acharLicao(userId, body);
  if (!lesson) return fail("Lição não encontrada.", 404);

  const questao = lesson.questions.find((q) => q.id === body.questionId);
  if (!questao) return fail("Questão não encontrada.", 404);

  const texto = await askGemini({
    key,
    system: gradeSystemPrompt(lesson.level),
    user: gradeUserPrompt(questao, resposta),
    maxTokens: 2000,
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

/** "Gerar 3 respostas": informal, formal e mais usual, somadas às que já existem (uma vez por questão). */
async function maisRespostas(userId: string, body: Body, key: string) {
  if (!body.lessonId || !body.questionId) return fail("Lição ou questão não informada.", 400);
  const lesson = await acharLicao(userId, body);
  if (!lesson) return fail("Lição não encontrada.", 404);

  const questao = lesson.questions.find((q) => q.id === body.questionId);
  const result = lesson.results?.[body.questionId];
  if (!questao || !result) return fail("Responda a questão antes de pedir outras respostas.", 400);

  if (!canGenerateMore(result)) {
    return fail("Você já gerou as 3 respostas desta questão.", 409);
  }
  const atuais = result.improvements ?? [];

  const texto = await askGemini({
    key,
    system: improveSystemPrompt(lesson.level),
    user: improveUserPrompt(questao, lesson.answers?.[questao.id] ?? "", result.correction, atuais),
    maxTokens: 2000,
    temperature: 0.7,
  });
  const novas = normalizeImprovements(extractJson(texto), [
    ...atuais,
    ...(result.correction ? [{ en: result.correction, why: "" }] : []),
  ]);
  if (!novas.length) return fail("A IA não trouxe respostas novas. Tente de novo.", 502);

  const atualizada = await setImprovements({
    userId,
    lessonId: lesson.id,
    questionId: questao.id,
    improvements: mergeImprovements(atuais, novas),
  });
  // Sem linha atualizada: outro clique (ou outra aba) gerou antes deste.
  if (!atualizada) return fail("Você já gerou as 3 respostas desta questão.", 409);
  return NextResponse.json({ lesson: atualizada, added: novas.length });
}
