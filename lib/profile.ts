export type Profile = {
  name: string;
  level: string;
  target: string;
  minutesPerDay: number;
  daysPerWeek: number;
  weeks: number;
  accent: string;
  difficulties: string[];
  goalPersonal: string;
  goalProfessional: string;
  profession: string;
  knowledge: string;
  movies: string;
  series: string;
  animation: string;
  books: string;
  music: string;
  hobbies: string;
  pleasures: string;
  avoid: string;
  notes: string;
};

export const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
export const TARGETS = ["A2", "B1", "B2", "C1", "C2"] as const;

export const DIFFICULTIES = [
  "Compreensão auditiva",
  "Fala e conversação",
  "Pronúncia",
  "Vocabulário",
  "Gramática",
  "Leitura",
  "Escrita",
  "Medo de errar em público",
  "Falta de tempo",
  "Manter a constância",
] as const;

export const ACCENTS = ["Indiferente", "Americano", "Britânico"] as const;

export const emptyProfile: Profile = {
  name: "",
  level: "A1",
  target: "B1",
  minutesPerDay: 25,
  daysPerWeek: 6,
  weeks: 12,
  accent: "Indiferente",
  difficulties: [],
  goalPersonal: "",
  goalProfessional: "",
  profession: "",
  knowledge: "",
  movies: "",
  series: "",
  animation: "",
  books: "",
  music: "",
  hobbies: "",
  pleasures: "",
  avoid: "",
  notes: "",
};

/** Perfil de demonstração que acompanha o plano de exemplo do app. */
export const sampleProfile: Profile = {
  name: "",
  level: "A1",
  target: "B1",
  minutesPerDay: 25,
  daysPerWeek: 6,
  weeks: 12,
  accent: "Indiferente",
  difficulties: ["Compreensão auditiva", "Fala e conversação", "Manter a constância"],
  goalPersonal: "Entender filmes, séries e músicas sem depender de legenda em português.",
  goalProfessional:
    "Trabalhar em time internacional: participar de reuniões, escrever relatórios e fazer entrevistas em inglês.",
  profession: "Analista de qualidade de software (QA/SDET)",
  knowledge: "Testes manuais e automatizados, APIs, pipelines de integração contínua",
  movies: "Ficção científica, ação, suspense, história e fantasia",
  series: "Comédias de situação, fantasia épica",
  animation: "Animes de aventura e desenhos de super-heróis",
  books: "Suspense, história, mitologia, desenvolvimento pessoal e textos cristãos",
  music: "Música cristã: louvor e rock cristão",
  hobbies: "Programação, manutenção do próprio carro, escrever no blog pessoal",
  pleasures: "Maratonar série no fim de semana, café da manhã sem pressa",
  avoid: "Somente músicas cristãs; evitar conteúdo com linguagem pesada",
  notes: "",
};

export const REQUIRED_FIELDS: (keyof Profile)[] = ["level", "target"];

export function profileIsUsable(p: Profile): boolean {
  const filled = [
    p.goalPersonal,
    p.goalProfessional,
    p.profession,
    p.movies,
    p.series,
    p.animation,
    p.books,
    p.music,
    p.hobbies,
    p.pleasures,
  ].filter((v) => v.trim().length > 2).length;
  return Boolean(p.level) && Boolean(p.target) && filled >= 3;
}

export function clampProfile(p: Profile): Profile {
  return {
    ...p,
    minutesPerDay: Math.min(120, Math.max(5, Number(p.minutesPerDay) || 25)),
    daysPerWeek: Math.min(7, Math.max(1, Number(p.daysPerWeek) || 6)),
    weeks: Math.min(24, Math.max(1, Number(p.weeks) || 12)),
    difficulties: Array.isArray(p.difficulties) ? p.difficulties.slice(0, 10) : [],
  };
}
