import { databaseConfigured, prisma } from "./db";

/**
 * Tabela compartilhada `app_pron` (texto normalizado → pronúncia). Sem banco, ou com
 * erro de banco, tudo vira vazio/no-op: a pronúncia é um extra, nunca derruba a tela.
 */
export async function getStoredPron(keys: string[]): Promise<Record<string, string>> {
  if (!databaseConfigured || keys.length === 0) return {};
  try {
    const rows = await prisma.pron.findMany({
      where: { text: { in: keys } },
      select: { text: true, say: true },
    });
    return Object.fromEntries(rows.map((r) => [r.text, r.say]));
  } catch (error) {
    console.error("app_pron: leitura falhou", error);
    return {};
  }
}

export async function saveStoredPron(map: Record<string, string>): Promise<void> {
  const entries = Object.entries(map);
  if (!databaseConfigured || entries.length === 0) return;
  try {
    // A primeira pronúncia salva fica; repetidas são ignoradas.
    await prisma.pron.createMany({
      data: entries.map(([text, say]) => ({ text, say })),
      skipDuplicates: true,
    });
  } catch (error) {
    console.error("app_pron: gravação falhou", error);
  }
}
