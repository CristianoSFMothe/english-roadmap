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

/** Rótulo de fase: primeiro terço, segundo terço e reta final do plano. */
function phaseLabel(n: number, total: number): string {
  if (total <= 1) return "Semana única";
  const third = Math.ceil(total / 3);
  if (n <= third) return "Fase 1 · Base";
  if (n <= third * 2) return "Fase 2 · Consolidação";
  return "Fase 3 · Autonomia";
}

export function buildWeeks(raw: RawWeek[]): Week[] {
  return raw.map((w, i) => {
    const n = w.n ?? i + 1;
    const vocabGroups = w.vocab.map((g) => ({
      group: g.group,
      cards: parseItems(n, g.group, g.items),
    }));
    const cards = vocabGroups.flatMap((g) => g.cards);
    const { vocab, ...rest } = w;
    return {
      ...rest,
      n,
      vocabGroups,
      cards,
      vocabCount: cards.length,
      phase: phaseLabel(n, raw.length),
    };
  });
}

export function totalsOf(weeks: Week[]) {
  return {
    days: weeks.reduce((s, w) => s + w.days.length, 0),
    cards: weeks.reduce((s, w) => s + w.cards.length, 0),
    minutes: weeks.reduce((s, w) => s + w.days.reduce((a, d) => a + d.minutes, 0), 0),
  };
}

export const dayKey = (week: number, day: number) => `w${week}d${day}`;
