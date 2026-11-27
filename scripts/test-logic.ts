import { extractJson, normalizeOutline, normalizeWeek } from "../lib/normalize.ts";
import { buildWeeks } from "../lib/weeks.ts";
import { systemPrompt, outlineMessage, weekMessage } from "../lib/prompt.ts";
import { sampleProfile, clampProfile } from "../lib/profile.ts";
import { numberToWords, cleanWords, CATEGORIES } from "../lib/vocabulary.ts";
import { readFileSync, readdirSync } from "node:fs";
import type { RawWeek } from "../lib/weeks.ts";
import { VERBS, thirdPerson, findVerb, ingForm, ptGerund, ptConditional, buildTense, TENSES, statNotice, buildExamples, shortAnswers } from "../lib/verbs.ts";
import { sayPhrase, pronKey, pronounce, PRON_STYLE, PRON_EXAMPLES } from "../lib/pronunciation.ts";
import { isDailyQuota, nextModel } from "../lib/gemini-errors.ts";
import { describeDbError, poolOptions } from "../lib/db-config.ts";
import { canGenerateMore, looksEnglish, MAX_IMPROVEMENTS, MAX_PARAGRAFOS, mergeImprovements, normalizeAnswer, normalizeImprovements, normalizeLessonOutline, normalizeQuestions, normalizeResult, normalizeStudy } from "../lib/lesson-normalize.ts";
import { weekRequest } from "../lib/licoes-client.ts";
import { startPlanPull } from "../lib/plan-pull.ts";
import { appendChat, CHAT_CONTEXT, generateStep, hasMoreHistory, HISTORY_PAGE, isReadOnlyLesson, todayInSaoPaulo, outlineDays, parseDateParam, parseWeekParam, partIndexForDate, validateQuestion } from "../lib/lesson-parts.ts";
import { normalizePronMap, pronBatches, pronSystemPrompt, pronUserPrompt, shouldStoreShared, splitGeneratable } from "../lib/pron-prompt.ts";
import { gradeSystemPrompt, improveSystemPrompt, improveUserPrompt, lessonSystemPrompt, ORDEM, STUDY_LIMITS, TOTAL_QUESTOES, outlineUserPrompt, partSystemPrompt, partUserPrompt, partAndQuestionsUserPrompt, questionsUserPrompt, chatSystemPrompt, chatUserPrompt, CHAT_CONTEXT_PROMPT } from "../lib/lesson-prompt.ts";
import type { Study } from "../lib/lesson-prompt.ts";
import type { LessonOutline } from "../lib/lesson-parts.ts";

let failures = 0;
const check = (name: string, fn: () => void) => {
  try {
    fn();
    console.log("ok   -", name);
  } catch (e) {
    failures++;
    console.log("FALHA-", name, ":", e instanceof Error ? e.message : e);
  }
};

const p = clampProfile({
  ...sampleProfile,
  profession: "Enfermeira",
  weeks: 2,
  daysPerWeek: 5,
  minutesPerDay: 20,
});

check("prompt do sistema cita nivel, alvo e interesses", () => {
  const s = systemPrompt(p);
  if (!s.includes("A1") || !s.includes("B1")) throw new Error("niveis ausentes");
  if (!s.includes("Enfermeira")) throw new Error("profissao ausente");
  if (!s.includes("linguagem pesada")) throw new Error("restricao ausente");
  if (!outlineMessage(p).includes("2 semanas")) throw new Error("contagem de semanas errada");
});

check("esboco com cercas de codigo e texto em volta", () => {
  const resposta = 'Claro! Aqui está:\n```json\n[{"n":1,"theme":"Hello there","subtitle":"s","why":"w","grammarTopic":"to be","milestone":"m"},{"n":2,"theme":"My day","subtitle":"s","why":"w","grammarTopic":"present simple","milestone":"m"}]\n```';
  const out = normalizeOutline(extractJson(resposta), 2);
  if (out.length !== 2) throw new Error("deveria ter 2 itens");
  if (out[1].n !== 2) throw new Error("numeracao errada");
});

check("semana completa vira Week utilizavel", () => {
  const bruta = JSON.stringify({
    n: 1,
    theme: "Hello there",
    subtitle: "Apresentar-se",
    why: "porque sim",
    grammar: { topic: "to be", why: "x", examples: ["I am a tester.", "She works here."], tip: "cuidado" },
    vocab: [{ group: "Apresentação", items: "my name is=meu nome é; I work at=eu trabalho na" }],
    resources: [
      { name: "BBC", url: "https://www.bbc.co.uk/learningenglish", what: "ouvir" },
      { name: "Inventado", url: "nao-e-url", what: "deve sumir" },
    ],
    content: [{ name: "Friends", kind: "Série", what: "uma cena" }],
    milestone: "falar 45s",
    days: [{ label: "Seg", focus: "Fala", minutes: 20, tasks: [{ what: "shadowing", resource: "BBC", min: 20 }], speak: "Hi!", mini: "cartões" }],
  });
  const w = normalizeWeek(extractJson(bruta), 1, 5, 20);
  if (w.resources.length !== 1) throw new Error("url invalida deveria ser descartada");
  if (w.days.length !== 5) throw new Error("deveria completar ate 5 dias, veio " + w.days.length);
  const [built] = buildWeeks([w]);
  if (built.cards.length !== 2) throw new Error("vocabulario nao virou cartoes");
  if (built.cards[0].en !== "my name is" || built.cards[0].pt !== "meu nome é") throw new Error("par en=pt errado");
});

check("vocabulario em formato de objeto tambem funciona", () => {
  const bruta = {
    theme: "T",
    grammar: { topic: "g", examples: [] },
    vocab: [{ group: "G", items: [{ en: "cat", pt: "gato" }, { en: "dog", pt: "cachorro" }] }],
    days: [{ label: "Seg", focus: "f", minutes: 15, tasks: [{ what: "x", resource: "y", min: 15 }] }],
  };
  const w = normalizeWeek(bruta, 3, 1, 15);
  const [built] = buildWeeks([w]);
  if (built.cards.length !== 2) throw new Error("esperava 2 cartoes");
  if (w.grammar.examples.length === 0) throw new Error("exemplos vazios deveriam receber placeholder");
});

check("semana sem vocabulario e recusada", () => {
  let threw = false;
  try { normalizeWeek({ theme: "x", vocab: [], days: [] }, 1, 5, 20); } catch { threw = true; }
  if (!threw) throw new Error("deveria lancar erro");
});

check("mensagem da semana carrega minutos e dias do perfil", () => {
  const m = weekMessage(p, { n: 1, theme: "T", subtitle: "s", why: "w", grammarTopic: "g", milestone: "m" }, ["1. T"]);
  if (!m.includes("5 dias de estudo")) throw new Error("dias por semana ausente");
  if (!m.includes("20 minutos")) throw new Error("minutos ausentes");
});

check("numeros por extenso de 0 a 1 milhao", () => {
  const casos: [number, string][] = [
    [0, "zero"],
    [7, "seven"],
    [15, "fifteen"],
    [21, "twenty-one"],
    [90, "ninety"],
    [100, "one hundred"],
    [101, "one hundred one"],
    [999, "nine hundred ninety-nine"],
    [1000, "one thousand"],
    [2026, "two thousand twenty-six"],
    [10010, "ten thousand ten"],
    [999999, "nine hundred ninety-nine thousand nine hundred ninety-nine"],
    [1000000, "one million"],
  ];
  for (const [n, esperado] of casos) {
    const obtido = numberToWords(n);
    if (obtido !== esperado) throw new Error(`${n}: "${obtido}" em vez de "${esperado}"`);
  }
  if (numberToWords(-1) || numberToWords(1000001) || numberToWords(1.5))
    throw new Error("aceitou numero fora da faixa");
});

