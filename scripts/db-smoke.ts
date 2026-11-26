/**
 * Teste de fumaça contra o banco de verdade (DATABASE_URL): cria um usuário de teste,
 * passa por todas as funções que falam com o banco e apaga tudo no fim.
 * Uso: npm run db:smoke
 */
import { auth } from "../lib/auth";
import { prisma } from "../lib/db";
import type { Question, Study } from "../lib/lesson-prompt";
import {
  assuntosRecentes,
  createLesson,
  errosRecentes,
  getLesson,
  historico,
  pendentes,
  saveAnswer,
  setImprovements,
  type Improvement,
  type Result,
} from "../lib/lessons";
import { getStoredPron, saveStoredPron } from "../lib/pron-store";
import { sampleProfile } from "../lib/profile";
import {
  googleGrant,
  loadUserData,
  loadVocab,
  recordCalendarExport,
  savePlan,
  saveProfile,
  saveProgress,
  saveVocab,
} from "../lib/server-data";
import { cleanWords, type MyWord } from "../lib/vocabulary";

let failures = 0;
async function check(name: string, fn: () => unknown | Promise<unknown>) {
  try {
    await fn();
    console.log("ok   -", name);
  } catch (e) {
    failures++;
    console.log("FALHA-", name, ":", e instanceof Error ? e.message : e);
  }
}
/** JSON com as chaves em ordem: o `jsonb` do Postgres não guarda a ordem das chaves. */
const canon = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(canon)
    : v && typeof v === "object" && !(v instanceof Date)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon((v as Record<string, unknown>)[k])]))
      : v;
