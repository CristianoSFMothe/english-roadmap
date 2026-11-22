import { NextResponse, type NextRequest } from "next/server";

/**
 * O login do Google só funciona no domínio registrado em BETTER_AUTH_URL,
 * porque o redirect do OAuth e o cookie de sessão nascem dele. Como o projeto
 * responde por vários endereços na Vercel, qualquer outro é redirecionado para
 * o canônico — assim não existe jeito de cair numa URL em que o login quebra.
 */
function canonicalHost(): string | null {
  const url = process.env.BETTER_AUTH_URL;
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  // Em preview e em desenvolvimento o endereço é outro de propósito.
  if (process.env.VERCEL_ENV !== "production") return NextResponse.next();

  const canonico = canonicalHost();
  const host = request.headers.get("host");
  if (!canonico || !host || host === canonico) return NextResponse.next();

  const destino = new URL(request.url);
  destino.protocol = "https:";
  destino.host = canonico;
  destino.port = "";
  return NextResponse.redirect(destino, 308);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
