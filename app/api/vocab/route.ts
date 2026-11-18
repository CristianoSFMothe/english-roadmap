import { NextResponse } from "next/server";
import { allowedUser } from "@/lib/access";
import { cleanWords, loadVocab, saveVocab } from "@/lib/server-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Palavras e frases que a pessoa adicionou. `words: null` quer dizer que nunca salvou. */
export async function GET() {
  const user = await allowedUser();
  if (!user) return NextResponse.json({ signedIn: false });
  try {
    return NextResponse.json({ signedIn: true, words: await loadVocab(user.id) });
  } catch {
    return NextResponse.json({ error: "Falha ao ler seu vocabulário." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await allowedUser();
  if (!user) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });

  let body: { words?: unknown };
  try {
    body = (await request.json()) as { words?: unknown };
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  try {
    await saveVocab(user.id, cleanWords(body.words));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao salvar seu vocabulário." }, { status: 500 });
  }
}
