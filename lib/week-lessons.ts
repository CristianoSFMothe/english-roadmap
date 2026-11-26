import { prisma } from "./db";
import type { Prisma } from "./generated/prisma/client";
import type { ChatMessage, ChatRole, LessonOutline } from "./lesson-parts";
import type { Study } from "./lesson-prompt";

/** A lição de uma semana do plano: o roteiro das 6 partes. */
export type WeekLesson = {
  id: string;
  planId: string;
  weekN: number;
  level: string;
  topic: string;
  theme: string | null;
  outline: LessonOutline;
};

const json = (v: unknown) => v as Prisma.InputJsonValue;

type WeekLessonRow = {
  id: string;
  planId: string;
  weekN: number;
  level: string;
  topic: string;
  theme: string | null;
  outline: unknown;
};

const paraWeekLesson = (r: WeekLessonRow): WeekLesson => ({
  id: r.id,
  planId: r.planId,
  weekN: r.weekN,
  level: r.level,
  topic: r.topic,
  theme: r.theme,
  outline: r.outline as LessonOutline,
});

export async function getWeekLesson(userId: string, planId: string, weekN: number): Promise<WeekLesson | null> {
  const r = await prisma.weekLesson.findUnique({ where: { userId_planId_weekN: { userId, planId, weekN } } });
  return r ? paraWeekLesson(r) : null;
}

/** Pelo id, só se a lição for desta pessoa. */
export async function getWeekLessonById(userId: string, id: string): Promise<WeekLesson | null> {
  const r = await prisma.weekLesson.findFirst({ where: { id, userId } });
  return r ? paraWeekLesson(r) : null;
}

/** Cria o roteiro da semana; se dois pedidos chegarem juntos, vale o primeiro. */
export async function createWeekLesson(a: {
  userId: string;
  planId: string;
  weekN: number;
  level: string;
  theme: string | null;
  outline: LessonOutline;
}): Promise<WeekLesson> {
  const r = await prisma.weekLesson.upsert({
    where: { userId_planId_weekN: { userId: a.userId, planId: a.planId, weekN: a.weekN } },
    create: {
      id: `wl-${a.userId.slice(0, 8)}-${a.planId}-${a.weekN}`,
      userId: a.userId,
      planId: a.planId,
      weekN: a.weekN,
      level: a.level,
      topic: a.outline.topic,
      theme: a.theme,
      outline: json(a.outline),
    },
    update: {},
  });
  return paraWeekLesson(r);
}

/** As lições já criadas de um plano, com quantas partes cada uma tem. */
export async function listWeekLessons(
  userId: string,
  planId: string,
): Promise<{ weekN: number; topic: string; parts: number }[]> {
  const rows = await prisma.weekLesson.findMany({
    where: { userId, planId },
    orderBy: { weekN: "asc" },
    select: { weekN: true, topic: true, _count: { select: { parts: true } } },
  });
  return rows.map((r) => ({ weekN: r.weekN, topic: r.topic, parts: r._count.parts }));
}

export async function getParts(weekLessonId: string): Promise<Record<number, Study>> {
  const rows = await prisma.lessonPart.findMany({ where: { weekLessonId }, orderBy: { idx: "asc" } });
  return Object.fromEntries(rows.map((r) => [r.idx, r.content as Study]));
}

export async function getPart(weekLessonId: string, idx: number): Promise<Study | null> {
  const r = await prisma.lessonPart.findUnique({ where: { weekLessonId_idx: { weekLessonId, idx } } });
  return r ? (r.content as Study) : null;
}

/** Grava a parte se ainda não existe e devolve a que ficou salva (vale a primeira). */
export async function savePart(weekLessonId: string, idx: number, content: Study): Promise<Study> {
  await prisma.lessonPart.createMany({
    data: [{ weekLessonId, idx, content: json(content) }],
    skipDuplicates: true,
  });
  return (await getPart(weekLessonId, idx)) ?? content;
}

type ChatRow = { id: bigint; role: string; text: string; createdAt: Date; partIdx: number };

/** O id é BigInt no banco: vira texto aqui, antes de chegar a um JSON. */
const paraMensagem = (r: ChatRow): ChatMessage => ({
  id: String(r.id),
  role: r.role === "professor" ? "professor" : "aluno",
  text: r.text,
  createdAt: r.createdAt.toISOString(),
});

/** A conversa de uma parte, em ordem: as últimas `limite` mensagens. */
export async function chatHistory(
  userId: string,
  weekLessonId: string,
  partIdx: number,
  limite = 100,
): Promise<ChatMessage[]> {
  const rows = await prisma.lessonChat.findMany({
    where: { userId, weekLessonId, partIdx },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limite,
  });
  return rows.reverse().map(paraMensagem);
}

/** Todas as conversas da lição da semana, por parte. */
export async function chatsByPart(userId: string, weekLessonId: string): Promise<Record<number, ChatMessage[]>> {
  const rows = await prisma.lessonChat.findMany({
    where: { userId, weekLessonId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const porParte: Record<number, ChatMessage[]> = {};
  for (const r of rows) (porParte[r.partIdx] ??= []).push(paraMensagem(r));
  return porParte;
}

/** Grava a pergunta e a resposta juntas, depois que o professor respondeu. */
export async function addChatPair(a: {
  userId: string;
  weekLessonId: string;
  partIdx: number;
  question: string;
  answer: string;
}): Promise<ChatMessage[]> {
  const agora = Date.now();
  const linha = (role: ChatRole, text: string, ms: number) =>
    prisma.lessonChat.create({
      data: { userId: a.userId, weekLessonId: a.weekLessonId, partIdx: a.partIdx, role, text, createdAt: new Date(ms) },
    });
  // A resposta fica 1 ms depois da pergunta, para a ordem não depender do id.
  const rows = await prisma.$transaction([linha("aluno", a.question, agora), linha("professor", a.answer, agora + 1)]);
  return rows.map(paraMensagem);
}
