# Lições: a aula completa de cada semana, com professor para tirar dúvidas

Data: 2026-11-25 · Branch: `gemini-e-flashcards`

## Intenção

O plano manda estudar um assunto ("Ler a explicação de 'to be' no presente", na
segunda da semana 1), mas o app não tem essa explicação. A caixa "Gramática" do plano
mostra só o nome do assunto, um motivo, 5 frases e uma dica. Também não há com quem tirar
dúvidas.

As **Lições** preenchem esse buraco. Cada semana do plano ganha uma lição sobre a
gramática dela (ex.: verbo *to be*), escrita pelo Gemini no tom de um professor que
explica para um aluno que começa do zero. A lição tem **6 partes, uma por dia** (seg. a
sáb.), cada uma ligando a gramática ao foco daquele dia do plano. Embaixo de cada parte
há um **chat com o professor**: a pessoa escreve a dúvida e a IA responde sabendo o que
ela está estudando.

O **Estudo do dia** deixa de inventar o próprio assunto e passa a mostrar a parte de hoje
da lição da semana, com os 5 exercícios praticando essa parte. Assim existe uma só
explicação de cada assunto no app.

Público: o usuário (uso pessoal, com login), brasileiro, começando do zero. Português
simples, sem jargão, com o inglês acompanhado de áudio e pronúncia aproximada.

## Metas

- Página **`/licoes`** com a lista das lições do plano atual (uma por semana) e o estado
  de cada uma.
- Página **`/licoes/[semana]`** com a lição da semana: o roteiro das 6 partes, cada parte
  aberta para leitura, e o chat do professor embaixo de cada parte.
- **Roteiro primeiro, partes depois.** Ao abrir uma semana pela primeira vez, o Gemini gera
  só o roteiro (6 títulos com objetivo e foco do dia). Cada parte é escrita depois: no dia
  dela, pelo Estudo do dia, ou antes, pelo botão da parte em `/licoes/[semana]`.
- Botão **"Gerar a lição inteira"**: gera, uma de cada vez, as partes que faltam,
  mostrando "Parte 3 de 6…".
- O **Estudo do dia** mostra a parte de hoje e o chat dela; os exercícios praticam essa
  parte.
- Link **"Lições"** no menu de todas as páginas, e um botão "Estudar a lição completa" na
  caixa "Gramática" do plano.
- Tudo o que é gerado fica salvo no banco. Abrir de novo não gera nada.

## Fora do escopo

- Lições para quem não tem login. Segue a regra das lições de hoje.
- Escolher um assunto livre fora do plano (ex.: "quero estudar phrasal verbs"). As lições
  saem só da gramática das semanas do plano.
- Regerar uma parte ou o roteiro depois de salvos.
- Chat por voz. É só texto.
- Limite diário de perguntas no chat. Uso pessoal; o limite é a cota do Gemini.
- Migrar o banco para o servidor novo e tirar o conteúdo do código (JSON das semanas,
  vocabulário, verbos). São as etapas 1 e 3 combinadas com o usuário e têm design próprio.
  Esta é a etapa 2.

## O que seria um fracasso, mesmo funcionando

- O Estudo do dia e a lição mostrarem explicações diferentes da mesma parte.
- Partes que repetem o mesmo conteúdo ou pulam etapas (ex.: a pergunta antes da
  afirmativa).
- O professor do chat responder sem saber o que a pessoa está estudando, ou responder em
  inglês difícil, ou com jargão.
- A página ficar lenta para abrir. Ela só lê do banco; o Gemini só é chamado em clique.
- Uma geração estourar os 60 s da rota e a pessoa perder o que já foi gerado.

## Abordagens consideradas

1. **Roteiro da semana primeiro, cada parte no seu dia (escolhida).** Uma chamada curta
   gera o roteiro; cada parte é uma chamada própria. As partes seguem a mesma sequência
   porque nascem do mesmo roteiro, e cada espera fica perto da de hoje.
2. **A lição inteira numa chamada só.** Tudo pronto no primeiro clique, mas a resposta
   seria ~3 vezes a de hoje, com risco de passar dos 60 s ou ser cortada, e um JSON
   quebrado perde tudo.
3. **Cada parte sozinha, sem roteiro.** Mais simples, mas as partes não sabem umas das
   outras e repetem ou pulam conteúdo.

O usuário escolheu a 1 e pediu também o botão "Gerar a lição inteira", que é feito
chamando a geração de parte várias vezes (uma requisição por parte), não com a
abordagem 2.

## Como funciona

### Qual lição e qual parte

