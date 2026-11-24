import type { Profile } from "./profile";

export type Difficulty = "facil" | "media" | "dificil";

/** Teoria e dicas do estudo do dia, geradas junto com as questões. */
export type StudyExample = { en: string; pt: string; pron?: string };
export type StudyTip = { text: string; wrong?: string; right?: string };
export type Study = {
  topic: string;
  goal: string;
  explanation: string[];
  pattern?: string;
  examples: StudyExample[];
  tips: StudyTip[];
};

/** Limites da teoria (também vão para o prompt). */
export const STUDY_LIMITS = { explanation: 4, examples: 5, tips: 4 };

export type Question = {
  id: string;
  difficulty: Difficulty;
  type: string;
  prompt: string;
  content: string;
  expected: string;
};

export const MIX: { difficulty: Difficulty; quantidade: number }[] = [
  { difficulty: "facil", quantidade: 2 },
  { difficulty: "media", quantidade: 2 },
  { difficulty: "dificil", quantidade: 1 },
];

export const TOTAL_QUESTOES = MIX.reduce((s, m) => s + m.quantidade, 0);

/** A ordem em que as questões aparecem: 2 fáceis, 2 médias, 1 difícil. */
export const ORDEM: Difficulty[] = MIX.flatMap((m) =>
  Array.from({ length: m.quantidade }, () => m.difficulty),
);

/**
 * Cópia de PRON_STYLE (lib/pronunciation.ts): este arquivo não importa nada em tempo de
 * execução. Um teste garante que as duas continuam iguais.
 */
const PRON_STYLE_LESSON = [
  "Escreva como um brasileiro leria em voz alta para soar como o inglês americano.",
  "Use só letras e sons do português. Nada de alfabeto fonético (IPA).",
  "O h aspirado do inglês vira \"rr\" (hello = rre-lôu, house = rráus).",
  "Coloque acento agudo ou circunflexo na sílaba forte (water = uó-ter, today = tu-dêi).",
  "Separe as sílabas com hífen só dentro da palavra; as palavras ficam separadas por espaço.",
  "O th vira \"th\" quando o som não existe em português (think = thínk) e \"d\" no the/this/that (the = dâ, this = dís).",
  "O r do fim de sílaba fica \"r\" (car = kár), e o w vira \"u\" (work = uârk).",
  "Mantenha a pontuação da frase original (vírgula, ponto, interrogação).",
].map((r) => `- ${r}`).join("\n");

const or = (v: string, f: string) => (v && v.trim() ? v.trim() : f);