const licaoBruta = (n: number) =>
  JSON.stringify(
    Array.from({ length: n }, (_, i) => ({
      id: "x",
      difficulty: ["fácil", "facil", "média", "media", "difícil"][i] ?? "media",
      type: "tradução",
      prompt: `Traduza a frase ${i + 1}`,
      content: `frase ${i + 1}`,
      expected: `sentence ${i + 1}`,
    })),
  );

check("licao com 5 questoes, ids e dificuldades normalizadas", () => {
  const qs = normalizeQuestions(extractJson("Segue a lição:\n```json\n" + licaoBruta(5) + "\n```"), ORDEM);
  if (qs.length !== TOTAL_QUESTOES) throw new Error("deveria ter 5 questoes");
  if (qs[0].id !== "q1" || qs[4].id !== "q5") throw new Error("ids fora de ordem");
  const mix = qs.map((q) => q.difficulty).join(",");
  if (mix !== "facil,facil,media,media,dificil") throw new Error("mix errado: " + mix);
});

check("licao incompleta e recusada", () => {
  let threw = false;
  try { normalizeQuestions(extractJson(licaoBruta(3)), ORDEM); } catch { threw = true; }
  if (!threw) throw new Error("deveria lancar erro");
});

check("correcao em portugues ou ingles vira Result", () => {
  const r = normalizeResult(extractJson('{"correct": false, "feedback": "Faltou o auxiliar.", "correction": "Do you like it?", "tip": "Use do em perguntas."}'));
  if (r.correct) throw new Error("deveria ser incorreto");
  if (!r.correction.startsWith("Do you")) throw new Error("correcao perdida");
  const pt = normalizeResult(extractJson('{"correto": true, "comentario": "Boa.", "correcao": "I work as a QA.", "dica": ""}'));
  if (!pt.correct || !pt.feedback) throw new Error("campos em portugues ignorados");
});

check("prompt da licao pede 5 questoes e cita o tema da semana", () => {
  const s = lessonSystemPrompt(p);
  if (!s.includes("A1")) throw new Error("nivel ausente");
  if (!s.includes("ESCREVENDO")) throw new Error("regra de escrita ausente");
});


check("verbos: terceira pessoa segue a ortografia", () => {
  const casos: [string, string][] = [["work","works"],["watch","watches"],["go","goes"],["study","studies"],["say","says"],["do","does"],["fix","fixes"],["buy","buys"],["try","tries"]];
  for (const [b, e] of casos) if (thirdPerson(b) !== e) throw new Error(`${b}: ${thirdPerson(b)}`);
});

check("verbos: tabela do work", () => {
  const work = findVerb("work");
  const he = work.table[2];
  if (he.present.en !== "He works" || he.present.pt !== "ele trabalha") throw new Error("presente: " + JSON.stringify(he.present));
  if (he.past.en !== "He worked" || he.past.pt !== "ele trabalhou") throw new Error("passado");
  if (he.future.en !== "He will work" || he.future.pt !== "ele vai trabalhar") throw new Error("futuro: " + he.future.pt);
  if (he.negative.en !== "He does not work" || he.negative.pt !== "ele não trabalha") throw new Error("negativa");
  if (he.short.join("|") !== "He doesn't work|He didn't work|He'll work|He won't work") throw new Error("contracoes: " + he.short.join("|"));
  const i = work.table[0];
  if (i.present.en !== "I work" || i.future.pt !== "eu vou trabalhar" || i.negative.en !== "I do not work") throw new Error("I");
  if (he.question.en !== "Does he work?" || he.question.pt !== "ele trabalha?") throw new Error("pergunta: " + JSON.stringify(he.question));
  if (work.table[1].question.en !== "Do you work?") throw new Error("pergunta you");
  if (he.present.say !== "rrí uârks" || he.past.say !== "rrí uârkt") throw new Error("pronuncia: " + he.present.say + " / " + he.past.say);
  if (he.question.say !== "dâz rrí uârk?" || he.negative.say !== "rrí dâz nót uârk") throw new Error("pronuncia pergunta/negativa");
  if (he.shortSay.join("|") !== "rrí dâ-zent uârk|rrí dí-dent uârk|rríl uârk|rrí uôunt uârk") throw new Error("pronuncia contracoes: " + he.shortSay.join("|"));
  const read = findVerb("read").table[0];
  if (read.present.say !== "ái ríd" || read.past.say !== "ái réd") throw new Error("read presente x passado");
});

check("verbos: to be e o padrao, I am = eu sou / eu estou", () => {
  if (VERBS[0].id !== "be") throw new Error("to be nao e o primeiro");
  const r = VERBS[0].table[0];
  if (r.present.en !== "I am" || r.present.pt !== "eu sou / eu estou") throw new Error(JSON.stringify(r.present));
  if (r.short[0] !== "I'm" || r.short[1] !== "I'm not") throw new Error("contracoes do be");
  if (VERBS[0].table[1].past.en !== "You were") throw new Error("you were");
  if (r.question.en !== "Am I?" || r.question.pt !== "eu sou? / eu estou?") throw new Error("pergunta do be: " + JSON.stringify(r.question));
  if (VERBS[0].table[2].question.en !== "Is he?") throw new Error("is he?");
  if (r.present.say !== "ái ém" || r.question.say !== "ém ái?" || r.shortSay[0] !== "áim") throw new Error("pronuncia do be");
  if (findVerb("nao-existe").id !== "be") throw new Error("fallback");
});

