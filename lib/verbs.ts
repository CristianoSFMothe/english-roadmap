/**
 * Verbos conjugados da aba "Verbos mais usados" em /vocabulario.
 * O inglês da tabela sai de regras (3ª pessoa, do/does, did, will, contrações);
 * o português é escrito à mão por verbo, porque não dá para gerar com segurança.
 * Sem imports: o `npm test` roda este arquivo direto no Node.
 */

/** `say`: pronúncia aproximada do inglês, escrita com sons do português (só na tabela). */
export type Line = { en: string; pt: string; say?: string };

export type PersonRow = {
  person: string;
  present: Line;
  past: Line;
  future: Line;
  negative: Line;
  /** Pergunta no presente: "Do you work?", "Does he work?", "Am I?". */
  question: Line;
  /** Contrações: negativa do presente, negativa do passado, futuro e futuro negativo. */
  short: string[];
  /** Pronúncia aproximada de cada contração, na mesma ordem de `short`. */
  shortSay: string[];
};

/** Formas do português para eu, você/ele/ela/isso, nós, eles. */
type PtForms = [string, string, string, string];

export type VerbSpec = {
  id: string;
  base: string;
  /** Significados, para o título: "conseguir, pegar, ficar". */
  pt: string;
  /** Infinitivo usado no futuro ("vou conseguir"). Padrão: o primeiro significado. */
  inf?: string;
  say: string;
  past: string;
  participle?: string;
  ptPresent: PtForms;
  ptPast: PtForms;
  note?: string;
  phrases: Line[];
  questions: Line[];
  words: Line[];
  conversation: Line[];
};

/** Formas usadas pelos outros tempos (Present continuous, Present perfect, Would...). */
export type VerbForms = {
  ing: string;
  participle: string;
  say: { base: string; ing: string; participle: string };
  /** Um item por sentido em português; o to be tem dois (ser e estar). */
  pt: { inf: string; past: PtForms }[];
};

export type Verb = Omit<VerbSpec, "ptPresent" | "ptPast" | "participle"> & {
  label: string;
  participle: string;
  table: PersonRow[];
  forms: VerbForms;
};

const PERSONS = ["I", "you", "he", "she", "it", "we", "they"] as const;
const PT_PERSONS = ["eu", "você", "ele", "ela", "isso", "nós", "eles"];
/** Qual das 4 formas do português cada pessoa usa. */
const PT_INDEX = [0, 1, 1, 1, 1, 2, 3];
const PT_FUTURE = ["vou", "vai", "vai", "vai", "vai", "vamos", "vão"];
const THIRD = new Set([2, 3, 4]);

/* ---------- pronúncia aproximada ---------- */

const PERSON_SAY = ["ái", "iú", "rrí", "chí", "ít", "uí", "dêi"];
const WILL_SAY = ["áil", "iúl", "rríl", "chíl", "í-tel", "uíl", "dêil"];

/** Terceira pessoa e passado de cada verbo (o infinitivo vem de `say`). */
const FORM_SAY: Record<string, [third: string, past: string]> = {
  have: ["rréz", "rréd"],
  do: ["dâz", "díd"],
  go: ["gôuz", "uént"],
  get: ["guéts", "gót"],
  make: ["mêiks", "mêid"],
  know: ["nôuz", "nú"],
  think: ["thínks", "thót"],
  take: ["têiks", "túk"],
  see: ["síz", "só"],
  come: ["kâmz", "kêim"],
  want: ["uánts", "uán-tid"],
  like: ["láiks", "láikt"],
  need: ["nídz", "ní-did"],
  say: ["séz", "séd"],
  tell: ["télz", "tôuld"],
  give: ["guívz", "guêiv"],
  find: ["fáindz", "fáund"],
  work: ["uârks", "uârkt"],
  live: ["lívz", "lívd"],
  study: ["stâ-diz", "stâ-did"],
  learn: ["lârnz", "lârnd"],
  speak: ["spíks", "spôuk"],
  understand: ["ân-der-sténdz", "ân-der-stúd"],
  read: ["rídz", "réd"],
  write: ["ráits", "rôut"],
  eat: ["íts", "êit"],
  drink: ["drínks", "drénk"],
  buy: ["báiz", "bót"],
  pay: ["pêiz", "pêid"],
  call: ["kólz", "kóld"],
  ask: ["ésks", "éskt"],
  help: ["rrélps", "rrélpt"],
  try: ["tráiz", "tráid"],
  use: ["iú-zes", "iúzd"],
  feel: ["fílz", "félt"],
  leave: ["líivz", "léft"],
  put: ["púts", "pút"],
  keep: ["kíps", "képt"],
  start: ["stárts", "stár-tid"],
};

/** Pronúncia da forma com -ing de cada verbo. */
const ING_SAY: Record<string, string> = {
  have: "rré-ving", do: "dú-ing", go: "gôu-ing", get: "gué-ting", make: "mêi-king",
  know: "nôu-ing", think: "thín-king", take: "têi-king", see: "sí-ing", come: "kâ-ming",
  want: "uán-ting", like: "lái-king", need: "ní-ding", say: "sêi-ing", tell: "té-ling",
  give: "guí-ving", find: "fáin-ding", work: "uâr-king", live: "lí-ving", study: "stâ-di-ing",
  learn: "lâr-ning", speak: "spí-king", understand: "ân-der-stén-ding", read: "rí-ding",
  write: "rái-ting", eat: "í-ting", drink: "drín-king", buy: "bái-ing", pay: "pêi-ing",
  call: "kó-ling", ask: "és-king", help: "rrél-ping", try: "trái-ing", use: "iú-zing",
  feel: "fí-ling", leave: "líi-ving", put: "pú-ting", keep: "kí-ping", start: "stár-ting",
};

/** Pronúncia do particípio quando ele é diferente do passado. */
const PARTICIPLE_SAY: Record<string, string> = {
  do: "dân", go: "gón", get: "gó-ten", know: "nôun", take: "têi-ken", see: "sín",
  come: "kâm", give: "guí-ven", speak: "spôu-ken", write: "rí-ten", eat: "í-ten",
  drink: "drânk",
};

/** Tira observações entre parênteses: "thínk (th com a língua...)" vira "thínk". */
const plainSay = (say: string) => say.replace(/\s*\(.*\)\s*$/, "");

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const l = (en: string, pt: string, say?: string): Line => (say ? { en, pt, say } : { en, pt });

/** 3ª pessoa do singular no presente: works, watches, goes, studies, says. */
export function thirdPerson(base: string): string {
  if (base === "have") return "has";
  if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + "ies";
  if (/(s|sh|ch|x|z|o)$/.test(base)) return base + "es";
  return base + "s";
}

const contractWill = (p: string) => `${p}'ll`;

/** Monta as 7 linhas da tabela de um verbo comum. */
export function buildTable(
  spec: Pick<VerbSpec, "id" | "base" | "past" | "pt" | "inf" | "say" | "ptPresent" | "ptPast">,
): PersonRow[] {
  const inf = spec.inf ?? spec.pt.split(",")[0].trim();
  const base = plainSay(spec.say);
  const [sThird, sPast] = FORM_SAY[spec.id] ?? [`${base}s`, `${base}d`];
  return PERSONS.map((p, i) => {
    const third = THIRD.has(i);
    const P = cap(p);
    const ptP = PT_PERSONS[i];
    const pres = spec.ptPresent[PT_INDEX[i]];
    const aux = third ? "does" : "do";
    const S = PERSON_SAY[i];
    const sAux = third ? "dâz" : "dú";
    return {
      person: p,
      present: l(`${P} ${third ? thirdPerson(spec.base) : spec.base}`, `${ptP} ${pres}`, `${S} ${third ? sThird : base}`),
      past: l(`${P} ${spec.past}`, `${ptP} ${spec.ptPast[PT_INDEX[i]]}`, `${S} ${sPast}`),
      future: l(`${P} will ${spec.base}`, `${ptP} ${PT_FUTURE[i]} ${inf}`, `${S} uíl ${base}`),
      negative: l(`${P} ${aux} not ${spec.base}`, `${ptP} não ${pres}`, `${S} ${sAux} nót ${base}`),
      question: l(`${cap(aux)} ${p} ${spec.base}?`, `${ptP} ${pres}?`, `${sAux} ${S} ${base}?`),
      short: [
        `${P} ${aux}n't ${spec.base}`,
        `${P} didn't ${spec.base}`,
        `${cap(contractWill(p))} ${spec.base}`,
        `${P} won't ${spec.base}`,
      ],
      shortSay: [
        `${S} ${third ? "dâ-zent" : "dôunt"} ${base}`,
        `${S} dí-dent ${base}`,
        `${WILL_SAY[i]} ${base}`,
        `${S} uôunt ${base}`,
      ],
    };
  });
}

/* ---------- to be, escrito à mão ---------- */

const BE_NOW = ["ém", "ár", "íz", "íz", "íz", "ár", "ár"];
const BE_WAS = ["uóz", "uâr", "uóz", "uóz", "uóz", "uâr", "uâr"];
const BE_CONTRACTION = ["áim", "iór", "rríz", "chíz", "íts", "uír", "dér"];

const BE_ROWS: Omit<PersonRow, "shortSay">[] = [
  {
    person: "I",
    present: l("I am", "eu sou / eu estou"),
    past: l("I was", "eu era / eu estava"),
    future: l("I will be", "eu vou ser / eu vou estar"),
    negative: l("I am not", "eu não sou / eu não estou"),
    question: l("Am I?", "eu sou? / eu estou?"),
    short: ["I'm", "I'm not", "I wasn't", "I'll be"],
  },
  {
    person: "you",
    present: l("You are", "você é / você está"),
    past: l("You were", "você era / você estava"),
    future: l("You will be", "você vai ser / você vai estar"),
    negative: l("You are not", "você não é / você não está"),
    question: l("Are you?", "você é? / você está?"),
    short: ["You're", "You aren't", "You weren't", "You'll be"],
  },
  {
    person: "he",
    present: l("He is", "ele é / ele está"),
    past: l("He was", "ele era / ele estava"),
    future: l("He will be", "ele vai ser / ele vai estar"),
    negative: l("He is not", "ele não é / ele não está"),
    question: l("Is he?", "ele é? / ele está?"),
    short: ["He's", "He isn't", "He wasn't", "He'll be"],
  },
  {
    person: "she",
    present: l("She is", "ela é / ela está"),
    past: l("She was", "ela era / ela estava"),
    future: l("She will be", "ela vai ser / ela vai estar"),
    negative: l("She is not", "ela não é / ela não está"),
    question: l("Is she?", "ela é? / ela está?"),
    short: ["She's", "She isn't", "She wasn't", "She'll be"],
  },
  {
    person: "it",
    present: l("It is", "isso é / isso está"),
    past: l("It was", "isso era / isso estava"),
    future: l("It will be", "isso vai ser / isso vai estar"),
    negative: l("It is not", "isso não é / isso não está"),
    question: l("Is it?", "isso é? / isso está?"),
    short: ["It's", "It isn't", "It wasn't", "It'll be"],
  },
  {
    person: "we",
    present: l("We are", "nós somos / nós estamos"),
    past: l("We were", "nós éramos / nós estávamos"),
    future: l("We will be", "nós vamos ser / nós vamos estar"),
    negative: l("We are not", "nós não somos / nós não estamos"),
    question: l("Are we?", "nós somos? / nós estamos?"),
    short: ["We're", "We aren't", "We weren't", "We'll be"],
  },
  {
    person: "they",
    present: l("They are", "eles são / eles estão"),
    past: l("They were", "eles eram / eles estavam"),
    future: l("They will be", "eles vão ser / eles vão estar"),
    negative: l("They are not", "eles não são / eles não estão"),
    question: l("Are they?", "eles são? / eles estão?"),
    short: ["They're", "They aren't", "They weren't", "They'll be"],
  },
];

/** As linhas do to be com a pronúncia aproximada de cada forma. */
const BE_TABLE: PersonRow[] = BE_ROWS.map((r, i) => {
  const S = PERSON_SAY[i];
  const now = BE_NOW[i];
  const was = BE_WAS[i];
  return {
    ...r,
    present: { ...r.present, say: `${S} ${now}` },
    past: { ...r.past, say: `${S} ${was}` },
    future: { ...r.future, say: `${S} uíl bí` },
    negative: { ...r.negative, say: `${S} ${now} nót` },
    question: { ...r.question, say: `${now} ${S}?` },
    shortSay: [
      BE_CONTRACTION[i],
      i === 0 ? "áim nót" : `${S} ${now === "ár" ? "árnt" : "í-zent"}`,
      `${S} ${was === "uóz" ? "uó-zent" : "uârnt"}`,
      `${WILL_SAY[i]} bí`,
    ],
  };
});

