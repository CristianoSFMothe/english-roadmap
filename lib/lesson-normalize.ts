import type { Difficulty, Question, Study, StudyExample, StudyLine, StudyTip } from "./lesson-prompt";
import type { LessonOutline, OutlinePart, PlanDay } from "./lesson-parts";
import type { Improvement, ImprovementStyle, Result } from "./lessons";

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
    improvements: normalizeImprovements(alvo.improvements ?? alvo.melhorias ?? alvo.sugestoes, []),
    withImprovements: true,
  };
}

/** Teto de outras respostas por questão (cada clique em "Gerar mais" soma 3). */
export const MAX_IMPROVEMENTS = 30;

function paraEstilo(v: unknown): ImprovementStyle | undefined {
  const e = semAcento(String(v ?? ""));
  if (e.includes("informal")) return "informal";
  if (e.startsWith("formal")) return "formal";
  if (e.includes("usual") || e.includes("comum") || e.includes("natural")) return "usual";
  return undefined;
}

/**
 * Até `limite` frases novas, com estilo e dica, sem repetir entre si nem as que já
 * existem. Aceita a lista solta ou dentro de { improvements }.
 */
export function normalizeImprovements(raw: unknown, existentes: Improvement[], limite = 3): Improvement[] {
  const alvo = Array.isArray(raw)
    ? raw
    : ((raw as Record<string, unknown> | null)?.improvements ??
      (raw as Record<string, unknown> | null)?.melhorias ??
      (raw as Record<string, unknown> | null)?.respostas);
  if (!Array.isArray(alvo)) return [];
  const out: Improvement[] = [];
  const vistas = new Set(existentes.map((m) => pronChave(m.en)));
  for (const item of alvo) {
    const o = (item && typeof item === "object" ? item : { en: item }) as Record<string, unknown>;
    const en = texto(o.en) || texto(o.frase) || texto(o.text) || texto(o.sentence);
    const chave = pronChave(en);
    if (!en || vistas.has(chave)) continue;
    vistas.add(chave);
    const why =
      texto(o.tip) || texto(o.dica) || texto(o.why) || texto(o.motivo) || texto(o.porque) || texto(o.pt);
    const style = paraEstilo(o.style ?? o.estilo);
    out.push(style ? { en, why, style } : { en, why });
    if (out.length === limite) break;
  }
  return out;
}

/** O "Gerar 3 respostas" só vale uma vez por questão respondida. */
export function canGenerateMore(result: Result | undefined): boolean {
  if (!result || result.moreGenerated) return false;
  // Correção antiga com melhorias: elas vieram do botão, antes de ele ter a trava.
  const antigaJaGerada = !result.withImprovements && (result.improvements ?? []).length > 0;
  return !antigaJaGerada;
}

/** Junta as novas no fim, até o teto. */
export function mergeImprovements(atuais: Improvement[], novas: Improvement[]): Improvement[] {
  return [...atuais, ...novas].slice(0, MAX_IMPROVEMENTS);
}

/** "I don't like coffee." e "i don't like coffee" contam como a mesma frase. */
const pronChave = (t: string) =>
  t.trim().replace(/\s+/g, " ").toLowerCase().replace(/[.!?,]+$/, "").trim();

// Sem "do" e "as", que também são palavras do inglês ("What do you do?", "as a tester").
const PALAVRAS_PT = /\b(eu|você|voce|ele|ela|nós|não|nao|que|de|da|dos|das|em|um|uma|os|para|com|é|está|gosta|trabalho|traduza|escreva)\b/i;

/**
 * O material da questão está em inglês? Só então ganha "Ouvir" e a pronúncia
 * (às vezes o material é uma frase em português para traduzir).
 */
export function looksEnglish(text: string): boolean {
  const t = text.trim();
  if (!/[a-z]/i.test(t)) return false;
  if (/[áàâãéêíóôõúç]/i.test(t)) return false;
  return !PALAVRAS_PT.test(t);
}

/** Os mesmos limites de STUDY_LIMITS (lesson-prompt), repetidos para não importar em tempo de execução. */
/** Igual a STUDY_LIMITS.explanation (um teste confere): este arquivo não importa valores. */
export const MAX_PARAGRAFOS = 6;
const MAX_EXEMPLOS = 5;
const MAX_DICAS = 4;
const MAX_FALAS = 8;
const MAX_PRATICAS = 3;
const PARTES = 6;

const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : typeof v === "string" && v.trim() ? [v] : []);

/**
 * Teoria e dicas do estudo do dia. Aceita chaves em inglês ou português e descarta
 * exemplo sem inglês e dica sem texto. Sem assunto ou sem explicação, recusa a lição.
 */
