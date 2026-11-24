import { databaseConfigured, pool } from "./db";

/**
 * Tabela compartilhada `app_pron` (texto normalizado → pronúncia). Sem banco, ou com
 * erro de banco, tudo vira vazio/no-op: a pronúncia é um extra, nunca derruba a tela.
 */
export async function getStoredPron(keys: string[]): Promise<Record<string, string>> {
  if (!databaseConfigured || keys.length === 0) return {};
  try {
    const { rows } = await pool.query<{ text: string; say: string }>(
      "select text, say from app_pron where text = any($1::text[])",
      [keys],
    );
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
    await pool.query(
      `insert into app_pron (text, say)
       select * from unnest($1::text[], $2::text[])
       on conflict (text) do nothing`,
      [entries.map(([k]) => k), entries.map(([, v]) => v)],
    );
  } catch (error) {
    console.error("app_pron: gravação falhou", error);
  }
}