const BE: Verb = {
  id: "be",
  base: "be",
  label: "to be",
  pt: "ser, estar",
  say: "bí",
  past: "was / were",
  participle: "been",
  note: "No passado, I/he/she/it usam was; you/we/they usam were.",
  table: BE_TABLE,
  forms: {
    ing: "being",
    participle: "been",
    say: { base: "bí", ing: "bí-ing", participle: "bín" },
    pt: [
      { inf: "ser", past: ["fui", "foi", "fomos", "foram"] },
      { inf: "estar", past: ["estive", "esteve", "estivemos", "estiveram"] },
    ],
  },
  phrases: [
    l("I am a software tester.", "Eu sou testador de software."),
    l("She is at work right now.", "Ela está no trabalho agora."),
    l("We were tired yesterday.", "Nós estávamos cansados ontem."),
    l("It will be a long day.", "Vai ser um dia longo."),
    l("I am 30 years old.", "Eu tenho 30 anos."),
    l("I'm hungry.", "Estou com fome."),
  ],
  questions: [
    l("Are you ready? Yes, I am. / No, I'm not.", "Você está pronto? Sim. / Não."),
    l("Where are you from?", "De onde você é?"),
    l("How old are you?", "Quantos anos você tem?"),
    l("Was the meeting good?", "A reunião foi boa?"),
    l("Is it far from here?", "É longe daqui?"),
  ],
  words: [
    l("There is", "há, existe (um)"),
    l("There are", "há, existem (vários)"),
    l("There was / There were", "havia, existia(m)"),
    l("to be late", "estar atrasado"),
    l("to be sure", "ter certeza"),
    l("to be afraid", "ter medo"),
  ],
  conversation: [
    l("A: Hi! How are you?", "A: Oi! Como você está?"),
    l("B: I'm fine, thanks. And you?", "B: Estou bem, obrigado. E você?"),
    l("A: I'm good. Are you busy today?", "A: Estou bem. Você está ocupado hoje?"),
    l("B: No, I'm not. I'm free after lunch.", "B: Não. Estou livre depois do almoço."),
  ],
};

/* ---------- os outros 39 ---------- */