const igual = (a: unknown, b: unknown, o: string) => {
  if (JSON.stringify(canon(a)) !== JSON.stringify(canon(b)))
    throw new Error(`${o}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);
};

const stamp = Date.now();
const id = `smoke-${stamp}`;
const email = `smoke-${stamp}@example.invalid`;
const pronKey = `smoke ${id}`;

const q1: Question = {
  id: "q1",
  difficulty: "facil",
  type: "tradução",
  prompt: "Traduza",
  content: "Eu sou do Brasil.",
  expected: "I am from Brazil.",
};
const estudo: Study = {
  topic: "Verbo to be",
  goal: "Dizer de onde você é.",
  explanation: ["O to be é ser ou estar."],
  examples: [{ en: "I am from Brazil.", pt: "Eu sou do Brasil." }],
  tips: [{ text: "Não esqueça o I." }],
};
const errado: Result = {
  correct: false,
  feedback: "Faltou o am.",
  correction: "I am from Brazil.",
  tip: "Use am com I.",
  improvements: [],
  withImprovements: true,
};
const m1: Improvement = { en: "I'm from Brazil.", why: "informal", style: "informal" };
const m2: Improvement = { en: "I come from Brazil.", why: "outra", style: "usual" };
const palavra: MyWord = { id: "w1", en: "hello", pt: "olá", kind: "palavra", createdAt: stamp };

async function main() {
  // Better Auth pelo adaptador Prisma: os campos têm que cair nas colunas certas.
  const ctx = await auth.$context;
  await check("Better Auth cria usuário, conta e sessão", async () => {
    const agora = new Date();
    await ctx.adapter.create({
      model: "user",
      data: { id, name: "Smoke", email, emailVerified: true, createdAt: agora, updatedAt: agora },
      forceAllowId: true,
    });
    await ctx.adapter.create({
      model: "account",
      data: {
        id: `${id}-acc`,
        accountId: "g-1",
        providerId: "google",
        userId: id,
        scope: "openid calendar.events",
        createdAt: agora,
        updatedAt: agora,
      },
      forceAllowId: true,
    });
    await ctx.adapter.create({
      model: "session",
      data: {
        id: `${id}-ses`,
        token: `${id}-token`,
        userId: id,
        expiresAt: new Date(stamp + 86_400_000),
        createdAt: agora,
        updatedAt: agora,
      },
      forceAllowId: true,
    });
    const achado = await ctx.adapter.findOne<{ email: string }>({
      model: "user",
      where: [{ field: "email", value: email }],
    });
    igual(achado?.email, email, "usuário pelo e-mail");
    const sessao = await ctx.internalAdapter.findSession(`${id}-token`);
    igual(sessao?.user.id, id, "sessão pelo token");
  });

  await check("googleGrant lê a conta", async () => {
    igual(await googleGrant(id), { connected: true, calendar: true, offline: false }, "grant");
  });

  await check("perfil, plano ativo e progresso", async () => {
    await saveProfile(id, sampleProfile);
    await savePlan(id, { id: `${id}-p1`, createdAt: stamp, profile: sampleProfile, weeks: [] });
    await savePlan(id, { id: `${id}-p2`, createdAt: stamp + 1, profile: sampleProfile, weeks: [] });
    await saveProgress(id, `${id}-p2`, { done: { a: true }, known: {}, notes: {}, currentWeek: 3 });
    await saveProgress(id, `${id}-p2`, { done: { a: true, b: true }, known: {}, notes: {}, currentWeek: 4 });
    const dados = await loadUserData(id);
    igual(dados.plan?.id, `${id}-p2`, "plano ativo");
    igual(dados.plan?.createdAt, stamp + 1, "createdAt do plano");
    igual(dados.progress[`${id}-p2`]?.currentWeek, 4, "semana");
    igual(dados.progress[`${id}-p2`]?.done, { a: true, b: true }, "dias feitos");
    igual(dados.profile, sampleProfile, "perfil");
    const ativos = await prisma.plan.count({ where: { userId: id, isActive: true } });
    igual(ativos, 1, "só um plano ativo");
  });

  let lessonId = "";
  await check("lição do dia volta com a mesma data", async () => {
    const l = await createLesson({ userId: id, date: "2026-11-25", level: "A1", weekN: 1, questions: [q1], study: estudo });
    lessonId = l.id;
    igual(l.date, "2026-11-25", "data no create");
    igual((await getLesson(id, "2026-11-25"))?.date, "2026-11-25", "data no get");
    igual(await getLesson(id, "2026-11-24"), null, "dia anterior vazio");
    igual(await assuntosRecentes(id), ["Verbo to be"], "assuntos");
    igual((await pendentes(id)).map((x) => x.date), ["2026-11-25"], "pendente antes de responder");
  });

  await check("resposta errada conclui a lição e entra nos erros", async () => {
    const depois = await saveAnswer({
      userId: id,
      lessonId,
      questionId: "q1",
      answer: "I is from Brazil.",
      result: errado,
      totalQuestoes: 1,
    });
    if (!depois?.completedAt) throw new Error("devia concluir");
    const lida = await getLesson(id, "2026-11-25");
    igual(lida?.answers.q1, "I is from Brazil.", "resposta");
    igual(lida?.results.q1?.correct, false, "resultado");
    igual(await errosRecentes(id), ["Use am com I."], "erros");
    igual(await historico(id), [{ date: "2026-11-25", completed: true, total: 1, answered: 1, correct: 0 }], "histórico");
    igual(await pendentes(id), [], "sem pendentes");
  });

  await check("Gerar 3 respostas só grava uma vez", async () => {
    const primeira = await setImprovements({ userId: id, lessonId, questionId: "q1", improvements: [m1] });
    const segunda = await setImprovements({ userId: id, lessonId, questionId: "q1", improvements: [m2] });
    if (!primeira) throw new Error("a primeira devia gravar");
    igual(segunda, null, "a segunda devia ser recusada");
    const lida = await getLesson(id, "2026-11-25");
    igual(lida?.results.q1?.improvements, [m1], "continua a primeira");
    igual(lida?.results.q1?.moreGenerated, true, "marcada como usada");
  });

  await check("vocabulário", async () => {
    await saveVocab(id, [palavra]);
    // cleanWords completa os campos opcionais (learned: false).
    igual(await loadVocab(id), cleanWords([palavra]), "lista");
  });

  await check("pronúncia compartilhada não sobrescreve", async () => {
    await saveStoredPron({ [pronKey]: "smôuk" });
    await saveStoredPron({ [pronKey]: "outra" });
    igual(await getStoredPron([pronKey]), { [pronKey]: "smôuk" }, "pronúncia");
  });

  await check("exportação para a agenda guarda a data certa", async () => {
    await recordCalendarExport({
      userId: id,
      planId: `${id}-p2`,
      calendarId: "c",
      calendarName: "n",
      eventCount: 2,
      startDate: "2026-11-30",
    });
    const e = await prisma.calendarExport.findFirst({ where: { userId: id } });
    igual(e?.startDate.toISOString().slice(0, 10), "2026-11-30", "start_date");
  });

  await check("apagar o usuário apaga tudo dele", async () => {
    await prisma.user.delete({ where: { id } });
    const restos = await Promise.all([
      prisma.lesson.count({ where: { userId: id } }),
      prisma.profile.count({ where: { userId: id } }),
      prisma.plan.count({ where: { userId: id } }),
      prisma.progress.count({ where: { userId: id } }),
      prisma.vocab.count({ where: { userId: id } }),
      prisma.calendarExport.count({ where: { userId: id } }),
      prisma.account.count({ where: { userId: id } }),
      prisma.session.count({ where: { userId: id } }),
    ]);
    igual(restos, [0, 0, 0, 0, 0, 0, 0, 0], "linhas que sobraram");
  });
}

main()
  .catch((e) => {
    failures++;
    console.log("FALHA- erro inesperado:", e instanceof Error ? e.message : e);
  })
  .finally(async () => {
    // Limpeza mesmo se algo falhou no meio.
    await prisma.user.deleteMany({ where: { id } }).catch(() => null);
    await prisma.pron.deleteMany({ where: { text: pronKey } }).catch(() => null);
    await prisma.$disconnect();
    console.log(failures === 0 ? "\nFumaça: tudo certo." : `\nFumaça: ${failures} falha(s).`);
    process.exit(failures === 0 ? 0 : 1);
  });