- Uma lição é identificada por **usuário + plano + semana** (`plan_id`, `week_n`). O plano
  de exemplo tem `plan_id = "sample"`, como já acontece em `app_progress`. Se a pessoa
  gerar um plano novo, as semanas dele ganham lições novas; as antigas ficam no banco.
- A semana é a mesma que o Estudo do dia já usa: a `currentWeek` da conta (via
  `/api/data`), ou a do navegador.
- **Parte do dia = dia da semana em São Paulo:** segunda = parte 1, …, sábado = parte 6.
  **Domingo usa a parte 6** (revisão), com exercícios novos.
- O roteiro guarda, para cada parte, o `focus` e o `label` do dia correspondente do plano
  (`week.days[i]`). Se o plano tiver menos de 6 dias, as partes que faltam usam o foco
  "Revisão".

### Conteúdo gerado (formato)

**Roteiro** (`outline`):

```json
{
  "topic": "Verbo to be no presente",
  "intro": "um parágrafo do professor dizendo o que a semana vai ensinar",
  "parts": [
    { "day": "Seg", "focus": "Base e Pronomes", "title": "O que é o to be", "goal": "Dizer quem você é e de onde vem." }
  ]
}
```

Exatamente 6 partes, em ordem de dificuldade (ex.: afirmativa → contrações → negativa →
pergunta → respostas curtas → revisão). `day` e `focus` vêm do plano; a IA escreve
`title` e `goal`.

**Parte** (`part`): o mesmo tipo `Study` do Estudo do dia, com dois campos novos
opcionais, para o tom de aula:

```json
{
  "topic": "O que é o to be",
  "goal": "Dizer quem você é e de onde vem.",
  "explanation": ["parágrafos em português, no tom de professor falando com o aluno"],
  "pattern": "Pessoa + am/is/are + resto",
  "examples": [{ "en": "I am from Brazil.", "pt": "Eu sou do Brasil.", "pron": "ái ém frâm bra-zíl" }],
  "tips": [{ "text": "...", "wrong": "Am Brazilian.", "right": "I am Brazilian." }],
  "dialogue": [{ "who": "Ana", "en": "Hi, I'm Ana.", "pt": "Oi, eu sou a Ana.", "pron": "rrái, áim ána" }],
  "practice": ["Diga em voz alta: seu nome, sua cidade e sua profissão com I am."]
}
```

- `explanation`: de 3 a 6 parágrafos (mais que os 2 a 4 de hoje, porque é a aula).
- `dialogue`: opcional, de 4 a 8 falas curtas que usam a parte numa situação real,
  ligada ao foco do dia (trabalho, série, música…).
- `practice`: opcional, de 1 a 3 atividades rápidas sem correção (falar, anotar, repetir).
- `pron` segue o mesmo estilo de pronúncia de hoje (`PRON_STYLE_LESSON`).
- O tipo `Study` em `lib/lesson-prompt.ts` ganha `dialogue?` e `practice?`. As lições
  antigas continuam válidas, porque os campos são opcionais.

**Resposta do chat:** `{ "answer": "texto em português, com o inglês entre aspas" }`.
Fica em JSON para usar o `askGemini` sem mudanças.

### Banco

**Com o Prisma (etapa 1, `2026-11-25-prisma-design.md`)**, estas tabelas viram modelos em
`prisma/schema.prisma` (`WeekLesson`, `LessonPart`, `LessonChat`, mais `weekLessonId` e
`partIdx` em `app_lesson`) e entram já na migração inicial. O SQL abaixo mostra a estrutura
que os modelos precisam gerar, com os mesmos nomes de tabelas e colunas (`@@map`/`@map`). O
acesso fica no Prisma Client, não em `pool.query`.

```sql
create table if not exists app_week_lesson (
  id          text primary key,
  user_id     text not null references "user"(id) on delete cascade,
  plan_id     text not null,
  week_n      int  not null,
  level       text not null,
  topic       text not null,
  theme       text,
  outline     jsonb not null,
  created_at  timestamptz not null default now(),
  unique (user_id, plan_id, week_n)
);

create table if not exists app_lesson_part (
  week_lesson_id text not null references app_week_lesson(id) on delete cascade,
  idx            int  not null check (idx between 0 and 5),
  content        jsonb not null,
  created_at     timestamptz not null default now(),
  primary key (week_lesson_id, idx)
);

create table if not exists app_lesson_chat (
  id             bigint generated always as identity primary key,
  user_id        text not null references "user"(id) on delete cascade,
  week_lesson_id text not null references app_week_lesson(id) on delete cascade,
  part_idx       int  not null,
  role           text not null check (role in ('aluno', 'professor')),
  text           text not null,
  created_at     timestamptz not null default now()
);
create index if not exists app_lesson_chat_part on app_lesson_chat (week_lesson_id, part_idx, created_at);

alter table app_lesson add column if not exists week_lesson_id text references app_week_lesson(id) on delete set null;
alter table app_lesson add column if not exists part_idx int;

alter table app_week_lesson enable row level security;
alter table app_lesson_part enable row level security;
alter table app_lesson_chat enable row level security;
```