const SPECS: VerbSpec[] = [
  {
    id: "have", base: "have", pt: "ter", say: "rrév", past: "had",
    ptPresent: ["tenho", "tem", "temos", "têm"], ptPast: ["tive", "teve", "tivemos", "tiveram"],
    note: "Na 3ª pessoa vira has: he has, she has.",
    phrases: [
      l("I have two brothers.", "Eu tenho dois irmãos."),
      l("She has a meeting at ten.", "Ela tem uma reunião às dez."),
      l("We had a great time.", "Nós nos divertimos muito."),
      l("I have to go now.", "Eu tenho que ir agora."),
    ],
    questions: [
      l("Do you have a minute? Yes, I do. / No, I don't.", "Você tem um minuto? Sim. / Não."),
      l("Does he have a car?", "Ele tem carro?"),
      l("Did you have breakfast?", "Você tomou café da manhã?"),
    ],
    words: [
      l("have to", "ter que"),
      l("have breakfast / lunch / dinner", "tomar café / almoçar / jantar"),
      l("have a good day", "tenha um bom dia"),
    ],
    conversation: [
      l("A: Do you have time for a quick call?", "A: Você tem tempo para uma ligação rápida?"),
      l("B: Sorry, I have a meeting now.", "B: Desculpe, tenho uma reunião agora."),
      l("A: No problem. Do you have time later?", "A: Sem problema. Você tem tempo mais tarde?"),
      l("B: Yes, I have some time at four.", "B: Sim, tenho um tempo às quatro."),
    ],
  },
  {
    id: "do", base: "do", pt: "fazer", say: "dú", past: "did", participle: "done",
    ptPresent: ["faço", "faz", "fazemos", "fazem"], ptPast: ["fiz", "fez", "fizemos", "fizeram"],
    note: "Também é o auxiliar das perguntas e negativas: Do you...? I don't...",
    phrases: [
      l("I do my homework at night.", "Eu faço a lição à noite."),
      l("She does yoga every morning.", "Ela faz ioga toda manhã."),
      l("We did a good job.", "Nós fizemos um bom trabalho."),
      l("I'll do it tomorrow.", "Eu faço isso amanhã."),
    ],
    questions: [
      l("What do you do?", "O que você faz? (profissão)"),
      l("Did you do the test? Yes, I did. / No, I didn't.", "Você fez o teste? Sim. / Não."),
      l("What are you doing?", "O que você está fazendo?"),
    ],
    words: [
      l("do the dishes", "lavar a louça"),
      l("do homework", "fazer a lição"),
      l("do your best", "fazer o seu melhor"),
    ],
    conversation: [
      l("A: What do you do?", "A: O que você faz?"),
      l("B: I work in IT. I do software testing.", "B: Trabalho com TI. Faço testes de software."),
      l("A: Do you like it?", "A: Você gosta?"),
      l("B: Yes, I do!", "B: Gosto, sim!"),
    ],
  },
  {
    id: "go", base: "go", pt: "ir", say: "gôu", past: "went", participle: "gone",
    ptPresent: ["vou", "vai", "vamos", "vão"], ptPast: ["fui", "foi", "fomos", "foram"],
    phrases: [
      l("I go to work by bus.", "Eu vou para o trabalho de ônibus."),
      l("He goes to the gym on Mondays.", "Ele vai à academia às segundas."),
      l("We went to the beach last weekend.", "Nós fomos à praia no fim de semana passado."),
      l("I'm going to travel next month.", "Eu vou viajar no mês que vem."),
    ],
    questions: [
      l("Where do you go on weekends?", "Aonde você vai nos fins de semana?"),
      l("Did you go to the party? Yes, I did. / No, I didn't.", "Você foi à festa? Sim. / Não."),
      l("How is it going?", "Como vão as coisas?"),
    ],
    words: [
      l("go home", "ir para casa"),
      l("go shopping", "ir às compras"),
      l("go out", "sair (para se divertir)"),
      l("going to", "vou (futuro planejado)"),
    ],
    conversation: [
      l("A: Where are you going?", "A: Aonde você está indo?"),
      l("B: I'm going to the supermarket.", "B: Estou indo ao supermercado."),
      l("A: Can I go with you?", "A: Posso ir com você?"),
      l("B: Sure, let's go!", "B: Claro, vamos!"),
    ],
  },
  {
    id: "get", base: "get", pt: "conseguir, pegar, ficar", say: "guét", past: "got", participle: "gotten",
    ptPresent: ["consigo", "consegue", "conseguimos", "conseguem"], ptPast: ["consegui", "conseguiu", "conseguimos", "conseguiram"],
    note: "Muda de sentido conforme a palavra seguinte: get up, get home, get tired.",
    phrases: [
      l("I get up at seven.", "Eu acordo às sete."),
      l("She got a new job.", "Ela conseguiu um emprego novo."),
      l("I'll get the tickets.", "Eu pego os ingressos."),
      l("It's getting cold.", "Está ficando frio."),
    ],
    questions: [
      l("What time do you get home?", "Que horas você chega em casa?"),
      l("Did you get my message? Yes, I did. / No, I didn't.", "Você recebeu minha mensagem? Sim. / Não."),
      l("Do you get it?", "Você entendeu?"),
    ],
    words: [
      l("get up", "levantar, acordar"),
      l("get home", "chegar em casa"),
      l("get better", "melhorar"),
      l("get married", "casar"),
    ],
    conversation: [
      l("A: Did you get my email?", "A: Você recebeu meu e-mail?"),
      l("B: Yes, I got it this morning.", "B: Sim, recebi hoje de manhã."),
      l("A: Great. Did you get the file too?", "A: Ótimo. Recebeu o arquivo também?"),
      l("B: No, I didn't. Can you send it again?", "B: Não. Pode mandar de novo?"),
    ],
  },
  {
    id: "make", base: "make", pt: "fazer, criar, preparar", say: "mêik", past: "made",
    ptPresent: ["faço", "faz", "fazemos", "fazem"], ptPast: ["fiz", "fez", "fizemos", "fizeram"],
    note: "make = fabricar, criar algo; do = realizar uma tarefa.",
    phrases: [
      l("I make coffee every morning.", "Eu faço café toda manhã."),
      l("She made a mistake.", "Ela cometeu um erro."),
      l("We will make a decision tomorrow.", "Nós vamos tomar uma decisão amanhã."),
      l("You make me happy.", "Você me deixa feliz."),
    ],
    questions: [
      l("Did you make dinner? Yes, I did. / No, I didn't.", "Você fez o jantar? Sim. / Não."),
      l("Can you make it?", "Você consegue ir? / dar conta?"),
      l("What makes you happy?", "O que te deixa feliz?"),
    ],
    words: [
      l("make a mistake", "cometer um erro"),
      l("make money", "ganhar dinheiro"),
      l("make friends", "fazer amigos"),
      l("make sure", "garantir, ter certeza"),
    ],
    conversation: [
      l("A: Can you make it to the meeting?", "A: Você consegue ir à reunião?"),
      l("B: Yes, but I'll be a little late.", "B: Sim, mas vou chegar um pouco atrasado."),
      l("A: OK. Make sure you bring the report.", "A: Certo. Não esqueça de trazer o relatório."),
      l("B: Sure, I will.", "B: Claro, vou levar."),
    ],
  },
  {
    id: "know", base: "know", pt: "saber, conhecer", say: "nôu", past: "knew", participle: "known",
    ptPresent: ["sei", "sabe", "sabemos", "sabem"], ptPast: ["soube", "soube", "soubemos", "souberam"],
    note: "O k não se pronuncia: know soa como no.",
    phrases: [
      l("I know the answer.", "Eu sei a resposta."),
      l("She knows my brother.", "Ela conhece meu irmão."),
      l("I didn't know that.", "Eu não sabia disso."),
      l("You'll know soon.", "Você vai saber logo."),
    ],
    questions: [
      l("Do you know her? Yes, I do. / No, I don't.", "Você a conhece? Sim. / Não."),
      l("Do you know where the station is?", "Você sabe onde fica a estação?"),
      l("How do you know?", "Como você sabe?"),
    ],
    words: [
      l("I don't know", "não sei"),
      l("you know", "sabe... (preenchimento na fala)"),
      l("let me know", "me avise"),
    ],
    conversation: [
      l("A: Do you know a good restaurant near here?", "A: Você conhece um bom restaurante aqui perto?"),
      l("B: Yes, I know a great place.", "B: Sim, conheço um lugar ótimo."),
      l("A: Do you know if it's open now?", "A: Sabe se está aberto agora?"),
      l("B: I don't know. Let me check.", "B: Não sei. Deixa eu ver."),
    ],
  },
  {
    id: "think", base: "think", pt: "pensar, achar", say: "thínk (th com a língua entre os dentes)", past: "thought",
    ptPresent: ["penso", "pensa", "pensamos", "pensam"], ptPast: ["pensei", "pensou", "pensamos", "pensaram"],
    phrases: [
      l("I think it's a good idea.", "Eu acho que é uma boa ideia."),
      l("She thinks about her family.", "Ela pensa na família."),
      l("I thought you were at home.", "Eu achei que você estava em casa."),
      l("I'll think about it.", "Vou pensar nisso."),
    ],
    questions: [
      l("What do you think?", "O que você acha?"),
      l("Do you think so? Yes, I do. / No, I don't.", "Você acha? Sim. / Não."),
      l("What are you thinking about?", "Em que você está pensando?"),
    ],
    words: [
      l("I think so", "acho que sim"),
      l("I don't think so", "acho que não"),
      l("think about", "pensar em"),
    ],
    conversation: [
      l("A: What do you think of the new design?", "A: O que você acha do novo design?"),
      l("B: I think it's clean and simple.", "B: Acho limpo e simples."),
      l("A: Do you think users will like it?", "A: Você acha que os usuários vão gostar?"),
      l("B: I think so.", "B: Acho que sim."),
    ],
  },
  {
    id: "take", base: "take", pt: "pegar, levar, tomar", say: "têik", past: "took", participle: "taken",
    ptPresent: ["pego", "pega", "pegamos", "pegam"], ptPast: ["peguei", "pegou", "pegamos", "pegaram"],
    phrases: [
      l("I take the bus to work.", "Eu pego o ônibus para o trabalho."),
      l("It takes 20 minutes.", "Leva 20 minutos."),
      l("She took a lot of photos.", "Ela tirou muitas fotos."),
      l("Take your time.", "Sem pressa."),
    ],
    questions: [
      l("How long does it take?", "Quanto tempo leva?"),
      l("Did you take your medicine? Yes, I did. / No, I didn't.", "Você tomou o remédio? Sim. / Não."),
      l("Can I take this?", "Posso levar isto?"),
    ],
    words: [
      l("take a shower", "tomar banho"),
      l("take a break", "fazer uma pausa"),
      l("take a photo", "tirar uma foto"),
      l("take care", "se cuida"),
    ],
    conversation: [
      l("A: How long does it take to get there?", "A: Quanto tempo leva para chegar lá?"),
      l("B: It takes about half an hour by car.", "B: Leva uns trinta minutos de carro."),
      l("A: Should I take a taxi?", "A: Devo pegar um táxi?"),
      l("B: Yes, take a taxi. It's faster.", "B: Sim, pegue um táxi. É mais rápido."),
    ],
  },
  {
    id: "see", base: "see", pt: "ver", say: "sí", past: "saw", participle: "seen",
    ptPresent: ["vejo", "vê", "vemos", "veem"], ptPast: ["vi", "viu", "vimos", "viram"],
    phrases: [
      l("I see my parents every Sunday.", "Eu vejo meus pais todo domingo."),
      l("We saw a great movie.", "Nós vimos um filme ótimo."),
      l("I'll see you tomorrow.", "Te vejo amanhã."),
      l("I see what you mean.", "Entendo o que você quer dizer."),
    ],
    questions: [
      l("Did you see that? Yes, I did. / No, I didn't.", "Você viu aquilo? Sim. / Não."),
      l("Can you see the screen?", "Você consegue ver a tela?"),
      l("When can I see you?", "Quando posso te ver?"),
    ],
    words: [
      l("see you later", "até mais"),
      l("I see", "entendo"),
      l("let's see", "vamos ver"),
    ],
    conversation: [
      l("A: Can you see my screen?", "A: Você consegue ver minha tela?"),
      l("B: Yes, I can see it now.", "B: Sim, estou vendo agora."),
      l("A: Do you see the error here?", "A: Está vendo o erro aqui?"),
      l("B: Yes, I see it.", "B: Sim, estou vendo."),
    ],
  },
  {
    id: "come", base: "come", pt: "vir", say: "kâm", past: "came", participle: "come",
    ptPresent: ["venho", "vem", "vimos", "vêm"], ptPast: ["vim", "veio", "viemos", "vieram"],
    phrases: [
      l("I come from Brazil.", "Eu venho do Brasil."),
      l("She came home late.", "Ela chegou em casa tarde."),
      l("They will come to the party.", "Eles vão vir à festa."),
      l("Come in, please.", "Entre, por favor."),
    ],
    questions: [
      l("Where do you come from?", "De onde você vem?"),
      l("Can you come tomorrow? Yes, I can. / No, I can't.", "Você pode vir amanhã? Sim. / Não."),
      l("When did he come back?", "Quando ele voltou?"),
    ],
    words: [
      l("come back", "voltar"),
      l("come in", "entrar"),
      l("come on!", "vamos! / qual é!"),
    ],
    conversation: [
      l("A: Are you coming to dinner?", "A: Você vem jantar?"),
      l("B: Yes, I'm coming. Give me five minutes.", "B: Sim, já vou. Me dá cinco minutos."),
      l("A: OK. Come in when you're ready.", "A: Ok. Entra quando estiver pronto."),
      l("B: Thanks!", "B: Obrigado!"),
    ],
  },
  {
    id: "want", base: "want", pt: "querer", say: "uánt", past: "wanted",
    ptPresent: ["quero", "quer", "queremos", "querem"], ptPast: ["quis", "quis", "quisemos", "quiseram"],
    phrases: [
      l("I want a coffee, please.", "Eu quero um café, por favor."),
      l("She wants to learn English.", "Ela quer aprender inglês."),
      l("I wanted to call you.", "Eu queria te ligar."),
      l("I don't want to go.", "Eu não quero ir."),
    ],
    questions: [
      l("Do you want some water? Yes, I do. / No, I don't.", "Você quer água? Sim. / Não."),
      l("What do you want to do?", "O que você quer fazer?"),
      l("Where do you want to eat?", "Onde você quer comer?"),
    ],
    words: [
      l("want to", "querer (fazer algo)"),
      l("wanna", "want to, na fala informal"),
      l("would like", "gostaria (mais educado que want)"),
    ],
    conversation: [
      l("A: What do you want to eat?", "A: O que você quer comer?"),
      l("B: I want a pizza.", "B: Quero uma pizza."),
      l("A: Do you want something to drink?", "A: Quer algo para beber?"),
      l("B: Yes, I want a soda.", "B: Sim, quero um refrigerante."),
    ],
  },
  {
    id: "like", base: "like", pt: "gostar", say: "láik", past: "liked",
    ptPresent: ["gosto", "gosta", "gostamos", "gostam"], ptPast: ["gostei", "gostou", "gostamos", "gostaram"],
    note: "Em inglês não tem o de: I like coffee = eu gosto de café.",
    phrases: [
      l("I like coffee.", "Eu gosto de café."),
      l("He likes to play soccer.", "Ele gosta de jogar futebol."),
      l("We liked the movie.", "Nós gostamos do filme."),
      l("I would like a table for two.", "Eu gostaria de uma mesa para dois."),
    ],
    questions: [
      l("Do you like it? Yes, I do. / No, I don't.", "Você gosta? Sim. / Não."),
      l("What do you like to do?", "O que você gosta de fazer?"),
      l("Would you like some tea?", "Você gostaria de um chá?"),
    ],
    words: [
      l("would like", "gostaria"),
      l("like this", "assim, desse jeito"),
      l("look like", "parecer (na aparência)"),
    ],
    conversation: [
      l("A: Do you like your new job?", "A: Você gosta do seu emprego novo?"),
      l("B: Yes, I like it a lot.", "B: Sim, gosto muito."),
      l("A: What do you like most?", "A: Do que você mais gosta?"),
      l("B: I like my team.", "B: Gosto da minha equipe."),
    ],
  },
  {
    id: "need", base: "need", pt: "precisar", say: "níd", past: "needed",
    ptPresent: ["preciso", "precisa", "precisamos", "precisam"], ptPast: ["precisei", "precisou", "precisamos", "precisaram"],
    phrases: [
      l("I need help.", "Eu preciso de ajuda."),
      l("She needs a new phone.", "Ela precisa de um celular novo."),
      l("We needed more time.", "Nós precisávamos de mais tempo."),
      l("You don't need to worry.", "Você não precisa se preocupar."),
    ],
    questions: [
      l("Do you need anything? Yes, I do. / No, I don't.", "Você precisa de alguma coisa? Sim. / Não."),
      l("What do you need?", "Do que você precisa?"),
      l("Do I need a ticket?", "Eu preciso de ingresso?"),
    ],
    words: [
      l("need to", "precisar (fazer algo)"),
      l("no need", "não precisa"),
      l("in need", "necessitado"),
    ],
    conversation: [
      l("A: Do you need help with that?", "A: Precisa de ajuda com isso?"),
      l("B: Yes, I need to move this table.", "B: Sim, preciso mudar esta mesa de lugar."),
      l("A: OK, I'll help you.", "A: Ok, eu te ajudo."),
      l("B: Thanks, I really needed it.", "B: Valeu, eu precisava mesmo."),
    ],
  },
  {
    id: "say", base: "say", pt: "dizer", say: "sêi", past: "said",
    ptPresent: ["digo", "diz", "dizemos", "dizem"], ptPast: ["disse", "disse", "dissemos", "disseram"],
    note: "says soa séz e said soa séd.",
    phrases: [
      l("I always say thank you.", "Eu sempre digo obrigado."),
      l("She said yes!", "Ela disse sim!"),
      l("He says it's fine.", "Ele diz que está tudo bem."),
      l("Don't say that.", "Não diga isso."),
    ],
    questions: [
      l("What did you say?", "O que você disse?"),
      l("How do you say this in English?", "Como se diz isso em inglês?"),
      l("Did she say anything? Yes, she did. / No, she didn't.", "Ela disse alguma coisa? Sim. / Não."),
    ],
    words: [
      l("say hello", "dizer oi, mandar um oi"),
      l("say goodbye", "se despedir"),
      l("say sorry", "pedir desculpa"),
    ],
    conversation: [
      l("A: Sorry, what did you say?", "A: Desculpe, o que você disse?"),
      l("B: I said the meeting is at three.", "B: Eu disse que a reunião é às três."),
      l("A: Can you say that again, slowly?", "A: Pode repetir, devagar?"),
      l("B: Sure. The meeting is at three.", "B: Claro. A reunião é às três."),
    ],
  },
  {
    id: "tell", base: "tell", pt: "contar, dizer a alguém", inf: "contar", say: "tél", past: "told",
    ptPresent: ["conto", "conta", "contamos", "contam"], ptPast: ["contei", "contou", "contamos", "contaram"],
    note: "tell pede a pessoa: tell me, tell her. say não: say hello.",
    phrases: [
      l("Tell me about your day.", "Me conta do seu dia."),
      l("She told me the truth.", "Ela me contou a verdade."),
      l("I'll tell him later.", "Eu conto para ele depois."),
      l("He always tells jokes.", "Ele sempre conta piadas."),
    ],
    questions: [
      l("Can you tell me the time?", "Você pode me dizer as horas?"),
      l("Did you tell her? Yes, I did. / No, I didn't.", "Você contou para ela? Sim. / Não."),
      l("What did he tell you?", "O que ele te disse?"),
    ],
    words: [
      l("tell the truth", "dizer a verdade"),
      l("tell a story", "contar uma história"),
      l("tell the difference", "notar a diferença"),
    ],
    conversation: [
      l("A: Can you tell me where the bathroom is?", "A: Você pode me dizer onde fica o banheiro?"),
      l("B: It's on the left.", "B: Fica à esquerda."),
      l("A: Thanks. And can you tell Ana I'm here?", "A: Obrigado. E pode avisar a Ana que estou aqui?"),
      l("B: Sure, I'll tell her.", "B: Claro, eu aviso."),
    ],
  },
  {
    id: "give", base: "give", pt: "dar", say: "guív", past: "gave", participle: "given",
    ptPresent: ["dou", "dá", "damos", "dão"], ptPast: ["dei", "deu", "demos", "deram"],
    phrases: [
      l("I give English classes.", "Eu dou aulas de inglês."),
      l("She gave me a gift.", "Ela me deu um presente."),
      l("I'll give you a call.", "Eu te ligo."),
      l("Give me a second.", "Me dá um segundo."),
    ],
    questions: [
      l("Can you give me a hand? Yes, I can. / No, I can't.", "Você me dá uma mão? Sim. / Não."),
      l("What did you give him?", "O que você deu para ele?"),
      l("Could you give me directions?", "Você poderia me dar uma direção?"),
    ],
    words: [
      l("give up", "desistir"),
      l("give back", "devolver"),
      l("give a hand", "dar uma mão, ajudar"),
    ],
    conversation: [
      l("A: Can you give me your email?", "A: Você pode me passar seu e-mail?"),
      l("B: Sure. Give me your phone and I'll type it.", "B: Claro. Me dá seu celular que eu digito."),
      l("A: Here you go.", "A: Aqui está."),
      l("B: Done. Don't give up on the project!", "B: Pronto. Não desista do projeto!"),
    ],
  },
  {
    id: "find", base: "find", pt: "encontrar, achar", inf: "encontrar", say: "fáind", past: "found",
    ptPresent: ["encontro", "encontra", "encontramos", "encontram"], ptPast: ["encontrei", "encontrou", "encontramos", "encontraram"],
    phrases: [
      l("I can't find my keys.", "Não consigo achar minhas chaves."),
      l("She found a new apartment.", "Ela encontrou um apartamento novo."),
      l("We'll find a solution.", "Nós vamos encontrar uma solução."),
      l("I find English interesting.", "Eu acho o inglês interessante."),
    ],
    questions: [
      l("Did you find it? Yes, I did. / No, I didn't.", "Você achou? Sim. / Não."),
      l("Where can I find a pharmacy?", "Onde encontro uma farmácia?"),
      l("How did you find this place?", "Como você achou este lugar?"),
    ],
    words: [
      l("find out", "descobrir"),
      l("lost and found", "achados e perdidos"),
      l("find a job", "arranjar um emprego"),
    ],
    conversation: [
      l("A: Did you find the bug?", "A: Você achou o bug?"),
      l("B: Yes, I found it in the login page.", "B: Sim, achei na tela de login."),
      l("A: Great! How did you find out?", "A: Ótimo! Como você descobriu?"),
      l("B: I checked the logs.", "B: Olhei os logs."),
    ],
  },
  {
    id: "work", base: "work", pt: "trabalhar, funcionar", inf: "trabalhar", say: "uârk", past: "worked",
    ptPresent: ["trabalho", "trabalha", "trabalhamos", "trabalham"], ptPast: ["trabalhei", "trabalhou", "trabalhamos", "trabalharam"],
    phrases: [
      l("I work from home.", "Eu trabalho de casa."),
      l("She works in a bank.", "Ela trabalha num banco."),
      l("It doesn't work.", "Não funciona."),
      l("We worked late yesterday.", "Nós trabalhamos até tarde ontem."),
    ],
    questions: [
      l("Where do you work?", "Onde você trabalha?"),
      l("Does it work? Yes, it does. / No, it doesn't.", "Funciona? Sim. / Não."),
      l("Did you work on Saturday?", "Você trabalhou no sábado?"),
    ],
    words: [
      l("work out", "malhar; dar certo"),
      l("at work", "no trabalho"),
      l("teamwork", "trabalho em equipe"),
    ],
    conversation: [
      l("A: Where do you work?", "A: Onde você trabalha?"),
      l("B: I work at a tech company.", "B: Trabalho numa empresa de tecnologia."),
      l("A: Do you work from home?", "A: Você trabalha de casa?"),
      l("B: Yes, I work from home on Fridays.", "B: Sim, às sextas trabalho de casa."),
    ],
  },
  {
    id: "live", base: "live", pt: "morar, viver", inf: "morar", say: "lív", past: "lived",
    ptPresent: ["moro", "mora", "moramos", "moram"], ptPast: ["morei", "morou", "moramos", "moraram"],
    phrases: [
      l("I live in São Paulo.", "Eu moro em São Paulo."),
      l("She lives with her parents.", "Ela mora com os pais."),
      l("We lived in Rio for two years.", "Nós moramos no Rio por dois anos."),
      l("I'd like to live abroad.", "Eu gostaria de morar fora."),
    ],
    questions: [
      l("Where do you live?", "Onde você mora?"),
      l("Do you live alone? Yes, I do. / No, I don't.", "Você mora sozinho? Sim. / Não."),
      l("How long have you lived here?", "Há quanto tempo você mora aqui?"),
    ],
    words: [
      l("live alone", "morar sozinho"),
      l("live abroad", "morar fora do país"),
      l("living room", "sala de estar"),
    ],
    conversation: [
      l("A: Where do you live?", "A: Onde você mora?"),
      l("B: I live near the city center.", "B: Moro perto do centro."),
      l("A: Do you live alone?", "A: Mora sozinho?"),
      l("B: No, I live with my wife.", "B: Não, moro com minha esposa."),
    ],
  },
  {
    id: "study", base: "study", pt: "estudar", say: "stâdi", past: "studied",
    ptPresent: ["estudo", "estuda", "estudamos", "estudam"], ptPast: ["estudei", "estudou", "estudamos", "estudaram"],
    phrases: [
      l("I study English every day.", "Eu estudo inglês todo dia."),
      l("He studies at night.", "Ele estuda à noite."),
      l("I studied for the test.", "Eu estudei para a prova."),
      l("We will study together.", "Nós vamos estudar juntos."),
    ],
    questions: [
      l("What do you study?", "O que você estuda?"),
      l("Did you study yesterday? Yes, I did. / No, I didn't.", "Você estudou ontem? Sim. / Não."),
      l("How long do you study per day?", "Quanto tempo você estuda por dia?"),
    ],
    words: [
      l("study hard", "estudar muito"),
      l("case study", "estudo de caso"),
      l("study group", "grupo de estudo"),
    ],
    conversation: [
      l("A: How do you study English?", "A: Como você estuda inglês?"),
      l("B: I study with an app and watch series.", "B: Estudo com um app e vejo séries."),
      l("A: How much time do you study?", "A: Quanto tempo você estuda?"),
      l("B: About thirty minutes a day.", "B: Uns trinta minutos por dia."),
    ],
  },
  {
    id: "learn", base: "learn", pt: "aprender", say: "lârn", past: "learned",
    ptPresent: ["aprendo", "aprende", "aprendemos", "aprendem"], ptPast: ["aprendi", "aprendeu", "aprendemos", "aprenderam"],
    phrases: [
      l("I learn new words every day.", "Eu aprendo palavras novas todo dia."),
      l("She learned to drive last year.", "Ela aprendeu a dirigir ano passado."),
      l("You will learn fast.", "Você vai aprender rápido."),
      l("We learn from our mistakes.", "Nós aprendemos com nossos erros."),
    ],
    questions: [
      l("What did you learn today?", "O que você aprendeu hoje?"),
      l("Do you want to learn Spanish? Yes, I do. / No, I don't.", "Você quer aprender espanhol? Sim. / Não."),
      l("How did you learn that?", "Como você aprendeu isso?"),
    ],
    words: [
      l("learn by heart", "decorar"),
      l("learn from", "aprender com"),
      l("lesson learned", "lição aprendida"),
    ],
    conversation: [
      l("A: Where did you learn English?", "A: Onde você aprendeu inglês?"),
      l("B: I learned it online.", "B: Aprendi pela internet."),
      l("A: Wow, you learned fast!", "A: Nossa, você aprendeu rápido!"),
      l("B: Thanks! I'm still learning.", "B: Obrigado! Ainda estou aprendendo."),
    ],
  },
  {
    id: "speak", base: "speak", pt: "falar", say: "spík", past: "spoke", participle: "spoken",
    ptPresent: ["falo", "fala", "falamos", "falam"], ptPast: ["falei", "falou", "falamos", "falaram"],
    note: "speak = falar uma língua ou formalmente; talk = conversar.",
    phrases: [
      l("I speak Portuguese and a little English.", "Eu falo português e um pouco de inglês."),
      l("She speaks three languages.", "Ela fala três idiomas."),
      l("I spoke with the manager.", "Eu falei com o gerente."),
      l("Please speak slowly.", "Por favor, fale devagar."),
    ],
    questions: [
      l("Do you speak English? Yes, I do. / No, I don't.", "Você fala inglês? Sim. / Não."),
      l("Can I speak to John?", "Posso falar com o John?"),
      l("Could you speak louder?", "Você poderia falar mais alto?"),
    ],
    words: [
      l("speak up", "falar mais alto; se manifestar"),
      l("public speaking", "falar em público"),
      l("speaker", "palestrante; caixa de som"),
    ],
    conversation: [
      l("A: Do you speak English?", "A: Você fala inglês?"),
      l("B: Yes, a little. Could you speak slowly?", "B: Sim, um pouco. Pode falar devagar?"),
      l("A: Of course. Where are you from?", "A: Claro. De onde você é?"),
      l("B: I'm from Brazil. I speak Portuguese.", "B: Sou do Brasil. Falo português."),
    ],
  },
  {
    id: "understand", base: "understand", pt: "entender", say: "ân-der-sténd", past: "understood",
    ptPresent: ["entendo", "entende", "entendemos", "entendem"], ptPast: ["entendi", "entendeu", "entendemos", "entenderam"],
    phrases: [
      l("I understand.", "Eu entendo."),
      l("I don't understand this word.", "Não entendo esta palavra."),
      l("She understood everything.", "Ela entendeu tudo."),
      l("You'll understand later.", "Você vai entender depois."),
    ],
    questions: [
      l("Do you understand? Yes, I do. / No, I don't.", "Você entende? Sim. / Não."),
      l("Did you understand the question?", "Você entendeu a pergunta?"),
      l("What don't you understand?", "O que você não entende?"),
    ],
    words: [
      l("understanding", "compreensão"),
      l("misunderstand", "entender errado"),
      l("easy to understand", "fácil de entender"),
    ],
    conversation: [
      l("A: Do you understand the task?", "A: Você entendeu a tarefa?"),
      l("B: Not really. I don't understand step two.", "B: Mais ou menos. Não entendi o passo dois."),
      l("A: No problem, I'll explain it again.", "A: Sem problema, eu explico de novo."),
      l("B: Thanks, now I understand.", "B: Valeu, agora entendi."),
    ],
  },
  {
    id: "read", base: "read", pt: "ler", say: "ríd", past: "read",
    ptPresent: ["leio", "lê", "lemos", "leem"], ptPast: ["li", "leu", "lemos", "leram"],
    note: "Escreve igual no passado, mas a pronúncia muda: read (ríd) e read (réd).",
    phrases: [
      l("I read before bed.", "Eu leio antes de dormir."),
      l("She reads the news every morning.", "Ela lê as notícias toda manhã."),
      l("I read a good book last month.", "Eu li um livro bom mês passado."),
      l("Read it out loud.", "Leia em voz alta."),
    ],
    questions: [
      l("What are you reading?", "O que você está lendo?"),
      l("Did you read my message? Yes, I did. / No, I didn't.", "Você leu minha mensagem? Sim. / Não."),
      l("Can you read this for me?", "Você pode ler isto para mim?"),
    ],
    words: [
      l("read aloud", "ler em voz alta"),
      l("reading", "leitura"),
      l("read between the lines", "ler nas entrelinhas"),
    ],
    conversation: [
      l("A: Did you read the email from the client?", "A: Você leu o e-mail do cliente?"),
      l("B: Not yet. I'll read it now.", "B: Ainda não. Vou ler agora."),
      l("A: Read it carefully, please.", "A: Leia com atenção, por favor."),
      l("B: OK, I'm reading it.", "B: Ok, estou lendo."),
    ],
  },
  {
    id: "write", base: "write", pt: "escrever", say: "ráit", past: "wrote", participle: "written",
    ptPresent: ["escrevo", "escreve", "escrevemos", "escrevem"], ptPast: ["escrevi", "escreveu", "escrevemos", "escreveram"],
    note: "O w não se pronuncia: write soa como right.",
    phrases: [
      l("I write in my journal every night.", "Eu escrevo no meu diário toda noite."),
      l("She wrote a report.", "Ela escreveu um relatório."),
      l("I'll write you an email.", "Vou te escrever um e-mail."),
      l("Write it down.", "Anota isso."),
    ],
    questions: [
      l("How do you write your name?", "Como se escreve seu nome?"),
      l("Did you write the tests? Yes, I did. / No, I didn't.", "Você escreveu os testes? Sim. / Não."),
      l("Can you write it for me?", "Você pode escrever para mim?"),
    ],
    words: [
      l("write down", "anotar"),
      l("writer", "escritor"),
      l("handwriting", "letra (caligrafia)"),
    ],
    conversation: [
      l("A: Can you write your phone number here?", "A: Pode escrever seu telefone aqui?"),
      l("B: Sure. How do you write your name?", "B: Claro. Como se escreve seu nome?"),
      l("A: M-A-R-I-A.", "A: M-A-R-I-A."),
      l("B: Got it. I wrote it down.", "B: Entendi. Já anotei."),
    ],
  },
  {
    id: "eat", base: "eat", pt: "comer", say: "ít", past: "ate", participle: "eaten",
    ptPresent: ["como", "come", "comemos", "comem"], ptPast: ["comi", "comeu", "comemos", "comeram"],
    phrases: [
      l("I eat rice and beans every day.", "Eu como arroz e feijão todo dia."),
      l("She doesn't eat meat.", "Ela não come carne."),
      l("We ate at a nice restaurant.", "Nós comemos num restaurante legal."),
      l("Let's eat out tonight.", "Vamos comer fora hoje à noite."),
    ],
    questions: [
      l("What do you want to eat?", "O que você quer comer?"),
      l("Did you eat lunch? Yes, I did. / No, I didn't.", "Você almoçou? Sim. / Não."),
      l("Do you eat fish?", "Você come peixe?"),
    ],
    words: [
      l("eat out", "comer fora"),
      l("eat healthy", "comer de forma saudável"),
      l("something to eat", "algo para comer"),
    ],
    conversation: [
      l("A: Are you hungry?", "A: Você está com fome?"),
      l("B: Yes, I didn't eat breakfast.", "B: Sim, não tomei café da manhã."),
      l("A: Let's eat something now.", "A: Vamos comer alguma coisa agora."),
      l("B: Good idea!", "B: Boa ideia!"),
    ],
  },
  {
    id: "drink", base: "drink", pt: "beber", say: "drínk", past: "drank", participle: "drunk",
    ptPresent: ["bebo", "bebe", "bebemos", "bebem"], ptPast: ["bebi", "bebeu", "bebemos", "beberam"],
    phrases: [
      l("I drink a lot of water.", "Eu bebo muita água."),
      l("He doesn't drink coffee.", "Ele não bebe café."),
      l("We drank juice at breakfast.", "Nós tomamos suco no café da manhã."),
      l("I'll drink some tea.", "Vou tomar um chá."),
    ],
    questions: [
      l("What would you like to drink?", "O que você gostaria de beber?"),
      l("Do you drink alcohol? Yes, I do. / No, I don't.", "Você bebe álcool? Sim. / Não."),
      l("Did you drink enough water today?", "Você bebeu água suficiente hoje?"),
    ],
    words: [
      l("a drink", "uma bebida"),
      l("soft drink", "refrigerante"),
      l("drinking water", "água potável"),
    ],
    conversation: [
      l("A: What would you like to drink?", "A: O que vai beber?"),
      l("B: I'll have an orange juice, please.", "B: Um suco de laranja, por favor."),
      l("A: With ice?", "A: Com gelo?"),
      l("B: No ice, thanks.", "B: Sem gelo, obrigado."),
    ],
  },
  {
    id: "buy", base: "buy", pt: "comprar", say: "bái", past: "bought",
    ptPresent: ["compro", "compra", "compramos", "compram"], ptPast: ["comprei", "comprou", "compramos", "compraram"],
    phrases: [
      l("I buy fruit at the market.", "Eu compro frutas na feira."),
      l("She bought a new laptop.", "Ela comprou um notebook novo."),
      l("We'll buy the tickets online.", "Nós vamos comprar os ingressos pela internet."),
      l("I can't buy it now.", "Não posso comprar isso agora."),
    ],
    questions: [
      l("Where did you buy it?", "Onde você comprou?"),
      l("Did you buy milk? Yes, I did. / No, I didn't.", "Você comprou leite? Sim. / Não."),
      l("Can I buy you a coffee?", "Posso te pagar um café?"),
    ],
    words: [
      l("buy online", "comprar pela internet"),
      l("buyer", "comprador"),
      l("buy one, get one free", "compre um, leve dois"),
    ],
    conversation: [
      l("A: I like your shoes. Where did you buy them?", "A: Gostei do seu tênis. Onde você comprou?"),
      l("B: I bought them online.", "B: Comprei pela internet."),
      l("A: Were they expensive?", "A: Foi caro?"),
      l("B: No, I bought them on sale.", "B: Não, comprei na promoção."),
    ],
  },
  {
    id: "pay", base: "pay", pt: "pagar", say: "pêi", past: "paid",
    ptPresent: ["pago", "paga", "pagamos", "pagam"], ptPast: ["paguei", "pagou", "pagamos", "pagaram"],
    phrases: [
      l("I pay the rent every month.", "Eu pago o aluguel todo mês."),
      l("He paid by card.", "Ele pagou no cartão."),
      l("I'll pay for dinner.", "Eu pago o jantar."),
      l("Pay attention.", "Preste atenção."),
    ],
    questions: [
      l("Can I pay by card? Yes, you can. / No, you can't.", "Posso pagar no cartão? Sim. / Não."),
      l("How much did you pay?", "Quanto você pagou?"),
      l("Who is paying?", "Quem vai pagar?"),
    ],
    words: [
      l("pay attention", "prestar atenção"),
      l("pay back", "devolver (dinheiro)"),
      l("payment", "pagamento"),
    ],
    conversation: [
      l("A: How would you like to pay?", "A: Como vai pagar?"),
      l("B: Can I pay by card?", "B: Posso pagar no cartão?"),
      l("A: Yes, of course.", "A: Sim, claro."),
      l("B: Great. I'll pay in one installment.", "B: Ótimo. Vou pagar à vista."),
    ],
  },
  {
    id: "call", base: "call", pt: "ligar, chamar", inf: "ligar", say: "kól", past: "called",
    ptPresent: ["ligo", "liga", "ligamos", "ligam"], ptPast: ["liguei", "ligou", "ligamos", "ligaram"],
    phrases: [
      l("I call my mom every day.", "Eu ligo para minha mãe todo dia."),
      l("She called you this morning.", "Ela te ligou hoje de manhã."),
      l("I'll call you back.", "Eu te ligo de volta."),
      l("My name is Ana, but they call me Aninha.", "Meu nome é Ana, mas me chamam de Aninha."),
    ],
    questions: [
      l("Can you call me later? Yes, I can. / No, I can't.", "Você pode me ligar depois? Sim. / Não."),
      l("Who called?", "Quem ligou?"),
      l("What do you call this in English?", "Como se chama isto em inglês?"),
    ],
    words: [
      l("call back", "retornar a ligação"),
      l("phone call", "ligação"),
      l("video call", "chamada de vídeo"),
    ],
    conversation: [
      l("A: Hi, did you call me?", "A: Oi, você me ligou?"),
      l("B: Yes, I called you twice.", "B: Sim, liguei duas vezes."),
      l("A: Sorry, I was in a meeting. Can I call you back in ten minutes?", "A: Desculpa, estava numa reunião. Posso te ligar em dez minutos?"),
      l("B: Sure, call me back.", "B: Claro, me liga."),
    ],
  },
  {
    id: "ask", base: "ask", pt: "perguntar, pedir", inf: "perguntar", say: "ésk", past: "asked",
    ptPresent: ["pergunto", "pergunta", "perguntamos", "perguntam"], ptPast: ["perguntei", "perguntou", "perguntamos", "perguntaram"],
    phrases: [
      l("Can I ask a question?", "Posso fazer uma pergunta?"),
      l("She asked me for help.", "Ela me pediu ajuda."),
      l("I'll ask the teacher.", "Vou perguntar ao professor."),
      l("He always asks good questions.", "Ele sempre faz boas perguntas."),
    ],
    questions: [
      l("Did you ask him? Yes, I did. / No, I didn't.", "Você perguntou para ele? Sim. / Não."),
      l("Can I ask you something?", "Posso te perguntar uma coisa?"),
      l("Why do you ask?", "Por que você pergunta?"),
    ],
    words: [
      l("ask for", "pedir (algo)"),
      l("ask out", "chamar para sair"),
      l("ask a question", "fazer uma pergunta"),
    ],
    conversation: [
      l("A: Excuse me, can I ask you something?", "A: Com licença, posso te perguntar uma coisa?"),
      l("B: Sure, go ahead.", "B: Claro, pode falar."),
      l("A: Where is the nearest bus stop?", "A: Onde fica o ponto de ônibus mais perto?"),
      l("B: I don't know. Ask the security guard.", "B: Não sei. Pergunte ao segurança."),
    ],
  },
  {
    id: "help", base: "help", pt: "ajudar", say: "rrélp", past: "helped",
    ptPresent: ["ajudo", "ajuda", "ajudamos", "ajudam"], ptPast: ["ajudei", "ajudou", "ajudamos", "ajudaram"],
    phrases: [
      l("I help my kids with homework.", "Eu ajudo meus filhos com a lição."),
      l("She helped me a lot.", "Ela me ajudou muito."),
      l("I'll help you tomorrow.", "Eu te ajudo amanhã."),
      l("Help!", "Socorro!"),
    ],
    questions: [
      l("Can you help me? Yes, I can. / No, I can't.", "Você pode me ajudar? Sim. / Não."),
      l("How can I help you?", "Como posso te ajudar?"),
      l("Do you need help?", "Precisa de ajuda?"),
    ],
    words: [
      l("help desk", "suporte, central de ajuda"),
      l("helpful", "útil, prestativo"),
      l("can't help it", "não consigo evitar"),
    ],
    conversation: [
      l("A: Hi, how can I help you?", "A: Olá, como posso te ajudar?"),
      l("B: I can't log in to my account.", "B: Não consigo entrar na minha conta."),
      l("A: I'll help you reset your password.", "A: Vou te ajudar a trocar a senha."),
      l("B: Thank you, that helped a lot.", "B: Obrigado, ajudou muito."),
    ],
  },
  {
    id: "try", base: "try", pt: "tentar, experimentar", inf: "tentar", say: "trái", past: "tried",
    ptPresent: ["tento", "tenta", "tentamos", "tentam"], ptPast: ["tentei", "tentou", "tentamos", "tentaram"],
    phrases: [
      l("I try to study every day.", "Eu tento estudar todo dia."),
      l("She tried a new recipe.", "Ela experimentou uma receita nova."),
      l("I'll try again tomorrow.", "Vou tentar de novo amanhã."),
      l("Try this cake!", "Experimenta este bolo!"),
    ],
    questions: [
      l("Did you try it? Yes, I did. / No, I didn't.", "Você experimentou? Sim. / Não."),
      l("Can I try this on?", "Posso provar isto?"),
      l("Why don't you try again?", "Por que você não tenta de novo?"),
    ],
    words: [
      l("try on", "provar (roupa)"),
      l("try out", "testar"),
      l("give it a try", "tentar, dar uma chance"),
    ],
    conversation: [
      l("A: Can I try this shirt on?", "A: Posso provar esta camisa?"),
      l("B: Sure, the fitting room is over there.", "B: Claro, o provador fica ali."),
      l("A: It's too small. Can I try a bigger one?", "A: Ficou pequena. Posso provar uma maior?"),
      l("B: Of course. Try this one.", "B: Claro. Prova esta."),
    ],
  },
  {
    id: "use", base: "use", pt: "usar", say: "iúz", past: "used",
    ptPresent: ["uso", "usa", "usamos", "usam"], ptPast: ["usei", "usou", "usamos", "usaram"],
    note: "used to = costumava: I used to live there.",
    phrases: [
      l("I use my phone a lot.", "Eu uso muito o celular."),
      l("She uses this app to study.", "Ela usa este app para estudar."),
      l("I used to play guitar.", "Eu costumava tocar violão."),
      l("We will use the new system.", "Nós vamos usar o sistema novo."),
    ],
    questions: [
      l("Can I use your pen? Yes, you can. / No, you can't.", "Posso usar sua caneta? Sim. / Não."),
      l("What do you use it for?", "Para que você usa isso?"),
      l("Did you use the coupon?", "Você usou o cupom?"),
    ],
    words: [
      l("used to", "costumava"),
      l("useful", "útil"),
      l("user", "usuário"),
    ],
    conversation: [
      l("A: Can I use your charger?", "A: Posso usar seu carregador?"),
      l("B: Sure. Do you use USB-C?", "B: Claro. Você usa USB-C?"),
      l("A: Yes, I do.", "A: Uso, sim."),
      l("B: Here, use this one.", "B: Toma, usa este."),
    ],
  },
  {
    id: "feel", base: "feel", pt: "sentir", say: "fíl", past: "felt",
    ptPresent: ["sinto", "sente", "sentimos", "sentem"], ptPast: ["senti", "sentiu", "sentimos", "sentiram"],
    phrases: [
      l("I feel tired today.", "Estou me sentindo cansado hoje."),
      l("She feels better now.", "Ela está se sentindo melhor agora."),
      l("I felt nervous in the interview.", "Eu fiquei nervoso na entrevista."),
      l("Feel free to ask.", "Fique à vontade para perguntar."),
    ],
    questions: [
      l("How do you feel?", "Como você está se sentindo?"),
      l("Do you feel better? Yes, I do. / No, I don't.", "Está se sentindo melhor? Sim. / Não."),
      l("Do you feel like going out?", "Você está a fim de sair?"),
    ],
    words: [
      l("feel like", "estar a fim de"),
      l("feel free", "ficar à vontade"),
      l("feeling", "sentimento"),
    ],
    conversation: [
      l("A: How do you feel today?", "A: Como você está hoje?"),
      l("B: I feel a little sick.", "B: Estou me sentindo meio mal."),
      l("A: Do you feel like going home?", "A: Quer ir para casa?"),
      l("B: Yes, I think I'll go.", "B: Sim, acho que vou."),
    ],
  },
  {
    id: "leave", base: "leave", pt: "sair, deixar", inf: "sair", say: "líiv", past: "left",
    ptPresent: ["saio", "sai", "saímos", "saem"], ptPast: ["saí", "saiu", "saímos", "saíram"],
    phrases: [
      l("I leave home at eight.", "Eu saio de casa às oito."),
      l("She left her bag on the bus.", "Ela deixou a bolsa no ônibus."),
      l("The train will leave soon.", "O trem vai sair logo."),
      l("Leave me alone.", "Me deixa em paz."),
    ],
    questions: [
      l("What time do you leave work?", "Que horas você sai do trabalho?"),
      l("Did he leave already? Yes, he did. / No, he didn't.", "Ele já saiu? Sim. / Não."),
      l("Can I leave a message?", "Posso deixar um recado?"),
    ],
    words: [
      l("leave a message", "deixar recado"),
      l("leave early", "sair cedo"),
      l("on leave", "de licença"),
    ],
    conversation: [
      l("A: What time are you leaving?", "A: Que horas você vai sair?"),
      l("B: I'm leaving at six.", "B: Vou sair às seis."),
      l("A: Can you leave the key with me?", "A: Pode deixar a chave comigo?"),
      l("B: Sure, I'll leave it on your desk.", "B: Claro, deixo na sua mesa."),
    ],
  },
  {
    id: "put", base: "put", pt: "colocar, pôr", inf: "colocar", say: "pút", past: "put",
    ptPresent: ["coloco", "coloca", "colocamos", "colocam"], ptPast: ["coloquei", "colocou", "colocamos", "colocaram"],
    note: "Igual no presente, no passado e no particípio: put, put, put.",
    phrases: [
      l("I put my keys on the table.", "Eu coloco as chaves na mesa."),
      l("She put on her jacket.", "Ela vestiu a jaqueta."),
      l("I'll put it in the box.", "Vou colocar isso na caixa."),
      l("Put it away, please.", "Guarda isso, por favor."),
    ],
    questions: [
      l("Where did you put my phone?", "Onde você colocou meu celular?"),
      l("Can I put this here? Yes, you can. / No, you can't.", "Posso colocar isto aqui? Sim. / Não."),
      l("Did you put sugar in it?", "Você colocou açúcar?"),
    ],
    words: [
      l("put on", "vestir"),
      l("put away", "guardar"),
      l("put off", "adiar"),
    ],
    conversation: [
      l("A: Where should I put these boxes?", "A: Onde coloco estas caixas?"),
      l("B: Put them in the kitchen.", "B: Coloca na cozinha."),
      l("A: Done. Should I put the plates away?", "A: Pronto. Guardo os pratos?"),
      l("B: Yes, please.", "B: Sim, por favor."),
    ],
  },
  {
    id: "keep", base: "keep", pt: "manter, guardar, continuar", inf: "manter", say: "kíp", past: "kept",
    ptPresent: ["mantenho", "mantém", "mantemos", "mantêm"], ptPast: ["mantive", "manteve", "mantivemos", "mantiveram"],
    phrases: [
      l("Keep going!", "Continue!"),
      l("I keep my documents in this folder.", "Eu guardo meus documentos nesta pasta."),
      l("She kept the secret.", "Ela guardou o segredo."),
      l("Keep the change.", "Pode ficar com o troco."),
    ],
    questions: [
      l("Can you keep a secret? Yes, I can. / No, I can't.", "Você sabe guardar segredo? Sim. / Não."),
      l("Where do you keep the keys?", "Onde você guarda as chaves?"),
      l("Why do you keep doing that?", "Por que você continua fazendo isso?"),
    ],
    words: [
      l("keep in touch", "manter contato"),
      l("keep calm", "manter a calma"),
      l("keep up", "acompanhar o ritmo"),
    ],
    conversation: [
      l("A: I'm moving to another city.", "A: Vou me mudar para outra cidade."),
      l("B: Oh no! Let's keep in touch.", "B: Ah, não! Vamos manter contato."),
      l("A: Sure, I'll keep you posted.", "A: Claro, vou te mantendo informado."),
      l("B: Keep me updated!", "B: Me mantém atualizado!"),
    ],
  },
  {
    id: "start", base: "start", pt: "começar", say: "stárt", past: "started",
    ptPresent: ["começo", "começa", "começamos", "começam"], ptPast: ["comecei", "começou", "começamos", "começaram"],
    phrases: [
      l("I start work at nine.", "Eu começo a trabalhar às nove."),
      l("The movie starts at eight.", "O filme começa às oito."),
      l("We started the project last week.", "Nós começamos o projeto semana passada."),
      l("Let's start!", "Vamos começar!"),
    ],
    questions: [
      l("When does the class start?", "Quando a aula começa?"),
      l("Did you start the course? Yes, I did. / No, I didn't.", "Você começou o curso? Sim. / Não."),
      l("Can we start now?", "Podemos começar agora?"),
    ],
    words: [
      l("start over", "começar de novo"),
      l("starting point", "ponto de partida"),
      l("start up", "ligar (máquina); startup (empresa)"),
    ],
    conversation: [
      l("A: Can we start the meeting?", "A: Podemos começar a reunião?"),
      l("B: Let's wait two minutes. Ana is coming.", "B: Vamos esperar dois minutos. A Ana está chegando."),
      l("A: OK. We'll start at 10:05.", "A: Ok. Começamos às 10h05."),
      l("B: Perfect.", "B: Perfeito."),
    ],
  },
];

