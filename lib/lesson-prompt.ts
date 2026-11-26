import type { ChatMessage, LessonOutline, PlanDay } from "./lesson-parts";
import type { Profile } from "./profile";

export type Difficulty = "facil" | "media" | "dificil";

/** Teoria e dicas do estudo do dia, geradas junto com as questões. */
export type StudyExample = { en: string; pt: string; pron?: string };
export type StudyTip = { text: string; wrong?: string; right?: string };
/** Uma fala do diálogo da parte: quem fala, o inglês, a tradução e a pronúncia. */
export type StudyLine = { who: string; en: string; pt: string; pron?: string };
export type Study = {
  topic: string;
  goal: string;
  explanation: string[];
  pattern?: string;
  examples: StudyExample[];
  tips: StudyTip[];
  /** Diálogo curto usando a parte numa situação real (só nas Lições). */
  dialogue?: StudyLine[];
  /** Atividades rápidas sem correção: falar, anotar, repetir. */
  practice?: string[];
};

/** Limites da teoria (também vão para o prompt). */
export const STUDY_LIMITS = { explanation: 6, examples: 5, tips: 4, dialogue: 8, practice: 3 };

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

/** Contexto que vai para o professor do chat (igual a CHAT_CONTEXT de lesson-parts.ts). */
export const CHAT_CONTEXT_PROMPT = 12;

function sobreAPessoa(p: Profile): string {
  return `Sobre quem vai estudar:
- Profissão: ${or(p.profession, "não informada")}
- Área técnica: ${or(p.knowledge, "não informada")}
- Objetivo pessoal: ${or(p.goalPersonal, "não informado")}
- Objetivo profissional: ${or(p.goalProfessional, "não informado")}
- Dificuldades declaradas: ${p.difficulties.length ? p.difficulties.join(", ") : "não informadas"}
- Interesses: ${[p.movies, p.series, p.animation, p.books, p.music, p.hobbies]
    .filter((x) => x && x.trim())
    .join("; ") || "não informados"}
- A evitar: ${or(p.avoid, "nada declarado")}`;
}

/** Regras da teoria: as mesmas no Estudo do dia e na lição da semana (uma fonte só). */
const THEORY_RULES = `Regras da teoria (a aula):
- Escreva para um adulto brasileiro que está começando e não sabe nada de inglês.
- Fale com o aluno como um professor fala na aula: use "você", explique o porquê das
  coisas e antecipe a dúvida mais comum ("você deve estar pensando…").
- Português do Brasil simples, frases curtas. Nada de jargão gramatical; se precisar de um
  termo (como "verbo auxiliar"), explique o que ele quer dizer na mesma frase.
- Um assunto só, pequeno o bastante para aprender em 10 a 15 minutos, dentro da gramática
  da semana. Se não for a primeira parte, retome a parte anterior em uma frase.
- Explique o que é, quando usar e como montar a frase, comparando com o português.
- Exemplos curtos do dia a dia e da profissão da pessoa, cada um com tradução e pronúncia.
- Dicas práticas: o erro mais comum de quem fala português (errado → certo) e um jeito de
  lembrar.
- Diálogo de 4 a ${STUDY_LIMITS.dialogue} falas curtas usando o assunto numa situação real,
  ligada ao foco do dia (trabalho, série, música…).
- De 1 a ${STUDY_LIMITS.practice} atividades rápidas sem correção ("practice"): falar em
  voz alta, anotar, repetir.`;

const PRON_RULES = `Como escrever a pronúncia ("pron"):
${PRON_STYLE_LESSON}`;

function questionRules(level: string): string {
  return `Regras das questões:
- Toda questão é respondida ESCREVENDO em inglês, nunca escolhendo alternativa.
- O enunciado diz em português exatamente o que fazer.
- Nível ${level}: frases curtas e vocabulário do dia a dia. Nada de gramática avançada
  só para complicar.
- Fácil: traduzir uma frase curta, completar uma lacuna, responder uma pergunta pessoal
  simples. Resposta de uma linha.
- Média: reescrever no passado ou no futuro, corrigir um erro comum de quem fala
  português, responder uma pergunta sobre rotina ou trabalho em 1 ou 2 frases.
- Difícil: produzir 2 ou 3 frases sobre uma situação real (reunião, relato de problema,
  conversa social), usando o vocabulário do tema da semana.
- Nunca repita a mesma frase em duas questões.
- As ${TOTAL_QUESTOES} questões praticam exatamente o assunto da teoria do dia. A difícil
  junta esse assunto com o vocabulário da semana.`;
}

const STUDY_FORMAT = `{
    "topic": "o título da parte, curto, em português",
    "goal": "o que a pessoa vai conseguir fazer, uma frase",
    "explanation": ["de 3 a ${STUDY_LIMITS.explanation} parágrafos curtos em português, falando com o aluno"],
    "pattern": "a fórmula da frase, ex.: pessoa + am/is/are + resto",
    "examples": [
      { "en": "frase em inglês", "pt": "tradução", "pron": "pronúncia aproximada" }
    ],
    "tips": [
      { "text": "dica em português", "wrong": "frase errada comum (opcional)", "right": "frase certa (opcional)" }
    ],
    "dialogue": [
      { "who": "nome de quem fala", "en": "fala em inglês", "pt": "tradução", "pron": "pronúncia aproximada" }
    ],
    "practice": ["atividade rápida em português"]
  }`;

