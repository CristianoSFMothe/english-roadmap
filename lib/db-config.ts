/**
 * Configuração da conexão com o Postgres, sem imports em tempo de execução, para o
 * `npm test` conseguir testar sem o banco.
 */

export type PoolOptions = {
  connectionString?: string;
  ssl?: false | { rejectUnauthorized: boolean };
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
};

const LIMITES = { max: 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 15_000 };

/**
 * Opções do pool do `pg` usado pelo Prisma. O `sslmode` da URL manda. Sem ele, bancos
 * gerenciados (Supabase, Neon) exigem TLS e o driver não liga isso sozinho; em
 * localhost, TLS fica de fora. Pool pequeno, por ser serverless.
 */
export function poolOptions(url: string | undefined): PoolOptions {
  if (!url) return { ...LIMITES };

  let sslmode: string | null = null;
  let connectionString = url;
  let host = "";
  try {
    const parsed = new URL(url);
    host = parsed.hostname;
    sslmode = parsed.searchParams.get("sslmode");
    if (sslmode !== null) {
      // O pg reinterpretaria o sslmode por conta própria e ignoraria o `ssl` abaixo.
      parsed.searchParams.delete("sslmode");
      connectionString = parsed.toString();
    }
  } catch {
    /* URL fora do padrão: segue sem sslmode e deixa o pg reclamar ao conectar */
  }

  const local = host === "localhost" || host === "127.0.0.1";
  const ssl =
    sslmode === "disable"
      ? false
      : sslmode !== null || !local
        ? { rejectUnauthorized: false }
        : undefined;

  return { connectionString, ...(ssl === undefined ? {} : { ssl }), ...LIMITES };
}

type ComCodigo = {
  code?: unknown;
  message?: unknown;
  cause?: unknown;
  originalCode?: unknown;
  originalMessage?: unknown;
  kind?: unknown;
  meta?: { driverAdapterError?: unknown };
};

/** Códigos do Prisma (P2010…) não dizem o motivo; o que vale é o do pg por baixo. */
const codigoDoPrisma = (code: string) => /^P\d{4}$/.test(code);

/**
 * Procura o código e a mensagem do erro do pg. O Prisma 7 os guarda em
 * `meta.driverAdapterError.cause.originalCode`; outros embrulhos usam `cause`.
 */
function acharCodigo(error: unknown): { code?: string; kind?: string; message: string } {
  let code: string | undefined;
  let kind: string | undefined;
  let message = "";
  const fila: unknown[] = [error];
  for (let passos = 0; fila.length && passos < 12; passos += 1) {
    const atual = fila.shift();
    if (!atual || typeof atual !== "object") continue;
    const e = atual as ComCodigo;
    const msg = typeof e.originalMessage === "string" ? e.originalMessage : e.message;
    // A mensagem mais interna (do pg) é a mais útil.
    if (typeof msg === "string" && msg) message = msg;
    const c = typeof e.originalCode === "string" ? e.originalCode : e.code;
    if (typeof c === "string" && !codigoDoPrisma(c)) code = c;
    if (typeof e.kind === "string") kind = e.kind;
    fila.push(e.meta?.driverAdapterError, e.cause);
  }
  return { code, kind, message };
}

/** Mensagem curta e sem segredos sobre a falha de conexão. */
export function describeDbError(error: unknown): string {
  const { code, kind, message } = acharCodigo(error);
  if (code === "28P01" || kind === "AuthenticationFailed") return "senha incorreta na connection string";
  if (code === "3D000" || kind === "DatabaseDoesNotExist") return "banco inexistente na connection string";
  if (code === "ENOTFOUND") return "host da connection string não resolve";
  if (kind === "DatabaseNotReachable") return "host da connection string não resolve ou não responde";
  if (code === "ETIMEDOUT" || kind === "SocketTimeout" || /timeout/i.test(message))
    return "tempo esgotado ao conectar: use o Transaction pooler do Supabase (porta 6543), não o host direto";
  if (kind === "TlsConnectionError" || /self.signed|certificate/i.test(message))
    return "problema de certificado TLS";
  return `falha ao conectar: ${(message || "erro desconhecido").slice(0, 120)}`;
}
