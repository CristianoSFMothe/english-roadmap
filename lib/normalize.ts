import type { RawWeek } from "./weeks";

export type OutlineItem = {
  n: number;
  theme: string;
  subtitle: string;
  why: string;
  grammarTopic: string;
  milestone: string;
};

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v.trim() : v == null ? fallback : String(v).trim();

const num = (v: unknown, fallback: number): number => {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
};

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Extrai o JSON da resposta do modelo, tolerando cercas de código ou texto em volta. */
export function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.search(/[[{]/);
    const end = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("A resposta do modelo não veio em JSON.");
    }
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

export function normalizeOutline(data: unknown, weeks: number): OutlineItem[] {
  const list = Array.isArray(data) ? data : arr((data as Record<string, unknown>)?.weeks);
  const items = list.slice(0, weeks).map((raw, i) => {
    const o = (raw ?? {}) as Record<string, unknown>;
    return {
      n: num(o.n, i + 1),
      theme: str(o.theme, `Week ${i + 1}`),
      subtitle: str(o.subtitle),
      why: str(o.why),
      grammarTopic: str(o.grammarTopic ?? o.grammar),
      milestone: str(o.milestone),
    };
  });
  if (!items.length) throw new Error("O esboço veio vazio.");
  return items.map((item, i) => ({ ...item, n: i + 1 }));
}

const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function normalizeWeek(
  data: unknown,
  n: number,
  daysPerWeek: number,
  minutesPerDay: number,
): RawWeek {
  const w = (data ?? {}) as Record<string, unknown>;
  const grammar = (w.grammar ?? {}) as Record<string, unknown>;

  const vocab = arr(w.vocab)
    .map((g) => {
      const o = (g ?? {}) as Record<string, unknown>;
      const items = Array.isArray(o.items)
        ? (o.items as unknown[])
            .map((it) => {
              if (typeof it === "string") return it;
              const pair = (it ?? {}) as Record<string, unknown>;
              const en = str(pair.en ?? pair.english);
              const pt = str(pair.pt ?? pair.portuguese ?? pair.translation);
              return en ? `${en}=${pt}` : "";
            })
            .filter(Boolean)
            .join("; ")
        : str(o.items);
      return { group: str(o.group, "Vocabulário"), items };
    })
    .filter((g) => g.items.length > 0);

  if (!vocab.length) throw new Error("A semana veio sem vocabulário.");

  const days = arr(w.days)
    .slice(0, 7)
    .map((d, i) => {
      const o = (d ?? {}) as Record<string, unknown>;
      const tasks = arr(o.tasks)
        .map((t) => {
          const task = (t ?? {}) as Record<string, unknown>;
          return {
            what: str(task.what),
            resource: str(task.resource, "—"),
            min: num(task.min ?? task.minutes, 0),
          };
        })
        .filter((t) => t.what.length > 0);
      return {
        label: str(o.label, DAY_LABELS[i] ?? `Dia ${i + 1}`),
        focus: str(o.focus, "Estudo"),
        minutes: num(o.minutes, minutesPerDay),
        tasks: tasks.length ? tasks : [{ what: "Revisar o vocabulário da semana", resource: "Flashcards", min: minutesPerDay }],
        speak: str(o.speak),
        mini: str(o.mini, "Revisar os flashcards da semana."),
      };
    });

  if (!days.length) throw new Error("A semana veio sem dias de estudo.");
  while (days.length < Math.min(daysPerWeek, 7)) {
    days.push({
      label: DAY_LABELS[days.length] ?? `Dia ${days.length + 1}`,
      focus: "Revisão",
      minutes: minutesPerDay,
      tasks: [{ what: "Revisar os flashcards e reler as frases da semana", resource: "Flashcards", min: minutesPerDay }],
      speak: "",
      mini: "Só os flashcards.",
    });
  }

  const examples = arr(grammar.examples).map((e) => str(e)).filter(Boolean);

  return {
    n,
    theme: str(w.theme, `Week ${n}`),
    subtitle: str(w.subtitle),
    why: str(w.why),
    grammar: {
      topic: str(grammar.topic, "Gramática da semana"),
      why: str(grammar.why),
      examples: examples.length ? examples : ["—"],
      tip: str(grammar.tip),
    },
    vocab,
    resources: arr(w.resources)
      .map((r) => {
        const o = (r ?? {}) as Record<string, unknown>;
        return { name: str(o.name), url: str(o.url), what: str(o.what) };
      })
      .filter((r) => r.name && /^https?:\/\//.test(r.url)),
    content: arr(w.content)
      .map((c) => {
        const o = (c ?? {}) as Record<string, unknown>;
        return { name: str(o.name), kind: str(o.kind, "Conteúdo"), what: str(o.what) };
      })
      .filter((c) => c.name),
    milestone: str(w.milestone),
    days,
  };
}
