import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * As migrações usam a conexão direta (Session pooler do Supabase, porta 5432), que não
 * passa pelo pooler de transação. Sem DIRECT_URL (como no build da Vercel, que só roda
 * `prisma generate`), cai na DATABASE_URL. O `env()` do Prisma lançaria erro nesse caso.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL },
});