function toVerb(spec: VerbSpec): Verb {
  const { ptPresent: _a, ptPast, participle, ...rest } = spec;
  const part = participle ?? spec.past;
  const [, pastSay] = FORM_SAY[spec.id] ?? ["", plainSay(spec.say)];
  return {
    ...rest,
    label: `to ${spec.base}`,
    participle: part,
    table: buildTable(spec),
    forms: {
      ing: ingForm(spec.base),
      participle: part,
      say: {
        base: plainSay(spec.say),
        ing: ING_SAY[spec.id] ?? `${plainSay(spec.say)}-ing`,
        participle: PARTICIPLE_SAY[spec.id] ?? pastSay,
      },
      pt: [{ inf: spec.inf ?? spec.pt.split(",")[0].trim(), past: ptPast }],
    },
  };
}

/** Os 40 verbos, com o to be primeiro. Ordem de frequência no dia a dia. */
export const VERBS: Verb[] = [BE, ...SPECS.map(toVerb)];

/** Verbo pelo id; se não existir (valor salvo antigo), volta para o to be. */
export function findVerb(id: string): Verb {
  return VERBS.find((v) => v.id === id) ?? VERBS[0];
}

/* ---------- outros tempos verbais ---------- */

export type TenseId = "basic" | "presentContinuous" | "pastContinuous" | "goingTo" | "presentPerfect" | "would";
export type OtherTense = Exclude<TenseId, "basic">;

