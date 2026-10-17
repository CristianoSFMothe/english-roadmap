import weeksA from "./weeks-a.json";
import weeksB from "./weeks-b.json";
import weeksC from "./weeks-c.json";
import { buildWeeks, type RawWeek, type Week } from "./weeks";

export type { Task, Day, RawWeek, Card, Week } from "./weeks";
export { buildWeeks, totalsOf, dayKey } from "./weeks";

/** Plano de demonstração que o app mostra antes de a pessoa gerar o seu. */
export const sampleRawWeeks = [...weeksA, ...weeksB, ...weeksC] as RawWeek[];
export const sampleWeeks: Week[] = buildWeeks(sampleRawWeeks);
