import { prisma } from "./db";
import { Prisma } from "./generated/prisma/client";
import type { Question, Study } from "./lesson-prompt";

export type ImprovementStyle = "informal" | "formal" | "usual";

/**
 * Outro jeito de responder: a frase em inglês, a dica (em português) de quando usar e o
 * estilo. As correções antigas não têm estilo.
 */
export type Improvement = { en: string; why: string; style?: ImprovementStyle };

export type Result = {
  correct: boolean;
  feedback: string;
  correction: string;
  tip: string;
  /** Até 3 jeitos de melhorar a resposta; vazio nas correções antigas. */
  improvements: Improvement[];
  /** Já usou o "Gerar 3 respostas" (só vale uma vez por questão). */
  moreGenerated?: boolean;
  /**
   * Corrigida no formato que já traz melhorias. Sem isso (correção antiga), melhorias
   * que existirem vieram do botão, de antes de ele ganhar a trava.
   */
  withImprovements?: boolean;
};

export type Lesson = {
  id: string;
  date: string;
  level: string;
  weekN: number | null;
  questions: Question[];
  /** Teoria e dicas; null nas lições criadas antes do Estudo do dia. */
  study: Study | null;
  answers: Record<string, string>;
  results: Record<string, Result>;
  completedAt: string | null;
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Data de hoje no fuso de São Paulo, que é onde o estudo acontece. */
export function hojeSaoPaulo(): string {
  const agora = new Date();
  const saoPaulo = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return iso(saoPaulo);
}

/** Uma lição como vem do Prisma Client (ou de um `$queryRaw` já convertido). */
type LessonRecord = {
  id: string;
  lessonDate: Date;
  level: string;
  weekN: number | null;
  questions: unknown;
  study: unknown;
  answers: unknown;
  results: unknown;
  completedAt: Date | null;
};

/** Linha de `app_lesson` devolvida pelo SQL escrito à mão (`returning`). */
type RawRow = {
  id: string;
  lesson_date: Date;
  level: string;
  week_n: number | null;
  questions: unknown;
  study: unknown;
  answers: unknown;
  results: unknown;
  completed_at: Date | null;
};

const doRaw = (r: RawRow): LessonRecord => ({
  id: r.id,
  lessonDate: r.lesson_date,
  level: r.level,
  weekN: r.week_n,
  questions: r.questions,
  study: r.study,
  answers: r.answers,
  results: r.results,
  completedAt: r.completed_at,
});

/**
 * Coluna `date`: o Prisma devolve meia-noite UTC. Ler com getters locais daria o dia
 * anterior em São Paulo, por isso a data sai do ISO.
 */
const dataIso = (d: Date) => d.toISOString().slice(0, 10);
const paraData = (iso: string) => new Date(`${iso}T00:00:00Z`);

const paraLesson = (r: LessonRecord): Lesson => ({
  id: r.id,
  date: dataIso(r.lessonDate),
  level: r.level,
  weekN: r.weekN,
  questions: (r.questions as Question[]) ?? [],
  study: (r.study as Study | null) ?? null,
  answers: (r.answers as Record<string, string>) ?? {},
  results: (r.results as Record<string, Result>) ?? {},
  completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
});

const json = (v: unknown) => v as Prisma.InputJsonValue;

export async function getLesson(userId: string, date: string): Promise<Lesson | null> {
  const r = await prisma.lesson.findUnique({
    where: { userId_lessonDate: { userId, lessonDate: paraData(date) } },
  });
  return r ? paraLesson(r) : null;
}

export async function createLesson(args: {
  userId: string;
  date: string;
  level: string;
  weekN: number | null;
  questions: Question[];
  study: Study;
}): Promise<Lesson> {
  const r = await prisma.lesson.upsert({
    where: { userId_lessonDate: { userId: args.userId, lessonDate: paraData(args.date) } },
    create: {
      id: `li-${args.userId.slice(0, 8)}-${args.date}`,
      userId: args.userId,
      lessonDate: paraData(args.date),
      level: args.level,
      weekN: args.weekN,
      questions: json(args.questions),
      study: json(args.study),
    },
    update: { questions: json(args.questions), study: json(args.study) },
  });
  return paraLesson(r);
}

/** Assuntos (study.topic) das últimas lições, do mais novo para o mais antigo. */
export async function assuntosRecentes(userId: string, limite = 7): Promise<string[]> {
  const rows = await prisma.lesson.findMany({
    where: { userId, NOT: { study: { equals: Prisma.DbNull } } },
    orderBy: { lessonDate: "desc" },
    take: limite,
    select: { study: true },
  });
  return rows
    .map((r) => String((r.study as { topic?: unknown } | null)?.topic ?? "").trim())
    .filter(Boolean);
}

/** Lições abertas: criadas e não concluídas, da mais antiga para a mais nova. */
export async function pendentes(userId: string, limite = 14): Promise<Lesson[]> {
  const rows = await prisma.lesson.findMany({
    where: { userId, completedAt: null },
    orderBy: { lessonDate: "asc" },
    take: limite,
  });
  return rows.map(paraLesson);
}

/** Últimos dias, para mostrar o que foi feito e o que ficou para trás. */
export async function historico(userId: string, dias = 7) {
  const rows = await prisma.$queryRaw<
    {
      lesson_date: Date;
      completed_at: Date | null;
      total: number;
      respondidas: bigint;
      acertos: bigint;
    }[]
  >`select lesson_date, completed_at,
           jsonb_array_length(questions) as total,
           (select count(*) from jsonb_object_keys(results)) as respondidas,
           (select count(*) from jsonb_each(results) r where (r.value->>'correct')::boolean) as acertos
    from app_lesson
    where user_id = ${userId}
    order by lesson_date desc
    limit ${dias}`;
  return rows.map((r) => ({
    date: dataIso(r.lesson_date),
    completed: Boolean(r.completed_at),
    total: Number(r.total ?? 0),
    answered: Number(r.respondidas ?? 0),
    correct: Number(r.acertos ?? 0),
  }));
}

export async function saveAnswer(args: {
  userId: string;
  lessonId: string;
  questionId: string;
  answer: string;
  result: Result;
  totalQuestoes: number;
}): Promise<Lesson | null> {
  const result = JSON.stringify(args.result);
  // Tudo num update só: a resposta, o resultado e a conclusão, sem corrida entre abas.
  const rows = await prisma.$queryRaw<RawRow[]>`
    update app_lesson
    set answers = answers || jsonb_build_object(${args.questionId}::text, ${args.answer}::text),
        results = results || jsonb_build_object(${args.questionId}::text, ${result}::jsonb),
        completed_at = case
          when completed_at is not null then completed_at
          when (select count(*) from jsonb_object_keys(results || jsonb_build_object(${args.questionId}::text, ${result}::jsonb))) >= ${args.totalQuestoes}
            then now()
          else null
        end
    where user_id = ${args.userId} and id = ${args.lessonId}
    returning id, lesson_date, level, week_n, questions, study, answers, results, completed_at`;
  return rows[0] ? paraLesson(doRaw(rows[0])) : null;
}

/**
 * Troca a lista de outras respostas de uma questão já corrigida e marca que o
 * "Gerar 3 respostas" já foi usado. Só grava se ainda não tinha sido usado.
 */
export async function setImprovements(args: {
  userId: string;
  lessonId: string;
  questionId: string;
  improvements: Improvement[];
}): Promise<Lesson | null> {
  const rows = await prisma.$queryRaw<RawRow[]>`
    update app_lesson
    set results = jsonb_set(
          jsonb_set(results, array[${args.questionId}::text, 'improvements'], ${JSON.stringify(args.improvements)}::jsonb, true),
          array[${args.questionId}::text, 'moreGenerated'], 'true'::jsonb, true)
    where user_id = ${args.userId} and id = ${args.lessonId} and results ? ${args.questionId}::text
      and coalesce((results->${args.questionId}::text->>'moreGenerated')::boolean, false) = false
    returning id, lesson_date, level, week_n, questions, study, answers, results, completed_at`;
  return rows[0] ? paraLesson(doRaw(rows[0])) : null;
}

/** Frases que a pessoa errou nos últimos dias, para a IA cobrar de novo. */
export async function errosRecentes(userId: string, limite = 5): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ tip: string | null; correction: string | null }[]>`
    select r.value->>'tip' as tip, r.value->>'correction' as correction
    from app_lesson l, jsonb_each(l.results) r
    where l.user_id = ${userId} and (r.value->>'correct')::boolean is false
    order by l.lesson_date desc
    limit ${limite}`;
  return rows.map((r) => (r.tip || r.correction || "").trim()).filter(Boolean);
}