check("verbos: 40 verbos completos e sem repeticao", () => {
  if (VERBS.length !== 40) throw new Error(`${VERBS.length} verbos`);
  if (new Set(VERBS.map((v) => v.id)).size !== 40) throw new Error("id repetido");
  for (const v of VERBS) {
    if (v.table.length !== 7) throw new Error(v.id + ": tabela");
    for (const r of v.table) if (!r.question?.en.endsWith("?") || !r.question.pt.endsWith("?")) throw new Error(v.id + ": pergunta");
    for (const r of v.table) {
      const says = [r.present, r.past, r.future, r.negative, r.question].map((x) => x.say ?? "").concat(r.shortSay);
      if (r.shortSay.length !== r.short.length || says.some((x) => !x.trim() || /undefined|\(/.test(x))) throw new Error(v.id + ": pronuncia " + r.person);
    }
    for (const [nome, lista] of Object.entries({ frases: v.phrases, perguntas: v.questions, palavras: v.words, conversa: v.conversation })) {
      if (lista.length < 2) throw new Error(`${v.id}: ${nome} vazia`);
      const ens = lista.map((l) => l.en);
      if (new Set(ens).size !== ens.length) throw new Error(`${v.id}: ${nome} repetida`);
      for (const l of lista) if (!l.en.trim() || !l.pt.trim()) throw new Error(`${v.id}: linha vazia em ${nome}`);
    }
  }
  const go = findVerb("go");
  if (go.table[3].present.en !== "She goes" || go.table[0].past.en !== "I went") throw new Error("go");
});

check("pronuncia: frases dos verbos", () => {
  if (sayPhrase("I live in São Paulo.") !== "ái lív ín sáun páu-lu.") throw new Error(String(sayPhrase("I live in São Paulo.")));
  if (sayPhrase("B: Are you ready?") !== "ár iú ré-di?") throw new Error("prefixo B: " + sayPhrase("B: Are you ready?"));
  if (!sayPhrase("I read a good book last month.")?.includes("réd")) throw new Error("read no passado");
  if (!sayPhrase("Can you read this for me?")?.includes("ríd")) throw new Error("read no presente");
  if (sayPhrase("palavrainexistente") !== undefined) throw new Error("palavra desconhecida devia dar undefined");
  const faltam: string[] = [];
  for (const v of VERBS)
    for (const k of ["phrases", "questions", "words", "conversation"] as const)
      for (const l of v[k]) if (!sayPhrase(l.en)) faltam.push(l.en);
  if (faltam.length) throw new Error(`${faltam.length} sem pronuncia, ex.: ${faltam.slice(0, 3).join(" | ")}`);
});

check("tempos: forma -ing", () => {
  const casos: [string, string][] = [["work","working"],["make","making"],["get","getting"],["put","putting"],["see","seeing"],["study","studying"],["use","using"],["come","coming"],["leave","leaving"],["call","calling"],["eat","eating"],["start","starting"],["be","being"],["go","going"],["read","reading"]];
  for (const [b, e] of casos) if (ingForm(b) !== e) throw new Error(`${b}: ${ingForm(b)}`);
});

check("tempos: portugues por regra", () => {
  const ger: [string, string][] = [["trabalhar","trabalhando"],["comer","comendo"],["ir","indo"],["pôr","pondo"],["sair","saindo"]];
  for (const [i, e] of ger) if (ptGerund(i) !== e) throw new Error(`${i}: ${ptGerund(i)}`);
  const cond: [string, string][] = [["trabalhar","trabalharia|trabalharia|trabalharíamos|trabalhariam"],["fazer","faria|faria|faríamos|fariam"],["dizer","diria|diria|diríamos|diriam"],["ser","seria|seria|seríamos|seriam"]];
  for (const [i, e] of cond) if (ptConditional(i).join("|") !== e) throw new Error(`${i}: ${ptConditional(i).join("|")}`);
});

check("tempos: work em cada tempo", () => {
  const work = findVerb("work");
  const pc = buildTense(work, "presentContinuous")!;
  const he = pc[2];
  if (he.affirmative.en !== "He is working" || he.affirmative.pt !== "ele está trabalhando" || he.affirmative.say !== "rrí íz uâr-king") throw new Error("pc: " + JSON.stringify(he.affirmative));
  if (he.negative.en !== "He is not working" || he.negative.pt !== "ele não está trabalhando") throw new Error("pc neg");
  if (he.question.en !== "Is he working?" || he.question.pt !== "ele está trabalhando?" || he.question.say !== "íz rrí uâr-king?") throw new Error("pc q");
  if (he.short.join("|") !== "He's working|He isn't working") throw new Error("pc short: " + he.short.join("|"));
  if (pc[0].short.join("|") !== "I'm working|I'm not working") throw new Error("pc short I");
  const pp = buildTense(work, "pastContinuous")!;
  if (pp[5].affirmative.en !== "We were working" || pp[5].affirmative.pt !== "nós estávamos trabalhando") throw new Error("past cont");
  if (pp[0].question.en !== "Was I working?") throw new Error("past cont q");
  const gt = buildTense(work, "goingTo")!;
  if (gt[0].affirmative.en !== "I am going to work" || gt[0].affirmative.pt !== "eu vou trabalhar" || gt[0].short[0] !== "I'm going to work") throw new Error("going to");
  if (gt[1].question.en !== "Are you going to work?" || gt[1].question.pt !== "você vai trabalhar?") throw new Error("going to q");
  const pf = buildTense(work, "presentPerfect")!;
  const she = pf[3];
  if (she.affirmative.en !== "She has worked" || she.affirmative.pt !== "ela já trabalhou") throw new Error("perfect: " + JSON.stringify(she.affirmative));
  if (she.negative.en !== "She has not worked" || she.negative.pt !== "ela ainda não trabalhou") throw new Error("perfect neg");
  if (she.question.en !== "Has she worked?" || she.question.pt !== "ela já trabalhou?") throw new Error("perfect q");
  if (she.short.join("|") !== "She's worked|She hasn't worked") throw new Error("perfect short");
  if (pf[0].short.join("|") !== "I've worked|I haven't worked") throw new Error("perfect short I");
  const wd = buildTense(work, "would")!;
  if (wd[6].affirmative.en !== "They would work" || wd[6].affirmative.pt !== "eles trabalhariam") throw new Error("would");
  if (wd[1].question.en !== "Would you work?" || wd[0].short.join("|") !== "I'd work|I wouldn't work") throw new Error("would q/short");
  if (buildTense(findVerb("make"), "would")![0].affirmative.pt !== "eu faria") throw new Error("faria");
  if (buildTense(findVerb("go"), "presentPerfect")![0].affirmative.en !== "I have gone") throw new Error("gone");
});

check("tempos: to be e verbos de estado", () => {
  const be = findVerb("be");
  if (buildTense(be, "goingTo")![0].affirmative.pt !== "eu vou ser / eu vou estar") throw new Error("be going to");
  const pf = buildTense(be, "presentPerfect")![0];
  if (pf.affirmative.en !== "I have been" || pf.affirmative.pt !== "eu já fui / eu já estive") throw new Error("be perfect: " + JSON.stringify(pf.affirmative));
  if (buildTense(be, "would")![0].affirmative.pt !== "eu seria / eu estaria") throw new Error("be would");
  for (const id of ["be","know","want","need","like","understand","see","have"]) {
    if (buildTense(findVerb(id), "presentContinuous") !== null || buildTense(findVerb(id), "pastContinuous") !== null) throw new Error(id + " no continuo");
    if (!statNotice(findVerb(id), "presentContinuous").includes(findVerb(id).table[0].present.en)) throw new Error(id + ": aviso");
  }
  if (!statNotice(findVerb("have"), "presentContinuous").includes("having lunch")) throw new Error("have: excecao");
  for (const id of ["think","feel","work"]) if (!buildTense(findVerb(id), "presentContinuous")) throw new Error(id + " devia ter continuo");
});

check("tempos: todo verbo em todo tempo completo", () => {
  if (TENSES[0].id !== "basic" || TENSES.length !== 6) throw new Error("TENSES");
  for (const v of VERBS)
    for (const t of TENSES) {
      if (t.id === "basic") continue;
      const rows = buildTense(v, t.id);
      if (!rows) continue;
      if (rows.length !== 7) throw new Error(`${v.id} ${t.id}: linhas`);
      for (const r of rows) {
        const ls = [r.affirmative, r.negative, r.question];
        const txt = ls.flatMap((l) => [l.en, l.pt, l.say ?? ""]).concat(r.short, r.shortSay);
        if (r.short.length !== r.shortSay.length || txt.some((x) => !x.trim() || /undefined/.test(x))) throw new Error(`${v.id} ${t.id} ${r.person}`);
      }
    }
});

check("exemplos do basico: presente, passado e futuro completos", () => {
  const work = findVerb("work");
  const b = buildExamples(work, "basic");
  if (b.length !== 3 || b[1].negative.en !== "I did not work" || b[1].question.en !== "Did you work?") throw new Error(JSON.stringify(b[1]));
  if (b[2].negative.en !== "I will not work") throw new Error("futuro");
  const go = buildExamples(findVerb("go"), "basic");
  if (go[1].affirmative.en !== "I went" || go[1].negative.en !== "I did not go") throw new Error("irregular");
  const be = buildExamples(findVerb("be"), "basic");
  if (be[1].negative.en !== "I was not" || be[1].question.en !== "Were you?" || be[2].negative.en !== "I will not be") throw new Error("to be");
});

check("exemplos de verbo de estado no continuo usam work", () => {
  const [b] = buildExamples(findVerb("know"), "presentContinuous");
  if (!b.affirmative.en.includes("working")) throw new Error(b.affirmative.en);
});

check("respostas curtas", () => {
  const w = shortAnswers(findVerb("work"), "basic").map((l) => l.en);
  if (!w.includes("Yes, I do.") || !w.includes("No, I didn't.") || w.length !== 6) throw new Error(w.join(" | "));
  if (!shortAnswers(findVerb("be"), "basic").some((l) => l.en === "Yes, I am.")) throw new Error("to be");
  if (shortAnswers(findVerb("work"), "presentPerfect")[1].en !== "No, I haven't.") throw new Error("perfect");
});

check("exemplos e respostas completos em todo verbo e tempo", () => {
  for (const v of VERBS)
    for (const t of TENSES) {
      const ls = [...buildExamples(v, t.id).flatMap((b) => [b.affirmative, b.negative, b.question]), ...shortAnswers(v, t.id)];
      const ruim = ls.find((l) => [l.en, l.pt, l.say ?? ""].some((x) => !x.trim() || /undefined/.test(x)));
      if (ruim) throw new Error(`${v.id} ${t.id}: ${JSON.stringify(ruim)}`);
    }
});

check("todo tempo tem explicacao completa", () => {
  for (const t of TENSES) {
    if (t.when.length < 2 || t.when.length > 4 || t.signals.length < 2 || t.mistakes.length < 2 || t.mistakes.length > 4) throw new Error(`${t.id}: quantidades`);
    const fixos = [...t.when.map((w) => w.ex), ...(t.endings ?? []).map((e) => e.ex)];
    if (fixos.some((l) => !l.en || !l.pt || !l.say)) throw new Error(`${t.id}: exemplo sem en/pt/say`);
    if (!t.spelling.length) throw new Error(`${t.id}: regras de escrita`);
  }
  const basic = TENSES[0];
  if (!basic.endings || basic.endings.length < 6) throw new Error("terminacoes -s e -ed");
});

check("pronKey ignora caixa, espacos e pontuacao final", () => {
  if (pronKey("  Hello!  ") !== "hello") throw new Error("hello");
  if (pronKey("How   are you?") !== "how are you") throw new Error("how are you");
  if (pronKey("Dr. Smith") !== "dr. smith") throw new Error("ponto no meio fica");
});

check("pronounce: explicita, dicionario, semente", () => {
  if (pronounce("book", "búk!") !== "búk!") throw new Error("explicita");
  if (pronounce("book") !== sayPhrase("book")) throw new Error("dicionario");
  if (pronounce("zzqx") !== undefined) throw new Error("desconhecida");
  if (pronounce("book", "  ") !== sayPhrase("book")) throw new Error("explicita vazia");
});

check("estilo e exemplos para o prompt", () => {
  if (!PRON_STYLE.includes("rr")) throw new Error("regra do h");
  if (PRON_EXAMPLES.length < 8) throw new Error("exemplos");
});

const semanaBruta = {
  theme: "T",
  grammar: { topic: "g", examples: ["I am here."] },
  vocab: [{ group: "G", items: "cat=gato" }],
  days: [{ label: "Seg", focus: "f", minutes: 15, tasks: [{ what: "x", resource: "y", min: 15 }] }],
};
const semanaMinima = normalizeWeek(semanaBruta, 1, 5, 20);

check("parseItems le a pronuncia como 3a parte", () => {
  const [w] = buildWeeks([{ ...semanaMinima, vocab: [{ group: "G", items: "book=livro=búk; pen=caneta" }] }]);
  if (w.cards[0].say !== "búk" || w.cards[0].pt !== "livro") throw new Error("3 partes");
  if (w.cards[1].say !== undefined || w.cards[1].pt !== "caneta") throw new Error("2 partes");
});

check("vocabulario em objeto aceita say/pron/pronuncia", () => {
  const w = normalizeWeek({ ...semanaBruta, vocab: [{ group: "G", items: [{ en: "book", pt: "livro", pron: "búk" }] }] }, 1, 5, 20);
  if (w.vocab[0].items !== "book=livro=búk") throw new Error(w.vocab[0].items);
});

check("prompt da semana pede a pronuncia", () => {
  const m = weekMessage(p, { n: 1, theme: "T", subtitle: "s", why: "w", grammarTopic: "g", milestone: "m" }, ["1. T"]);
  if (!m.includes("=uârd") || !m.includes("rr")) throw new Error("formato ou estilo ausente");
});

check("prompt da semana leva o mesmo estilo de PRON_STYLE", () => {
  const m = weekMessage(p, { n: 1, theme: "T", subtitle: "s", why: "w", grammarTopic: "g", milestone: "m" }, ["1. T"]);
  const falta = PRON_STYLE.split("\n").find((r) => !m.includes(r));
  if (falta) throw new Error("regra fora do prompt: " + falta);
});

check("normalizePronMap fica so com o que foi pedido", () => {
  const m = normalizePronMap({ Hello: "rre-lôu", extra: "x", "Good night!": "" }, ["hello", "good night"], pronKey);
  if (m.hello !== "rre-lôu" || "extra" in m || "good night" in m) throw new Error(JSON.stringify(m));
});

check("pronBatches tira repetidos e corta em 40", () => {
  const textos = [...Array(90).keys()].map((i) => `w${i}`).concat(["W1", "", "x".repeat(201)]);
  const lotes = pronBatches(textos, pronKey);
  if (lotes.length !== 3 || lotes[0].length !== 40 || lotes.flat().length !== 90) throw new Error("lotes");
});

check("prompt de pronuncia leva estilo e textos", () => {
  if (!pronSystemPrompt(PRON_STYLE, PRON_EXAMPLES).includes("rr")) throw new Error("estilo");
  if (!pronUserPrompt(["Good morning"]).includes("Good morning")) throw new Error("texto");
});

check("cleanWords guarda a pronuncia com limite", () => {
  const [w] = cleanWords([{ id: "1", en: "book", pt: "livro", say: "búk" }]);
  if (w.say !== "búk") throw new Error("say");
  const [l] = cleanWords([{ id: "2", en: "a", pt: "b", say: "x".repeat(400) }]);
  if ((l.say ?? "").length !== 300) throw new Error("limite");
});

check("estudo completo normalizado", () => {
  const s = normalizeStudy({ study: { topic: "To be negativo", goal: "g", explanation: ["a", "b"], pattern: "P", examples: [{ en: "I am not", pt: "Eu não sou", pron: "ái ém nót" }, { pt: "sem en" }], tips: [{ text: "t", wrong: "I not am", right: "I am not" }, "dica solta"] } });
  if (s.topic !== "To be negativo" || s.examples.length !== 1 || s.tips.length !== 2) throw new Error(JSON.stringify(s));
  if (s.tips[1].text !== "dica solta" || s.examples[0].pron !== "ái ém nót") throw new Error("campos");
});

check("estudo com chaves em portugues e sem opcionais", () => {
  const s = normalizeStudy({ estudo: { assunto: "A", explicacao: "um parágrafo", exemplos: [{ ingles: "Hi", traducao: "Oi" }], dicas: [] } });
  if (s.explanation.length !== 1 || s.pattern !== undefined || s.examples[0].pron !== undefined) throw new Error("opcionais");
});

check("resposta sem teoria e recusada", () => {
  let threw = false;
  try { normalizeStudy(JSON.parse(licaoBruta(5))); } catch { threw = true; }
  if (!threw) throw new Error("deveria recusar array sem study");
});

check("questoes saem do objeto novo", () => {
  const qs = normalizeQuestions({ study: {}, questions: JSON.parse(licaoBruta(5)) }, ORDEM);
  if (qs.length !== TOTAL_QUESTOES) throw new Error("questions no objeto");
});

check("prompt da licao pede teoria ligada as questoes", () => {
  const s = lessonSystemPrompt(sampleProfile);
  if (!/teoria/i.test(s) || !/jarg/i.test(s)) throw new Error("regras da teoria");
});

check("prompt da licao leva o mesmo estilo de PRON_STYLE", () => {
  const s = lessonSystemPrompt(sampleProfile);
  const falta = PRON_STYLE.split("\n").find((r) => !s.includes(r));
  if (falta) throw new Error("regra fora do prompt: " + falta);
});

check("so a chave do servidor grava na tabela compartilhada", () => {
  if (shouldStoreShared("chave-do-visitante", "chave-do-servidor")) throw new Error("visitante gravou");
  if (!shouldStoreShared("chave-do-servidor", "chave-do-servidor")) throw new Error("servidor nao gravou");
  if (shouldStoreShared("", undefined)) throw new Error("sem chave");
});

check("textos longos demais saem da geracao como falha", () => {
  const { ok, skipped } = splitGeneratable(["book", "x".repeat(250), "Book!", ""], pronKey);
  if (ok.length !== 1 || ok[0] !== "book") throw new Error(JSON.stringify(ok));
  if (skipped.length !== 1 || skipped[0].length !== 250) throw new Error("pulado");
});

const sampleRaw: RawWeek[] = ["a", "b", "c"].flatMap((s) =>
  JSON.parse(readFileSync(new URL(`../lib/weeks-${s}.json`, import.meta.url), "utf8")),
);

check("todo item fixo do vocabulario tem pronuncia", () => {
  const faltam = CATEGORIES.flatMap((c) => c.groups.flatMap((g) => g.items.filter((i) => !i.say?.trim()).map((i) => `${c.id}/${i.en}`)));
  if (faltam.length) throw new Error(`${faltam.length} sem say: ${faltam.slice(0, 10).join(", ")}`);
});

check("todo card do plano de exemplo tem pronuncia", () => {
  const faltam = buildWeeks(sampleRaw).flatMap((w) => w.cards.filter((c) => !c.say?.trim()).map((c) => c.en));
  if (faltam.length) throw new Error(`${faltam.length} sem pronuncia: ${faltam.slice(0, 10).join(", ")}`);
});

check("frases do dia e exemplos de gramatica do plano de exemplo tem pronuncia", () => {
  const textos = sampleRaw.flatMap((w) => [...w.days.map((d) => d.speak), ...w.grammar.examples]);
  const faltam = textos.filter((t) => t && !pronounce(t));
  if (faltam.length) throw new Error(`${faltam.length} sem pronuncia: ${faltam.slice(0, 5).join(" | ")}`);
});

check("correcao traz ate 3 jeitos de melhorar a resposta", () => {
  const r = normalizeResult(extractJson(JSON.stringify({
    correct: true, feedback: "Boa.", correction: "My first name is Cristiano.",
    improvements: [
      { en: "My first name is Cristiano and I am a QA analyst.", why: "Diz a profissao completa." },
      { en: "  ", why: "vazio" },
      { frase: "I'm Cristiano, and I work as a QA analyst.", motivo: "Mais natural." },
      "Hi! I'm Cristiano. I'm a QA engineer.",
      { en: "My first name is Cristiano and I am a QA analyst.", why: "repetida" },
      { en: "I work in quality assurance as an analyst.", why: "Outro jeito." },
    ],
  })));
  if (r.improvements.length !== 3) throw new Error(JSON.stringify(r.improvements));
  if (r.improvements[1].en !== "I'm Cristiano, and I work as a QA analyst." || r.improvements[1].why !== "Mais natural.") throw new Error("chaves em pt");
  if (r.improvements[2].why !== "") throw new Error("string solta vira frase sem porque");
  const antigo = normalizeResult(extractJson('{"correct": false, "feedback": "x"}'));
  if (!Array.isArray(antigo.improvements) || antigo.improvements.length) throw new Error("sem melhorias");
  const pt = normalizeResult({ correct: true, melhorias: [{ en: "I am a tester.", porque: "Simples." }] });
  if (pt.improvements[0]?.why !== "Simples.") throw new Error("melhorias em pt");
});

check("prompt de correcao pede 3 jeitos de melhorar, certo ou errado", () => {
  const p = gradeSystemPrompt("A1");
  if (!p.includes('"improvements"') || !/3 jeitos/.test(p)) throw new Error("sem improvements");
});

check("so o material em ingles ganha ouvir e pronuncia", () => {
  for (const en of ["What is your first name and what is your job?", "I ___ (work) every day.", "She don't like coffee.", "What do you do?", "I work as a tester, as you know."])
    if (!looksEnglish(en)) throw new Error(`devia ser ingles: ${en}`);
  for (const pt of ["Eu trabalho todos os dias.", "Traduza: você gosta de café?", "Ela não gosta de chá", "", "o que você faz no fim de semana"])
    if (looksEnglish(pt)) throw new Error(`devia ser portugues: ${pt}`);
});

check("novas respostas vem nos 3 estilos, com dica, sem repetir as que ja existem", () => {
  const atuais = [{ en: "I don't like coffee.", why: "x", style: "usual" as const }];
  const novas = normalizeImprovements({ improvements: [
    { style: "informal", en: "Nah, coffee's not my thing.", tip: "Com amigos." },
    { estilo: "formal", frase: "I do not care for coffee.", dica: "Em reunioes." },
    { style: "mais usual", en: "i don't like coffee", why: "repetida" },
    { style: "Usual", en: "I'm not a fan of coffee.", why: "No dia a dia." },
    { style: "estranho", en: "Coffee? No, thanks.", why: "sem estilo conhecido" },
  ] }, atuais);
  if (novas.length !== 3) throw new Error(JSON.stringify(novas));
  if (novas.map((n) => n.style).join() !== "informal,formal,usual") throw new Error(novas.map((n) => n.style).join());
  if (novas[0].why !== "Com amigos." || novas[1].why !== "Em reunioes.") throw new Error("dica");
  const lista = normalizeImprovements([{ en: "Coffee? No, thanks." }], []);
  if (lista[0]?.style !== undefined) throw new Error("estilo desconhecido fica sem estilo");
});

check("gerar mais respostas acumula sem passar do limite", () => {
  const base = Array.from({ length: MAX_IMPROVEMENTS - 2 }, (_, i) => ({ en: `Sentence ${i}.`, why: "" }));
  const juntas = mergeImprovements(base, [{ en: "A.", why: "" }, { en: "B.", why: "" }, { en: "C.", why: "" }]);
  if (juntas.length !== MAX_IMPROVEMENTS || juntas[0].en !== "Sentence 0." || juntas.at(-1)!.en !== "B.") throw new Error(String(juntas.length));
});

check("prompt de mais respostas pede informal, formal e mais usual e manda as que ja existem", () => {
  const sys = improveSystemPrompt("A1");
  if (!/informal/.test(sys) || !/formal/.test(sys) || !/usual/.test(sys) || !sys.includes('"style"')) throw new Error("estilos");
  const q = { id: "q1", difficulty: "media" as const, type: "pergunta", prompt: "Responda.", content: "What is your job?", expected: "I am a QA analyst." };
  const u = improveUserPrompt(q, "I am QA", "I am a QA analyst.", [{ en: "I work as a QA analyst.", why: "" }]);
  if (!u.includes("I am QA") || !u.includes("I work as a QA analyst.")) throw new Error(u);
  if (!/informal/.test(gradeSystemPrompt("A1"))) throw new Error("correcao tambem nos 3 estilos");
});

check("as 3 respostas extras so podem ser geradas uma vez por questao", () => {
  const base = { correct: true, feedback: "", correction: "", tip: "", improvements: [] };
  if (!canGenerateMore(base)) throw new Error("ainda nao gerou");
  if (!canGenerateMore({ ...base, withImprovements: true, improvements: [{ en: "A.", why: "" }] })) throw new Error("as da correcao nao contam");
  if (canGenerateMore({ ...base, moreGenerated: true })) throw new Error("ja gerou");
  if (canGenerateMore(undefined)) throw new Error("sem resposta");
});

check("respostas geradas antes da trava contam como ja geradas", () => {
  const base = { correct: true, feedback: "", correction: "", tip: "", improvements: [] };
  const antigaGerada = { ...base, improvements: [{ en: "I work in QA.", why: "", style: "usual" as const }] };
  if (canGenerateMore(antigaGerada)) throw new Error("antiga com respostas geradas pelo botao");
  const nova = normalizeResult({ correct: true, feedback: "ok", correction: "I am a QA analyst.", improvements: [{ style: "informal", en: "I'm a QA.", tip: "x" }] });
  if (!nova.withImprovements || !canGenerateMore(nova)) throw new Error("correcao nova ainda pode gerar uma vez");
  if (canGenerateMore({ ...nova, moreGenerated: true })) throw new Error("nova depois de gerar");
});

check("limite diario gratuito troca para o modelo reserva uma vez", () => {
  const dia = '{"error":{"code":429,"message":"Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20 ... requests per day","details":[{"violations":[{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}]}}';
  const minuto = '{"error":{"code":429,"details":[{"violations":[{"quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier"}]}]}}';
  if (!isDailyQuota(429, dia) || isDailyQuota(429, minuto) || isDailyQuota(500, dia)) throw new Error("isDailyQuota");
  if (nextModel("gemini-3.8-flash", "gemini-3.5-flash") !== "gemini-3.5-flash") throw new Error("reserva");
  if (nextModel("gemini-3.5-flash", "gemini-3.5-flash") !== null) throw new Error("reserva igual ao principal");
  if (nextModel("gemini-3.8-flash", "") !== null) throw new Error("sem reserva");
});

// ---------- Conexão com o banco ----------

check("poolOptions: sslmode da URL manda", () => {
  const a = poolOptions("postgresql://u:p@db.exemplo.com:5432/x?sslmode=disable");
  if (a.ssl !== false) throw new Error("disable devia desligar TLS");
  const b = poolOptions("postgresql://u:p@localhost:5432/x?sslmode=require");
  if (!b.ssl) throw new Error("require devia ligar TLS mesmo em localhost");
  if (b.connectionString?.includes("sslmode")) throw new Error("sslmode devia sair da URL");
});

check("poolOptions: sem sslmode, TLS só fora de localhost", () => {
  const sup = poolOptions("postgresql://u:p@aws-1-sa-east-1.pooler.supabase.com:6543/postgres");
  if (!sup.ssl || sup.ssl.rejectUnauthorized !== false) throw new Error("supabase sem TLS");
  if (poolOptions("postgresql://u:p@127.0.0.1:5432/x").ssl) throw new Error("local com TLS");
  if (sup.max !== 3 || sup.connectionTimeoutMillis !== 15_000 || sup.idleTimeoutMillis !== 10_000)
    throw new Error("limites do pool");
});

check("poolOptions: sem URL não lança", () => {
  if (poolOptions(undefined).connectionString !== undefined) throw new Error("url inventada");
});

check("describeDbError acha o código do pg dentro do erro do Prisma", () => {
  const embrulhado = { message: "Driver adapter error", cause: { cause: { code: "28P01" } } };
  if (describeDbError(embrulhado) !== "senha incorreta na connection string") throw new Error(describeDbError(embrulhado));
  if (describeDbError({ cause: { code: "3D000" } }) !== "banco inexistente na connection string") throw new Error("3D000");
  if (describeDbError({ code: "ENOTFOUND" }) !== "host da connection string não resolve") throw new Error("ENOTFOUND");
  if (!describeDbError(new Error("x".repeat(500))).startsWith("falha ao conectar: ")) throw new Error("genérico");
  if (describeDbError(new Error("x".repeat(500))).length > 140) throw new Error("mensagem longa demais");
});

check("describeDbError entende o erro real do Prisma 7 (P2010 com driverAdapterError)", () => {
  const real = Object.assign(new Error("Raw query failed. Code: `28P01`."), {
    code: "P2010",
    meta: {
      driverAdapterError: {
        name: "DriverAdapterError",
        cause: { originalCode: "28P01", originalMessage: "password authentication failed", kind: "AuthenticationFailed" },
      },
    },
  });
  if (describeDbError(real) !== "senha incorreta na connection string") throw new Error(describeDbError(real));
  const semCodigo = Object.assign(new Error("x"), {
    code: "P2010",
    meta: { driverAdapterError: { cause: { originalMessage: "Connection terminated due to connection timeout" } } },
  });
  if (!describeDbError(semCodigo).startsWith("tempo esgotado")) throw new Error(describeDbError(semCodigo));
});

check("describeDbError usa o kind do adaptador quando não há código do pg", () => {
  const comKind = (kind: string) =>
    Object.assign(new Error(""), { code: "P2010", meta: { driverAdapterError: { cause: { kind, host: "h" } } } });
  if (describeDbError(comKind("DatabaseNotReachable")) !== "host da connection string não resolve ou não responde")
    throw new Error(describeDbError(comKind("DatabaseNotReachable")));
  if (describeDbError(comKind("DatabaseDoesNotExist")) !== "banco inexistente na connection string") throw new Error("db");
  if (!describeDbError(comKind("SocketTimeout")).startsWith("tempo esgotado")) throw new Error("timeout");
  if (describeDbError(comKind("TlsConnectionError")) !== "problema de certificado TLS") throw new Error("tls");
});

// ---------- Migração inicial do Prisma ----------

const migracao = (() => {
  try {
    return readFileSync(new URL("../prisma/migrations/0001_init/migration.sql", import.meta.url), "utf8");
  } catch {
    return "";
  }
})();

const TABELAS = ["user", "session", "account", "verification", "app_profile", "app_plan",
  "app_progress", "app_calendar_export", "app_lesson", "app_reminder", "app_vocab",
  "app_pron", "app_week_lesson", "app_lesson_part", "app_lesson_chat"];

check("migração inicial cria as 15 tabelas", () => {
  for (const t of TABELAS)
    if (!migracao.includes(`CREATE TABLE "${t}"`) && !migracao.includes(`CREATE TABLE "public"."${t}"`))
      throw new Error(`falta ${t}`);
});

check("migração inicial liga RLS em todas as tabelas", () => {
  for (const t of TABELAS)
    if (!new RegExp(`ALTER TABLE "(public"\\.")?${t}" ENABLE ROW LEVEL SECURITY`, "i").test(migracao))
      throw new Error(`sem RLS: ${t}`);
});

check("alguma migração liga RLS na tabela de controle do Prisma", () => {
  const dir = new URL("../prisma/migrations/", import.meta.url);
  const todas = readdirSync(dir)
    .filter((d) => /^\d{4}_/.test(d))
    .map((d) => readFileSync(new URL(`${d}/migration.sql`, dir), "utf8"))
    .join("\n");
  if (!/ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY/.test(todas)) throw new Error("sem RLS");
});

check("lição única por dia e lição da semana única por plano", () => {
  if (!/UNIQUE INDEX[^;]*"app_lesson"[^;]*\("user_id", "lesson_date"\)/.test(migracao)) throw new Error("app_lesson");
  if (!/UNIQUE INDEX[^;]*"app_week_lesson"[^;]*\("user_id", "plan_id", "week_n"\)/.test(migracao))
    throw new Error("app_week_lesson");
});

check("índices em ordem decrescente de hoje continuam", () => {
  if (!/"app_plan"[^;]*\("user_id", "created_at" DESC\)/.test(migracao)) throw new Error("app_plan");
  if (!/"app_lesson"[^;]*\("user_id", "lesson_date" DESC\)/.test(migracao)) throw new Error("app_lesson");
});

// ---------- Lições ----------

const assert = (c: unknown, m: string) => {
  if (!c) throw new Error(m);
};

check("parte do dia: segunda 0, sábado 5, domingo 5", () => {
  assert(partIndexForDate("2026-11-23") === 0, "segunda");
  assert(partIndexForDate("2026-11-25") === 2, "quarta");
  assert(partIndexForDate("2026-11-28") === 5, "sábado");
  assert(partIndexForDate("2026-11-29") === 5, "domingo");
});
check("outlineDays completa com Revisão e corta em 6", () => {
  const d = outlineDays([{ label: "Seg", focus: "Base" }, { label: "Ter", focus: "Trabalho" }]);
  assert(d.length === 6 && d[1].focus === "Trabalho" && d[5].focus === "Revisão", JSON.stringify(d));
  assert(outlineDays(Array.from({ length: 7 }, (_, i) => ({ label: `D${i}`, focus: "f" }))).length === 6, "7 → 6");
});
check("validateQuestion recusa vazia e longa", () => {
  assert(validateQuestion("   ") !== null, "vazia");
  assert(validateQuestion("x".repeat(1001)) !== null, "1001");
  assert(validateQuestion("x".repeat(1000)) === null, "1000");
  assert(validateQuestion("Por que I am?") === null, "válida");
});
check("parseWeekParam só aceita semana do plano", () => {
  assert(parseWeekParam("2", [1, 2, 3]) === 2, "2");
  for (const v of ["abc", "0", "99", "2.5", ""]) assert(parseWeekParam(v, [1, 2, 3]) === null, v);
});
check("parseDateParam aceita só data real", () => {
  assert(parseDateParam("2026-11-24") === "2026-11-24", "válida");
  assert(parseDateParam("2028-02-29") === "2028-02-29", "bissexto");
  for (const v of ["2026-02-30", "2026-13-01", "abc", "", "2026-1-5", " 2026-11-24", null, undefined])
    assert(parseDateParam(v) === null, String(v));
});
check("só leitura: dia passado concluído", () => {
  const hoje = "2026-11-26";
  assert(isReadOnlyLesson({ date: "2026-11-24", completedAt: "2026-11-24T22:00:00Z" }, hoje), "passado concluído");
  assert(!isReadOnlyLesson({ date: "2026-11-24", completedAt: null }, hoje), "passado pendente");
  assert(!isReadOnlyLesson({ date: hoje, completedAt: "2026-11-26T10:00:00Z" }, hoje), "hoje concluído");
});
check("hasMoreHistory com página cheia", () => {
  assert(HISTORY_PAGE === 14, "14");
  assert(hasMoreHistory(14) && !hasMoreHistory(13) && !hasMoreHistory(0), "limites");
});
const DIAS6 = outlineDays(["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((label, i) => ({ label, focus: `F${i}` })));
const parteBruta = (i: number) => ({ title: `T${i}`, goal: `G${i}`, day: "X", focus: "da IA" });
check("roteiro completo: day/focus vêm do plano", () => {
  const o = normalizeLessonOutline({ topic: "To be", intro: "Oi", parts: [0, 1, 2, 3, 4, 5].map(parteBruta) }, DIAS6);
  assert(o.parts.length === 6 && o.parts[0].focus === "F0" && o.parts[5].day === "Sáb" && o.parts[2].title === "T2", JSON.stringify(o));
});
check("roteiro com chaves em português e 7 partes vira 6", () => {
  const o = normalizeLessonOutline({ roteiro: { assunto: "A", introducao: "I", partes: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ titulo: `T${i}`, objetivo: "g" })) } }, DIAS6);
  assert(o.topic === "A" && o.intro === "I" && o.parts.length === 6, JSON.stringify(o));
});
check("roteiro com 4 partes é erro", () => {
  let msg = "";
  try { normalizeLessonOutline({ topic: "A", parts: [0, 1, 2, 3].map(parteBruta) }, DIAS6); } catch (e) { msg = (e as Error).message; }
  assert(msg === "A IA não devolveu o roteiro completo. Tente de novo.", msg);
});
check("normalizeStudy lê diálogo e prática e descarta fala sem en", () => {
  const s = normalizeStudy({ study: { topic: "T", explanation: ["a"], dialogo: [{ quem: "Ana", ingles: "Hi", traducao: "Oi" }, { who: "B", pt: "sem en" }], pratica: "Diga seu nome" } });
  assert(s.dialogue?.length === 1 && s.dialogue[0].who === "Ana" && s.dialogue[0].en === "Hi", JSON.stringify(s.dialogue));
  assert(s.practice?.[0] === "Diga seu nome", JSON.stringify(s.practice));
});
check("normalizeStudy aceita até 6 parágrafos e omite diálogo vazio", () => {
  const s = normalizeStudy({ study: { topic: "T", explanation: ["1", "2", "3", "4", "5", "6", "7"] } });
  assert(s.explanation.length === 6 && !("dialogue" in s) && !("practice" in s), JSON.stringify(s));
});
check("limite de parágrafos do normalizador igual ao do prompt", () => {
  assert(MAX_PARAGRAFOS === STUDY_LIMITS.explanation, `${MAX_PARAGRAFOS} ≠ ${STUDY_LIMITS.explanation}`);
});
check("normalizeAnswer aceita resposta e recusa vazio", () => {
  assert(normalizeAnswer({ resposta: " Use am. " }) === "Use am.", "resposta");
  let threw = false;
  try { normalizeAnswer({ answer: "" }); } catch { threw = true; }
  assert(threw, "vazio");
});

