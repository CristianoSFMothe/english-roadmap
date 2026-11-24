import { NextResponse } from "next/server";
import { askGemini, resolveKey } from "@/lib/gemini";
import { extractJson } from "@/lib/normalize";
import {
  normalizePronMap,
  pronBatches,
  pronSystemPrompt,
  pronUserPrompt,
  shouldStoreShared,
} from "@/lib/pron-prompt";
import { getStoredPron, saveStoredPron } from "@/lib/pron-store";
import { PRON_EXAMPLES, PRON_STYLE, pronKey } from "@/lib/pronunciation";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type Body = { texts?: unknown; generate?: unknown; apiKey?: unknown; accessCode?: unknown };

/**
 * Pronúncia de textos em inglês.
 * - `generate` ausente/false: só consulta a tabela compartilhada (de graça, nunca chama o Gemini).
 * - `generate: true` (clique em "Gerar pronúncia"): gera o que falta com o Gemini e guarda.
 * Resposta sempre `{ say: { [pronKey]: pronúncia } }`; falhas devolvem o que já estava guardado.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  if (!Array.isArray(body.texts) || !body.texts.every((t) => typeof t === "string")) {
    return NextResponse.json({ error: "Envie { texts: string[] }." }, { status: 400 });
  }

  const texts = pronBatches(body.texts as string[], pronKey)[0] ?? [];
  const keys = texts.map(pronKey);
  const stored = await getStoredPron(keys);
  const missing = texts.filter((t) => !stored[pronKey(t)]);

  if (body.generate !== true || missing.length === 0) {
    return NextResponse.json({ say: stored });
  }

  const resolved = await resolveKey(
    typeof body.apiKey === "string" ? body.apiKey : undefined,
    typeof body.accessCode === "string" ? body.accessCode : undefined,
  );
  if ("error" in resolved) return NextResponse.json({ say: stored });

  try {
    const answer = await askGemini({
      key: resolved.key,
      system: pronSystemPrompt(PRON_STYLE, PRON_EXAMPLES),
      user: pronUserPrompt(missing),
      maxTokens: 4000,
      temperature: 0.2,
    });
    const fresh = normalizePronMap(extractJson(answer), missing, pronKey);
    // Só a chave do servidor (login autorizado ou código de acesso) grava na tabela de todos.
    if (shouldStoreShared(resolved.key, process.env.GEMINI_API_KEY)) await saveStoredPron(fresh);
    return NextResponse.json({ say: { ...stored, ...fresh } });
  } catch (error) {
    console.error("/api/pron: Gemini falhou", error);
    return NextResponse.json({ say: stored });
  }
}
