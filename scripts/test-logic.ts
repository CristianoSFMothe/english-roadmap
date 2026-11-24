import { extractJson, normalizeOutline, normalizeWeek } from "../lib/normalize.ts";
import { buildWeeks } from "../lib/weeks.ts";
import { systemPrompt, outlineMessage, weekMessage } from "../lib/prompt.ts";
import { sampleProfile, clampProfile } from "../lib/profile.ts";
import { numberToWords } from "../lib/vocabulary.ts";
import { VERBS, thirdPerson, findVerb, ingForm, ptGerund, ptConditional, buildTense, TENSES, statNotice, buildExamples, shortAnswers } from "../lib/verbs.ts";
import { sayPhrase, pronKey, pronounce, PRON_STYLE, PRON_EXAMPLES } from "../lib/pronunciation.ts";
import { normalizeQuestions, normalizeResult } from "../lib/lesson-normalize.ts";
import { lessonSystemPrompt, lessonUserPrompt, ORDEM, TOTAL_QUESTOES } from "../lib/lesson-prompt.ts";

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
  const u = lessonUserPrompt({ level: "A1", tema: "Daily routine", gramatica: "present simple", data: "2026-10-17" });
  if (!u.includes("5 questões")) throw new Error("quantidade ausente");
  if (!u.includes("Daily routine")) throw new Error("tema ausente");
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

console.log(failures === 0 ? "\nTodos os testes passaram." : `\n${failures} falha(s).`);
process.exit(failures === 0 ? 0 : 1);
