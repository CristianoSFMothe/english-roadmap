/** Nome, descrição e endereço público do app, usados no SEO, no login e na agenda. */
export const SITE_NAME = "Trilha de Inglês";

export const SITE_TITLE = "Trilha de Inglês: plano de estudo de inglês personalizado com IA";

export const SITE_DESCRIPTION =
  "Monte um plano de estudo de inglês semana a semana, do seu nível atual ao nível que você quer alcançar. A IA usa seus objetivos, suas dificuldades e o que você gosta de assistir, ler e ouvir para criar gramática, vocabulário, flashcards e atividades diárias no seu ritmo.";

export const SITE_KEYWORDS = [
  "aprender inglês",
  "plano de estudo de inglês",
  "cronograma de inglês",
  "inglês para iniciantes",
  "estudar inglês sozinho",
  "inglês com IA",
  "flashcards de inglês",
  "vocabulário em inglês",
  "gramática inglesa",
  "níveis A1 A2 B1 B2 C1",
];

export function siteUrl(): string {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
