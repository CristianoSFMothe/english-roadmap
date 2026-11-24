# Estudo do dia: teoria, dicas e exercícios

Data: 2026-11-23 · Branch: `gemini-e-flashcards`

## Intenção

Hoje a aba **"Lição do dia"** do plano (`components/Lessons.tsx`) entrega 5 exercícios
escritos por dia, gerados e corrigidos pelo Gemini. Falta o que vem **antes** dos
exercícios: a **teoria** do assunto do dia e as **dicas**. Também falta um **link no menu**
que leve direto a essa área.

O objetivo é que a pessoa abra o app e encontre o estudo de hoje em uma página só, nesta
ordem: aprender (teoria), evitar os erros comuns (dicas) e praticar (exercícios). O
conteúdo avança de um dia para o outro, seguindo o plano dela.

Público: brasileiros que começam do zero. Tudo em português simples, sem jargão
gramatical, com o inglês acompanhado de pronúncia aproximada e áudio, como já acontece na
página de verbos.

## Metas

- Página própria **`/estudo-diario`**, chamada "Estudo do dia", com link no topo do plano
  (`/`), do vocabulário (`/vocabulario`) e das preferências (`/preferencias`).
- Ordem da página: **Teoria → Dicas → Exercícios** (os 5 exercícios atuais, com correção).
- A teoria e os exercícios do dia tratam **do mesmo assunto**. Quem leu a teoria consegue
  resolver as questões.
- **Evolução diária:** cada dia traz um assunto novo, ligado ao tema e à gramática da
  semana atual do plano, sem repetir os assuntos dos últimos dias e voltando aos erros
  recentes da pessoa.
- A teoria fica salva com a lição do dia. Abrir a página de novo não gera nada.

## Fora do escopo

- Teoria para quem não tem login. A lição já exige login, e a teoria segue a mesma regra.
- Trilha fixa escrita à mão. Foi considerada (opção B) e descartada pelo usuário.
- Mudar a forma de corrigir as respostas, o lembrete do Google Agenda ou a contagem de
  atraso. Isso tudo continua como está e só muda de lugar.
- Exercícios novos (múltipla escolha, áudio, fala). Continua tudo escrito.

## O que seria um fracasso, mesmo funcionando

- Teoria que não bate com as questões do dia.
- Explicação com jargão ("verbo auxiliar modal", "particípio") sem tradução simples.
- Duas lições diferentes no app (a aba antiga e a página nova) com conteúdos diferentes.
- A página ficar mais lenta para abrir. Ela só lê do banco, e a geração só acontece no
  clique em "Gerar".

## Abordagens consideradas

1. **Uma chamada ao Gemini para tudo (escolhida).** O mesmo pedido devolve teoria, dicas e
   as 5 questões, salvas juntas na lição do dia. A teoria e os exercícios saem casados por
   construção, a espera fica perto da atual e a mudança no código é a menor. O custo é uma
   resposta maior (limite de tokens sobe) e, se o JSON vier quebrado, a geração inteira é
   refeita.
2. **Duas chamadas em sequência** (teoria, depois exercícios). Cada pedido é mais simples,
   mas a espera dobra e pode estourar o limite de 60 s da rota.
3. **Teoria sob demanda** (botão "Ver teoria"). A teoria fica "antes" só no visual, pode não
   casar com as questões e são duas esperas.

O usuário escolheu a 1, com a teoria gerada pelo Gemini (não uma trilha fixa).

## Como funciona

### Conteúdo gerado (formato)

A resposta do Gemini deixa de ser um array e vira um objeto:

```json
{
  "study": {
    "topic": "Verbo to be na negativa",
    "goal": "Dizer o que você não é e onde você não está.",
    "explanation": ["parágrafo curto em português", "..."],
    "pattern": "Pessoa + am/is/are + not + resto",
    "examples": [
      { "en": "I am not tired.", "pt": "Eu não estou cansado.", "pron": "ái ém nót táierd" }
    ],
    "tips": [
      { "text": "Em inglês o 'not' vem depois do verbo.", "wrong": "I not am tired.", "right": "I am not tired." }
    ]
  },
  "questions": [ { "id": "q1", "difficulty": "facil", "type": "...", "prompt": "...", "content": "...", "expected": "..." } ]
}
```

- `explanation`: de 2 a 4 parágrafos curtos, em português simples.
- `pattern`: opcional. É a "fórmula" da frase, quando o assunto tiver uma.
- `examples`: de 3 a 5 frases curtas. `pron` é a pronúncia aproximada com sons do
  português, no mesmo estilo de `lib/pronunciation.ts` ("rr" para o h, acentos para a
  sílaba forte). O prompt leva 2 ou 3 exemplos desse estilo.
