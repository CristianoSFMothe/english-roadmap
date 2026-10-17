import type { Profile } from "./profile";

const or = (value: string, fallback: string) =>
  value && value.trim() ? value.trim() : fallback;

const NOT_GIVEN = "não informado (escolha temas cotidianos e neutros)";

/**
 * Briefing de interesses e preferências de conteúdo.
 * É o prompt base do projeto, com as lacunas preenchidas pelos dados do perfil.
 */
export function interestsBrief(p: Profile): string {
  const level = p.level;
  const target = p.target;
  const job = or(p.profession, "não informado");

  return `# INTERESSES PESSOAIS E PREFERÊNCIAS DE CONTEÚDO

O plano de inglês deve ser construído considerando os gostos pessoais da pessoa.
Aprender por meio de conteúdos que já despertam interesse aumenta a motivação,
facilita a criação de hábitos e torna a exposição ao idioma mais prazerosa.

Use estas preferências para selecionar materiais de listening, reading, speaking,
shadowing, sentence mining, vocabulário contextualizado, escrita e simulações de conversação.

**Importante:** não recomende simplesmente assistir a conteúdos em inglês sem estratégia.
Explique como adaptar cada tipo de conteúdo ao nível atual ${level}, como explorá-lo
ativamente e como aumentar gradualmente a dificuldade até ${target}.

## Quem é a pessoa

- Nome: ${or(p.name, "não informado")}
- Nível atual: ${level}
- Nível desejado: ${target}
- Dificuldades declaradas: ${p.difficulties.length ? p.difficulties.join(", ") : "não informadas"}
- Objetivo pessoal: ${or(p.goalPersonal, NOT_GIVEN)}
- Objetivo profissional: ${or(p.goalProfessional, NOT_GIVEN)}
- Profissão: ${job}
- Conhecimento e área técnica: ${or(p.knowledge, "não informado")}
- Tempo disponível: ${p.minutesPerDay} minutos por dia, ${p.daysPerWeek} dias por semana
- Sotaque de preferência: ${p.accent}
- Restrições de conteúdo: ${or(p.avoid, "nenhuma declarada")}
- Outras observações: ${or(p.notes, "nenhuma")}

## 1. Filmes

Gêneros e exemplos de interesse: ${or(p.movies, NOT_GIVEN)}

Use esses gêneros para recomendar filmes, cenas, trailers, entrevistas com atores,
vídeos explicativos e outros materiais adequados à aprendizagem de inglês.
Priorize inicialmente cenas curtas, diálogos cotidianos e conteúdos com apoio visual.
Filmes com vocabulário arcaico, diálogos muito rápidos ou termos de fantasia complexos
devem ser usados de maneira complementar, não como fonte principal no nível ${level}.

## 2. Séries de televisão

Séries de interesse: ${or(p.series, NOT_GIVEN)}

Explore cada série conforme a dificuldade linguística: comédias e situações cotidianas
para expressões do dia a dia, perguntas, respostas e pronúncia informal; séries de
conversas mais densas para opinião e vocabulário social; fantasia épica e narrativas
complexas para compreensão contextual, descrição de personagens e conflitos.
Não presuma que todas sejam adequadas para compreensão integral no nível ${level}:
selecione cenas acessíveis e mostre como aproveitá-las mesmo sem entender o episódio inteiro.

## 3. Animes e desenhos

Animações de interesse: ${or(p.animation, NOT_GIVEN)}

Recomende conteúdos com áudio em inglês quando disponível, vídeos explicativos, trailers,
entrevistas, resumos e cenas com diálogos compreensíveis. Aproveite o conhecimento prévio
da história para que a atenção fique no inglês. Priorize frases curtas e reutilizáveis,
descrições de ações, emoções e intenções, perguntas e respostas, vocabulário cotidiano e
áudio claro. Para conteúdo de ação com pouca fala, complemente com cenas de diálogo.
Diferencie áudio original de dublagem em inglês e não presuma que tudo esteja disponível
gratuitamente em qualquer país.

## 4. Livros e leitura

Interesses de leitura: ${or(p.books, NOT_GIVEN)}

Crie uma trilha de leitura progressiva: histórias curtas, textos adaptados para iniciantes,
leituras graduadas e artigos com vocabulário acessível, do nível ${level} até ${target}.
Para cada recomendação, informe nível, dificuldade, disponibilidade e a melhor maneira de
estudar o texto. Ensine a usar leitura extensiva para fluidez e leitura intensiva para
estudar expressões, sem transformar toda leitura em tradução demorada.
Ao recomendar textos religiosos ou livros protegidos, indique fontes legítimas e respeite
os direitos autorais das traduções.

## 5. Músicas

Estilos e artistas de interesse: ${or(p.music, NOT_GIVEN)}
${p.avoid.trim() ? `Restrições a respeitar rigorosamente: ${p.avoid.trim()}` : ""}

Prefira músicas originalmente compostas ou interpretadas em inglês. Ensine o ciclo:
1. escutar sem ler, 2. ler a letra enquanto escuta, 3. identificar expressões úteis,
4. consultar tradução só nos trechos necessários, 5. praticar frases curtas em voz alta,
6. reutilizar expressões em frases próprias, 7. ouvir de novo dias depois.
Letras têm linguagem poética, metáforas, contrações e pronúncia estilizada: não as trate
como a principal fonte de inglês falado natural. Respeite direitos autorais: indique fontes
legítimas para letras e nunca reproduza letras completas.

## 6. Hobbies e prazeres

- Hobbies: ${or(p.hobbies, NOT_GIVEN)}
- Prazeres e momentos de descanso: ${or(p.pleasures, NOT_GIVEN)}

Use esses temas para vocabulário cotidiano, conversas sociais e atividades de fala.

## 7. Como integrar os gostos ao plano

Os interesses não devem aparecer só como lista de recomendações: eles fazem parte da
execução do cronograma semanal. Para isso:

- Associe conteúdos específicos aos dias da semana.
- Alterne entretenimento, inglês cotidiano e inglês profissional de ${job}.
- Prefira materiais que a pessoa realmente tenha vontade de consumir.
- Monte listas prévias para evitar perder tempo escolhendo o que assistir ou ouvir.
- Mostre como revisitar cenas, músicas e textos já conhecidos.
- Ofereça alternativa curta para os dias de cansaço.
- Separe consumo recreativo de atividade com objetivo linguístico definido.
- Não exija estudo ativo de todo filme, episódio, livro ou música consumido.
- Aumente gradualmente a proporção de conteúdo novo em relação ao já conhecido.

Para cada conteúdo recomendado, indique uma forma prática de usá-lo em uma sessão de
${Math.max(10, p.minutesPerDay - 10)} a ${p.minutesPerDay + 5} minutos.

## 8. Critérios para selecionar conteúdos

Considere simultaneamente: o nível atual ${level} e a progressão até ${target}; os gostos
pessoais; a clareza da fala e a dificuldade do vocabulário; a possibilidade de usar áudio e
texto juntos; a disponibilidade de fontes legais e links verificáveis; o tempo necessário
por atividade; e o valor prático do vocabulário para a vida cotidiana e para o trabalho
como ${job}.

Não escolha um conteúdo apenas porque a pessoa gosta do universo ou da franquia. Avalie se
ele é útil para o nível atual e, se não for, proponha uma adaptação ou um material
preparatório mais simples.

O resultado deve ser uma experiência personalizada, em que a pessoa desenvolva inglês por
meio dos assuntos de que gosta, sem perder de vista o objetivo principal: alcançar ${target}
e se comunicar com autonomia crescente na vida cotidiana e profissional.`;
}