- RLS ligado e sem políticas, igual às outras tabelas: o app acessa pelo servidor, e a
  chave pública do Supabase não lê nada.
- `"user".id` é `text` (conferido no banco atual).
- **Ordem:** a etapa 1 recria o banco no Supabase com estas tabelas já incluídas. A etapa 2
  (este design) só escreve o código. Ao terminar a etapa 1, a geração e o chat já podem ser
  testados de verdade.
- Uma parte é gravada com `insert … on conflict do nothing` e depois relida. Se dois
  cliques gerarem a mesma parte, vale a primeira e as duas telas mostram a mesma.

**Uma fonte só para a teoria:** as lições novas do Estudo do dia gravam
`week_lesson_id` + `part_idx` e deixam `study` nulo. As leituras de `app_lesson` fazem
`left join app_lesson_part` e preenchem `study` com o conteúdo da parte. As lições antigas,
com `study` próprio, continuam como estão.

Código novo em `lib/week-lessons.ts` (acesso ao banco pelo Prisma Client, no padrão de
`lib/lessons.ts` depois da etapa 1):
`getWeekLesson`, `createWeekLesson`, `listWeekLessons(userId, planId)` (com quantas partes
cada uma tem), `getPart`, `savePart`, `chatHistory(weekLessonId, partIdx, limite)`,
`addChat`.

### Rotas

**`app/api/licoes/route.ts`** (nova, `maxDuration = 60`, login obrigatório, chave via
`resolveKey`, como `/api/lesson`):

- `GET ?planId=…` → lista das lições do plano com `{ weekN, topic, partes geradas }`.
- `GET ?planId=…&week=N` → a lição (roteiro, partes geradas e chat de cada parte).
- `POST action: "outline"` → gera e salva o roteiro da semana, se ainda não existe. O
  cliente manda `planId`, `weekN`, `tema`, `gramatica`, `dias` (`label` e `focus` de cada
  dia) e `vocabulario`, como o Estudo do dia já manda hoje. `maxTokens` ~3000.
- `POST action: "part"`, `idx` → gera e salva uma parte, se ainda não existe. O prompt
  leva o roteiro inteiro (para saber o que vem antes e depois) e o vocabulário da semana.
  `maxTokens` ~8000.
- `POST action: "ask"`, `weekLessonId`, `partIdx`, `question` → salva a pergunta, chama o
  Gemini e salva a resposta. Pergunta vazia ou com mais de 1000 caracteres é recusada.

**`app/api/lesson/route.ts`** (Estudo do dia), ação `generate`:

- Recebe também `planId`. Acha a lição da semana; se não existe, responde `409` com
  `{ needsOutline: true }`. O cliente então chama `/api/licoes` `outline` e tenta de novo.
  São duas requisições para nenhuma passar dos 60 s.
- Com o roteiro e a **parte de hoje já gerada**: gera só as 5 questões, a partir da parte
  (`maxTokens` ~4000).
- Com o roteiro e **sem a parte de hoje**: uma chamada só gera a parte e as 5 questões
  (`{ study, questions }`, como hoje, `maxTokens` 12000), grava a parte em
  `app_lesson_part` e a lição do dia apontando para ela.
- Deixa de usar `assuntosRecentes`: quem decide o assunto agora é o roteiro.
  `errosRecentes` continua entrando no pedido das questões. O prompt antigo de assunto
  livre (`lessonUserPrompt` com `assuntosRecentes`) sai do código, e `assuntosRecentes`
  também.
- **Dias atrasados também viram partes.** Ao gerar a lição de uma data passada (chip do
  backlog), a parte é a do **dia da semana daquela data** (terça atrasada → parte 2), da
  **semana atual** no momento em que a pessoa gera (a semana de antes não fica salva). Ou
  seja, `generate` recebe a data e calcula o índice da parte a partir dela, e a semana vem
  do cliente, como hoje. Se aquela parte já tem exercícios de outro dia, ela é reaproveitada
  e só as questões são novas.
- Corrigir respostas, "Gerar 3 respostas", a contagem de atraso e o lembrete não mudam.

### Prompts (`lib/lesson-prompt.ts`)

