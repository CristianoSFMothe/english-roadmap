# Pronúncia aproximada em todo o app

Data: 2026-11-23 · Branch: `gemini-e-flashcards`

Substitui a "Parte 1: pronúncia aproximada" de
`2026-11-17-conversas-e-pronuncia-design.md`, que só cobria o `/vocabulario` e nunca foi
executada. Mantém as decisões de lá que continuam valendo: `MyWord.say`, que pode ser
editado, e exemplos do estilo no prompt.

## Intenção

Quem começa do zero precisa **ler** como a palavra soa, não só ouvir. Hoje só a aba de
verbos tem a pronúncia aproximada completa (sons do português, como em `lib/pronunciation.ts`).
No resto do app ela falta, e o usuário notou isso no vocabulário ("Para soletrar",
perguntas e pronomes, cores e adjetivos, casa/cidade/comida, corpo/saúde/roupas).

O pedido: **toda palavra e frase em inglês do app mostra a pronúncia aproximada**, inclusive
as **palavras novas** criadas depois (planos gerados, palavras que a pessoa adiciona,
teoria do Estudo do dia).

## Situação atual (levantada em 2026-11-23)

- Listas fixas de `lib/vocabulary.ts` (`CATEGORIES`): **245 de 353 itens sem `say`**.
  Alfabeto 5/35, dias e meses 17/42, família 34/34, dia a dia 41/41, perguntas 20/20, cores
  e adjetivos 36/36, casa e cidade 38/38, corpo e roupas 32/32, preposições 22/22. Números
  estão completos.
- Flashcards do plano (`Card`, vindos de `vocab.items` no formato `en=pt; en=pt`): nenhum
  tem pronúncia. O plano de exemplo (`lib/weeks-*.json`) tem 870 itens.
- Palavras da pessoa (`MyWord`): não têm campo de pronúncia.
- Frase do dia (`day.speak`, no `DayDrawer`) e exemplos de gramática (`week.grammar.examples`,
  no `Roadmap`): sem pronúncia.
- Verbos (`VerbsView`): completos, via `sayPhrase` + `WORD_SAY`/`LINE_SAY`.
- No vocabulário, `RefItem.say` é a pronúncia em português, mostrada em `<span className="say">`.
  **Não confundir** com o parâmetro `say` de `Speak`/`speak()`, que é o texto em inglês a
  ser falado pela voz. A pronúncia aproximada nunca vai para o `speak()`.

## Metas

- Todo item das listas fixas e do plano de exemplo tem pronúncia escrita, revisada e no
  mesmo estilo.
- Uma **função única** decide a pronúncia de qualquer texto em inglês, e todos os lugares
  que mostram inglês para estudo passam a usá-la.
- Palavra nova (plano gerado, palavra da pessoa, teoria do Estudo do dia) ganha pronúncia
  sem ninguém editar código.
- Um teste impede que um item fixo novo entre sem pronúncia.

## Fora do escopo

- Pronúncia nos enunciados e respostas dos exercícios da lição (eles são para a pessoa
  produzir o inglês).
- IPA. Continua aparecendo como hoje, depois de tocar uma palavra solta.
- Trocar o motor de voz.
- Conversas e menu (Partes 2 e 3 do spec de 2026-11-17).

## O que seria um fracasso, mesmo funcionando

- Estilos misturados: uma palavra com "rr" para o h e outra com "h". Tudo tem que seguir as
  regras de `lib/pronunciation.ts`.
- A página ficar lenta, ou com dezenas de chamadas ao Gemini, ao abrir uma lista.
- A mesma palavra gerada várias vezes no Gemini.

## Abordagens consideradas

- **A) Explícita → dicionário → Gemini (escolhida pelo usuário).** O texto já escrito vale
  primeiro. Na falta dele, o dicionário compõe a frase. Na falta dos dois, o Gemini é
  consultado uma única vez por texto, e o resultado é guardado.
- **B) Só o dicionário.** Grátis, sem internet e consistente, mas palavra fora do
  dicionário fica sem pronúncia.
- **C) Converter a IPA do dicionário online para sons do português.** Cobre qualquer
  palavra solta sem IA, mas o resultado sai tosco e não cobre frases.

## Como funciona

### 1. Regra de estilo, em um lugar só

As regras de escrita ficam em um comentário e em uma constante exportada de
`lib/pronunciation.ts`: inglês americano, sons do português, "rr" para o h, acento na
sílaba forte, sílabas separadas por hífen e nota curta para o "th" só onde o som não existe
em português. Nas frases, as palavras se ligam como na fala ("uát-chu-dú" para *what do
you do*) só quando essa ligação for o normal. O prompt do Gemini usa essa mesma constante,
com 8 a 10 exemplos tirados de `WORD_SAY` e de `lib/vocabulary.ts`.

### 2. Conteúdo fixo preenchido pelo subagente `pronuncia` (Claude Code)

