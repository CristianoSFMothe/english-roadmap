import { Pool } from "pg";

/**
 * Pool único de conexões, reaproveitado entre invocações.
 * Em serverless o módulo é reavaliado a cada instância fria, então guardamos
 * o pool no globalThis para não abrir conexões demais no Postgres.
 */
const globalForDb = globalThis as unknown as { pgPool?: Pool };

export const pool: Pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const databaseConfigured = Boolean(process.env.DATABASE_URL);