/** Textos do bloco de explicação que aparece antes da tabela. */
export type TenseInfo = {
  id: TenseId;
  name: string;
  /** Exemplo curto em português, mostrado no seletor. */
  label: string;
  what: string;
  pt: string;
  how: string;
  negative: string;
  question: string;
  tip: string;
  /** Situações de uso, cada uma com uma frase-exemplo fixa. */
  when: { text: string; ex: Line }[];
  /** Regras de escrita (terminações, formas irregulares, contrações). */
  spelling: string[];
  /** Palavras que costumam aparecer junto com o tempo. */
  signals: { en: string; pt: string }[];
  /** Erros comuns de quem fala português. */
  mistakes: { wrong: string; right: string; why: string }[];
  /** Só no Básico: pronúncia das terminações -s e -ed. */
  endings?: { text: string; ex: Line }[];
};

export type TenseRow = {
  person: string;
  affirmative: Line;
  negative: Line;
  question: Line;
  short: string[];
  shortSay: string[];
};

const sg = (en: string, pt: string) => ({ en, pt });
const err = (wrong: string, right: string, why: string) => ({ wrong, right, why });

export const TENSES: TenseInfo[] = [
  {
    id: "basic",
    name: "Básico",
    label: "presente, passado e futuro",
    what: "São as três formas que você mais vai usar. O presente fala da rotina e do que é sempre verdade. O passado fala do que já aconteceu e terminou. O futuro com will fala do que vai acontecer: uma decisão tomada na hora, uma promessa ou uma previsão.",
    pt: "Presente (eu trabalho), pretérito perfeito (eu trabalhei) e futuro (eu vou trabalhar).",
    how: "Presente: pessoa + verbo (com he, she, it o verbo ganha -s). Passado: pessoa + verbo no passado. Futuro: pessoa + will + verbo.",
    negative: "Presente: do not / does not antes do verbo. Passado: did not. Futuro: will not. No to be, o not vem depois de am / is / are / was / were.",
    question: "Do / Does / Did / Will vão para a frente da pessoa. No to be, am / is / are / was / were vão para a frente.",
    tip: "O texto entre parênteses é a pronúncia aproximada, escrita com sons do português. Na conversa, as formas curtas (don't, didn't, won't, I'll) são as mais comuns.",
    when: [
      { text: "Presente: rotina, hábito ou algo que é sempre verdade.", ex: l("I work every day.", "Eu trabalho todos os dias.", "ái uârk é-vri dêi") },
      { text: "Passado: algo que começou e terminou, muitas vezes dizendo quando.", ex: l("I worked yesterday.", "Eu trabalhei ontem.", "ái uârkt iés-ter-dêi") },
      { text: "Futuro com will: decisão tomada na hora, enquanto você fala.", ex: l("The phone is ringing. I'll get it.", "O telefone está tocando. Eu atendo.", "dâ fôun íz rín-guing. áil guét ít") },
      { text: "Futuro com will: promessa ou oferta de ajuda.", ex: l("I'll help you.", "Eu te ajudo.", "áil rrélp iú") },
      { text: "Futuro com will: previsão, o que você acha que vai acontecer.", ex: l("It will be cold tomorrow.", "Vai fazer frio amanhã.", "ít uíl bí kôuld tu-mó-rou") },
    ],
    spelling: [
      "Presente com he, she, it: o verbo ganha -s (work → works, like → likes).",
      "Se termina em s, sh, ch, x, z ou o, ganha -es (watch → watches, go → goes, do → does).",
      "Se termina em consoante + y, troque o y por -ies (study → studies). Com vogal + y, só -s (play → plays).",
      "Have vira has com he, she, it (she has).",
      "Passado regular: -ed (work → worked). Se já termina em e, só -d (like → liked). Consoante + y vira -ied (study → studied). Palavra curta terminada em consoante + vogal + consoante dobra a última letra (stop → stopped).",
      "Passado irregular não segue regra (go → went, make → made, get → got). Esses a gente decora: a tabela abaixo mostra o passado de cada verbo.",
      "Na negativa e na pergunta do passado, o did já mostra que é passado, então o verbo volta à forma normal: I did not go (e não went).",
      "No futuro, will é igual para todas as pessoas e o verbo fica na forma normal: he will work.",
    ],
    endings: [
      { text: "-s com som de \"s\" depois dos sons p, t, k e f.", ex: l("He works.", "Ele trabalha.", "rrí uârks") },
      { text: "-s com som de \"z\" depois de vogal e da maioria das consoantes.", ex: l("She plays.", "Ela joga.", "chí plêiz") },
      { text: "-es com som de \"iz\" depois de s, sh, ch, x e z: aqui sim ganha uma sílaba.", ex: l("He watches TV.", "Ele assiste TV.", "rrí uó-tchiz tí-ví") },
      { text: "-ed com som de \"t\" depois dos sons p, k, s, sh, ch e f.", ex: l("I worked.", "Eu trabalhei.", "ái uârkt") },
      { text: "-ed com som de \"d\" depois de vogal e das outras consoantes.", ex: l("I played.", "Eu joguei.", "ái plêid") },
      { text: "-ed com som de \"id\" só depois de t ou d: é o único caso em que ganha uma sílaba.", ex: l("I wanted.", "Eu quis.", "ái uán-tid") },
      { text: "Cuidado: fora isso, o -ed não vira sílaba nova. Asked é \"éskt\", e não \"és-ked\".", ex: l("I asked.", "Eu perguntei.", "ái éskt") },
    ],
    signals: [
      sg("every day", "todo dia"), sg("usually", "normalmente"), sg("always", "sempre"), sg("never", "nunca"),
      sg("yesterday", "ontem"), sg("last week", "semana passada"), sg("two days ago", "dois dias atrás"),
      sg("tomorrow", "amanhã"), sg("next year", "ano que vem"), sg("later", "mais tarde"),
    ],
    mistakes: [
      err("He work.", "He works.", "Com he, she e it, o verbo do presente ganha -s."),
      err("I didn't worked.", "I didn't work.", "Depois de did, o verbo volta à forma normal: o did já mostra que é passado."),
      err("Do you went?", "Did you go?", "Pergunta no passado usa did, e o verbo fica na forma normal."),
      err("I will to work.", "I will work.", "Depois de will não vem to."),
    ],
  },
  {
    id: "presentContinuous",
    name: "Present continuous",
    label: "estou fazendo",
    what: "Fala de algo acontecendo agora, enquanto você fala, ou de uma situação temporária destes dias. Também serve para um compromisso já marcado para breve.",
    pt: "Estar + verbo terminado em -ndo: eu estou trabalhando.",
    how: "Pessoa + am / is / are + verbo com -ing. Am com I; is com he, she, it; are com you, we, they.",
    negative: "Coloque not depois de am / is / are.",
    question: "Am / Is / Are vão para a frente da pessoa.",
    tip: "Costuma vir com now (agora), right now (neste momento) e today (hoje).",
    when: [
      { text: "Acontecendo agora, neste momento.", ex: l("I am working now.", "Eu estou trabalhando agora.", "ái ém uâr-king náu") },
      { text: "Situação temporária, destes dias (não é para sempre).", ex: l("She is studying English this month.", "Ela está estudando inglês este mês.", "chí íz stâ-di-ing ín-glich dís mânth") },
      { text: "Compromisso já marcado para breve.", ex: l("We are meeting the client tomorrow.", "Nós vamos encontrar o cliente amanhã.", "uí ár mí-ting dâ klái-ent tu-mó-rou") },
    ],
    spelling: [
      "Na maioria dos verbos, só acrescente -ing: work → working, speak → speaking.",
      "Se termina em e que não se fala, tire o e: make → making, write → writing. Exceções: be → being, see → seeing.",
      "Palavra curta terminada em consoante + vogal + consoante: dobre a última letra (get → getting, put → putting, stop → stopping).",
      "Se termina em ie, troque por -ying: die → dying, lie → lying.",
      "Na conversa: I am vira I'm, he is vira he's, you are vira you're.",
    ],
    signals: [
      sg("now", "agora"), sg("right now", "neste momento"), sg("at the moment", "no momento"),
      sg("today", "hoje"), sg("this week", "esta semana"), sg("Look!", "Olha!"),
    ],
    mistakes: [
      err("I working.", "I am working.", "Sem am / is / are, a frase fica sem o \"estar\"."),
      err("I am knowing the answer.", "I know the answer.", "Verbos de estado (know, want, like, need) quase não vão para o -ing."),
      err("She are working.", "She is working.", "Com he, she e it, use is."),
    ],
  },
  {
    id: "pastContinuous",
    name: "Past continuous",
    label: "eu estava fazendo",
    what: "Fala de algo que estava em andamento num momento do passado. Muitas vezes aparece junto com outra ação curta que interrompeu: eu estava trabalhando quando você ligou.",
    pt: "Pretérito imperfeito: eu estava trabalhando (ou eu trabalhava).",
    how: "Pessoa + was / were + verbo com -ing. Was para I, he, she, it; were para you, we, they.",
    negative: "Coloque not depois de was / were.",
    question: "Was / Were vão para a frente da pessoa.",
    tip: "Muito usado com when: I was working when you called (eu estava trabalhando quando você ligou).",
    when: [
      { text: "Ação em andamento num horário do passado.", ex: l("At eight o'clock I was working.", "Às oito horas eu estava trabalhando.", "ét êit o-klók ái uóz uâr-king") },
      { text: "Ação longa interrompida por outra curta (com when).", ex: l("I was working when you called.", "Eu estava trabalhando quando você ligou.", "ái uóz uâr-king uén iú kóld") },
      { text: "Duas ações acontecendo ao mesmo tempo (com while).", ex: l("She was reading while I was cooking.", "Ela estava lendo enquanto eu estava cozinhando.", "chí uóz rí-ding uáil ái uóz kú-king") },
    ],
    spelling: [
      "Was com I, he, she, it. Were com you, we, they.",
      "O -ing segue as mesmas regras do Present continuous: make → making, get → getting.",
      "Na conversa: was not vira wasn't, e were not vira weren't.",
    ],
    signals: [
      sg("when", "quando"), sg("while", "enquanto"), sg("at eight o'clock", "às oito horas"),
      sg("yesterday at noon", "ontem ao meio-dia"), sg("all day", "o dia todo"),
    ],
    mistakes: [
      err("They was working.", "They were working.", "Com you, we e they, use were."),
      err("I was work.", "I was working.", "Depois de was / were, o verbo leva -ing."),
      err("When you called, I worked.", "When you called, I was working.", "Para dizer o que estava em andamento, use was / were + -ing."),
    ],
  },
  {
    id: "goingTo",
    name: "Going to",
    label: "vou fazer (planejado)",
    what: "Fala de um plano ou de uma intenção que você já decidiu antes de falar. Também serve para prever algo que você já está vendo que vai acontecer (olha as nuvens: vai chover).",
    pt: "Futuro com ir: eu vou trabalhar.",
    how: "Pessoa + am / is / are + going to + verbo.",
    negative: "Coloque not depois de am / is / are.",
    question: "Am / Is / Are vão para a frente da pessoa.",
    tip: "Will é para decidir na hora ou prever; going to é para o que já está planejado. Na fala, going to vira gonna.",
    when: [
      { text: "Plano já decidido.", ex: l("I am going to travel next month.", "Eu vou viajar no mês que vem.", "ái ém gôu-ing tu tré-vel nékst mânth") },
      { text: "Previsão com base no que você está vendo.", ex: l("Look at the sky. It is going to rain.", "Olha o céu. Vai chover.", "lúk ét dâ skái. ít íz gôu-ing tu rêin") },
      { text: "Intenção: o que você pretende fazer.", ex: l("We are going to study tonight.", "Nós vamos estudar hoje à noite.", "uí ár gôu-ing tu stâ-di tu-náit") },
    ],
    spelling: [
      "Depois de going to, o verbo fica na forma normal, sem -ing e sem -s: going to work.",
      "Am / is / are muda com a pessoa; o going to não muda.",
      "Na fala, going to vira gonna (gâ-na): I'm gonna work. Na escrita formal, use going to.",
    ],
    signals: [
      sg("tomorrow", "amanhã"), sg("next week", "semana que vem"), sg("tonight", "hoje à noite"),
      sg("soon", "em breve"), sg("this weekend", "este fim de semana"),
    ],
    mistakes: [
      err("I going to work.", "I am going to work.", "Falta am / is / are antes de going to."),
      err("I am going to working.", "I am going to work.", "Depois de going to, o verbo fica na forma normal."),
      err("She are going to travel.", "She is going to travel.", "Com he, she e it, use is."),
    ],
  },
  {
    id: "presentPerfect",
    name: "Present perfect",
    label: "eu já fiz",
    what: "Fala de algo que já aconteceu em algum momento até agora, sem dizer quando. Serve para experiências de vida (você já foi?), para novidades e resultados, e para o que começou no passado e continua até hoje.",
    pt: "Não tem um igual em português. Pense em \"já\" + passado: eu já trabalhei.",
    how: "Pessoa + have / has + particípio do verbo. Has para he, she, it.",
    negative: "Coloque not depois de have / has: I have not = eu ainda não.",
    question: "Have / Has vão para a frente da pessoa: Have you...? = Você já...?",
    tip: "Se disser quando (yesterday, last year), use o passado do Básico: I worked yesterday. Palavras comuns aqui: already (já), ever (alguma vez), never (nunca), yet (ainda).",
    when: [
      { text: "Experiência de vida, sem dizer quando.", ex: l("I have been to London.", "Eu já fui a Londres.", "ái rrév bín tu lân-dân") },
      { text: "Algo que já aconteceu (ou ainda não) até agora.", ex: l("I have finished the report.", "Eu já terminei o relatório.", "ái rrév fí-nicht dâ ri-pórt") },
      { text: "Começou no passado e continua até hoje (com for ou since).", ex: l("I have lived here for five years.", "Eu moro aqui há cinco anos.", "ái rrév lívd rrír fór fáiv iírz") },
    ],
    spelling: [
      "Have com I, you, we, they. Has com he, she, it.",
      "Particípio dos verbos regulares é igual ao passado: work → worked, study → studied.",
      "Particípio dos irregulares a gente decora: go → gone, do → done, see → seen, eat → eaten, make → made. A tabela abaixo mostra o de cada verbo.",
      "Na conversa: I have vira I've, he has vira he's, have not vira haven't.",
    ],
    signals: [
      sg("already", "já"), sg("ever", "alguma vez"), sg("never", "nunca"), sg("yet", "ainda (na negativa e na pergunta)"),
      sg("just", "acabou de"), sg("for", "há (quanto tempo)"), sg("since", "desde"),
    ],
    mistakes: [
      err("I have worked yesterday.", "I worked yesterday.", "Se disser quando (yesterday, last year), use o passado do Básico."),
      err("He have finished.", "He has finished.", "Com he, she e it, use has."),
      err("I have went.", "I have gone.", "Depois de have / has vem o particípio (gone), e não o passado (went)."),
      err("I live here for five years.", "I have lived here for five years.", "Para \"moro aqui há...\", o inglês usa have + particípio."),
    ],
  },
  {
    id: "would",
    name: "Would",
    label: "eu faria",
    what: "Fala do que você faria numa situação imaginada, que não é real agora. Também é o jeito educado de pedir, oferecer ou perguntar alguma coisa.",
    pt: "Futuro do pretérito: eu trabalharia.",
    how: "Pessoa + would + verbo. É igual para todas as pessoas.",
    negative: "Coloque not depois de would: would not (wouldn't).",
    question: "Would vai para a frente da pessoa.",
    tip: "Pedido educado: I would like a coffee = Eu gostaria de um café. Na fala, I would vira I'd.",
    when: [
      { text: "Pedido educado.", ex: l("I would like a coffee, please.", "Eu gostaria de um café, por favor.", "ái uúd láik â kó-fi, plíz") },
      { text: "Situação imaginada, com if.", ex: l("If I had time, I would travel more.", "Se eu tivesse tempo, eu viajaria mais.", "íf ái rréd táim, ái uúd tré-vel mór") },
      { text: "Pergunta educada.", ex: l("Would you help me?", "Você me ajudaria?", "uúd iú rrélp mí?") },
    ],
    spelling: [
      "Would é igual para todas as pessoas, e o verbo fica na forma normal: he would work.",
      "Na conversa: I would vira I'd, e would not vira wouldn't.",
      "Com if, a parte do if vai para o passado: If I had (e não If I would have).",
    ],
    signals: [
      sg("if", "se"), sg("would like", "gostaria"), sg("please", "por favor"), sg("in your place", "no seu lugar"),
    ],
    mistakes: [
      err("I would to like a coffee.", "I would like a coffee.", "Depois de would não vem to."),
      err("If I would have money, I would travel.", "If I had money, I would travel.", "Na parte do if, use o passado (had), e não would."),
      err("He woulds work.", "He would work.", "Would não ganha -s."),
    ],
  },
];

