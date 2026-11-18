import { extractJson, normalizeOutline, normalizeWeek } from "../lib/normalize.ts";
import { buildWeeks } from "../lib/weeks.ts";
import { systemPrompt, outlineMessage, weekMessage } from "../lib/prompt.ts";
import { sampleProfile, clampProfile } from "../lib/profile.ts";
import { numberToWords } from "../lib/vocabulary.ts";

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

console.log(failures === 0 ? "\nTodos os testes passaram." : `\n${failures} falha(s).`);
process.exit(failures === 0 ? 0 : 1);