- **Atualização de 2026-11-23 (decisão do usuário):** quem escreve a pronúncia do conteúdo
  fixo é um **subagente do Claude Code**, definido em `.claude/agents/pronuncia.md`. Ele
  roda na sessão do Claude Code do usuário, com a conta dele, só durante o desenvolvimento,
  nunca no site. As instruções dele copiam a regra de estilo do item 1, e ele só pode
  mexer nos campos de pronúncia, nunca em `en`, `pt` ou na ordem dos itens.
- O subagente preenche o `say` dos 245 itens de `CATEGORIES`. Nos itens com barra ou ponto
  médio ("I · me · my", "dash / hyphen"), a pronúncia segue as mesmas partes.
- Ele preenche a pronúncia dos 870 cards do plano de exemplo, no formato `en=pt=pronúncia`
  (ver item 4).
- Ele preenche `lib/pron-seed.ts` (mapa `pronKey(texto) → pronúncia`, sem imports) com as
  frases do dia (`days[].speak`) e os exemplos de gramática (`grammar.examples`) do plano
  de exemplo. O `pronounce` consulta esse mapa depois do dicionário.
- Testes em `scripts/test-logic.ts`: todo item de `CATEGORIES` tem `say`, todo card de
  `sampleWeeks` tem pronúncia, e toda frase do dia e todo exemplo de gramática do plano de
  exemplo têm `pronounce(...)` definido. A mensagem do teste lista os itens que faltam.
- Fora do conteúdo fixo, nada é gerado sem clique (item 3).

### 3. Função única

`pronounce(en, explicit?)` em `lib/pronunciation.ts` (o arquivo continua sem imports):
devolve `explicit` se existir, senão `sayPhrase(en)`, senão a entrada de `PRON_SEED`
(`lib/pron-seed.ts`), senão `undefined`.

**Atualização de 2026-11-23 (decisão do usuário):** palavras, frases e textos sem
pronúncia aparecem **sem ela e com um botão "Gerar pronúncia"**. O Gemini só é chamado no
clique.

No cliente, o hook **`usePron(en, explicit?)`** (arquivo novo `lib/use-pron.ts`) devolve
`{ say, status, generate }`:

1. `pronounce(en, explicit)`;
2. o cache local (`localStorage`, chave `pronCache`, mapa texto normalizado → pronúncia);
3. **consulta automática e gratuita** ao que já está guardado no servidor: a fila manda em
   lote (espera de ~300 ms, até 40 textos) `POST /api/pron` com `generate: false`, que só
   lê a tabela `app_pron` e nunca chama o Gemini. Decisão minha: assim, uma palavra que
   alguém já gerou aparece pronta para todo mundo;
4. se nada encontrar, `status = "missing"`, e a tela mostra o botão. `generate()` manda
   `generate: true`, com a `geminiApiKey` e o `accessCode` do navegador, e o resultado vai
   para o cache local e para todos os componentes que mostram aquele texto.

Estados: `"ready"` (tem pronúncia), `"checking"` (consultando o servidor: nada aparece),
`"missing"` (botão), `"generating"` (botão desabilitado, "Gerando…") e `"failed"`
(mensagem curta "Não deu para gerar agora" e o botão de novo).

**Botões:**
- `<Pron>` (um texto): quando falta a pronúncia, mostra um botão pequeno "Gerar pronúncia"
  no lugar dela. Usado em flashcards, frase do dia, palavra da pessoa e exemplos.
- `<PronListButton texts={...} />` (uma lista): no título de uma lista com itens sem
  pronúncia, mostra "Gerar pronúncia de N itens". Gera todos em lotes de 40, e os itens
  da lista não mostram o botão individual. Usado nas listas do vocabulário da semana, nas
  aprendidas e em "Minhas palavras".

Texto normalizado: aparado, espaços únicos, minúsculas, sem pontuação final.

### 4. Planos gerados pelo Gemini

- O prompt da semana (`lib/prompt.ts`, por volta da linha 241) passa a pedir
  `"items": "word=palavra=uârd; to work=trabalhar=tu uârk"`, com as regras de estilo.
- `parseItems` (`lib/weeks.ts`): a 1ª parte é `en`, a 2ª é `pt` e a 3ª, se houver, é `say`.
  `Card` ganha `say?: string`. Planos antigos, sem a 3ª parte, continuam funcionando, e
  a pronúncia deles vem do dicionário ou do Gemini pelo `usePron`.
- `normalize.ts`, quando `items` vier como array de objetos, aceita `say`/`pron`/`pronuncia`
  e monta `en=pt=say`.
- O aumento de tamanho da resposta (~10 a 15 %) deve caber no `maxTokens` atual da semana.
  Se o teste real mostrar corte (`MAX_TOKENS`), o limite sobe.

### 5. Palavras da pessoa

- `MyWord` ganha `say?: string`. `cleanWords` (`lib/server-data.ts`) aceita e limita o campo
  (até 300 caracteres).