/** Verbos de estado: quase nunca vão para o contínuo ("I am knowing" está errado). */
export const STATIVE = new Set(["be", "know", "want", "need", "like", "understand", "see", "have"]);

const BE_EN_NOW = ["am", "are", "is", "is", "is", "are", "are"];
const BE_EN_WAS = ["was", "were", "was", "was", "was", "were", "were"];
const ESTAR_NOW = ["estou", "está", "está", "está", "está", "estamos", "estão"];
const ESTAR_WAS = ["estava", "estava", "estava", "estava", "estava", "estávamos", "estavam"];
const HAVE_SHORT = ["I've", "You've", "He's", "She's", "It's", "We've", "They've"];
const HAVE_SHORT_SAY = ["áiv", "iúv", "rríz", "chíz", "íts", "uív", "dêiv"];
const WOULD_SHORT = ["I'd", "You'd", "He'd", "She'd", "It'd", "We'd", "They'd"];
const WOULD_SHORT_SAY = ["áid", "iúd", "rríd", "chíd", "í-ted", "uíd", "dêid"];

/** Forma com -ing: working, making, getting, seeing, studying. */
export function ingForm(base: string): string {
  if (/ie$/.test(base)) return base.slice(0, -2) + "ying";
  if (base !== "be" && /[^aeiou]e$/.test(base)) return base.slice(0, -1) + "ing";
  if (/^[^aeiou]*[aeiou][bdgmnprt]$/.test(base)) return base + base.slice(-1) + "ing";
  return base + "ing";
}