const QUESTIONS_FORMAT = `[
    {
      "id": "q1",
      "difficulty": "facil",
      "type": "tradução | lacuna | pergunta | reescrita | correção | produção",
      "prompt": "o que fazer, em português, uma frase",
      "content": "o material da questão: a frase a traduzir, a lacuna, a pergunta ou a situação",
      "expected": "uma resposta correta de referência, em inglês"
    }
  ]`;

const STUDY_COUNTS = `Entre 3 e ${STUDY_LIMITS.examples} exemplos, entre 2 e ${STUDY_LIMITS.tips} dicas, de 4 a
${STUDY_LIMITS.dialogue} falas no diálogo e de 1 a ${STUDY_LIMITS.practice} práticas.`;

/** O roteiro inteiro, marcando a parte que está sendo escrita. */
function roteiroTexto(o: LessonOutline, idx: number): string {
  const linhas = o.parts.map(
    (p, i) => `${i === idx ? "→" : " "} Parte ${i + 1} (${p.day} · ${p.focus}): ${p.title} — ${p.goal}`,
  );
  return `Lição da semana: ${o.topic}
${o.intro ? `Introdução: ${o.intro}\n` : ""}Roteiro:
${linhas.join("\n")}`;
}

function extrasDoDia(a: { vocabulario?: string[]; errosRecentes?: string[] }): string {
  const extras: string[] = [];
  if (a.vocabulario?.length)
    extras.push(`Vocabulário da semana para aproveitar: ${a.vocabulario.slice(0, 25).join(", ")}`);
  if (a.errosRecentes?.length)
    extras.push(
      `Erros recentes desta pessoa, para cobrar de novo com outras palavras: ${a.errosRecentes
        .slice(0, 5)
        .join(" | ")}`,
    );
  return extras.join("\n");
}

export function lessonSystemPrompt(p: Profile): string {
  return `Você é professor de inglês e prepara o estudo do dia de uma pessoa de nível ${p.level},
cuja meta é ${p.target}. As instruções e explicações são em português do Brasil; o que a
pessoa precisa escrever é em inglês.

${sobreAPessoa(p)}

${questionRules(p.level)}

${THEORY_RULES}

${PRON_RULES}

Responda SEMPRE com JSON válido e nada mais.`;
}

/** Roteiro da lição da semana: 6 partes em sequência, uma por dia. */
export function outlineSystemPrompt(p: Profile): string {
  return `Você é professor de inglês e planeja a aula de uma semana inteira para uma pessoa de
nível ${p.level}, cuja meta é ${p.target}. Escreva em português do Brasil simples.

${sobreAPessoa(p)}

Como montar o roteiro:
- A semana tem 6 partes, uma por dia, de segunda a sábado, sobre a gramática da semana.
- As partes seguem uma sequência de dificuldade, sem pular etapas e sem repetir conteúdo
  (ex.: afirmativa → contrações → negativa → pergunta → respostas curtas → revisão).
- Cada parte é pequena o bastante para 10 a 15 minutos.
- Cada parte liga a gramática ao foco daquele dia do plano.
- A introdução é um parágrafo do professor dizendo, com "você", o que a semana vai ensinar.

Responda SEMPRE com JSON válido e nada mais.`;
}

export function outlineUserPrompt(a: {
  level: string;
  weekN: number;
  tema?: string;
  gramatica: string;
  dias: PlanDay[];
  vocabulario?: string[];
}): string {
  const dias = a.dias.map((d, i) => `- Parte ${i + 1}: ${d.day} · foco do dia: ${d.focus}`).join("\n");
  return `Monte o roteiro da lição da semana ${a.weekN} (nível ${a.level}).

Gramática da semana: ${a.gramatica}
${a.tema ? `Tema da semana: ${a.tema}\n` : ""}${a.vocabulario?.length ? `Vocabulário da semana: ${a.vocabulario.slice(0, 25).join(", ")}\n` : ""}
Os 6 dias, na ordem:
${dias}

Responda com um objeto JSON nesta forma exata, com exatamente 6 partes, na ordem dos dias:

{
  "topic": "o assunto da semana, curto, em português",
  "intro": "um parágrafo do professor dizendo o que a semana vai ensinar",
  "parts": [
    { "title": "título curto da parte", "goal": "o que a pessoa vai conseguir fazer, uma frase" }
  ]
}`;
}

/** Uma parte da lição da semana (a aula de um dia), sem as questões. */
export function partSystemPrompt(p: Profile): string {
  return `Você é professor de inglês e escreve a aula de um dia para uma pessoa de nível
${p.level}, cuja meta é ${p.target}. As explicações são em português do Brasil.

${sobreAPessoa(p)}

${THEORY_RULES}

${PRON_RULES}

Responda SEMPRE com JSON válido e nada mais.`;
}