export function lessonSystemPrompt(p: Profile): string {
  return `Você é professor de inglês e prepara a lição diária de uma pessoa de nível ${p.level},
cuja meta é ${p.target}. As instruções e explicações são em português do Brasil; o que a
pessoa precisa escrever é em inglês.

Sobre quem vai estudar:
- Profissão: ${or(p.profession, "não informada")}
- Área técnica: ${or(p.knowledge, "não informada")}
- Objetivo pessoal: ${or(p.goalPersonal, "não informado")}
- Objetivo profissional: ${or(p.goalProfessional, "não informado")}
- Dificuldades declaradas: ${p.difficulties.length ? p.difficulties.join(", ") : "não informadas"}
- Interesses: ${[p.movies, p.series, p.animation, p.books, p.music, p.hobbies]
    .filter((x) => x && x.trim())
    .join("; ") || "não informados"}
- A evitar: ${or(p.avoid, "nada declarado")}

Regras das questões:
- Toda questão é respondida ESCREVENDO em inglês, nunca escolhendo alternativa.
- O enunciado diz em português exatamente o que fazer.
- Nível ${p.level}: frases curtas e vocabulário do dia a dia. Nada de gramática avançada
  só para complicar.
- Fácil: traduzir uma frase curta, completar uma lacuna, responder uma pergunta pessoal
  simples. Resposta de uma linha.
- Média: reescrever no passado ou no futuro, corrigir um erro comum de quem fala
  português, responder uma pergunta sobre rotina ou trabalho em 1 ou 2 frases.
- Difícil: produzir 2 ou 3 frases sobre uma situação real (reunião, relato de problema,
  conversa social), usando o vocabulário do tema da semana.
- Nunca repita a mesma frase em duas questões.
- As ${TOTAL_QUESTOES} questões praticam exatamente o assunto da teoria do dia. A difícil
  junta esse assunto com o vocabulário da semana.

Regras da teoria (vem antes das questões):
- Escreva para um adulto brasileiro que está começando e não sabe nada de inglês.
- Português do Brasil simples, frases curtas. Nada de jargão gramatical; se precisar de um
  termo (como "verbo auxiliar"), explique o que ele quer dizer na mesma frase.
- Um assunto só por dia, pequeno o bastante para aprender em 10 minutos, dentro da
  gramática da semana.
- Explique o que é, quando usar e como montar a frase, comparando com o português.
- Exemplos curtos do dia a dia e da profissão da pessoa, cada um com tradução e pronúncia.
- Dicas práticas: o erro mais comum de quem fala português (errado → certo) e um jeito de
  lembrar.

Como escrever a pronúncia ("pron"):
${PRON_STYLE_LESSON}

Responda SEMPRE com JSON válido e nada mais.`;
}

export function lessonUserPrompt(args: {
  level: string;
  tema?: string;
  gramatica?: string;
  vocabulario?: string[];
  errosRecentes?: string[];
  /** Assuntos (study.topic) dos últimos dias, para avançar sem repetir. */
  assuntosRecentes?: string[];
  data: string;
}): string {
  const extras: string[] = [];
  if (args.tema) extras.push(`Tema da semana: ${args.tema}`);
  if (args.gramatica) extras.push(`Gramática da semana: ${args.gramatica}`);
  if (args.vocabulario?.length)
    extras.push(`Vocabulário para aproveitar: ${args.vocabulario.slice(0, 25).join(", ")}`);
  if (args.errosRecentes?.length)
    extras.push(
      `Erros recentes desta pessoa, para cobrar de novo com outras palavras: ${args.errosRecentes
        .slice(0, 5)
        .join(" | ")}`,
    );

  if (args.assuntosRecentes?.length)
    extras.push(
      `Assuntos dos últimos dias (não repita, avance a partir deles dentro da gramática da semana): ${args.assuntosRecentes
        .slice(0, 7)
        .join(" | ")}`,
    );

  return `Monte o estudo de ${args.data}: a teoria e as dicas de um assunto e exatamente
${TOTAL_QUESTOES} questões sobre ele: 2 fáceis, 2 médias e 1 difícil, nessa ordem.

${extras.join("\n")}

Responda com um objeto JSON nesta forma exata:

{
  "study": {
    "topic": "o assunto do dia, curto, em português (ex.: To be na negativa)",
    "goal": "o que a pessoa vai conseguir fazer hoje, uma frase",
    "explanation": ["de 2 a ${STUDY_LIMITS.explanation} parágrafos curtos em português"],
    "pattern": "a fórmula da frase, ex.: pessoa + am/is/are + not + resto",
    "examples": [
      { "en": "frase em inglês", "pt": "tradução", "pron": "pronúncia aproximada" }
    ],
    "tips": [
      { "text": "dica em português", "wrong": "frase errada comum (opcional)", "right": "frase certa (opcional)" }
    ]
  },
  "questions": [
    {
      "id": "q1",
      "difficulty": "facil",
      "type": "tradução | lacuna | pergunta | reescrita | correção | produção",
      "prompt": "o que fazer, em português, uma frase",
      "content": "o material da questão: a frase a traduzir, a lacuna, a pergunta ou a situação",
      "expected": "uma resposta correta de referência, em inglês"
    }
  ]
}

Entre 3 e ${STUDY_LIMITS.examples} exemplos e entre 2 e ${STUDY_LIMITS.tips} dicas.
As dificuldades devem ser exatamente "facil", "media" e "dificil".`;
}