/** Gerúndio em português: trabalhar → trabalhando. */
export function ptGerund(inf: string): string {
  return inf === "pôr" ? "pondo" : inf.slice(0, -1) + "ndo";
}

const CONDITIONAL_STEM: Record<string, string> = { fazer: "far", dizer: "dir", trazer: "trar", pôr: "por" };

/** Futuro do pretérito: eu / você / nós / eles trabalharia(m). */
export function ptConditional(inf: string): PtForms {
  const stem = CONDITIONAL_STEM[inf] ?? inf;
  return [`${stem}ia`, `${stem}ia`, `${stem}íamos`, `${stem}iam`];
}

/** Monta as 7 linhas de um tempo; null para verbo de estado no contínuo. */
export function buildTense(verb: Verb, tense: OtherTense): TenseRow[] | null {
  const continuous = tense === "presentContinuous" || tense === "pastContinuous";
  if (continuous && STATIVE.has(verb.id)) return null;
  const { ing, participle, say } = verb.forms;
  const base = verb.base;
  return PERSONS.map((p, i) => {
    const P = cap(p);
    const S = PERSON_SAY[i];
    const ptP = PT_PERSONS[i];
    const k = PT_INDEX[i];
    const third = THIRD.has(i);
    const be = BE_TABLE[i];
    /** Junta os sentidos em português: "eu vou ser / eu vou estar". */
    const pt = (fn: (v: VerbForms["pt"][number]) => string) => verb.forms.pt.map(fn).join(" / ");
    const row = (
      aff: [string, (v: VerbForms["pt"][number]) => string, string],
      neg: [string, (v: VerbForms["pt"][number]) => string, string],
      q: [string, (v: VerbForms["pt"][number]) => string, string],
      short: string[],
      shortSay: string[],
    ): TenseRow => ({
      person: p,
      affirmative: l(aff[0], pt(aff[1]), aff[2]),
      negative: l(neg[0], pt(neg[1]), neg[2]),
      question: l(q[0], pt(q[1]), q[2]),
      short,
      shortSay,
    });

    switch (tense) {
      case "presentContinuous": {
        const [en, sy, est] = [BE_EN_NOW[i], BE_NOW[i], ESTAR_NOW[i]];
        return row(
          [`${P} ${en} ${ing}`, (v) => `${ptP} ${est} ${ptGerund(v.inf)}`, `${S} ${sy} ${say.ing}`],
          [`${P} ${en} not ${ing}`, (v) => `${ptP} não ${est} ${ptGerund(v.inf)}`, `${S} ${sy} nót ${say.ing}`],
          [`${cap(en)} ${p} ${ing}?`, (v) => `${ptP} ${est} ${ptGerund(v.inf)}?`, `${sy} ${S} ${say.ing}?`],
          [`${be.short[0]} ${ing}`, `${be.short[1]} ${ing}`],
          [`${be.shortSay[0]} ${say.ing}`, `${be.shortSay[1]} ${say.ing}`],
        );
      }
      case "pastContinuous": {
        const [en, sy, est] = [BE_EN_WAS[i], BE_WAS[i], ESTAR_WAS[i]];
        return row(
          [`${P} ${en} ${ing}`, (v) => `${ptP} ${est} ${ptGerund(v.inf)}`, `${S} ${sy} ${say.ing}`],
          [`${P} ${en} not ${ing}`, (v) => `${ptP} não ${est} ${ptGerund(v.inf)}`, `${S} ${sy} nót ${say.ing}`],
          [`${cap(en)} ${p} ${ing}?`, (v) => `${ptP} ${est} ${ptGerund(v.inf)}?`, `${sy} ${S} ${say.ing}?`],
          [`${be.short[2]} ${ing}`],
          [`${be.shortSay[2]} ${say.ing}`],
        );
      }
      case "goingTo": {
        const [en, sy, fut] = [BE_EN_NOW[i], BE_NOW[i], PT_FUTURE[i]];
        return row(
          [`${P} ${en} going to ${base}`, (v) => `${ptP} ${fut} ${v.inf}`, `${S} ${sy} gôu-ing tu ${say.base}`],
          [`${P} ${en} not going to ${base}`, (v) => `${ptP} não ${fut} ${v.inf}`, `${S} ${sy} nót gôu-ing tu ${say.base}`],
          [`${cap(en)} ${p} going to ${base}?`, (v) => `${ptP} ${fut} ${v.inf}?`, `${sy} ${S} gôu-ing tu ${say.base}?`],
          [`${be.short[0]} going to ${base}`, `${be.short[1]} going to ${base}`],
          [`${be.shortSay[0]} gôu-ing tu ${say.base}`, `${be.shortSay[1]} gôu-ing tu ${say.base}`],
        );
      }
      case "presentPerfect": {
        const [have, sy] = third ? ["has", "rréz"] : ["have", "rrév"];
        return row(
          [`${P} ${have} ${participle}`, (v) => `${ptP} já ${v.past[k]}`, `${S} ${sy} ${say.participle}`],
          [`${P} ${have} not ${participle}`, (v) => `${ptP} ainda não ${v.past[k]}`, `${S} ${sy} nót ${say.participle}`],
          [`${cap(have)} ${p} ${participle}?`, (v) => `${ptP} já ${v.past[k]}?`, `${sy} ${S} ${say.participle}?`],
          [`${HAVE_SHORT[i]} ${participle}`, `${P} ${third ? "hasn't" : "haven't"} ${participle}`],
          [`${HAVE_SHORT_SAY[i]} ${say.participle}`, `${S} ${third ? "rré-zent" : "rré-vent"} ${say.participle}`],
        );
      }
      case "would":
        return row(
          [`${P} would ${base}`, (v) => `${ptP} ${ptConditional(v.inf)[k]}`, `${S} uúd ${say.base}`],
          [`${P} would not ${base}`, (v) => `${ptP} não ${ptConditional(v.inf)[k]}`, `${S} uúd nót ${say.base}`],
          [`Would ${p} ${base}?`, (v) => `${ptP} ${ptConditional(v.inf)[k]}?`, `uúd ${S} ${say.base}?`],
          [`${WOULD_SHORT[i]} ${base}`, `${P} wouldn't ${base}`],
          [`${WOULD_SHORT_SAY[i]} ${say.base}`, `${S} uú-dent ${say.base}`],
        );
    }
  });
}