export function normalizeStudy(raw: unknown): Study {
  const objeto = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const o = (objeto.study ?? objeto.estudo ?? objeto.teoria ?? {}) as Record<string, unknown>;

  const topic = texto(o.topic) || texto(o.assunto);
  const explanation = lista(o.explanation ?? o.explicacao)
    .map(texto)
    .filter(Boolean)
    .slice(0, MAX_PARAGRAFOS);
  if (!topic || explanation.length === 0) {
    throw new Error("A IA não devolveu a teoria. Tente gerar de novo.");
  }

  const examples: StudyExample[] = lista(o.examples ?? o.exemplos)
    .map((e) => {
      const x = (e ?? {}) as Record<string, unknown>;
      const en = texto(x.en) || texto(x.ingles);
      const pt = texto(x.pt) || texto(x.traducao);
      const pron = texto(x.pron) || texto(x.pronuncia) || texto(x.say);
      return en ? { en, pt, ...(pron ? { pron } : {}) } : null;
    })
    .filter((e): e is StudyExample => e !== null)
    .slice(0, MAX_EXEMPLOS);

  const tips: StudyTip[] = lista(o.tips ?? o.dicas)
    .map((d) => {
      if (typeof d === "string") return d.trim() ? { text: d.trim() } : null;
      const x = (d ?? {}) as Record<string, unknown>;
      const text = texto(x.text) || texto(x.texto);
      const wrong = texto(x.wrong) || texto(x.errado);
      const right = texto(x.right) || texto(x.certo);
      return text ? { text, ...(wrong ? { wrong } : {}), ...(right ? { right } : {}) } : null;
    })
    .filter((d): d is StudyTip => d !== null)
    .slice(0, MAX_DICAS);

  const dialogue: StudyLine[] = lista(o.dialogue ?? o.dialogo ?? o.falas)
    .map((f) => {
      const x = (f ?? {}) as Record<string, unknown>;
      const en = texto(x.en) || texto(x.ingles);
      const pron = texto(x.pron) || texto(x.pronuncia) || texto(x.say);
      return en
        ? { who: texto(x.who) || texto(x.quem), en, pt: texto(x.pt) || texto(x.traducao), ...(pron ? { pron } : {}) }
        : null;
    })
    .filter((f): f is StudyLine => f !== null)
    .slice(0, MAX_FALAS);

  const practice = lista(o.practice ?? o.pratica)
    .map(texto)
    .filter(Boolean)
    .slice(0, MAX_PRATICAS);

  const pattern = texto(o.pattern) || texto(o.formula);
  return {
    topic,
    goal: texto(o.goal) || texto(o.objetivo),
    explanation,
    ...(pattern ? { pattern } : {}),
    examples,
    tips,
    ...(dialogue.length ? { dialogue } : {}),
    ...(practice.length ? { practice } : {}),
  };
}

/**
 * Roteiro da lição da semana: exatamente 6 partes, com o dia e o foco vindos do plano
 * (a IA escreve só título e objetivo). Aceita chaves em português.
 */
export function normalizeLessonOutline(raw: unknown, dias: PlanDay[]): LessonOutline {
  const objeto = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const o = (objeto.outline ?? objeto.roteiro ?? objeto) as Record<string, unknown>;

  const topic = texto(o.topic) || texto(o.assunto);
  if (!topic) throw new Error("A IA não devolveu o roteiro. Tente de novo.");

  const parts: OutlinePart[] = lista(o.parts ?? o.partes)
    .map((p) => {
      const x = (p ?? {}) as Record<string, unknown>;
      return { title: texto(x.title) || texto(x.titulo), goal: texto(x.goal) || texto(x.objetivo) };
    })
    .filter((p) => p.title)
    .slice(0, PARTES)
    .map((p, i) => ({ day: dias[i]?.day ?? `Dia ${i + 1}`, focus: dias[i]?.focus ?? "Revisão", ...p }));
  if (parts.length < PARTES) throw new Error("A IA não devolveu o roteiro completo. Tente de novo.");

  return { topic, intro: texto(o.intro) || texto(o.introducao), parts };
}

/** Resposta do professor no chat. */
export function normalizeAnswer(raw: unknown): string {
  if (typeof raw === "string") {
    if (raw.trim()) return raw.trim();
    throw new Error("A IA não respondeu. Tente de novo.");
  }
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const answer = texto(o.answer) || texto(o.resposta);
  if (!answer) throw new Error("A IA não respondeu. Tente de novo.");
  return answer;
}