const FREE_RULES = `Regra inegociável: todo recurso de estudo recomendado precisa ser GRATUITO.
- Não recomende cursos pagos, assinaturas, aplicativos por assinatura, livros à venda,
  leituras graduadas compradas (Oxford Bookworms e similares), aulas particulares nem
  plataformas com paywall.
- Quando o assunto pedir um material que normalmente é pago, indique a alternativa
  gratuita equivalente (textos de domínio público, leituras graduadas livres, podcasts
  com transcrição aberta, glossários e documentação oficial).
- Filmes, séries e animes que a pessoa já assina ou já tem em casa podem ser citados como
  conteúdo, nunca como recurso a comprar: deixe claro que é opcional e ofereça sempre uma
  opção gratuita no mesmo dia (trailer oficial, entrevista, resumo, podcast).
- O app em si não deve exigir nenhuma compra para a pessoa cumprir a semana.`;

const LINK_RULES = `Regras para links (importante):
- Use apenas sites gratuitos, conhecidos e estáveis. Exemplos seguros: bbc.co.uk/learningenglish,
  newsinlevels.com, learningenglish.voanews.com, simple.wikipedia.org, apps.ankiweb.net,
  youglish.com, languagereactor.com, gutenberg.org, librivox.org, biblegateway.com,
  glossary.istqb.org, testautomationu.applitools.com, playwright.dev.
- Prefira a página inicial ou a seção do site. Nunca invente URLs de episódios, vídeos ou
  arquivos específicos.
- Para séries, filmes, animes e músicas, não coloque link: escreva apenas o nome e como usar,
  porque a disponibilidade varia por país e catálogo.`;

