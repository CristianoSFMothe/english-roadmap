import { extractJson, normalizeOutline, normalizeWeek } from "../lib/normalize.ts";
import { buildWeeks } from "../lib/weeks.ts";
import { systemPrompt, outlineMessage, weekMessage } from "../lib/prompt.ts";
import { sampleProfile, clampProfile } from "../lib/profile.ts";
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

const p = clampProfile({ ...sampleProfile, weeks: 2, daysPerWeek: 5, minutesPerDay: 20 });

check("prompt do sistema cita nivel, alvo e interesses", () => {
  const s = systemPrompt(p);
  if (!s.includes("A1") || !s.includes("B1")) throw new Error("niveis ausentes");
  if (!s.includes("QA/SDET")) throw new Error("profissao ausente");
  if (!s.includes("Somente músicas cristãs")) throw new Error("restricao ausente");
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

console.log(failures === 0 ? "\nTodos os testes passaram." : `\n${failures} falha(s).`);
process.exit(failures === 0 ? 0 : 1);