- No formulário de adicionar: um campo "Pronúncia (opcional)" com o botão "Gerar" ao lado,
  que preenche o campo pelo Gemini antes de salvar. Na lista, uma palavra sem pronúncia
  mostra o botão "Gerar pronúncia", e o resultado fica gravado na palavra (no navegador e
  na nuvem). A pessoa pode editar depois.

### 6. Rota `/api/pron`

- `POST { texts: string[], generate: boolean, apiKey?, accessCode? }` →
  `{ say: Record<string, string> }`.
- Limites: até 40 textos, cada um com até 200 caracteres. Textos fora disso são ignorados.
- Passos: normalizar e buscar na tabela `app_pron`. Com `generate: false`, para aqui. Com
  `generate: true`, pede **em uma chamada** ao Gemini só os que faltam (JSON
  `{ "texto": "pronúncia" }`, temperatura baixa), grava e devolve tudo. O Gemini é o
  provedor escolhido pelo usuário para o botão. O Claude no site exigiria chave de API
  separada da assinatura e foi descartado.
- Chave: `resolveKey(apiKey, accessCode)`, a mesma regra das outras rotas. Sem chave
  disponível, a rota devolve só o que já está na tabela, sem erro.
- Sem `DATABASE_URL`: pula a tabela e devolve o que o Gemini gerou. O cache fica só no
  navegador.

### 7. Banco

- Tabela nova, compartilhada entre todos, porque a pronúncia de uma palavra não depende de
  quem estuda:
  `create table if not exists app_pron (text text primary key, say text not null, created_at timestamptz not null default now()); alter table app_pron enable row level security;`
- Execução: pelo MCP do Supabase **só com a autorização do usuário** no momento, ou à mão
  pelo usuário no SQL Editor. O comando fica registrado no plano.

### 8. Onde aparece

Com `usePron` (ou `pronounce`, quando o texto é fixo e já tem a pronúncia escrita):

- `VocabularyPage`: listas fixas (já mostra `say`) e "Minhas palavras".
- `Flashcards`: a pronúncia na frente do card, abaixo do inglês, e no verso, junto da
  resposta. O deck de verbos hoje põe a pronúncia dentro do `pt` ("tradução (pronúncia)").
  Ele passa a usar `Card.say`, e o deck do vocabulário fixo (`VocabularyPage`, linha ~35)
  também, para não aparecer a pronúncia duas vezes.
- `Roadmap`: exemplos de gramática e a lista de vocabulário da semana (linha ~408).
- `DayDrawer`: a frase do dia.
- Estudo do dia: os exemplos da teoria (`pron` do Gemini como explícito) e as dicas
  (`right`).

Visual: o mesmo de hoje no vocabulário (`.say`, linha de baixo, discreta).

### 9. Verificação

- `npm test` e `npx tsc --noEmit` passando.
- Navegador **só pelo MCP `chrome-devtools`**, em desktop e mobile (`emulate`): conferir as
  seções que o usuário citou (Para soletrar, Perguntas e pronomes, Cores e adjetivos, Casa,
  cidade e comida, Corpo, saúde e roupas), os flashcards do plano, a frase do dia e uma
  palavra nova adicionada em "Minhas palavras".

## Ordem de execução

Este trabalho vem **antes** do Estudo do dia, porque a teoria usa `usePron`.

1. Regra de estilo, `pronounce` e testes.
2. `say` nas listas fixas.
3. `Card.say`, `parseItems`, prompt do plano e `normalize.ts`.
4. Pronúncia no plano de exemplo (870 itens).
5. Tabela, rota `/api/pron` e `usePron`.
6. Exibição nos componentes e campo em "Minhas palavras".

## Decisões tomadas pelo usuário

- Todas as palavras do app têm pronúncia, e as novas também (abordagem A).
- O conteúdo fixo (vocabulário e plano de exemplo) é preenchido agora por um subagente do
  Claude Code (`pronuncia`), que usa a conta do usuário.
- Fora do conteúdo fixo, o texto aparece sem pronúncia e com o botão "Gerar pronúncia", e
  quem gera é o Gemini. Usar a assinatura Pro/Max do Claude no site não é permitido, e uma
  chave de API do Claude teria custo separado.

## Decisões minhas (o usuário pode corrigir)

- O cache é compartilhado entre todas as pessoas (tabela `app_pron`), porque é uma
  informação sobre a palavra, não sobre quem estuda.
- A consulta ao que já está guardado é automática e gratuita (sem Gemini). Só a geração
  precisa de clique.
- Listas têm um botão único ("Gerar pronúncia de N itens"), e itens soltos têm o botão
  pequeno.
- A pronúncia da palavra da pessoa fica gravada na própria palavra e pode ser editada.
- Exercícios da lição ficam sem pronúncia.
- O pedido ao Gemini vai em lotes de até 40 textos.

## Fica a critério de quem constrói

- A estrutura interna da fila de `usePron` (módulo com `Map` + assinantes, ou contexto React).
- O texto exato do prompt de pronúncia.
- Acrescentar ao `WORD_SAY` as palavras soltas das listas fixas, se isso ajudar o
  `sayPhrase` a compor mais frases sem o Gemini.