export function systemPrompt(p: Profile): string {
  return `Você é um professor de inglês que monta planos de estudo personalizados, baseados em
Comprehensible Input, Método Natural, imersão ativa e passiva, micro-hábitos, shadowing,
revisão espaçada e prática de conversação.

Escreva todas as explicações em português do Brasil. Os exemplos, frases e vocabulário de
estudo ficam em inglês. Seja concreto: nada de conselhos genéricos.

${FREE_RULES}

${LINK_RULES}

Responda SEMPRE com JSON válido e nada mais: sem comentários, sem texto antes ou depois,
sem blocos de código.

${interestsBrief(p)}`;
}

export function outlineMessage(p: Profile): string {
  return `Monte o esboço de ${p.weeks} semanas de estudo, do nível ${p.level} até ${p.target}.

Cada semana tem um tema principal do cotidiano ou do trabalho, útil e relevante para os
objetivos informados, com dificuldade crescente. O tópico gramatical nasce do tema, não o
contrário. A semana 1 deve ser a mais simples possível.

Responda com um array JSON de ${p.weeks} objetos, nesta forma exata:

[
  {
    "n": 1,
    "theme": "título curto em inglês, 2 a 4 palavras",
    "subtitle": "o que a pessoa vai aprender, em português, até 8 palavras",
    "why": "por que este tema importa para esta pessoa, 2 ou 3 frases em português",
    "grammarTopic": "tópico gramatical em português, ligado ao tema",
    "milestone": "o que a pessoa deve conseguir fazer no fim da semana, mensurável"
  }
]`;
}

export function weekMessage(
  p: Profile,
  item: { n: number; theme: string; subtitle: string; why: string; grammarTopic: string; milestone: string },
  outlineThemes: string[],
): string {
  const days = p.daysPerWeek;
  return `Desenvolva a semana ${item.n} por completo.

Tema: ${item.theme} — ${item.subtitle}
Gramática: ${item.grammarTopic}
Meta: ${item.milestone}
Contexto das outras semanas (não repita vocabulário já coberto): ${outlineThemes.join(" | ")}

Regras:
- ${days} dias de estudo, com ${p.minutesPerDay} minutos nos dias normais. Varie o foco entre
  inglês profissional, série ou filme, leitura, música, fala e um dia mais leve de revisão.
- Entre 70 e 100 itens de vocabulário no total, divididos em 4 a 6 grupos temáticos.
- Cada item no formato "inglês=português", separados por ponto e vírgula, numa única string.
- As tarefas de cada dia somam aproximadamente os minutos do dia.
- Toda frase de exemplo em inglês deve ser utilizável por alguém de nível ${p.level}.

Responda com um único objeto JSON, nesta forma exata:

{
  "n": ${item.n},
  "theme": "${item.theme}",
  "subtitle": "${item.subtitle}",
  "why": "2 ou 3 frases em português",
  "grammar": {
    "topic": "${item.grammarTopic}",
    "why": "por que esse tópico serve a este tema, 1 ou 2 frases",
    "examples": ["5 frases em inglês, curtas e úteis"],
    "tip": "o erro mais comum de quem fala português, em 1 ou 2 frases"
  },
  "vocab": [
    { "group": "nome do grupo em português", "items": "word=palavra; to work=trabalhar" }
  ],
  "resources": [
    { "name": "nome do recurso", "url": "https://...", "what": "o que fazer com ele nesta semana" }
  ],
  "content": [
    { "name": "nome do filme, série, música ou texto", "kind": "Série", "what": "como usar em uma sessão" }
  ],
  "milestone": "${item.milestone}",
  "days": [
    {
      "label": "Seg",
      "focus": "foco do dia em português, até 3 palavras",
      "minutes": ${p.minutesPerDay},
      "tasks": [
        { "what": "o que fazer, concreto", "resource": "em qual recurso", "min": 5 }
      ],
      "speak": "frase do dia em inglês, para falar em voz alta",
      "mini": "versão curta para dia cansado"
    }
  ]
}`;
}
