/**
 * Vocabulário de referência da página /vocabulario: listas fixas que servem para
 * qualquer pessoa, independentes do plano gerado. `say` é uma pronúncia aproximada
 * escrita para quem fala português (inglês americano).
 */

export type RefItem = { en: string; pt: string; say?: string };

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
  learned?: boolean;
  createdAt: number;
};

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

export const ALPHABET: RefItem[] = [
  it("A", "a", "êi"),
  it("B", "bê", "bí"),
  it("C", "cê", "sí"),
  it("D", "dê", "dí"),
  it("E", "é", "í"),
  it("F", "efe", "éf"),
  it("G", "gê", "djí"),
  it("H", "agá", "êitch"),
  it("I", "i", "ái"),
  it("J", "jota", "djêi"),
  it("K", "cá", "kêi"),
  it("L", "ele", "él"),
  it("M", "eme", "ém"),
  it("N", "ene", "én"),
  it("O", "ó", "ôu"),
  it("P", "pê", "pí"),
  it("Q", "quê", "kiú"),
  it("R", "erre", "ár"),
  it("S", "esse", "és"),
  it("T", "tê", "tí"),
  it("U", "u", "iú"),
  it("V", "vê", "ví"),
  it("W", "dáblio", "dâbliu"),
  it("X", "xis", "éks"),
  it("Y", "ípsilon", "uái"),
  it("Z", "zê", "zí (no inglês britânico, zéd)"),
];

