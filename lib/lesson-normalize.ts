import type { Difficulty, Question } from "./lesson-prompt";
import type { Result } from "./lessons";

// Este arquivo não importa nada em tempo de execução de propósito: assim os
// testes conseguem carregá-lo direto, sem bundler. A ordem das dificuldades
// chega por parâmetro, vinda do MIX, que continua sendo a fonte única.

const semAcento = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

function paraDificuldade(valor: unknown, posicao: number, ordem: Difficulty[]): Difficulty {
  const v = semAcento(String(valor ?? ""));
  if (v.startsWith("fac")) return "facil";
  if (v.startsWith("med")) return "media";
  if (v.startsWith("dif")) return "dificil";
  return ordem[posicao] ?? "media";
}

const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/**
 * Aceita o array direto ou embrulhado em { questions } / { questoes } / { licao },
 * conserta ids e dificuldades e exige a lição inteira, com enunciado e conteúdo.
 */
export function normalizeQuestions(raw: unknown, ordem: Difficulty[]): Question[] {
  const objeto = (raw ?? {}) as Record<string, unknown>;
  const bruto = Array.isArray(raw)
    ? raw
    : objeto.questions ?? objeto.questoes ?? objeto.licao ?? objeto.lesson;

  if (!Array.isArray(bruto)) throw new Error("A IA não devolveu a lista de questões.");

  const total = ordem.length;
  const questoes: Question[] = [];
  for (const [i, item] of bruto.slice(0, total).entries()) {
    const o = (item ?? {}) as Record<string, unknown>;
    const prompt = texto(o.prompt) || texto(o.enunciado);
    const content = texto(o.content) || texto(o.conteudo) || texto(o.frase);
    if (!prompt && !content) continue;
    questoes.push({
      id: `q${questoes.length + 1}`,
      difficulty: paraDificuldade(o.difficulty ?? o.dificuldade, i, ordem),
      type: texto(o.type) || texto(o.tipo) || "escrita",
      prompt: prompt || "Responda em inglês.",
      content,
      expected: texto(o.expected) || texto(o.esperado) || texto(o.resposta),
    });
  }

  if (questoes.length < total) {
    throw new Error(
      `A IA devolveu ${questoes.length} de ${total} questões. Tente gerar de novo.`,
    );
  }
  return questoes;
}

/** A correção vem como objeto; qualquer campo faltando vira algo apresentável. */
export function normalizeResult(raw: unknown): Result {
  const alvo = ((Array.isArray(raw) ? raw[0] : raw) ?? {}) as Record<string, unknown>;

  const bruto = alvo.correct ?? alvo.correto ?? alvo.acertou;
  const correct =
    typeof bruto === "boolean"
      ? bruto
      : ["true", "sim", "1"].includes(semAcento(String(bruto ?? "")));

  return {
    correct,
    feedback:
      texto(alvo.feedback) ||
      texto(alvo.comentario) ||
      (correct ? "Resposta correta." : "Resposta incorreta."),
    correction: texto(alvo.correction) || texto(alvo.correcao),
    tip: texto(alvo.tip) || texto(alvo.dica),
  };
}
