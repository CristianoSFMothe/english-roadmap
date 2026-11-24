/**
 * Vocabulário de referência da página /vocabulario: listas fixas que servem para
 * qualquer pessoa, independentes do plano gerado. `say` é uma pronúncia aproximada
 * escrita para quem fala português (inglês americano).
 */

/** `pt` é a tradução; fica vazio quando não há tradução (ex.: letras do alfabeto). */
export type RefItem = { en: string; pt?: string; say?: string };

export type RefCategory = {
  id: string;
  title: string;
  intro?: string;
  groups: { title: string; items: RefItem[] }[];
};

/** Palavra ou frase adicionada pela própria pessoa. */
export type MyWord = {
  id: string;
  en: string;
  pt: string;
  kind: "palavra" | "frase";
  example?: string;
  /** Pronúncia aproximada em sons do português (escrita à mão ou gerada no botão). */
  say?: string;
  learned?: boolean;
  createdAt: number;
};

const MAX_WORDS = 3000;
const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Mantém só palavras bem formadas, para o banco não guardar lixo vindo do navegador. */
export function cleanWords(raw: unknown): MyWord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, MAX_WORDS)
    .map((w): MyWord | null => {
      const o = (w ?? {}) as Record<string, unknown>;
      const id = texto(o.id, 64);
      const en = texto(o.en, 300);
      const pt = texto(o.pt, 300);
      if (!id || !en) return null;
      const example = texto(o.example, 500);
      const say = texto(o.say, 300);
      return {
        id,
        en,
        pt,
        kind: o.kind === "frase" ? "frase" : "palavra",
        ...(example ? { example } : {}),
        ...(say ? { say } : {}),
        learned: o.learned === true,
        createdAt: Number(o.createdAt) || Date.now(),
      };
    })
    .filter((w): w is MyWord => w !== null);
}

const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
  "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function belowThousand(n: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds) parts.push(`${ONES[hundreds]} hundred`);
  if (rest) {
    if (rest < 20) parts.push(ONES[rest]);
    else parts.push(TENS[Math.floor(rest / 10)] + (rest % 10 ? `-${ONES[rest % 10]}` : ""));
  }
  return parts.join(" ");
}

/** Escreve por extenso, em inglês americano, um número inteiro de 0 a 1.000.000. */
export function numberToWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 1_000_000) return "";
  if (n === 0) return "zero";
  if (n === 1_000_000) return "one million";
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  return [thousands ? `${belowThousand(thousands)} thousand` : "", rest ? belowThousand(rest) : ""]
    .filter(Boolean)
    .join(" ");
}

const it = (en: string, pt: string, say?: string): RefItem => ({ en, pt, say });
/** Letra do alfabeto: só a pronúncia aproximada em inglês, sem o nome da letra em português. */
const letter = (en: string, say: string): RefItem => ({ en, say });

export const ALPHABET: RefItem[] = [
  letter("A", "êi"),
  letter("B", "bí"),
  letter("C", "sí"),
  letter("D", "dí"),
  letter("E", "í"),
  letter("F", "éf"),
  letter("G", "djí"),
  letter("H", "êitch"),
  letter("I", "ái"),
  letter("J", "djêi"),
  letter("K", "kêi"),
  letter("L", "él"),
  letter("M", "ém"),
  letter("N", "én"),
  letter("O", "ôu"),
  letter("P", "pí"),
  letter("Q", "kiú"),
  letter("R", "ár"),
  letter("S", "és"),
  letter("T", "tí"),
  letter("U", "iú"),
  letter("V", "ví"),
  letter("W", "dâbliu"),
  letter("X", "éks"),
  letter("Y", "uái"),
  letter("Z", "zí (no inglês britânico, zéd)"),
];