/** Aviso mostrado no lugar da tabela quando o verbo de estado não vai para o contínuo. */
export function statNotice(verb: Verb, tense: OtherTense): string {
  const past = tense === "pastContinuous";
  const wrong = `${past ? "I was" : "I am"} ${verb.forms.ing}`;
  const right = past ? verb.table[0].past.en : verb.table[0].present.en;
  let text =
    `O verbo to ${verb.base} fala de um estado (como ser, saber, querer, gostar), não de uma ação ` +
    `acontecendo, então quase não aparece neste tempo. Em vez de "${wrong}", diga "${right}".`;
  if (verb.id === "have")
    text +=
      ` Exceção: quando have não é "possuir", como em "I'm having lunch" (estou almoçando) ` +
      `e "We're having fun" (estamos nos divertindo).`;
  return text;
}

/* ---------- exemplos e respostas curtas da explicação ---------- */

/** Afirmativa e negativa com "I", pergunta com "you". */
export type ExampleBlock = { title?: string; affirmative: Line; negative: Line; question: Line };

/** Junta os sentidos em português: "eu não fui / eu não estive". */
const ptJoin = (verb: Verb, fn: (v: VerbForms["pt"][number]) => string) => verb.forms.pt.map(fn).join(" / ");

/** Exemplos completos do tempo, montados com o verbo escolhido (verbo de estado no contínuo usa to work). */
export function buildExamples(verb: Verb, tense: TenseId): ExampleBlock[] {
  if (tense === "basic") {
    const [I, you] = verb.table;
    const b = verb.forms.say.base;
    const isBe = verb.id === "be";
    const past: ExampleBlock = isBe
      ? {
          title: "Passado",
          affirmative: I.past,
          negative: l("I was not", "eu não era / eu não estava", "ái uóz nót"),
          question: l("Were you?", "você era? / você estava?", "uâr iú?"),
        }
      : {
          title: "Passado",
          affirmative: I.past,
          negative: l(`I did not ${verb.base}`, ptJoin(verb, (v) => `eu não ${v.past[0]}`), `ái díd nót ${b}`),
          question: l(`Did you ${verb.base}?`, ptJoin(verb, (v) => `você ${v.past[1]}?`), `díd iú ${b}?`),
        };
    return [
      { title: "Presente", affirmative: I.present, negative: I.negative, question: you.question },
      past,
      {
        title: "Futuro",
        affirmative: I.future,
        negative: l(`I will not ${verb.base}`, ptJoin(verb, (v) => `eu não vou ${v.inf}`), `ái uíl nót ${b}`),
        question: l(`Will you ${verb.base}?`, ptJoin(verb, (v) => `você vai ${v.inf}?`), `uíl iú ${b}?`),
      },
    ];
  }
  const rows = buildTense(verb, tense) ?? buildTense(findVerb("work"), tense)!;
  return [{ affirmative: rows[0].affirmative, negative: rows[0].negative, question: rows[1].question }];
}

/** Auxiliar da resposta curta: [sim, não, pronúncia do sim, pronúncia do não]. */
const SHORT_AUX: Record<string, [string, string, string, string]> = {
  do: ["do", "don't", "dú", "dôunt"],
  am: ["am", "'m not", "ém", "nót"],
  did: ["did", "didn't", "díd", "dí-dent"],
  was: ["was", "wasn't", "uóz", "uó-zent"],
  will: ["will", "won't", "uíl", "uôunt"],
  have: ["have", "haven't", "rrév", "rré-vent"],
  would: ["would", "wouldn't", "uúd", "uú-dent"],
};

function shortPair(aux: string, ex: ExampleBlock): Line[] {
  const [yes, no, sYes, sNo] = SHORT_AUX[aux];
  const negEn = aux === "am" ? "No, I'm not." : `No, I ${no}.`;
  const negSay = aux === "am" ? "nôu, áim nót" : `nôu, ái ${sNo}`;
  return [
    l(`Yes, I ${yes}.`, `Sim (${ex.affirmative.pt}).`, `iés, ái ${sYes}`),
    l(negEn, `Não (${ex.negative.pt}).`, negSay),
  ];
}

const TENSE_AUX: Record<Exclude<TenseId, "basic">, string> = {
  presentContinuous: "am",
  pastContinuous: "was",
  goingTo: "am",
  presentPerfect: "have",
  would: "would",
};

/** Resposta curta (Yes, I do. / No, I don't.) para a pergunta com "you". */
export function shortAnswers(verb: Verb, tense: TenseId): Line[] {
  const blocks = buildExamples(verb, tense);
  if (tense === "basic") {
    const isBe = verb.id === "be";
    return [
      ...shortPair(isBe ? "am" : "do", blocks[0]),
      ...shortPair(isBe ? "was" : "did", blocks[1]),
      ...shortPair("will", blocks[2]),
    ];
  }
  return shortPair(TENSE_AUX[tense], blocks[0]);
}