- `tips`: de 2 a 4 dicas. `wrong` e `right` são opcionais e servem para o erro típico de
  quem fala português.

Tipo novo `Study` em `lib/lesson-prompt.ts`. `Lesson` (em `lib/lessons.ts`) ganha
`study: Study | null`.

### Pedido ao Gemini (`lib/lesson-prompt.ts`)

- `lessonSystemPrompt` ganha as regras da teoria: português simples, sem jargão (ou com o
  jargão traduzido na mesma frase), exemplos do dia a dia e do trabalho da pessoa, e
  pronúncia aproximada.
- Regra central do prompt: **as 5 questões praticam exatamente o assunto da teoria**, e a
  difícil combina o assunto com o vocabulário da semana.
- `lessonUserPrompt` recebe também `assuntosRecentes: string[]`, os `topic` dos últimos 7
  dias. A instrução: escolher um assunto novo, que avance dentro da gramática da semana
  (exemplo: afirmativa → negativa → pergunta → resposta curta), sem repetir nenhum dos
  recentes. Se os erros recentes apontarem uma lacuna, o assunto pode revisitá-la por
  outro ângulo.
- `maxTokens` da geração passa de 6000 para 12000.

### Normalização (`lib/lesson-normalize.ts`)

- `normalizeStudy(raw)` nova, tolerante como as atuais. Aceita `study`, `estudo` ou
  `teoria` e chaves em português (`assunto`, `explicacao`, `exemplos`, `dicas`). Exige
  `topic` e pelo menos 1 parágrafo de `explanation`, senão lança erro ("A IA não devolveu a
  teoria. Tente gerar de novo."). Descarta exemplos sem `en` e dicas sem `text`.
- `normalizeQuestions` já aceita `{ questions }` e não muda.
- O arquivo continua sem imports em tempo de execução, por causa do `npm test`.

### Banco

- A tabela `app_lesson` foi criada à mão no Supabase, e o esquema não está no repositório.
- Migração: `alter table app_lesson add column if not exists study jsonb;` A coluna aceita
  nulo, e as lições antigas ficam com `study = null`.
- Execução: pelo MCP do Supabase (`apply_migration`), **só com a autorização do usuário**
  no momento da execução, ou à mão pelo usuário no SQL Editor. O comando fica registrado
  no plano.
- `lib/lessons.ts`: `study` entra em todos os `select`/`returning`, em `paraLesson` e em
  `createLesson` (no `insert` e no `on conflict do update`). Função nova
  `assuntosRecentes(userId, limite = 7)`: `select study->>'topic' ... where study is not
  null order by lesson_date desc`.

### Rota (`app/api/lesson/route.ts`)

- `gerar` busca `assuntosRecentes` junto com `errosRecentes`, passa ao prompt, normaliza
  `study` e `questions` do mesmo JSON e salva os dois.
- Se a lição do dia já existe **com questões**, ela é devolvida como está, mesmo sem
  teoria. Não há regeração automática.
- `GET` não muda de formato. As lições passam a carregar `study`.

### Página `/estudo-diario`

- `app/estudo-diario/page.tsx` (metadata com título e descrição) renderiza
  `components/DailyStudyPage.tsx` (cliente). O cabeçalho segue o padrão de
  `VocabularyPage`: marca "Trilha de inglês · Estudo do dia", botões "Vocabulário",
  "Preferências" e "← Voltar ao plano", e o `AuthBar` para entrar.
- **Contexto do plano:** lê do `localStorage` as mesmas chaves do `Roadmap` (`plan`,
  `week:${planId}`, `geminiApiKey`, `accessCode`) com `usePersistentState`, e monta a
  semana atual com `buildWeeks`. Com login, também busca `/api/data` (como o `Roadmap` faz)
  para pegar o plano e a `currentWeek` salvos na nuvem, porque a pessoa pode abrir a página
  direto em um aparelho onde o plano ainda não foi carregado. Sem plano gerado, usa o plano
  de exemplo. Mostra no topo "Semana N · tema" para a pessoa saber de onde vem o assunto.
- **Login:** `useSession` + `authConfigured`. Sem login, mostra o mesmo aviso de hoje
  ("Entre com sua conta Google…").
- **Seções, em ordem:**
  1. **Teoria:** `topic` como título, `goal` em destaque, os parágrafos, `pattern` em uma
     caixa e os exemplos com o inglês, o botão de ouvir (`<Speak text={en} />` de
     `SpeechButtons`), a pronúncia aproximada na linha de baixo e a tradução. Atenção:
     o `say` do `Speak` é o texto em inglês que a voz fala, não a pronúncia em português,
     então `pron` só é exibido e nunca vai para o `say`. A exibição usa a função única de
     pronúncia do design `2026-11-23-pronuncia-em-todo-app-design.md`, com `pron` como
     pronúncia explícita.
  2. **Dicas:** lista. Quando houver `wrong`/`right`, mostra ✗ errado → ✓ certo.
  3. **Exercícios:** o bloco atual de questões, correção, placar, atrasados e "Gerar"
     (mesmo comportamento de hoje).
  4. **Lembrete diário:** o bloco atual, sem mudança.
- Lição sem teoria (antiga): as seções 1 e 2 dão lugar a um aviso curto: "Esta lição é
  anterior à teoria. As próximas já vêm com explicação e dicas."
- Antes de gerar: texto curto ("Hoje você recebe uma explicação, dicas e 5 exercícios
  sobre um assunto da semana N") e o botão "Gerar o estudo de hoje". Durante a geração,
  aviso de que pode levar até um minuto.
- Abrir uma lição atrasada (chip do backlog) troca as três seções para aquela lição.

### Reaproveitamento do `Lessons.tsx`

- Mover a lógica e o JSX de `Lessons.tsx` para a página nova. Divisão sugerida:
  `DailyStudyPage` (página, cabeçalho, contexto do plano) e `Lessons` (carregar, gerar,
  corrigir, backlog, lembrete), que ganha a renderização de teoria e dicas antes da lista.
  Não pode sobrar código de lição duplicado.
- **Aba "Lição do dia" no plano:** continua existindo, mas passa a mostrar só um cartão
  curto ("A lição do dia agora tem teoria e dicas e fica em uma página própria") com o
  botão "Abrir o estudo do dia" → `/estudo-diario`.

### Menu

- Botão "Estudo do dia" em `Roadmap` (antes de "Preferências"), `VocabularyPage` e
  `PreferencesPage`. No plano, com destaque (`btn small primary`, se a classe existir no
  CSS; senão, o estilo mais próximo do botão principal).
- Conferir que o cabeçalho não quebra mal no celular com um botão a mais.

### Estilos

- Classes novas em `app/globals.css`, prefixo `study-` (`study-theory`, `study-pattern`,
  `study-example`, `study-tips`, `study-wrong`, `study-right`). Usar as variáveis de cor e
  o espaçamento dos painéis já existentes (`.panel`, `.section-title`).

### Testes e verificação

- `scripts/test-logic.ts`: casos de `normalizeStudy` (formato completo, chaves em
  português, `study` ausente → erro, exemplos sem `en` descartados, `pattern` ausente
  aceito) e um caso de `normalizeQuestions` lendo o objeto novo `{ study, questions }`.
- `npm test` e checagem de tipos (`npx tsc --noEmit`) passando.
- Navegador **só pelo MCP `chrome-devtools`**, em desktop e mobile (`emulate`):
  link do menu nas três páginas, página sem login, aba antiga com o cartão. A geração real
  depende de login com conta autorizada e de uma chave do Gemini no perfil isolado. Se não
  der para gerar ali, dizer isso ao usuário e pedir que ele teste a geração.

## Decisões tomadas pelo usuário

- A teoria e as dicas vêm antes dos exercícios, e a área tem link no menu.
- A teoria é gerada pelo Gemini (opção A), não uma trilha fixa.
- Uma chamada ao Gemini gera teoria, dicas e exercícios juntos (abordagem 1).

## Decisões minhas (o usuário pode corrigir)

- Endereço `/estudo-diario` e nome "Estudo do dia".
- A aba "Lição do dia" vira um cartão com link, em vez de sumir.
- A evolução vem dos assuntos dos últimos 7 dias, enviados no pedido.
- Lições antigas abrem sem teoria, com aviso, e não são regeradas.
- Teoria inválida faz a geração falhar (para tentar de novo), em vez de salvar só os
  exercícios.
- O lembrete diário muda junto para a página nova.
- A página não entra no `sitemap.ts`, porque o conteúdo exige login.
- A página lê o plano da nuvem quando há login, para não cair no plano de exemplo em um
  aparelho novo.

## Fica a critério de quem constrói

- Nomes exatos de funções e classes CSS, dentro dos padrões acima.
- O texto final dos avisos, em português simples.
- O ajuste fino do prompt (exemplos de pronúncia, tamanho dos parágrafos) depois de ver
  2 ou 3 gerações reais.
