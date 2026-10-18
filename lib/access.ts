import { headers } from "next/headers";
import { auth, authConfigured } from "./auth";

/**
 * Lista de e-mails autorizados, separada por vírgula em ALLOWED_EMAILS.
 * Vazia significa aberto: qualquer conta Google entra.
 */
export function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const accessRestricted = allowedEmails().length > 0;

export function emailAllowed(email?: string | null): boolean {
  const lista = allowedEmails();
  if (!lista.length) return true;
  return Boolean(email && lista.includes(email.toLowerCase()));
}

export type SessionUser = { id: string; email: string; name?: string | null };

/** Usuário da sessão, já filtrado pela lista de autorizados. */
export async function allowedUser(): Promise<SessionUser | null> {
  if (!authConfigured) return null;
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user?.email || !emailAllowed(user.email)) return null;
  return { id: user.id, email: user.email, name: user.name };
}