- `outlineSystemPrompt(profile)` / `outlineUserPrompt(...)`: 6 partes em sequência, cada
  uma pequena o bastante para 10–15 minutos, ligando a gramática da semana ao foco do dia.
- `partSystemPrompt(profile)` / `partUserPrompt(...)`: reaproveita as regras da teoria de
  hoje (português simples, sem jargão, comparar com o português, exemplos da profissão,
  pronúncia) e acrescenta o tom de professor: falar com o aluno ("você"), explicar o porquê,
  antecipar a dúvida comum, retomar a parte anterior em uma frase.
- O prompt de geração do Estudo do dia passa a receber o roteiro e o índice da parte, para
  escrever a parte certa junto com as questões. Um prompt novo, `questionsUserPrompt`, gera
  só as questões a partir de uma parte pronta.
- `chatSystemPrompt(profile)` / `chatUserPrompt(...)`: o professor recebe o assunto da
  semana, o título e o conteúdo da parte, e as últimas 12 mensagens da conversa. Regras:
  responder em português simples, curto (até ~150 palavras), com exemplos em inglês e a
  pronúncia aproximada quando mostrar frase nova; se a dúvida for de outro assunto de
  inglês, responder mesmo assim e, se for de uma parte futura, dizer que ela vem depois;
  se não for sobre inglês, trazer a conversa de volta para a lição.

### Normalização (`lib/lesson-normalize.ts`)

