import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";
import { describeDbError, poolOptions } from "./db-config";

const connectionString = process.env.DATABASE_URL;

/**
 * Client único, guardado no globalThis para não abrir conexões demais entre recargas
 * no desenvolvimento. Sem DATABASE_URL ele é criado mesmo assim (o build importa as
 * rotas) e só falha se alguém tentar consultar.
 */
const globalForDb = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForDb.prisma ?? new PrismaClient({ adapter: new PrismaPg(poolOptions(connectionString)) });

if (process.env.NODE_ENV !== "production") globalForDb.prisma = prisma;

export const databaseConfigured = Boolean(connectionString);

/** Mensagem curta e sem segredos sobre o estado da conexão. */
export async function databaseStatus(): Promise<string> {
  if (!connectionString) return "DATABASE_URL não definida";
  try {
    await prisma.$queryRaw`select 1`;
    return "ok";
  } catch (error) {
    return describeDbError(error);
  }
}
