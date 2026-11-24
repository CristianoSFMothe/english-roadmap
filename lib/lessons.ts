import { pool } from "./db";
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

type Row = {
  id: string;
  lesson_date: Date | string;
  level: string;
  week_n: number | null;
  questions: Question[];
  study: Study | null;
  answers: Record<string, string>;
  results: Record<string, Result>;
  completed_at: Date | null;
};

const paraLesson = (r: Row): Lesson => ({
  id: r.id,
  date: typeof r.lesson_date === "string" ? r.lesson_date.slice(0, 10) : iso(r.lesson_date),
  level: r.level,
  weekN: r.week_n,
  questions: r.questions ?? [],
  study: r.study ?? null,
  answers: r.answers ?? {},
  results: r.results ?? {},
  completedAt: r.completed_at ? new Date(r.completed_at).toISOString() : null,
});

export async function getLesson(userId: string, date: string): Promise<Lesson | null> {
  const { rows } = await pool.query<Row>(
    `select id, lesson_date, level, week_n, questions, study, answers, results, completed_at
     from app_lesson where user_id = $1 and lesson_date = $2`,
    [userId, date],
  );
  return rows[0] ? paraLesson(rows[0]) : null;
}

export async function createLesson(args: {
  userId: string;
  date: string;
  level: string;
  weekN: number | null;
  questions: Question[];
  study: Study;
}): Promise<Lesson> {
  const id = `li-${args.userId.slice(0, 8)}-${args.date}`;
  const { rows } = await pool.query<Row>(
    `insert into app_lesson (id, user_id, lesson_date, level, week_n, questions, study)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (user_id, lesson_date) do update
       set questions = excluded.questions, study = excluded.study
     returning id, lesson_date, level, week_n, questions, study, answers, results, completed_at`,
    [
      id,
      args.userId,
      args.date,
      args.level,
      args.weekN,
      JSON.stringify(args.questions),
      JSON.stringify(args.study),
    ],
  );
  return paraLesson(rows[0]);
}

/** Assuntos (study.topic) das últimas lições, do mais novo para o mais antigo. */
export async function assuntosRecentes(userId: string, limite = 7): Promise<string[]> {
  const { rows } = await pool.query<{ topic: string | null }>(
    `select study->>'topic' as topic
     from app_lesson
     where user_id = $1 and study is not null
     order by lesson_date desc
     limit $2`,
    [userId, limite],
  );
  return rows.map((r) => (r.topic ?? "").trim()).filter(Boolean);
}

/** Lições abertas: criadas e não concluídas, da mais antiga para a mais nova. */
export async function pendentes(userId: string, limite = 14): Promise<Lesson[]> {
  const { rows } = await pool.query<Row>(
    `select id, lesson_date, level, week_n, questions, study, answers, results, completed_at
     from app_lesson
     where user_id = $1 and completed_at is null
     order by lesson_date asc
     limit $2`,
    [userId, limite],
  );
  return rows.map(paraLesson);
}

/** Últimos dias, para mostrar o que foi feito e o que ficou para trás. */
export async function historico(userId: string, dias = 7) {
  const { rows } = await pool.query<{
    lesson_date: Date | string;
    completed_at: Date | null;
    total: number;
    respondidas: number;
    acertos: number;
  }>(
    `select lesson_date, completed_at,
            jsonb_array_length(questions) as total,
            (select count(*) from jsonb_object_keys(results)) as respondidas,
            (select count(*) from jsonb_each(results) r where (r.value->>'correct')::boolean) as acertos
     from app_lesson
     where user_id = $1
     order by lesson_date desc
     limit $2`,
    [userId, dias],
  );
  return rows.map((r) => ({
    date: typeof r.lesson_date === "string" ? r.lesson_date.slice(0, 10) : iso(r.lesson_date),
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
  const { rows } = await pool.query<Row>(
    `update app_lesson
     set answers = answers || jsonb_build_object($3::text, $4::text),
         results = results || jsonb_build_object($3::text, $5::jsonb),
         completed_at = case
           when completed_at is not null then completed_at
           when (select count(*) from jsonb_object_keys(results || jsonb_build_object($3::text, $5::jsonb))) >= $6
             then now()
           else null
         end
     where user_id = $1 and id = $2
     returning id, lesson_date, level, week_n, questions, study, answers, results, completed_at`,
    [
      args.userId,
      args.lessonId,
      args.questionId,
      args.answer,
      JSON.stringify(args.result),
      args.totalQuestoes,
    ],
  );
  return rows[0] ? paraLesson(rows[0]) : null;
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
  const { rows } = await pool.query<Row>(
    `update app_lesson
     set results = jsonb_set(
           jsonb_set(results, array[$3::text, 'improvements'], $4::jsonb, true),
           array[$3::text, 'moreGenerated'], 'true'::jsonb, true)
     where user_id = $1 and id = $2 and results ? $3
       and coalesce((results->$3->>'moreGenerated')::boolean, false) = false
     returning id, lesson_date, level, week_n, questions, study, answers, results, completed_at`,
    [args.userId, args.lessonId, args.questionId, JSON.stringify(args.improvements)],
  );
  return rows[0] ? paraLesson(rows[0]) : null;
}

/** Frases que a pessoa errou nos últimos dias, para a IA cobrar de novo. */
export async function errosRecentes(userId: string, limite = 5): Promise<string[]> {
  const { rows } = await pool.query<{ tip: string | null; correction: string | null }>(
    `select r.value->>'tip' as tip, r.value->>'correction' as correction
     from app_lesson l, jsonb_each(l.results) r
     where l.user_id = $1 and (r.value->>'correct')::boolean is false
     order by l.lesson_date desc
     limit $2`,
    [userId, limite],
  );
  return rows
    .map((r) => (r.tip || r.correction || "").trim())
    .filter(Boolean);
}
