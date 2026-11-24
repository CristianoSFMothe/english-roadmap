/**
 * Pronúncia aproximada das frases da aba de verbos, escrita com sons do português
 * (inglês americano, "rr" para o h). Monta a frase palavra por palavra a partir de
 * WORD_SAY; LINE_SAY corrige frases inteiras quando a palavra é ambígua (read no passado).
 * Sem imports: o `npm test` roda este arquivo direto no Node.
 */

const WORD_SAY: Record<string, string> = {
  a: "â", about: "â-báut", abroad: "â-bród", account: "â-káunt", afraid: "â-frêid",
  after: "éf-ter", again: "â-guén", ahead: "â-rréd", alcohol: "él-ko-rról", alone: "â-lôun",
  aloud: "â-láud", already: "ól-ré-di", always: "ól-uêiz", am: "ém", an: "én", ana: "é-na",
  and: "énd", aninha: "a-ní-nha", another: "â-nâ-der", answer: "én-ser", anything: "é-ni-thing",
  apartment: "â-párt-ment", app: "ép", are: "ár", ask: "ésk", asked: "éskt", asks: "ésks",
  at: "ét", ate: "êit", attention: "â-tén-chân", away: "â-uêi",

  back: "bék", bag: "bég", bank: "bénk", bathroom: "béth-rum", be: "bí", beach: "bítch",
  beans: "bínz", bed: "béd", before: "bi-fór", best: "bést", better: "bé-ter",
  between: "bi-tuín", bigger: "bí-guer", book: "búk", bought: "bót", box: "bóks",
  boxes: "bók-siz", brazil: "bra-zíl", break: "brêik", breakfast: "brék-fâst", bring: "bríng",
  brother: "brâ-der", brothers: "brâ-derz", bug: "bâg", bus: "bâs", busy: "bí-zi",
  but: "bât", buy: "bái", buyer: "bái-er", by: "bái",

  c: "sí", cake: "kêik", call: "kól", called: "kóld", calm: "kám", came: "kêim", can: "kén",
  "can't": "ként", car: "kár", card: "kárd", care: "kér", carefully: "kér-fu-li",
  case: "kêis", center: "sén-ter", change: "tchêindj", charger: "tchár-djer", check: "tchék",
  checked: "tchékt", city: "sí-ti", class: "klés", classes: "klé-siz", clean: "klín",
  client: "klái-ent", coffee: "kó-fi", cold: "kôuld", come: "kâm", coming: "kâ-ming",
  company: "kâm-pa-ni", could: "kúd", coupon: "kú-pón", course: "kórs",

  day: "dêi", decision: "di-sí-jân", design: "di-záin", desk: "désk", did: "díd",
  "didn't": "dí-dent", difference: "dí-fe-rens", dinner: "dí-ner", directions: "di-rék-chânz",
  dishes: "dí-chiz", documents: "dó-kiu-ments", do: "dú", does: "dâz", "doesn't": "dâ-zent", doing: "dú-ing",
  "don't": "dôunt", done: "dân", down: "dáun", drank: "drénk", drink: "drínk",
  drinking: "drín-king", drive: "dráiv",

  early: "âr-li", easy: "í-zi", eat: "ít", eight: "êit", email: "í-mêil", english: "ín-glich",
  enough: "i-nâf", error: "é-ror", every: "év-ri", everything: "év-ri-thing",
  excuse: "eks-kiúz", expensive: "eks-pén-siv", explain: "eks-plêin",

  family: "fé-mi-li", far: "fár", fast: "fést", faster: "fés-ter", feel: "fíl",
  feeling: "fí-ling", feels: "fílz", felt: "félt", file: "fáil", find: "fáind", fine: "fáin",
  fish: "fích", fitting: "fí-ting", five: "fáiv", folder: "fôul-der", for: "fór",
  found: "fáund", four: "fór", free: "frí", fridays: "frái-dêiz", friends: "frénz",
  from: "frâm", fruit: "frút",

  gave: "guêiv", get: "guét", getting: "gué-ting", gift: "guíft", give: "guív", go: "gôu",
  goes: "gôuz", going: "gôu-ing", good: "gúd", goodbye: "gud-bái", got: "gót",
  great: "grêit", group: "grúp", guard: "gárd", guitar: "gui-tár", gym: "djím",

  had: "rréd", half: "rréf", hand: "rrénd", handwriting: "rrénd-rái-ting", happy: "rré-pi",
  hard: "rrárd", has: "rréz", have: "rrév", he: "rrí", healthy: "rrél-thi", heart: "rrárt",
  hello: "rre-lôu", help: "rrélp", helped: "rrélpt", helpful: "rrélp-ful", her: "rrâr",
  here: "rrír", hi: "rrái", him: "rrím", home: "rrôum", homework: "rrôum-uârk",
  hour: "áuer", how: "rráu", hungry: "rrân-gri",

  i: "ái", "i'd": "áid", "i'll": "áil", "i'm": "áim", ice: "áis", idea: "ai-día", if: "íf",
  in: "ín", installment: "ins-tól-ment", interesting: "ín-tres-ting",
  interview: "ín-ter-viú", is: "íz", it: "ít", "it's": "íts",

  jacket: "djé-kit", job: "djób", john: "djón", jokes: "djôuks", journal: "djâr-nal",
  juice: "djús",

  keep: "kíp", kept: "képt", key: "kí", keys: "kíz", kids: "kídz", kitchen: "kí-tchen",
  know: "nôu", knows: "nôuz",

  languages: "lén-gui-djiz", laptop: "lép-tóp", last: "lést", late: "lêit",
  later: "lêi-ter", learn: "lârn", learned: "lârnd", learning: "lâr-ning", leave: "líiv",
  leaving: "líi-ving", left: "léft", lesson: "lé-son", let: "lét", "let's": "léts",
  like: "láik", liked: "láikt", likes: "láiks", lines: "láinz", little: "lí-tel",
  live: "lív", lived: "lívd", lives: "lívz", living: "lí-ving", log: "lóg", login: "lóg-in",
  logs: "lógz", long: "lóng", look: "lúk", lost: "lóst", lot: "lót", loud: "láud",
  louder: "láu-der", lunch: "lântch",

  made: "mêid", make: "mêik", makes: "mêiks", manager: "mé-ni-djer", market: "már-kit",
  married: "mé-rid", me: "mí", mean: "mín", meat: "mít", medicine: "mé-di-sin",
  meeting: "mí-ting", message: "mé-sidj", milk: "mílk", minute: "mí-nit",
  minutes: "mí-nits", mistake: "mis-têik", mistakes: "mis-têiks",
  misunderstand: "mis-ân-der-sténd", mom: "mám", mondays: "mân-dêiz", money: "mâ-ni",
  month: "mânth", more: "mór", morning: "mór-ning", most: "môust", move: "múv",
  movie: "mú-vi", moving: "mú-ving", much: "mâtch", my: "mái",

  name: "nêim", near: "nír", nearest: "ní-rest", need: "níd", needed: "ní-did",
  needs: "nídz", nervous: "nâr-vâs", new: "nú", news: "núz", next: "nékst", nice: "náis",
  night: "náit", nine: "náin", no: "nôu", not: "nót", now: "náu", number: "nâm-ber",

  of: "óv", off: "óf", oh: "ôu", ok: "ôu-kêi", old: "ôuld", on: "ón", one: "uân",
  online: "ón-láin", open: "ôu-pen", orange: "ó-rindj", our: "áuer", out: "áut",
  over: "ôu-ver",

  page: "pêidj", paid: "pêid", parents: "pé-rents", party: "pár-ti", password: "pés-uârd",
  paulo: "páu-lu", pay: "pêi", paying: "pêi-ing", payment: "pêi-ment", pen: "pén",
  per: "pâr", perfect: "pâr-fekt", pharmacy: "fár-ma-si", phone: "fôun", photo: "fôu-tou",
  photos: "fôu-touz", pizza: "pít-sa", place: "plêis", plates: "plêits", play: "plêi",
  please: "plíz", point: "póint", portuguese: "pór-tchu-guíz", posted: "pôus-tid",
  problem: "pró-blem", project: "pró-djekt", public: "pâ-blik", put: "pút",

  question: "kués-tchân", questions: "kués-tchânz", quick: "kuík",

  read: "ríd", reading: "rí-ding", reads: "rídz", ready: "ré-di", really: "rí-li",
  recipe: "ré-si-pi", rent: "rént", report: "ri-pórt", reset: "ri-sét",
  restaurant: "rés-tâ-rânt", rice: "ráis", right: "ráit", rio: "rí-ou", room: "rúm",

  said: "séd", sale: "sêil", saturday: "sé-tar-dêi", saw: "só", say: "sêi", says: "séz",
  screen: "skrín", second: "sé-kând", secret: "sí-kret", security: "si-kiú-ri-ti", see: "sí",
  send: "sénd", series: "sí-riz", seven: "sé-ven", she: "chí", shirt: "chârt", shoes: "chúz",
  shopping: "chó-ping", should: "chúd", shower: "cháu-er", sick: "sík", simple: "sím-pel",
  six: "síks", slowly: "slôu-li", small: "smól", so: "sôu", soccer: "só-ker", soda: "sôu-da",
  soft: "sóft", software: "sóft-uér", solution: "so-lú-chân", some: "sâm",
  something: "sâm-thing", soon: "sún", sorry: "só-ri", spanish: "spé-nich", speak: "spík",
  speaker: "spí-ker", speaking: "spí-king", speaks: "spíks", spoke: "spôuk", start: "stárt",
  started: "stár-tid", starting: "stár-ting", starts: "stárts", station: "stêi-chân",
  step: "stép", still: "stíl", stop: "stóp", story: "stó-ri", studied: "stâ-did",
  studies: "stâ-diz", study: "stâ-di", sugar: "chú-gar", sunday: "sân-dêi",
  supermarket: "sú-per-már-kit", sure: "chúr", system: "sís-tem", são: "sáun",

  table: "têi-bel", take: "têik", takes: "têiks", task: "tésk", taxi: "ték-si", tea: "tí",
  teacher: "tí-tcher", team: "tím", teamwork: "tím-uârk", tech: "ték", tell: "tél",
  tells: "télz", ten: "tén", test: "tést", tester: "tés-ter", testing: "tés-ting",
  tests: "tésts", thank: "thénk", thanks: "thénks", that: "dét", the: "dâ", them: "dém",
  there: "dér", these: "díz", they: "dêi", think: "thínk", thinking: "thín-king",
  thinks: "thínks", thirty: "thâr-ti", this: "dís", thought: "thót", three: "thrí",
  ticket: "tí-kit", tickets: "tí-kits", time: "táim", tired: "táierd", to: "tu",
  today: "tu-dêi", together: "tu-gué-der", told: "tôuld", tomorrow: "tu-mó-rou",
  tonight: "tu-náit", too: "tú", took: "túk", touch: "tâtch", train: "trêin",
  travel: "tré-vel", tried: "tráid", truth: "trúth", try: "trái", twice: "tuáis", two: "tú",
  type: "táip",

  understand: "ân-der-sténd", understanding: "ân-der-stén-ding", understood: "ân-der-stúd",
  up: "âp", updated: "âp-dêi-tid", usb: "iú-és-bí", use: "iúz", used: "iúzd",
  useful: "iús-ful", user: "iú-zer", users: "iú-zerz", uses: "iú-ziz",

  video: "ví-di-ou",

  wait: "uêit", wanna: "uá-na", want: "uánt", wanted: "uán-tid", wants: "uánts", was: "uóz",
  watch: "uótch", water: "uó-ter", we: "uí", "we'll": "uíl", week: "uík", weekend: "uí-kend",
  weekends: "uí-kendz", went: "uént", were: "uâr", what: "uót", when: "uén", where: "uér",
  who: "rrú", why: "uái", wife: "uáif", will: "uíl", with: "uíd", word: "uârd",
  words: "uârdz", work: "uârk", worked: "uârkt", works: "uârks", worry: "uâ-ri",
  would: "uúd", wow: "uáu", write: "ráit", writer: "rái-ter", wrote: "rôut",

  year: "iír", years: "iírz", yes: "iés", yesterday: "iés-ter-dêi", yet: "iét", yoga: "iôu-ga",
  you: "iú", "you'll": "iúl", "you're": "iór", your: "iór",

  "20": "tuén-ti", "30": "thâr-ti", "10:05": "tén ôu fáiv",
};

