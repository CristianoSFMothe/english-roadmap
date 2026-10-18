import { betterAuth } from "better-auth";
import { pool } from "./db";

/** Escopos pedidos ao Google: identificação e criação de eventos na agenda. */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar.events",
];

function baseUrl(): string {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/** O login só aparece no app quando as três peças estão configuradas. */
export const authConfigured = Boolean(
  process.env.DATABASE_URL &&
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET,
);

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET ?? "chave-de-desenvolvimento-trocar",
  baseURL: baseUrl(),
  trustedOrigins: [baseUrl()],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      scope: GOOGLE_SCOPES,
      // offline + consent garantem o refresh token, necessário para a agenda
      // continuar funcionando depois que o token de acesso expira.
      accessType: "offline",
      prompt: "select_account consent",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  databaseHooks: {
    user: {
      create: {
        // Com ALLOWED_EMAILS preenchida, só essas contas viram usuário.
        before: async (user) => {
          const lista = (process.env.ALLOWED_EMAILS ?? "")
            .split(",")
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean);
          if (!lista.length) return;
          if (!user.email || !lista.includes(user.email.toLowerCase())) return false;
        },
      },
    },
  },
  user: {
    deleteUser: { enabled: false },
  },
});