const ROTEIRO: LessonOutline = { topic: "To be", intro: "i", parts: DIAS6.map((d, i) => ({ ...d, title: `Título ${i + 1}`, goal: "g" })) };
const PARTE: Study = { topic: "Título 3", goal: "g", explanation: ["p"], examples: [], tips: [] };
check("roteiro pede 6 partes com os dias e focos do plano", () => {
  const u = outlineUserPrompt({ level: "A1", weekN: 1, gramatica: "to be", dias: DIAS6 });
  assert(/6 partes/.test(u) && u.includes("Sáb") && u.includes("F5") && u.includes("to be"), u);
});
check("parte leva o roteiro inteiro e marca qual escrever", () => {
  const u = partUserPrompt({ outline: ROTEIRO, idx: 2 });
  assert(u.includes("Título 2") && u.includes("Título 3") && u.includes("Título 4") && /parte 3/i.test(u), u);
  assert(/"dialogue"/.test(u) && /"practice"/.test(u) && /"pron"/.test(u), "formato novo");
});
check("parte + questões substitui o assunto livre", () => {
  const u = partAndQuestionsUserPrompt({ outline: ROTEIRO, idx: 0, data: "2026-11-23", errosRecentes: ["Use am com I."] });
  assert(u.includes("Título 1") && u.includes("Use am com I.") && /"questions"/.test(u) && /"study"/.test(u) && !/Assuntos dos últimos dias/.test(u), u);
  assert(u.includes(`${TOTAL_QUESTOES} questões`) && /"pron"/.test(u), "quantidade e pronúncia");
});
check("só questões parte da parte pronta", () => {
  const u = questionsUserPrompt({ part: PARTE, outline: ROTEIRO, idx: 2, data: "2026-11-25" });
  assert(u.includes("Título 3") && /"questions"/.test(u) && !/"study"/.test(u), u);
});
check("chat leva só as últimas 12 mensagens e a pergunta", () => {
  const history = Array.from({ length: 15 }, (_, i) => ({ id: String(i), role: (i % 2 ? "professor" : "aluno") as "aluno" | "professor", text: `msg${i}.`, createdAt: "" }));
  const u = chatUserPrompt({ outline: ROTEIRO, idx: 2, part: PARTE, history, question: "Por que am?" });
  assert(!u.includes("msg2.") && u.includes("msg3.") && u.includes("msg14.") && u.includes("Por que am?") && u.includes("Título 3"), u);
  assert(CHAT_CONTEXT_PROMPT === CHAT_CONTEXT, "contexto do chat igual nos dois arquivos");
});
check("professor do chat responde em JSON, curto e em português", () => {
  const s = chatSystemPrompt(sampleProfile);
  assert(/"answer"/.test(s) && /150 palavras/.test(s) && /português/.test(s), s);
});
check("teoria fala com o aluno (você) no Estudo do dia e na lição", () => {
  assert(/você/.test(partSystemPrompt(sampleProfile)) && /você/.test(lessonSystemPrompt(sampleProfile)), "tom");
});
check("parte e chat levam o mesmo estilo de PRON_STYLE", () => {
  for (const s of [partSystemPrompt(sampleProfile), chatSystemPrompt(sampleProfile)]) {
    const falta = PRON_STYLE.split("\n").find((r) => !s.includes(r));
    assert(!falta, "regra fora do prompt: " + falta);
  }
});