export const CATEGORIES: RefCategory[] = [
  {
    id: "alfabeto",
    title: "Alfabeto",
    intro:
      "Abaixo de cada letra está a pronúncia aproximada do nome dela em inglês, escrita com sons do português. Use o botão de ouvir para conferir. Soletrar é útil para dizer seu nome, e-mail e endereço.",
    groups: [
      { title: "Letras", items: ALPHABET },
      {
        title: "Para soletrar",
        items: [
          it("How do you spell it?", "Como se soletra?", "rráu dú iú spél ít?"),
          it("Can you spell your name, please?", "Pode soletrar seu nome, por favor?", "kén iú spél iór nêim, plíz?"),
          it("capital letter", "letra maiúscula", "ké-pi-tal lé-ter"),
          it("lowercase letter", "letra minúscula", "lôu-er-kêis lé-ter"),
          it("double L", "dois L (LL)", "dâ-bel él"),
          it("at (@)", "arroba", "ét"),
          it("dot (.)", "ponto (em e-mail e site)", "dót"),
          it("underscore (_)", "sublinhado", "ân-der-scór"),
          it("dash / hyphen (-)", "hífen", "désh / hái-fen"),
        ],
      },
    ],
  },
  {
    id: "numeros",
    title: "Números",
    intro:
      "Use o conversor para ver qualquer número de 0 a 1 milhão por extenso. Em inglês, números de 21 a 99 levam hífen (twenty-one) e o ponto de milhar é uma vírgula: 1,000.",
    groups: [
      {
        title: "0 a 20",
        items: [
          it("0", "zero", "zí-rou"),
          it("1", "one", "uân"),
          it("2", "two", "tú"),
          it("3", "three", "thrí (th com a língua entre os dentes)"),
          it("4", "four", "fór"),
          it("5", "five", "fáiv"),
          it("6", "six", "síks"),
          it("7", "seven", "sé-ven"),
          it("8", "eight", "êit"),
          it("9", "nine", "náin"),
          it("10", "ten", "tén"),
          it("11", "eleven", "i-lé-ven"),
          it("12", "twelve", "tuélv"),
          it("13", "thirteen", "thâr-tín"),
          it("14", "fourteen", "fór-tín"),
          it("15", "fifteen", "fif-tín"),
          it("16", "sixteen", "siks-tín"),
          it("17", "seventeen", "se-ven-tín"),
          it("18", "eighteen", "êi-tín"),
          it("19", "nineteen", "náin-tín"),
          it("20", "twenty", "tuén-ti"),
        ],
      },
      {
        title: "Dezenas",
        items: [
          it("30", "thirty", "thâr-ti"),
          it("40", "forty", "fór-ti"),
          it("50", "fifty", "fíf-ti"),
          it("60", "sixty", "síks-ti"),
          it("70", "seventy", "sé-ven-ti"),
          it("80", "eighty", "êi-ti"),
          it("90", "ninety", "náin-ti"),
          it("21", "twenty-one", "tuén-ti uân"),
          it("45", "forty-five", "fór-ti fáiv"),
          it("99", "ninety-nine", "náin-ti náin"),
        ],
      },
      {
        title: "Centenas, milhares e milhão",
        items: [
          it("100", "one hundred", "uân hân-dred"),
          it("101", "one hundred one", "uân hân-dred uân"),
          it("250", "two hundred fifty", "tú hân-dred fíf-ti"),
          it("500", "five hundred", "fáiv hân-dred"),
          it("1,000", "one thousand", "uân tháu-zand"),
          it("1,500", "one thousand five hundred", "uân tháu-zand fáiv hân-dred"),
          it("2,026", "two thousand twenty-six", "tú tháu-zand tuén-ti síks"),
          it("10,000", "ten thousand", "tén tháu-zand"),
          it("100,000", "one hundred thousand", "uân hân-dred tháu-zand"),
          it("1,000,000", "one million", "uân mí-lion"),
        ],
      },
      {
        title: "Ordinais",
        items: [
          it("1st", "first · primeiro", "fârst"),
          it("2nd", "second · segundo", "sé-kand"),
          it("3rd", "third · terceiro", "thârd"),
          it("4th", "fourth · quarto", "fórth"),
          it("5th", "fifth · quinto", "fífth"),
          it("6th", "sixth · sexto", "síksth"),
          it("7th", "seventh · sétimo", "sé-venth"),
          it("8th", "eighth · oitavo", "êith"),
          it("9th", "ninth · nono", "náinth"),
          it("10th", "tenth · décimo", "ténth"),
          it("20th", "twentieth · vigésimo", "tuén-ti-eth"),
          it("100th", "hundredth · centésimo", "hân-dredth"),
        ],
      },
    ],
  },
  {
    id: "dias-meses",
    title: "Dias e meses",
    intro:
      "Em inglês, dias da semana e meses sempre começam com letra maiúscula. Datas: on Monday, in January, on May 5th.",
    groups: [
      {
        title: "Dias da semana",
        items: [
          it("Monday", "segunda-feira", "mân-dei"),
          it("Tuesday", "terça-feira", "túz-dei"),
          it("Wednesday", "quarta-feira", "uénz-dei"),
          it("Thursday", "quinta-feira", "thârz-dei"),
          it("Friday", "sexta-feira", "frái-dei"),
          it("Saturday", "sábado", "sé-tar-dei"),
          it("Sunday", "domingo", "sân-dei"),
          it("weekday", "dia útil", "uík-dei"),
          it("weekend", "fim de semana", "uí-kend"),
        ],
      },
      {
        title: "Meses do ano",
        items: [
          it("January", "janeiro", "djé-niu-é-ri"),
          it("February", "fevereiro", "fé-bru-é-ri"),
          it("March", "março", "mártch"),
          it("April", "abril", "êi-pril"),
          it("May", "maio", "mêi"),
          it("June", "junho", "djún"),
          it("July", "julho", "dju-lái"),
          it("August", "agosto", "ó-gâst"),
          it("September", "setembro", "sep-tém-ber"),
          it("October", "outubro", "ok-tôu-ber"),
          it("November", "novembro", "nou-vém-ber"),
          it("December", "dezembro", "di-sém-ber"),
        ],
      },
      {
        title: "Estações do ano",
        items: [
          it("spring", "primavera", "spring"),
          it("summer", "verão", "sâ-mer"),
          it("fall / autumn", "outono", "fól / ó-tâm"),
          it("winter", "inverno", "uín-ter"),
        ],
      },
      {
        title: "Tempo",
        items: [
          it("today", "hoje", "tu-dêi"),
          it("tomorrow", "amanhã", "tu-mó-rou"),
          it("yesterday", "ontem", "iés-ter-dêi"),
          it("now", "agora", "náu"),
          it("later", "mais tarde", "lêi-ter"),
          it("morning", "manhã", "mór-ning"),
          it("afternoon", "tarde", "éf-ter-nún"),
          it("evening", "início da noite", "ív-ning"),
          it("night", "noite", "náit"),
          it("week", "semana", "uík"),
          it("month", "mês", "mânth"),
          it("year", "ano", "iír"),
          it("What time is it?", "Que horas são?", "uót táim íz ít?"),
          it("It's three o'clock.", "São três horas.", "íts thrí â-klók."),
          it("half past two", "duas e meia", "rréf pést tú"),
          it("a quarter to five", "quinze para as cinco", "â kuór-ter tu fáiv"),
          it("What's the date today?", "Que dia é hoje?", "uóts dâ dêit tu-dêi?"),
        ],
      },
    ],
  },
  {
    id: "familia",
    title: "Família",
    groups: [
      {
        title: "Família próxima",
        items: [
          it("mother / mom", "mãe", "mâ-der / mám"),
          it("father / dad", "pai", "fá-der / déd"),
          it("parents", "pais (pai e mãe)", "pé-rents"),
          it("son", "filho", "sân"),
          it("daughter", "filha", "dó-ter"),
          it("children / kids", "filhos, crianças", "tchíl-dren / kídz"),
          it("brother", "irmão", "brâ-der"),
          it("sister", "irmã", "sís-ter"),
          it("siblings", "irmãos (de ambos os sexos)", "síb-lingz"),
          it("husband", "marido", "rrâz-band"),
          it("wife", "esposa", "uáif"),
          it("partner", "parceiro, parceira", "párt-ner"),
          it("baby", "bebê", "bêi-bi"),
          it("twins", "gêmeos", "tuínz"),
        ],
      },
      {
        title: "Família estendida",
        items: [
          it("grandmother / grandma", "avó", "grénd-mâ-der / grén-má"),
          it("grandfather / grandpa", "avô", "grénd-fá-der / grén-pá"),
          it("grandparents", "avós", "grénd-pé-rents"),
          it("grandson", "neto", "grénd-sân"),
          it("granddaughter", "neta", "grénd-dó-ter"),
          it("uncle", "tio", "ân-kel"),
          it("aunt", "tia", "ént"),
          it("cousin", "primo, prima", "kâ-zin"),
          it("nephew", "sobrinho", "né-fiu"),
          it("niece", "sobrinha", "nís"),
          it("relatives", "parentes", "ré-la-tivz"),
        ],
      },
      {
        title: "Família por casamento",
        items: [
          it("mother-in-law", "sogra", "mâ-der-in-ló"),
          it("father-in-law", "sogro", "fá-der-in-ló"),
          it("brother-in-law", "cunhado", "brâ-der-in-ló"),
          it("sister-in-law", "cunhada", "sís-ter-in-ló"),
          it("stepmother", "madrasta", "stép-mâ-der"),
          it("stepfather", "padrasto", "stép-fá-der"),
          it("stepson / stepdaughter", "enteado, enteada", "stép-sân / stép-dó-ter"),
          it("boyfriend", "namorado", "bói-frénd"),
          it("girlfriend", "namorada", "gârl-frénd"),
        ],
      },
    ],
  },
  {
    // Conteúdo em lib/verbs.ts, mostrado por components/VerbsView.tsx.
    id: "verbos",
    title: "Verbos mais usados",
    groups: [],
  },
  {
    id: "dia-a-dia",
    title: "Expressões do dia a dia",
    groups: [
      {
        title: "Cumprimentos e despedidas",
        items: [
          it("Good morning!", "Bom dia!", "gúd mór-ning!"),
          it("Good afternoon!", "Boa tarde!", "gúd éf-ter-nún!"),
          it("Good evening!", "Boa noite! (ao chegar)", "gúd ív-ning!"),
          it("Good night!", "Boa noite! (ao se despedir ou dormir)", "gúd náit!"),
          it("Hi! / Hello!", "Oi! / Olá!", "rrái! / rre-lôu!"),
          it("How are you?", "Como vai?", "rráu ár iú?"),
          it("I'm fine, thanks. And you?", "Estou bem, obrigado. E você?", "áim fáin, thénks. énd iú?"),
          it("What's up?", "E aí?", "uóts âp?"),
          it("Nice to meet you.", "Prazer em conhecer você.", "náis tu mít iú."),
          it("See you later!", "Até mais!", "sí iú lêi-ter!"),
          it("See you tomorrow!", "Até amanhã!", "sí iú tu-mó-rou!"),
          it("Bye! / Goodbye!", "Tchau! / Adeus!", "bái! / gud-bái!"),
          it("Take care!", "Se cuida!", "têik kér!"),
          it("Have a nice day!", "Tenha um bom dia!", "rrév â náis dêi!"),
        ],
      },
      {
        title: "Gentileza",
        items: [
          it("Please.", "Por favor.", "plíz."),
          it("Thank you. / Thanks.", "Obrigado.", "thénk iú. / thénks."),
          it("You're welcome.", "De nada.", "iór uél-kâm."),
          it("Excuse me.", "Com licença.", "eks-kiúz mí."),
          it("Sorry.", "Desculpa.", "só-ri."),
          it("No problem.", "Sem problema.", "nôu pró-blem."),
          it("Congratulations!", "Parabéns! (por uma conquista)", "kân-gré-tchu-lêi-chânz!"),
          it("Happy birthday!", "Feliz aniversário!", "rré-pi bârth-dêi!"),
          it("Bless you!", "Saúde! (quando alguém espirra)", "blés iú!"),
          it("Cheers!", "Saúde! (no brinde)", "tchírz!"),
          it("Good luck!", "Boa sorte!", "gúd lâk!"),
        ],
      },
      {
        title: "Quando não entender",
        items: [
          it("I don't understand.", "Não entendi.", "ái dôunt ân-der-sténd."),
          it("Could you repeat that, please?", "Pode repetir, por favor?", "kúd iú ri-pít dét, plíz?"),
          it("Could you speak more slowly?", "Pode falar mais devagar?", "kúd iú spík mór slôu-li?"),
          it("What does ... mean?", "O que significa ...?", "uót dâz ... mín?"),
          it("How do you say ... in English?", "Como se diz ... em inglês?", "rráu dú iú sêi ... ín ín-glich?"),
          it("I don't know.", "Não sei.", "ái dôunt nôu."),
          it("Let me think.", "Deixa eu pensar.", "lét mí thínk."),
          it("Just a moment, please.", "Só um momento, por favor.", "djâst â môu-ment, plíz."),
        ],
      },
      {
        title: "Na rua e nas compras",
        items: [
          it("Where is the bathroom?", "Onde fica o banheiro?", "uér íz dâ béth-rum?"),
          it("How much is it?", "Quanto custa?", "rráu mâtch íz ít?"),
          it("Can I pay by card?", "Posso pagar no cartão?", "kén ái pêi bái kárd?"),
          it("I'd like a coffee, please.", "Eu queria um café, por favor.", "áid láik â kó-fi, plíz."),
          it("The check, please.", "A conta, por favor.", "dâ tchék, plíz."),
          it("I'm lost.", "Estou perdido.", "áim lóst."),
          it("Can you help me?", "Você pode me ajudar?", "kén iú rrélp mí?"),
          it("Let's go!", "Vamos!", "léts gôu!"),
        ],
      },
    ],
  },
  {
    id: "perguntas",
    title: "Perguntas e pronomes",
    groups: [
      {
        title: "Palavras de pergunta",
        items: [
          it("what", "o que, qual", "uót"),
          it("where", "onde", "uér"),
          it("when", "quando", "uén"),
          it("who", "quem", "rrú"),
          it("why", "por que", "uái"),
          it("how", "como", "rráu"),
          it("which", "qual (entre opções)", "uítch"),
          it("whose", "de quem", "rrúz"),
          it("how much", "quanto (incontável)", "rráu mâtch"),
          it("how many", "quantos (contável)", "rráu mé-ni"),
          it("how old", "quantos anos", "rráu ôuld"),
          it("how long", "quanto tempo", "rráu lóng"),
          it("how often", "com que frequência", "rráu ó-fen"),
        ],
      },
      {
        title: "Pronomes",
        items: [
          it("I · me · my", "eu · me/mim · meu", "ái · mí · mái"),
          it("you · you · your", "você · te/você · seu", "iú · iú · iór"),
          it("he · him · his", "ele · o/ele · dele", "rrí · rrím · rríz"),
          it("she · her · her", "ela · a/ela · dela", "chí · rrâr · rrâr"),
          it("it · it · its", "ele/ela (coisa, animal)", "ít · ít · íts"),
          it("we · us · our", "nós · nos · nosso", "uí · âs · áuer"),
          it("they · them · their", "eles/elas · os/eles · deles", "dêi · dém · dér"),
        ],
      },
    ],
  },
  {
    id: "cores-adjetivos",
    title: "Cores e adjetivos",
    groups: [
      {
        title: "Cores",
        items: [
          it("red", "vermelho", "réd"),
          it("blue", "azul", "blú"),
          it("green", "verde", "grín"),
          it("yellow", "amarelo", "ié-lou"),
          it("orange", "laranja", "ó-rindj"),
          it("purple", "roxo", "pâr-pel"),
          it("pink", "rosa", "pínk"),
          it("brown", "marrom", "bráun"),
          it("black", "preto", "blék"),
          it("white", "branco", "uáit"),
          it("gray", "cinza", "grêi"),
          it("light blue / dark blue", "azul-claro / azul-escuro", "láit blú / dárk blú"),
        ],
      },
      {
        title: "Opostos",
        items: [
          it("big · small", "grande · pequeno", "bíg · smól"),
          it("long · short", "comprido · curto", "lóng · chórt"),
          it("tall · short", "alto · baixo", "tól · chórt"),
          it("old · new", "velho · novo", "ôuld · nú"),
          it("old · young", "velho · jovem", "ôuld · iâng"),
          it("good · bad", "bom · ruim", "gúd · béd"),
          it("easy · difficult", "fácil · difícil", "í-zi · dí-fi-kâlt"),
          it("cheap · expensive", "barato · caro", "tchíp · eks-pén-siv"),
          it("hot · cold", "quente · frio", "rrót · kôuld"),
          it("fast · slow", "rápido · devagar", "fést · slôu"),
          it("happy · sad", "feliz · triste", "rré-pi · séd"),
          it("early · late", "cedo · tarde", "âr-li · lêit"),
          it("full · empty", "cheio · vazio", "fúl · émp-ti"),
          it("open · closed", "aberto · fechado", "ôu-pen · klôuzd"),
        ],
      },
      {
        title: "Sentimentos",
        items: [
          it("tired", "cansado", "táierd"),
          it("hungry", "com fome", "rrân-gri"),
          it("thirsty", "com sede", "thârs-ti"),
          it("bored", "entediado", "bórd"),
          it("excited", "animado", "ik-sái-tid"),
          it("nervous", "nervoso", "nâr-vâs"),
          it("worried", "preocupado", "uâ-rid"),
          it("angry", "com raiva", "én-gri"),
          it("scared", "com medo", "skérd"),
          it("proud", "orgulhoso", "práud"),
        ],
      },
    ],
  },
  {
    id: "casa-cidade",
    title: "Casa, cidade e comida",
    groups: [
      {
        title: "Casa",
        items: [
          it("house / home", "casa (construção / lar)", "rráus / rrôum"),
          it("bedroom", "quarto", "béd-rum"),
          it("bathroom", "banheiro", "béth-rum"),
          it("kitchen", "cozinha", "kí-tchen"),
          it("living room", "sala de estar", "lí-ving rúm"),
          it("door", "porta", "dór"),
          it("window", "janela", "uín-dôu"),
          it("bed", "cama", "béd"),
          it("table", "mesa", "têi-bel"),
          it("chair", "cadeira", "tchér"),
          it("fridge", "geladeira", "frídj"),
          it("stairs", "escada", "stérz"),
        ],
      },
      {
        title: "Lugares na cidade",
        items: [
          it("street", "rua", "strít"),
          it("supermarket", "supermercado", "sú-per-már-kit"),
          it("bakery", "padaria", "bêi-ke-ri"),
          it("drugstore / pharmacy", "farmácia", "drâg-stór / fár-ma-si"),
          it("hospital", "hospital", "rrós-pi-tal"),
          it("bank", "banco", "bénk"),
          it("school", "escola", "skúl"),
          it("park", "parque", "párk"),
          it("bus stop", "ponto de ônibus", "bâs stóp"),
          it("restaurant", "restaurante", "rés-tâ-rânt"),
          it("gas station", "posto de gasolina", "gués stêi-chân"),
          it("downtown", "centro da cidade", "dáun-táun"),
        ],
      },
      {
        title: "Comida e bebida",
        items: [
          it("breakfast · lunch · dinner", "café da manhã · almoço · jantar", "brék-fâst · lântch · dí-ner"),
          it("water", "água", "uó-ter"),
          it("coffee", "café", "kó-fi"),
          it("juice", "suco", "djús"),
          it("milk", "leite", "mílk"),
          it("bread", "pão", "bréd"),
          it("rice and beans", "arroz e feijão", "ráis énd bínz"),
          it("meat", "carne", "mít"),
          it("chicken", "frango", "tchí-ken"),
          it("fish", "peixe", "fích"),
          it("egg", "ovo", "ég"),
          it("cheese", "queijo", "tchíz"),
          it("fruit", "fruta", "frút"),
          it("vegetables", "legumes, verduras", "védj-ta-belz"),
        ],
      },
    ],
  },
  {
    id: "corpo-roupas",
    title: "Corpo, saúde e roupas",
    groups: [
      {
        title: "Corpo",
        items: [
          it("head", "cabeça", "rréd"),
          it("face", "rosto", "fêis"),
          it("eyes", "olhos", "áiz"),
          it("ears", "orelhas, ouvidos", "írz"),
          it("nose", "nariz", "nôuz"),
          it("mouth", "boca", "máuth"),
          it("teeth", "dentes", "títh"),
          it("hair", "cabelo", "rrér"),
          it("arm", "braço", "árm"),
          it("hand", "mão", "rrénd"),
          it("leg", "perna", "lég"),
          it("foot · feet", "pé · pés", "fút · fít"),
          it("back", "costas", "bék"),
          it("stomach", "estômago, barriga", "stâ-mak"),
        ],
      },
      {
        title: "Saúde",
        items: [
          it("I have a headache.", "Estou com dor de cabeça.", "ái rrév â rré-dêik."),
          it("I have a cold.", "Estou resfriado.", "ái rrév â kôuld."),
          it("I have a fever.", "Estou com febre.", "ái rrév â fí-ver."),
          it("I feel sick.", "Estou passando mal.", "ái fíl sík."),
          it("doctor", "médico", "dók-ter"),
          it("medicine", "remédio", "mé-di-sin"),
          it("appointment", "consulta, compromisso marcado", "â-póint-ment"),
        ],
      },
      {
        title: "Roupas",
        items: [
          it("shirt", "camisa", "chârt"),
          it("T-shirt", "camiseta", "tí-chârt"),
          it("pants", "calça", "pénts"),
          it("shorts", "bermuda, short", "chórts"),
          it("dress", "vestido", "drés"),
          it("skirt", "saia", "skârt"),
          it("jacket", "jaqueta", "djé-kit"),
          it("shoes", "sapatos", "chúz"),
          it("sneakers", "tênis", "sní-kerz"),
          it("socks", "meias", "sóks"),
          it("hat / cap", "chapéu / boné", "rrét / kép"),
        ],
      },
    ],
  },
  {
    id: "preposicoes",
    title: "Preposições e conectores",
    groups: [
      {
        title: "Lugar e tempo",
        items: [
          it("in", "em, dentro de (in Brazil, in May)", "ín"),
          it("on", "em, sobre (on the table, on Monday)", "ón"),
          it("at", "em, no ponto (at home, at 3 p.m.)", "ét"),
          it("under", "embaixo de", "ân-der"),
          it("next to", "ao lado de", "nékst tu"),
          it("between", "entre", "bi-tuín"),
          it("in front of", "na frente de", "ín frânt óv"),
          it("behind", "atrás de", "bi-rráind"),
          it("before", "antes de", "bi-fór"),
          it("after", "depois de", "éf-ter"),
          it("during", "durante", "dú-ring"),
          it("until", "até (tempo)", "ân-tíl"),
        ],
      },
      {
        title: "Conectores",
        items: [
          it("and", "e", "énd"),
          it("but", "mas", "bât"),
          it("or", "ou", "ór"),
          it("because", "porque", "bi-kóz"),
          it("so", "então, por isso", "sôu"),
          it("also", "também", "ól-sôu"),
          it("then", "depois, então", "dén"),
          it("however", "no entanto", "rrau-é-ver"),
          it("for example", "por exemplo", "fór ig-zém-pel"),
          it("actually", "na verdade", "ék-tchu-a-li"),
        ],
      },
    ],
  },
];