export function partUserPrompt(a: { outline: LessonOutline; idx: number; vocabulario?: string[] }): string {
  const parte = a.outline.parts[a.idx];
  return `${roteiroTexto(a.outline, a.idx)}

Escreva a parte ${a.idx + 1} de ${a.outline.parts.length} ("${parte?.title ?? ""}"), marcada com →.
Ela continua a parte anterior e prepara a próxima; não ensine o que é das outras partes.
${extrasDoDia(a)}

Responda com um objeto JSON nesta forma exata:

{
  "study": ${STUDY_FORMAT}
}

${STUDY_COUNTS}`;
}

/** Estudo do dia quando a parte de hoje ainda não existe: a parte e as questões juntas. */
export function partAndQuestionsUserPrompt(a: {
  outline: LessonOutline;
  idx: number;
  vocabulario?: string[];
  errosRecentes?: string[];
  data: string;
}): string {
  const parte = a.outline.parts[a.idx];
  return `${roteiroTexto(a.outline, a.idx)}

Monte o estudo de ${a.data}: escreva a parte ${a.idx + 1} de ${a.outline.parts.length}
("${parte?.title ?? ""}"), marcada com →, e exatamente ${TOTAL_QUESTOES} questões sobre ela:
2 fáceis, 2 médias e 1 difícil, nessa ordem.
${extrasDoDia(a)}

Responda com um objeto JSON nesta forma exata:

{
  "study": ${STUDY_FORMAT},
  "questions": ${QUESTIONS_FORMAT}
}

${STUDY_COUNTS}
As dificuldades devem ser exatamente "facil", "media" e "dificil".`;
}

/** Estudo do dia quando a parte de hoje já existe: só as questões, a partir dela. */
export function questionsUserPrompt(a: {
  part: Study;
  outline: LessonOutline;
  idx: number;
  vocabulario?: string[];
  errosRecentes?: string[];
  data: string;
}): string {
  const exemplos = a.part.examples.map((e) => `- ${e.en}`).join("\n");
  return `Lição da semana: ${a.outline.topic}
Parte ${a.idx + 1} de ${a.outline.parts.length}: ${a.part.topic}
Objetivo: ${a.part.goal}
${a.part.pattern ? `Fórmula: ${a.part.pattern}\n` : ""}Explicação:
${a.part.explanation.join("\n")}
${exemplos ? `Exemplos da aula (não copie nas questões):\n${exemplos}\n` : ""}
Monte o estudo de ${a.data}: exatamente ${TOTAL_QUESTOES} questões novas sobre esta parte:
2 fáceis, 2 médias e 1 difícil, nessa ordem. A aula já está pronta; não escreva outra.
${extrasDoDia(a)}

Responda com um objeto JSON nesta forma exata:

{
  "questions": ${QUESTIONS_FORMAT}
}

As dificuldades devem ser exatamente "facil", "media" e "dificil".`;
}

/** O professor que responde as dúvidas embaixo de cada parte. */
export function chatSystemPrompt(p: Profile): string {
  return `Você é o professor de inglês de uma pessoa de nível ${p.level}, falante de português do
Brasil, e responde as dúvidas dela sobre a aula que ela está estudando.

${sobreAPessoa(p)}

Como responder:
- Em português do Brasil simples, curto: no máximo 150 palavras.
- Sem jargão; se usar um termo, explique na mesma frase. Nada de markdown (sem asteriscos,
  sem títulos); pode usar quebras de linha.
- Fale com "você", como na aula. Coloque o inglês entre aspas.
- Quando mostrar uma frase nova em inglês, dê a tradução e a pronúncia aproximada.
- Dúvida sobre outro assunto de inglês: responda mesmo assim. Se for de uma parte que ainda
  vem na semana, diga que ela vem depois.
- Se a pergunta não for sobre inglês, responda em uma frase e traga a conversa de volta
  para a aula.

${PRON_RULES}

Responda SEMPRE com JSON válido e nada mais, nesta forma:

{ "answer": "a resposta em português, com o inglês entre aspas" }`;
}

export function chatUserPrompt(a: {
  outline: LessonOutline;
  idx: number;
  part: Study;
  history: ChatMessage[];
  question: string;
}): string {
  const conversa = a.history
    .slice(-CHAT_CONTEXT_PROMPT)
    .map((m) => `${m.role === "aluno" ? "Aluno" : "Professor"}: ${m.text}`)
    .join("\n");
  return `${roteiroTexto(a.outline, a.idx)}

A aula que o aluno está estudando (parte ${a.idx + 1}): ${a.part.topic}
Objetivo: ${a.part.goal}
${a.part.pattern ? `Fórmula: ${a.part.pattern}\n` : ""}Explicação:
${a.part.explanation.join("\n")}

${conversa ? `Conversa até agora:\n${conversa}\n\n` : ""}Nova pergunta do aluno:
"""
${a.question}
"""`;
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