export function gradeSystemPrompt(level: string): string {
  return `Você corrige respostas de um estudante de inglês de nível ${level}, falante de
português do Brasil. Seja justo e encorajador, sem passar a mão na cabeça.

Como julgar:
- Vale o sentido e a estrutura. Aceite sinônimos, contrações e ordens alternativas corretas.
- Erro de digitação óbvio ou falta de maiúscula não reprova: marque como correto e comente.
- Reprove quando houver erro de gramática que mude o sentido, tempo verbal errado,
  verbo mal conjugado, falta de auxiliar em pergunta ou negativa, ou resposta em português.
- Se a pessoa respondeu outra coisa, reprove e diga o que foi pedido.

O retorno é sempre JSON válido e nada mais, nesta forma:

{
  "correct": true,
  "feedback": "1 ou 2 frases em português explicando o acerto ou o erro",
  "correction": "a resposta em inglês corrigida, ou a mesma frase se já estava certa",
  "tip": "uma dica curta para não repetir o erro, ou string vazia se acertou",
  "improvements": ${STYLE_EXAMPLE}
}

Em "improvements", dê sempre 3 jeitos de melhorar a resposta do estudante, tanto quando ele
acerta quanto quando erra: ${STYLE_RULES}`;
}

const STYLE_EXAMPLE = `[
    { "style": "informal", "en": "a resposta em inglês, informal", "tip": "dica em português" },
    { "style": "formal", "en": "a resposta em inglês, formal", "tip": "dica em português" },
    { "style": "usual", "en": "a resposta em inglês, do jeito mais usual", "tip": "dica em português" }
  ]`;

const STYLE_RULES = `uma "informal" (com amigos e família), uma "formal" (trabalho,
entrevista, e-mail, desconhecidos) e uma "usual" (o jeito que um nativo mais diz no dia a
dia). São 3 frases completas em inglês, que respondem ao que foi pedido, diferentes entre
si e da "correction". Use o vocabulário do nível do estudante, sem gírias difíceis. O "tip"
é uma dica simples em português, para quem não sabe nada de inglês e sem jargão de
gramática: quando usar essa forma e o que muda nela.`;

/** "Gerar mais 3 respostas": outras formas de responder, sem repetir as que já existem. */
export function improveSystemPrompt(level: string): string {
  return `Você ajuda um estudante de inglês de nível ${level}, falante de português do Brasil,
a conhecer outras formas de responder a uma questão que ele já fez.

Dê exatamente 3 respostas novas: ${STYLE_RULES}

Nunca repita (nem quase igual) uma das respostas que ele já tem.

O retorno é sempre JSON válido e nada mais, nesta forma:

{
  "improvements": ${STYLE_EXAMPLE}
}`;
}

export function improveUserPrompt(
  q: Question,
  resposta: string,
  correcao: string,
  existentes: { en: string }[],
): string {
  const ja = [correcao, ...existentes.map((m) => m.en)].filter(Boolean);
  return `Questão (${q.difficulty}, ${q.type})
Enunciado: ${q.prompt}
Material: ${q.content}
Resposta de referência: ${q.expected}

Resposta escrita pelo estudante:
"""
${resposta}
"""

Respostas que ele já tem (não repita):
${ja.length ? ja.map((t) => `- ${t}`).join("\n") : "- nenhuma"}`;
}

export function gradeUserPrompt(q: Question, resposta: string): string {
  return `Questão (${q.difficulty}, ${q.type})
Enunciado: ${q.prompt}
Material: ${q.content}
Resposta de referência: ${q.expected}

Resposta escrita pelo estudante:
"""
${resposta}
"""`;
}