export const CATEGORIES: RefCategory[] = [
  {
    id: "alfabeto",
    title: "Alfabeto",
    intro:
      "A pronúncia ao lado de cada letra é aproximada, escrita como se lê em português. Use o botão de ouvir para conferir. Soletrar é útil para dizer seu nome, e-mail e endereço.",
    groups: [
      { title: "Letras", items: ALPHABET },
      {
        title: "Para soletrar",
        items: [
          it("How do you spell it?", "Como se soletra?"),
          it("Can you spell your name, please?", "Pode soletrar seu nome, por favor?"),
          it("capital letter", "letra maiúscula"),
          it("lowercase letter", "letra minúscula"),
          it("double L", "dois L (LL)"),
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
          it("today", "hoje"),
          it("tomorrow", "amanhã"),
          it("yesterday", "ontem"),
          it("now", "agora"),
          it("later", "mais tarde"),
          it("morning", "manhã"),
          it("afternoon", "tarde"),
          it("evening", "início da noite"),
          it("night", "noite"),
          it("week", "semana"),
          it("month", "mês"),
          it("year", "ano"),
          it("What time is it?", "Que horas são?"),
          it("It's three o'clock.", "São três horas."),
          it("half past two", "duas e meia"),
          it("a quarter to five", "quinze para as cinco"),
          it("What's the date today?", "Que dia é hoje?"),
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
          it("mother / mom", "mãe"),
          it("father / dad", "pai"),
          it("parents", "pais (pai e mãe)"),
          it("son", "filho"),
          it("daughter", "filha"),
          it("children / kids", "filhos, crianças"),
          it("brother", "irmão"),
          it("sister", "irmã"),
          it("siblings", "irmãos (de ambos os sexos)"),
          it("husband", "marido"),
          it("wife", "esposa"),
          it("partner", "parceiro, parceira"),
          it("baby", "bebê"),
          it("twins", "gêmeos"),
        ],
      },
      {
        title: "Família estendida",
        items: [
          it("grandmother / grandma", "avó"),
          it("grandfather / grandpa", "avô"),
          it("grandparents", "avós"),
          it("grandson", "neto"),
          it("granddaughter", "neta"),
          it("uncle", "tio"),
          it("aunt", "tia"),
          it("cousin", "primo, prima"),
          it("nephew", "sobrinho"),
          it("niece", "sobrinha"),
          it("relatives", "parentes"),
        ],
      },
      {
        title: "Família por casamento",
        items: [
          it("mother-in-law", "sogra"),
          it("father-in-law", "sogro"),
          it("brother-in-law", "cunhado"),
          it("sister-in-law", "cunhada"),
          it("stepmother", "madrasta"),
          it("stepfather", "padrasto"),
          it("stepson / stepdaughter", "enteado, enteada"),
          it("boyfriend", "namorado"),
          it("girlfriend", "namorada"),
        ],
      },
    ],
  },
  {
    id: "verbos",
    title: "Verbos mais usados",
    intro:
      "Formas na ordem: presente · passado · particípio. Quando só aparecem duas, o verbo é regular (passado e particípio iguais, terminados em -ed).",
    groups: [
      {
        title: "Irregulares essenciais",
        items: [
          it("be · was/were · been", "ser, estar"),
          it("have · had · had", "ter"),
          it("do · did · done", "fazer"),
          it("say · said · said", "dizer"),
          it("go · went · gone", "ir"),
          it("get · got · gotten", "conseguir, pegar, ficar"),
          it("make · made · made", "fazer, criar"),
          it("know · knew · known", "saber, conhecer"),
          it("think · thought · thought", "pensar, achar"),
          it("take · took · taken", "pegar, levar"),
          it("see · saw · seen", "ver"),
          it("come · came · come", "vir"),
          it("give · gave · given", "dar"),
          it("find · found · found", "encontrar"),
          it("tell · told · told", "contar, dizer a alguém"),
          it("feel · felt · felt", "sentir"),
          it("leave · left · left", "sair, deixar"),
          it("put · put · put", "colocar"),
          it("keep · kept · kept", "manter, guardar"),
          it("begin · began · begun", "começar"),
          it("bring · brought · brought", "trazer"),
          it("write · wrote · written", "escrever"),
          it("buy · bought · bought", "comprar"),
          it("eat · ate · eaten", "comer"),
          it("drink · drank · drunk", "beber"),
          it("sleep · slept · slept", "dormir"),
          it("speak · spoke · spoken", "falar"),
          it("read · read · read", "ler (o passado se pronuncia rréd)"),
          it("understand · understood · understood", "entender"),
          it("meet · met · met", "conhecer, encontrar"),
          it("pay · paid · paid", "pagar"),
          it("send · sent · sent", "enviar"),
          it("forget · forgot · forgotten", "esquecer"),
          it("lose · lost · lost", "perder"),
          it("drive · drove · driven", "dirigir"),
          it("run · ran · run", "correr"),
        ],
      },
      {
        title: "Regulares do dia a dia",
        items: [
          it("want · wanted", "querer"),
          it("need · needed", "precisar"),
          it("like · liked", "gostar"),
          it("love · loved", "amar, adorar"),
          it("work · worked", "trabalhar"),
          it("live · lived", "morar, viver"),
          it("study · studied", "estudar"),
          it("learn · learned", "aprender"),
          it("help · helped", "ajudar"),
          it("ask · asked", "perguntar, pedir"),
          it("answer · answered", "responder"),
          it("talk · talked", "conversar"),
          it("listen · listened", "escutar"),
          it("watch · watched", "assistir"),
          it("play · played", "jogar, tocar, brincar"),
          it("cook · cooked", "cozinhar"),
          it("clean · cleaned", "limpar"),
          it("open · opened", "abrir"),
          it("close · closed", "fechar"),
          it("start · started", "começar"),
          it("finish · finished", "terminar"),
          it("try · tried", "tentar"),
          it("use · used", "usar"),
          it("call · called", "ligar, chamar"),
          it("wait · waited", "esperar"),
          it("remember · remembered", "lembrar"),
          it("travel · traveled", "viajar"),
          it("walk · walked", "caminhar"),
        ],
      },
    ],
  },
  {
    id: "dia-a-dia",
    title: "Expressões do dia a dia",
    groups: [
      {
        title: "Cumprimentos e despedidas",
        items: [
          it("Good morning!", "Bom dia!"),
          it("Good afternoon!", "Boa tarde!"),
          it("Good evening!", "Boa noite! (ao chegar)"),
          it("Good night!", "Boa noite! (ao se despedir ou dormir)"),
          it("Hi! / Hello!", "Oi! / Olá!"),
          it("How are you?", "Como vai?"),
          it("I'm fine, thanks. And you?", "Estou bem, obrigado. E você?"),
          it("What's up?", "E aí?"),
          it("Nice to meet you.", "Prazer em conhecer você."),
          it("See you later!", "Até mais!"),
          it("See you tomorrow!", "Até amanhã!"),
          it("Bye! / Goodbye!", "Tchau! / Adeus!"),
          it("Take care!", "Se cuida!"),
          it("Have a nice day!", "Tenha um bom dia!"),
        ],
      },
      {
        title: "Gentileza",
        items: [
          it("Please.", "Por favor."),
          it("Thank you. / Thanks.", "Obrigado."),
          it("You're welcome.", "De nada."),
          it("Excuse me.", "Com licença."),
          it("Sorry.", "Desculpa."),
          it("No problem.", "Sem problema."),
          it("Congratulations!", "Parabéns! (por uma conquista)"),
          it("Happy birthday!", "Feliz aniversário!"),
          it("Bless you!", "Saúde! (quando alguém espirra)"),
          it("Cheers!", "Saúde! (no brinde)"),
          it("Good luck!", "Boa sorte!"),
        ],
      },
      {
        title: "Quando não entender",
        items: [
          it("I don't understand.", "Não entendi."),
          it("Could you repeat that, please?", "Pode repetir, por favor?"),
          it("Could you speak more slowly?", "Pode falar mais devagar?"),
          it("What does ... mean?", "O que significa ...?"),
          it("How do you say ... in English?", "Como se diz ... em inglês?"),
          it("I don't know.", "Não sei."),
          it("Let me think.", "Deixa eu pensar."),
          it("Just a moment, please.", "Só um momento, por favor."),
        ],
      },
      {
        title: "Na rua e nas compras",
        items: [
          it("Where is the bathroom?", "Onde fica o banheiro?"),
          it("How much is it?", "Quanto custa?"),
          it("Can I pay by card?", "Posso pagar no cartão?"),
          it("I'd like a coffee, please.", "Eu queria um café, por favor."),
          it("The check, please.", "A conta, por favor."),
          it("I'm lost.", "Estou perdido."),
          it("Can you help me?", "Você pode me ajudar?"),
          it("Let's go!", "Vamos!"),
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
          it("what", "o que, qual"),
          it("where", "onde"),
          it("when", "quando"),
          it("who", "quem"),
          it("why", "por que"),
          it("how", "como"),
          it("which", "qual (entre opções)"),
          it("whose", "de quem"),
          it("how much", "quanto (incontável)"),
          it("how many", "quantos (contável)"),
          it("how old", "quantos anos"),
          it("how long", "quanto tempo"),
          it("how often", "com que frequência"),
        ],
      },
      {
        title: "Pronomes",
        items: [
          it("I · me · my", "eu · me/mim · meu"),
          it("you · you · your", "você · te/você · seu"),
          it("he · him · his", "ele · o/ele · dele"),
          it("she · her · her", "ela · a/ela · dela"),
          it("it · it · its", "ele/ela (coisa, animal)"),
          it("we · us · our", "nós · nos · nosso"),
          it("they · them · their", "eles/elas · os/eles · deles"),
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
          it("red", "vermelho"),
          it("blue", "azul"),
          it("green", "verde"),
          it("yellow", "amarelo"),
          it("orange", "laranja"),
          it("purple", "roxo"),
          it("pink", "rosa"),
          it("brown", "marrom"),
          it("black", "preto"),
          it("white", "branco"),
          it("gray", "cinza"),
          it("light blue / dark blue", "azul-claro / azul-escuro"),
        ],
      },
      {
        title: "Opostos",
        items: [
          it("big · small", "grande · pequeno"),
          it("long · short", "comprido · curto"),
          it("tall · short", "alto · baixo"),
          it("old · new", "velho · novo"),
          it("old · young", "velho · jovem"),
          it("good · bad", "bom · ruim"),
          it("easy · difficult", "fácil · difícil"),
          it("cheap · expensive", "barato · caro"),
          it("hot · cold", "quente · frio"),
          it("fast · slow", "rápido · devagar"),
          it("happy · sad", "feliz · triste"),
          it("early · late", "cedo · tarde"),
          it("full · empty", "cheio · vazio"),
          it("open · closed", "aberto · fechado"),
        ],
      },
      {
        title: "Sentimentos",
        items: [
          it("tired", "cansado"),
          it("hungry", "com fome"),
          it("thirsty", "com sede"),
          it("bored", "entediado"),
          it("excited", "animado"),
          it("nervous", "nervoso"),
          it("worried", "preocupado"),
          it("angry", "com raiva"),
          it("scared", "com medo"),
          it("proud", "orgulhoso"),
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
          it("house / home", "casa (construção / lar)"),
          it("bedroom", "quarto"),
          it("bathroom", "banheiro"),
          it("kitchen", "cozinha"),
          it("living room", "sala de estar"),
          it("door", "porta"),
          it("window", "janela"),
          it("bed", "cama"),
          it("table", "mesa"),
          it("chair", "cadeira"),
          it("fridge", "geladeira"),
          it("stairs", "escada"),
        ],
      },
      {
        title: "Lugares na cidade",
        items: [
          it("street", "rua"),
          it("supermarket", "supermercado"),
          it("bakery", "padaria"),
          it("drugstore / pharmacy", "farmácia"),
          it("hospital", "hospital"),
          it("bank", "banco"),
          it("school", "escola"),
          it("park", "parque"),
          it("bus stop", "ponto de ônibus"),
          it("restaurant", "restaurante"),
          it("gas station", "posto de gasolina"),
          it("downtown", "centro da cidade"),
        ],
      },
      {
        title: "Comida e bebida",
        items: [
          it("breakfast · lunch · dinner", "café da manhã · almoço · jantar"),
          it("water", "água"),
          it("coffee", "café"),
          it("juice", "suco"),
          it("milk", "leite"),
          it("bread", "pão"),
          it("rice and beans", "arroz e feijão"),
          it("meat", "carne"),
          it("chicken", "frango"),
          it("fish", "peixe"),
          it("egg", "ovo"),
          it("cheese", "queijo"),
          it("fruit", "fruta"),
          it("vegetables", "legumes, verduras"),
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
          it("head", "cabeça"),
          it("face", "rosto"),
          it("eyes", "olhos"),
          it("ears", "orelhas, ouvidos"),
          it("nose", "nariz"),
          it("mouth", "boca"),
          it("teeth", "dentes"),
          it("hair", "cabelo"),
          it("arm", "braço"),
          it("hand", "mão"),
          it("leg", "perna"),
          it("foot · feet", "pé · pés"),
          it("back", "costas"),
          it("stomach", "estômago, barriga"),
        ],
      },
      {
        title: "Saúde",
        items: [
          it("I have a headache.", "Estou com dor de cabeça."),
          it("I have a cold.", "Estou resfriado."),
          it("I have a fever.", "Estou com febre."),
          it("I feel sick.", "Estou passando mal."),
          it("doctor", "médico"),
          it("medicine", "remédio"),
          it("appointment", "consulta, compromisso marcado"),
        ],
      },
      {
        title: "Roupas",
        items: [
          it("shirt", "camisa"),
          it("T-shirt", "camiseta"),
          it("pants", "calça"),
          it("shorts", "bermuda, short"),
          it("dress", "vestido"),
          it("skirt", "saia"),
          it("jacket", "jaqueta"),
          it("shoes", "sapatos"),
          it("sneakers", "tênis"),
          it("socks", "meias"),
          it("hat / cap", "chapéu / boné"),
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
          it("in", "em, dentro de (in Brazil, in May)"),
          it("on", "em, sobre (on the table, on Monday)"),
          it("at", "em, no ponto (at home, at 3 p.m.)"),
          it("under", "embaixo de"),
          it("next to", "ao lado de"),
          it("between", "entre"),
          it("in front of", "na frente de"),
          it("behind", "atrás de"),
          it("before", "antes de"),
          it("after", "depois de"),
          it("during", "durante"),
          it("until", "até (tempo)"),
        ],
      },
      {
        title: "Conectores",
        items: [
          it("and", "e"),
          it("but", "mas"),
          it("or", "ou"),
          it("because", "porque"),
          it("so", "então, por isso"),
          it("also", "também"),
          it("then", "depois, então"),
          it("however", "no entanto"),
          it("for example", "por exemplo"),
          it("actually", "na verdade"),
        ],
      },
    ],
  },
];
