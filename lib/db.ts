import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

/**
 * Bancos gerenciados (Supabase, Neon) exigem TLS, e o driver não liga isso
 * sozinho quando a connection string não traz sslmode. Sem isso a conexão cai
 * com "Connection terminated unexpectedly". Em localhost, TLS fica de fora.
 */
const local = !connectionString || /@(localhost|127\.0\.0\.1)/.test(connectionString);

/**
 * Pool único, guardado no globalThis para não abrir conexões demais entre
 * invocações em serverless.
 */
const globalForDb = globalThis as unknown as { pgPool?: Pool };

export const pool: Pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString,
    ssl: local ? undefined : { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const databaseConfigured = Boolean(connectionString);

/** Mensagem curta e sem segredos sobre o estado da conexão. */
export async function databaseStatus(): Promise<string> {
  if (!connectionString) return "DATABASE_URL não definida";
  try {
    await pool.query("select 1");
    return "ok";
  } catch (error) {
    const e = error as { code?: string; message?: string };
    if (e.code === "28P01") return "senha incorreta na connection string";
    if (e.code === "3D000") return "banco inexistente na connection string";
    if (e.code === "ENOTFOUND") return "host da connection string não resolve";
    if (e.code === "ETIMEDOUT" || /timeout/i.test(e.message ?? ""))
      return "tempo esgotado ao conectar: use o Transaction pooler do Supabase (porta 6543), não o host direto";
    if (/self.signed|certificate/i.test(e.message ?? "")) return "problema de certificado TLS";
    return `falha ao conectar: ${(e.message ?? "erro desconhecido").slice(0, 120)}`;
  }
}