/** Frases em que a regra palavra por palavra erraria. */
const LINE_SAY: Record<string, string> = {
  "I read a good book last month.": "ái réd â gúd búk lést mânth.",
  "M-A-R-I-A.": "ém-êi-ár-ái-êi.",
};

const TOKEN = /[A-Za-zÀ-ÿ]+(?:'[A-Za-z]+)*|\d+(?::\d+)?/g;

/**
 * Pronúncia aproximada de uma frase em inglês. Ignora o "A: " / "B: " das conversas e
 * mantém a pontuação. Devolve undefined se alguma palavra não estiver no dicionário.
 */
export function sayPhrase(en: string): string | undefined {
  const text = en.replace(/^[AB]: /, "");
  const fixed = LINE_SAY[text];
  if (fixed) return fixed;
  let missing = false;
  const out = text.replace(TOKEN, (w) => {
    const say = WORD_SAY[w.toLowerCase()];
    if (!say) missing = true;
    return say ?? w;
  });
  return missing ? undefined : out;
}

/* ---------- regra de estilo, chave do cache e pronúncia de qualquer texto ---------- */

/** Regras do jeito de escrever a pronúncia (vão para o prompt do Gemini e para o subagente). */
export const PRON_STYLE = [
  "Escreva como um brasileiro leria em voz alta para soar como o inglês americano.",
  "Use só letras e sons do português. Nada de alfabeto fonético (IPA).",
  "O h aspirado do inglês vira \"rr\" (hello = rre-lôu, house = rráus).",
  "Coloque acento agudo ou circunflexo na sílaba forte (water = uó-ter, today = tu-dêi).",
  "Separe as sílabas com hífen só dentro da palavra; as palavras ficam separadas por espaço.",
  "O th vira \"th\" quando o som não existe em português (think = thínk) e \"d\" no the/this/that (the = dâ, this = dís).",
  "O r do fim de sílaba fica \"r\" (car = kár), e o w vira \"u\" (work = uârk).",
  "Mantenha a pontuação da frase original (vírgula, ponto, interrogação).",
].join("\n");

/** Pares de exemplo tirados do dicionário acima. */
export const PRON_EXAMPLES: [string, string][] = [
  ["book", WORD_SAY.book],
  ["coffee", WORD_SAY.coffee],
  ["breakfast", WORD_SAY.breakfast],
  ["yesterday", WORD_SAY.yesterday],
  ["already", WORD_SAY.already],
  ["think", "thínk"],
  ["hello", "rre-lôu"],
  ["How are you?", "rráu ár iú?"],
  ["I read a good book last month.", LINE_SAY["I read a good book last month."]],
  ["Where is the bathroom?", "uér íz dâ béth-rum?"],
];

/** Chave do cache: sem espaços extras, minúscula e sem . ! ? , no fim. */
export function pronKey(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase().replace(/[.!?,]+$/, "").trim();
}

/**
 * Pronúncias escritas à mão (pelo subagente `pronuncia`) para frases fixas que o
 * dicionário não cobre. A chave é `pronKey(texto)`. Fica aqui, e não num arquivo à
 * parte, porque este arquivo não pode ter imports (o `npm test` roda ele direto no Node).
 */
export const PRON_SEED: Record<string, string> = {
  "hello, my name is alex and i am from brazil": "rre-lôu, mái nêim íz é-leks énd ái ém frâm bra-zíl.",
  "hi, it is very nice to meet you": "rrái, ít íz vé-ri náis tu mít iú!",
  "in my free time, i like to cook and play video games": "ín mái frí táim, ái láik tu kúk énd plêi ví-di-ou guêimz.",
  "i am ready for the weekend and i like good music": "ái ém ré-di fór dâ uí-kend énd ái láik gúd miú-zik.",
  "hello! my name is carlos. i am from brazil and i am a developer. in my free time, i like to walk and cook": "rre-lôu! mái nêim íz kár-lous. ái ém frâm bra-zíl énd ái ém â di-vé-lo-per. ín mái frí táim, ái láik tu uók énd kúk.",
  "she is my colleague": "chí íz mái kó-lig.",
  "i always wake up early and drink a glass of water": "ái ól-uêiz uêik âp âr-li énd drínk â glés óv uó-ter.",
  "i usually check my emails before i attend the morning meeting": "ái iú-ju-a-li tchék mái í-mêilz bi-fór ái â-ténd dâ mór-ning mí-ting.",
  "we often have breakfast together in the kitchen": "uí ó-fen rrév brék-fâst tu-gué-der ín dâ kí-tchen.",
  "i cook breakfast and prepare fresh coffee every day": "ái kúk brék-fâst énd pri-pér fréch kó-fi év-ri dêi.",
  "on friday evenings, i relax on the couch and watch a show": "ón frái-dêi ív-ningz, ái ri-léks ón dâ káutch énd uótch â chôu.",
  "i always wake up early, drink coffee, and start work at nine": "ái ól-uêiz uêik âp âr-li, drínk kó-fi, énd stárt uârk ét náin.",
  "i always wake up at seven in the morning": "ái ól-uêiz uêik âp ét sé-ven ín dâ mór-ning.",
  "she usually checks her emails before the meeting": "chí iú-ju-a-li tchéks rrâr í-mêilz bi-fór dâ mí-ting.",
  "we often drink coffee in the afternoon": "uí ó-fen drínk kó-fi ín dâ éf-ter-nún.",
  "he rarely starts work late": "rrí rér-li stárts uârk lêit.",
  "they never skip breakfast": "dêi né-ver skíp brék-fâst.",
  "i love playing adventure games because they are exciting": "ái lâv plêi-ing âd-vén-tcher guêimz bi-kóz dêi ár ek-sái-ting.",
  "my favorite series is funny and helps me relax after work": "mái fêi-vo-rit sí-riz íz fâ-ni énd rrélps mí ri-léks éf-ter uârk.",
  "i enjoy cooking eggs and drinking hot coffee in the morning": "ái en-djói kú-king égz énd drín-king rrót kó-fi ín dâ mór-ning.",
  "listening to music is my favorite way to spend my free time": "lís-ning tu miú-zik íz mái fêi-vo-rit uêi tu spénd mái frí táim.",
  "on weekends, i enjoy walking in the park and playing video games": "ón uí-kendz, ái en-djói uó-king ín dâ párk énd plêi-ing ví-di-ou guêimz.",
  "my favorite game is exciting and i love playing it with my friends": "mái fêi-vo-rit guêim íz ek-sái-ting énd ái lâv plêi-ing ít uíd mái frénz.",
  "i like playing video games after work": "ái láik plêi-ing ví-di-ou guêimz éf-ter uârk.",
  "she loves cooking dinner for her family": "chí lâvz kú-king dí-ner fór rrâr fé-mi-li.",
  "we enjoy watching sci-fi series on weekends": "uí en-djói uó-tching sái-fái sí-riz ón uí-kendz.",
  "i do not like walking in the rain": "ái dú nót láik uó-king ín dâ rêin.",
  "do you enjoy trying new recipes": "dú iú en-djói trái-ing nú ré-si-piz?",
  "there is a laptop and there are two pens on my desk": "dér íz â lép-tóp énd dér ár tú pénz ón mái désk.",
  "the mouse is next to the keyboard and the notebook is under the pen": "dâ máus íz nékst tu dâ kí-bórd énd dâ nôut-búk íz ân-der dâ pén.",
  "there are many desks and chairs in the office": "dér ár mé-ni désks énd tchérz ín dâ ó-fis.",
  "every morning i check my emails and write a daily report": "év-ri mór-ning ái tchék mái í-mêilz énd ráit â dêi-li ri-pórt.",
  "in this office there are no windows and there is only one computer": "ín dís ó-fis dér ár nôu uín-dôuz énd dér íz ôun-li uân kâm-piú-ter.",
  "there is a laptop on my desk. there are two screens. the notebook is next to the mouse. i check messages, i attend short meetings, and i organize my tasks": "dér íz â lép-tóp ón mái désk. dér ár tú skrínz. dâ nôut-búk íz nékst tu dâ máus. ái tchék mé-si-djiz, ái â-ténd chórt mí-tingz, énd ái ór-ga-náiz mái tésks.",
  "there are two monitors in my office": "dér ár tú mó-ni-terz ín mái ó-fis.",
  "the notebook is next to the keyboard": "dâ nôut-búk íz nékst tu dâ kí-bórd.",
  "there are three urgent emails in my inbox": "dér ár thrí âr-djent í-mêilz ín mái ín-bóks.",
  "the document is under the folder": "dâ dó-kiu-ment íz ân-der dâ fôul-der.",
  "i am studying english right now": "ái ém stâ-di-ing ín-glich ráit náu.",
  "the spaceship is flying through the dark sky": "dâ spêis-chíp íz flái-ing thrú dâ dárk skái.",
  "my team is working on a new project today": "mái tím íz uâr-king ón â nú pró-djekt tu-dêi.",
  "look! he is opening the door and smiling": "lúk! rrí íz ôu-pe-ning dâ dór énd smái-ling.",
  "a quiet life is beginning right now": "â kuái-et láif íz bi-guí-ning ráit náu.",
  "the robot is running, the light is flashing, and the hero is escaping": "dâ rôu-bót íz râ-ning, dâ láit íz flé-ching, énd dâ rrí-rou íz is-kêi-ping.",
  "i am working on the report right now": "ái ém uâr-king ón dâ ri-pórt ráit náu.",
  "she is watching a science fiction movie": "chí íz uó-tching â sái-ens fík-chân mú-vi.",
  "they are walking in the park": "dêi ár uó-king ín dâ párk.",
  "i usually drink coffee, but today i am drinking tea": "ái iú-ju-a-li drínk kó-fi, bât tu-dêi ái ém drín-king tí.",
  "the spaceship is landing right now": "dâ spêis-chíp íz lén-ding ráit náu.",
  "first, cut the bread and heat the pan": "fârst, kât dâ bréd énd rrít dâ pén.",
  "first, check the list and then send the report": "fârst, tchék dâ líst énd dén sénd dâ ri-pórt.",
  "pass me the butter and the hot coffee, please": "pés mí dâ bâ-ter énd dâ rrót kó-fi, plíz.",
  "add some fruit and a little sugar to the bowl": "éd sâm frút énd â lí-tel chú-gar tu dâ bôul.",
  "first, take two eggs. then, fry them in the pan": "fârst, têik tú égz. dén, frái dém ín dâ pén.",
  "finally, serve the hot tea and enjoy breakfast": "fái-na-li, sârv dâ rrót tí énd en-djói brék-fâst.",
  "first, chop two fresh tomatoes": "fârst, tchóp tú fréch to-mêi-tôuz.",
  "then, add a little salt and some water": "dén, éd â lí-tel sólt énd sâm uó-ter.",
  "after that, heat the oil in a pan": "éf-ter dét, rrít dâ óil ín â pén.",
  "mix everything together with a spoon": "míks év-ri-thing tu-gué-der uíd â spún.",
  "finally, serve the hot eggs with toast": "fái-na-li, sârv dâ rrót égz uíd tôust.",
  "last weekend i watched a very funny show on tv": "lést uí-kend ái uótcht â vé-ri fâ-ni chôu ón tí-ví.",
  "yesterday i worked hard and checked all my emails": "iés-ter-dêi ái uârkt rrárd énd tchékt ól mái í-mêilz.",
  "the story was quiet, but the ending was very exciting": "dâ stó-ri uóz kuái-et, bât dâ én-ding uóz vé-ri ek-sái-ting.",
  "i listened to my favorite song and enjoyed the quiet night": "ái lí-send tu mái fêi-vo-rit sóng énd en-djóid dâ kuái-et náit.",
  "last weekend was great because i watched five episodes of my favorite show": "lést uí-kend uóz grêit bi-kóz ái uótcht fáiv é-pi-sôudz óv mái fêi-vo-rit chôu.",
  "i rested at home, cooked a warm meal, and watched movies": "ái rés-tid ét rrôum, kúkt â uórm míl, énd uótcht mú-viz.",
  "the movie was very exciting": "dâ mú-vi uóz vé-ri ek-sái-ting.",
  "we watched a great sci-fi series": "uí uótcht â grêit sái-fái sí-riz.",
  "i stayed on the couch all sunday": "ái stêid ón dâ káutch ól sân-dêi.",
  "first, he wrote the report, and then he sent the email": "fârst, rrí rôut dâ ri-pórt, énd dén rrí sént dâ í-mêil.",
  "the hero lost the battle, but then he saved the city": "dâ rrí-rou lóst dâ bé-tel, bât dén rrí sêivd dâ sí-ti.",
  "she found a secret door and went inside the dark room": "chí fáund â sí-kret dór énd uént in-sáid dâ dárk rúm.",
  "did you hear the news about the main character": "díd iú rrír dâ núz â-báut dâ mêin ké-rak-ter?",
  "suddenly, the villain came, but the hero fought and won in the end": "sâ-den-li, dâ ví-len kêim, bât dâ rrí-rou fót énd uân ín dâ énd.",
  "first i thought it was difficult, but then i understood the whole plot": "fârst ái thót ít uóz dí-fi-kâlt, bât dén ái ân-der-stúd dâ rrôul plót.",
  "the hero saw the villain and ran away": "dâ rrí-rou só dâ ví-len énd rén â-uêi.",
  "she wrote a short report about the movie": "chí rôut â chórt ri-pórt â-báut dâ mú-vi.",
  "they went to the cinema last night": "dêi uént tu dâ sí-ne-ma lést náit.",
  "did you see the new episode yesterday": "díd iú sí dâ nú é-pi-sôud iés-ter-dêi?",
  "what did the main character do first": "uót díd dâ mêin ké-rak-ter dú fârst?",
  "i am going to finish the status report by friday": "ái ém gôu-ing tu fí-nich dâ stêi-tâs ri-pórt bái frái-dêi.",
  "what are you going to do this afternoon": "uót ár iú gôu-ing tu dú dís éf-ter-nún?",
  "this weekend, i am going to cook a nice dinner and relax": "dís uí-kend, ái ém gôu-ing tu kúk â náis dí-ner énd ri-léks.",
  "i am going to review the tasks, send the email, and play games on saturday": "ái ém gôu-ing tu ri-viú dâ tésks, sénd dâ í-mêil, énd plêi guêimz ón sé-tar-dêi.",
  "next week i am going to launch the project, and then i will rest": "nékst uík ái ém gôu-ing tu lóntch dâ pró-djekt, énd dén ái uíl rést.",
  "we are going to meet at five o'clock": "uí ár gôu-ing tu mít ét fáiv â-klók.",
  "i think it will rain this weekend": "ái thínk ít uíl rêin dís uí-kend.",
  "sorry, i did not understand. could you repeat that, please": "só-ri, ái díd nót ân-der-sténd. kúd iú ri-pít dét, plíz?",
  "we need more time, so we should change the meeting date": "uí níd mór táim, sôu uí chúd tchêindj dâ mí-ting dêit.",
  "what is the main goal? can you give a simple example": "uót íz dâ mêin gôul? kén iú guív â sím-pel ig-zém-pel?",
  "i have a question about the project. can you explain this part": "ái rrév â kués-tchân â-báut dâ pró-djekt. kén iú eks-plêin dís párt?",
  "we must follow the safety rules, but we can try another solution": "uí mâst fó-lôu dâ sêif-ti rúlz, bât uí kén trái â-nâ-der so-lú-chân.",
  "sorry to interrupt. could you speak slower? i think we should check the plan and find a simple fix": "só-ri tu in-te-râpt. kúd iú spík slôu-er? ái thínk uí chúd tchék dâ plén énd fáind â sím-pel fíks.",
  "could you repeat that, please": "kúd iú ri-pít dét, plíz?",
  "we must follow the new safety rules": "uí mâst fó-lôu dâ nú sêif-ti rúlz.",
  "you should check the document again": "iú chúd tchék dâ dó-kiu-ment â-guén.",
  "i have already managed a project team": "ái rrév ól-ré-di mé-nidjd â pró-djekt tím.",
  "have you ever led a presentation": "rrév iú é-ver léd â pré-zen-têi-chân?",
  "i have completed all my tasks so far": "ái rrév kâm-plí-tid ól mái tésks sôu fár.",
  "i have done my sentence mining today": "ái rrév dân mái sén-tens mái-ning tu-dêi.",
  "i have solved complex challenges at work": "ái rrév sólvd kóm-pleks tché-len-djiz ét uârk.",
  "i have achieved great success in my career": "ái rrév â-tchívd grêit sâk-sés ín mái ka-rír.",
  "have you ever led a project": "rrév iú é-ver léd â pró-djekt?",
  "i have never missed a deadline": "ái rrév né-ver míst â déd-láin.",
  "i have already completed the report": "ái rrév ól-ré-di kâm-plí-tid dâ ri-pórt.",
  "she has not finished the test yet": "chí rréz nót fí-nicht dâ tést iét.",
  "the project is on schedule, however we need more time for testing": "dâ pró-djekt íz ón ské-djul, rrau-é-ver uí níd mór táim fór tés-ting.",
  "in my opinion, the main issue is the tight deadline": "ín mái o-pí-niân, dâ mêin í-chu íz dâ táit déd-láin.",
  "although the budget is low, our productivity increased": "ól-dôu dâ bâ-djit íz lôu, áuer prôu-dâk-tí-vi-ti in-kríst.",
  "we resolved the blocker, therefore the outcome is very positive": "uí ri-zólvd dâ bló-ker, dér-fór dâ áut-kâm íz vé-ri pó-zi-tiv.",
  "in conclusion, our next step is to deliver the final product next week": "ín kân-klú-jân, áuer nékst stép íz tu di-lí-ver dâ fái-nal pró-dâkt nékst uík.",
  "overall, performance was high because the team worked hard": "ôu-ver-ól, per-fór-mâns uóz rrái bi-kóz dâ tím uârkt rrárd.",
  "the project is late because we had technical issues": "dâ pró-djekt íz lêit bi-kóz uí rréd ték-ni-kal í-chuz.",
  "we tested the code; however, we found a new bug": "uí tés-tid dâ kôud; rrau-é-ver, uí fáund â nú bâg.",
  "the budget is low, therefore we must prioritize tasks": "dâ bâ-djit íz lôu, dér-fór uí mâst prai-ó-ri-táiz tésks.",
  "although the deadline was short, we finished on time": "ól-dôu dâ déd-láin uóz chórt, uí fí-nicht ón táim.",
  "sales increased because the new campaign was successful": "sêilz in-kríst bi-kóz dâ nú kém-pêin uóz sâk-sés-ful.",
};

/** Pronúncia de um texto: a explícita, senão o dicionário, senão o mapa semente. */
export function pronounce(en: string, explicit?: string): string | undefined {
  const own = explicit?.trim();
  if (own) return own;
  return sayPhrase(en) ?? PRON_SEED[pronKey(en)];
}