check("generateStep decide o que gerar", () => {
  assert(generateStep({ lessonHasQuestions: true, hasWeekLesson: false, hasPart: false }) === "existing", "existe");
  assert(generateStep({ lessonHasQuestions: false, hasWeekLesson: false, hasPart: false }) === "needsOutline", "sem roteiro");
  assert(generateStep({ lessonHasQuestions: false, hasWeekLesson: true, hasPart: true }) === "questionsOnly", "parte pronta");
  assert(generateStep({ lessonHasQuestions: false, hasWeekLesson: true, hasPart: false }) === "partAndQuestions", "sem parte");
});

check("weekRequest manda dias, gramática e até 25 palavras", () => {
  const w = buildWeeks(sampleRaw)[0];
  const r = weekRequest(w);
  assert(r.weekN === w.n && r.dias.length === w.days.length && r.dias[0].focus === w.days[0].focus && r.dias[0].label === w.days[0].label, JSON.stringify(r.dias));
  assert(r.gramatica === w.grammar.topic && r.tema === w.theme && r.vocabulario.length > 0 && r.vocabulario.length <= 25, JSON.stringify(r).slice(0, 200));
});

check("hoje em São Paulo vira o dia certo perto da meia-noite", () => {
  assert(todayInSaoPaulo(new Date("2026-11-26T02:00:00Z")) === "2026-11-25", "23h em SP ainda é dia 25");
  assert(todayInSaoPaulo(new Date("2026-11-26T03:30:00Z")) === "2026-11-26", "00h30 em SP já é dia 26");
});

