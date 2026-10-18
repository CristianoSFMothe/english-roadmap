import { NextResponse } from "next/server";
import { databaseStatus } from "@/lib/db";
import { authConfigured } from "@/lib/auth";
import { accessRestricted } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diagnóstico de configuração. Não devolve nenhum segredo: só diz se cada peça
 * está no lugar e, quando o banco falha, o motivo em uma frase.
 */
export async function GET() {
  let canonical: string | null = null;
  try {
    canonical = process.env.BETTER_AUTH_URL ? new URL(process.env.BETTER_AUTH_URL).host : null;
  } catch {
    canonical = "BETTER_AUTH_URL inválida";
  }

  return NextResponse.json({
    banco: await databaseStatus(),
    loginConfigurado: authConfigured,
    acessoRestrito: accessRestricted,
    dominioDoLogin: canonical,
    geracaoComChaveDoServidor: Boolean(process.env.ANTHROPIC_API_KEY),
    codigoDeAcesso: Boolean(process.env.APP_ACCESS_CODE),
  });
}