- `normalizeOutline(raw, dias)`: aceita chaves em português (`assunto`, `partes`,
  `titulo`, `objetivo`), força 6 partes (sobra é cortada; se vierem menos de 6, erro "A IA
  não devolveu o roteiro completo. Tente de novo.") e sobrescreve `day`/`focus` com os do
  plano.
- `normalizeStudy` passa a aceitar `dialogue` (`dialogo`, `falas`) e `practice`
  (`pratica`), descartando falas sem `en`.
- `normalizeAnswer(raw)`: aceita `answer`/`resposta`; texto vazio → erro.
- Continua sem imports em tempo de execução, por causa do `npm test`.

### Páginas

**Contexto do plano compartilhado.** A lógica de `DailyStudyPage` que acha o plano e a
semana (localStorage + `/api/data`) vira um hook `usePlanContext()` em
`lib/use-plan-context.ts`, usado pelo Estudo do dia e pelas Lições. Devolve `plan`,
`planId`, `weeks`, `currentWeek`, `apiKey`, `accessCode`, `userId`.

**`/licoes`** (`app/licoes/page.tsx` + `components/LessonsIndexPage.tsx`):

```
Trilha de inglês · Lições           [Estudo do dia] [Vocabulário] [Preferências] [← Plano]

Semana 1 · Verbo to be no presente          ● semana atual
  Apresentações e cumprimentos · 2 de 6 partes             [Abrir]
Semana 2 · Presente simples
  Rotina e hábitos · ainda não gerada                      [Abrir]
...
```

Uma linha por semana do plano, com a gramática, o tema, o estado e a semana atual em
destaque. Sem login: o aviso de sempre ("Entre com sua conta Google…").

**`/licoes/[semana]`** (`app/licoes/[semana]/page.tsx` + `components/WeekLessonPage.tsx`):

```
Semana 1 · Verbo to be no presente
  "Nesta semana você vai aprender a dizer quem é…"   (intro do roteiro)
  [Gerar a lição inteira]

  1 Seg · Base e Pronomes · O que é o to be          ✓ pronta     ← hoje
  2 Ter · Inglês Profissional · Apresentar-se         [Gerar esta parte]
  ...

  ── Parte 1 · O que é o to be ──────────────────────
  Objetivo · explicação · fórmula · exemplos (🔊 + pronúncia) · dicas ✗→✓
  · diálogo · pratique agora
  💬 Pergunte ao professor
     Você: por que "I am" e não "I is"?
     Professor: …
     [________________________] [Enviar]
```

- Ao abrir uma semana sem roteiro, mostra "Preparar a lição" (gera o roteiro). Não gera
  sozinho ao abrir.
- As partes ficam numa lista; clicar abre a parte abaixo (uma aberta por vez). Abre já na
  parte de hoje quando é a semana atual; senão, na parte 1.
- "Gerar a lição inteira": chama `part` para cada parte que falta, em ordem, uma por vez,
  com "Gerando a parte 3 de 6…". Se uma falhar, para, mostra o erro e mantém as que já
  foram salvas; clicar de novo continua de onde parou. O botão some quando as 6 existem.
- A parte reaproveita a renderização da teoria do Estudo do dia (`StudySections`), que
  ganha o diálogo e a prática. O inglês usa `Speak` e a pronúncia usa `Pron`, como hoje.
- Semana fora do plano (ex.: `/licoes/99`): mensagem "Essa semana não existe no seu plano"
  e link para `/licoes`.

**Chat** (`components/TeacherChat.tsx`): usado em `/licoes/[semana]` e no Estudo do dia,
sempre ligado a `weekLessonId` + `partIdx`, então a conversa é a mesma nos dois lugares.
Mostra o histórico salvo, o campo de texto (Enter envia, Shift+Enter quebra linha), "O
professor está escrevendo…" durante a espera e o erro, se houver. A resposta é mostrada
como texto, com quebras de linha; sem markdown.

**Estudo do dia** (`DailyStudyPage` / `Lessons.tsx`):

- A seção de teoria mostra "Parte N de 6 · Semana X · assunto", o conteúdo da parte e o
  link "Ver a lição completa →" (`/licoes/X`). O chat da parte fica entre as dicas e os
  exercícios.
- Antes de gerar: "Hoje: parte N de 6 da lição de *assunto*, com 5 exercícios". O botão
  "Gerar o estudo de hoje" faz `outline` antes, se precisar, e depois `generate`.
- Lições antigas, sem parte, aparecem como hoje e sem chat (não têm `weekLessonId`).

**Menu:** link "Lições" em `Roadmap`, `VocabularyPage`, `PreferencesPage`,
`DailyStudyPage` e nas duas páginas novas. Conferir o cabeçalho no celular.

**Plano (`Roadmap`):** a caixa "Gramática" ganha o botão "Estudar a lição completa →"
para `/licoes/${week.n}`.

### Estilos

Classes novas em `app/globals.css` com prefixo `lesson-` (`lesson-list`, `lesson-part`,
`lesson-dialogue`, `lesson-chat`, `lesson-msg`, `lesson-msg-teacher`), usando as variáveis
e os painéis que já existem.

### Testes e verificação

- `scripts/test-logic.ts`: `normalizeOutline` (completo, chaves em português, 7 partes →
  6, 4 partes → erro, `day`/`focus` vêm do plano), `normalizeStudy` com `dialogue` e
  `practice`, `normalizeAnswer`, e a regra do dia (segunda → 0, sábado → 5, domingo → 5).
- `npm test` e `npx tsc --noEmit` passando.
- Navegador **só pelo MCP `chrome-devtools`**, desktop e mobile (`emulate`): menu nas
  páginas, `/licoes` sem login, `/licoes/[semana]` com semana inexistente. Gerar de verdade
  depende de login com a conta autorizada no perfil isolado; se não der, dizer isso ao
  usuário e pedir que ele teste a geração, o "Gerar a lição inteira" e o chat.

## Decisões tomadas pelo usuário

- Juntar as três ideias: lição por assunto da semana, uma parte por dia seguindo o foco do
  dia, e o Estudo do dia mostrando a parte de hoje.
- Chat com o professor embaixo de cada parte, salvo, nos dois lugares.
- Gerar o roteiro primeiro e cada parte no seu dia (abordagem 1), mais o botão "Gerar a
  lição inteira".
- Ordem do trabalho: (1) migrar o banco, (2) Lições, (3) tirar o conteúdo do código.

## Decisões minhas (o usuário pode corrigir)

- Endereços `/licoes` e `/licoes/[semana]`, nome "Lições".
- Parte do dia pelo dia da semana em São Paulo; domingo repete a parte 6 com exercícios
  novos.
- Dias atrasados usam a parte do dia da semana da data atrasada, na semana atual, e o
  caminho antigo de assunto livre sai do código.
- A lição é por plano: gerar um plano novo cria lições novas.
- A teoria das lições novas do Estudo do dia é lida da parte (join), não copiada.
- O roteiro não é gerado sozinho ao abrir a página; precisa de clique.
- O chat manda as últimas 12 mensagens como contexto; pergunta de até 1000 caracteres.
- O chat responde dúvidas de inglês fora da parte, mas puxa a conversa de volta para a
  lição quando não é sobre inglês.
- O esquema fica versionado no Prisma (`prisma/schema.prisma` e `prisma/migrations/`).
- As páginas novas não entram no `sitemap.ts`, porque exigem login.

## Fica a critério de quem constrói

- Nomes exatos de funções, componentes e classes CSS, dentro dos padrões acima.
- Os textos finais dos avisos e botões, em português simples.
- O ajuste fino dos prompts e dos `maxTokens` depois de ver 2 ou 3 gerações reais.
- Como dividir `Lessons.tsx` se ele crescer demais com o chat e a parte.