check("conversa enviada fica na parte ao trocar de parte e voltar", () => {
  const msg = (id: string) => ({ id, role: "aluno" as const, text: id, createdAt: "2026-11-25T12:00:00Z" });
  const antes = { 0: [msg("1")], 2: [msg("9")] };
  const depois = appendChat(antes, 0, [msg("2"), msg("3")]);
  assert(depois[0].map((m) => m.id).join(",") === "1,2,3", "parte 0 ganha as novas");
  assert(depois[2].length === 1, "outra parte intacta");
  assert(antes[0].length === 1, "não muda o objeto antigo");
  assert(appendChat(depois, 0, [msg("3")])[0].length === 3, "não duplica id repetido");
  assert(appendChat({}, 4, [msg("5")])[4].length === 1, "parte sem conversa começa uma");
});

await (async () => {
  // Strict Mode monta, desmonta e monta de novo: o plano da conta tem que chegar mesmo assim.
  const nome = "plano da conta chega mesmo com o efeito montado duas vezes (Strict Mode)";
  try {
    const chamadas: { ready: boolean; weekN: number | null }[] = [];
    const buscar = async () => ({ signedIn: true, plan: null, progress: { sample: { currentWeek: 3 } } });
    const aplicar = (r: { remote: { weekN: number | null } | null; ready: boolean }) =>
      chamadas.push({ ready: r.ready, weekN: r.remote?.weekN ?? null });
    const parar1 = startPlanPull("u1", buscar, aplicar);
    parar1();
    startPlanPull("u1", buscar, aplicar);
    await new Promise((r) => setTimeout(r, 10));
    assert(chamadas.length === 1, `uma resposta aplicada (veio ${chamadas.length})`);
    assert(chamadas[0]?.ready === true && chamadas[0]?.weekN === 3, "pronto e semana 3");
    console.log(`ok - ${nome}`);
  } catch (e) {
    failures++;
    console.log(`FALHA - ${nome}: ${e instanceof Error ? e.message : e}`);
  }
})();

console.log(failures === 0 ? "\nTodos os testes passaram." : `\n${failures} falha(s).`);
process.exit(failures === 0 ? 0 : 1);
