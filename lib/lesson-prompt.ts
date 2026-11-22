import type { Profile } from "./profile";

export type Difficulty = "facil" | "media" | "dificil";

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

Responda SEMPRE com JSON válido e nada mais.`;
}

export function lessonUserPrompt(args: {
  level: string;
  tema?: string;
  gramatica?: string;
  vocabulario?: string[];
  errosRecentes?: string[];
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

  return `Monte a lição de ${args.data} com exatamente ${TOTAL_QUESTOES} questões:
2 fáceis, 2 médias e 1 difícil, nessa ordem.

${extras.join("\n")}

Responda com um array JSON nesta forma exata:

[
  {
    "id": "q1",
    "difficulty": "facil",
    "type": "tradução | lacuna | pergunta | reescrita | correção | produção",
    "prompt": "o que fazer, em português, uma frase",
    "content": "o material da questão: a frase a traduzir, a lacuna, a pergunta ou a situação",
    "expected": "uma resposta correta de referência, em inglês"
  }
]

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
  "tip": "uma dica curta para não repetir o erro, ou string vazia se acertou"
}`;
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
