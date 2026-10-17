import weeksA from "./weeks-a.json";
import weeksB from "./weeks-b.json";
import weeksC from "./weeks-c.json";

export type Task = { what: string; resource: string; min: number };

export type Day = {
  label: string;
  focus: string;
  minutes: number;
  tasks: Task[];
  speak: string;
  mini: string;
};

export type RawWeek = {
  n: number;
  theme: string;
  subtitle: string;
  why: string;
  grammar: { topic: string; why: string; examples: string[]; tip: string };
  vocab: { group: string; items: string }[];
  resources: { name: string; url: string; what: string }[];
  content: { name: string; kind: string; what: string }[];
  milestone: string;
  days: Day[];
};

export type Card = { en: string; pt: string; group: string; id: string };

export type Week = Omit<RawWeek, "vocab"> & {
  vocabGroups: { group: string; cards: Card[] }[];
  cards: Card[];
  vocabCount: number;
  phase: string;
};

const PHASES: Record<number, string> = {
  1: "Fase 1 · Base A1+",
  2: "Fase 1 · Base A1+",
  3: "Fase 1 · Base A1+",
  4: "Fase 1 · Base A1+",
  5: "Fase 1 · Base A1+",
  6: "Fase 1 · Base A1+",
  7: "Fase 2 · A2 em construção",
  8: "Fase 2 · A2 em construção",
  9: "Fase 2 · A2 em construção",
  10: "Fase 2 · A2 em construção",
  11: "Fase 2 · A2 em construção",
  12: "Fase 2 · A2 em construção",
};

function parseItems(weekN: number, group: string, items: string): Card[] {
  return items
    .split(";")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair, i) => {
      const cut = pair.indexOf("=");
      const en = cut === -1 ? pair : pair.slice(0, cut).trim();
      const pt = cut === -1 ? "" : pair.slice(cut + 1).trim();
      return { en, pt, group, id: `w${weekN}-${group}-${i}` };
    });
}

const raw = [...weeksA, ...weeksB, ...weeksC] as RawWeek[];

export const weeks: Week[] = raw.map((w) => {
  const vocabGroups = w.vocab.map((g) => ({
    group: g.group,
    cards: parseItems(w.n, g.group, g.items),
  }));
  const cards = vocabGroups.flatMap((g) => g.cards);
  const { vocab, ...rest } = w;
  return {
    ...rest,
    vocabGroups,
    cards,
    vocabCount: cards.length,
    phase: PHASES[w.n] ?? "",
  };
});

export const TOTAL_DAYS = weeks.reduce((sum, w) => sum + w.days.length, 0);
export const TOTAL_CARDS = weeks.reduce((sum, w) => sum + w.cards.length, 0);
export const TOTAL_MINUTES = weeks.reduce(
  (sum, w) => sum + w.days.reduce((s, d) => s + d.minutes, 0),
  0,
);

export const dayKey = (week: number, day: number) => `w${week}d${day}`;
