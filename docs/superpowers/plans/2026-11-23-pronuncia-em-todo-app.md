# Pronúncia em todo o app: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** toda palavra e frase em inglês do app tem a pronúncia aproximada (sons do português). O conteúdo fixo já vem com ela, preenchida por um subagente do Claude Code. O resto aparece sem ela e com o botão "Gerar pronúncia", que usa o Gemini.

**Architecture:** `pronounce()` resolve nesta ordem: pronúncia explícita, dicionário (`sayPhrase`) e mapa semente (`lib/pron-seed.ts`). No cliente, `usePron` também consulta o cache local e, de graça, a tabela compartilhada `app_pron` (`/api/pron` com `generate: false`). Só no clique do botão a rota chama o Gemini (`generate: true`). O subagente `.claude/agents/pronuncia.md`, rodando no Claude Code com a conta do usuário, escreve a pronúncia das listas fixas, dos cards e das frases do plano de exemplo. Testes impedem que um item fixo fique sem ela.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript 5.9, `pg` (Supabase Postgres), Gemini via `lib/gemini.ts`, testes em `scripts/test-logic.ts` (`npm test`, Node `--experimental-strip-types`), subagente do Claude Code.

**Spec:** `docs/superpowers/specs/2026-11-23-pronuncia-em-todo-app-design.md`

Substitui as Tasks 1, 2 e 5 (pronúncia) de `2026-11-17-conversas-e-pronuncia.md`, que nunca foram executadas.

## Global Constraints

- Estilo da pronúncia: inglês americano, sons do português, "rr" para o h, acento na sílaba forte, sílabas separadas por hífen, nota curta para o "th" só onde o som não existe em português. Igual a `WORD_SAY` em `lib/pronunciation.ts`.
- A pronúncia aproximada **nunca** vai para o parâmetro `say` de `Speak`/`speak()`, que é o texto em inglês falado pela voz.
- `lib/pronunciation.ts`, `lib/pron-seed.ts`, `lib/pron-prompt.ts`, `lib/lesson-normalize.ts`, `lib/vocabulary.ts` e `lib/weeks.ts` ficam **sem imports em tempo de execução** (só `import type`). Exceção: `lib/pronunciation.ts` pode importar `lib/pron-seed.ts` com extensão `.ts` explícita (`import { PRON_SEED } from "./pron-seed.ts"`), desde que o `tsconfig` aceite. Senão, `PRON_SEED` vai para dentro de `lib/pronunciation.ts`.
- Fora do conteúdo fixo, **nada chama o Gemini sem clique**. A consulta automática usa `generate: false`.
- Textos da interface: "Gerar pronúncia", "Gerar pronúncia de N itens", "Gerando…" e "Não deu para gerar agora".
- `/api/pron`: até 40 textos por pedido, cada um com até 200 caracteres.
- `MyWord.say`: até 300 caracteres.
- O subagente `pronuncia` só altera campos de pronúncia: nunca `en`, `pt`, a ordem ou a separação dos itens.
- Banco: `app_pron` só é criada com a autorização explícita do usuário no momento, pelo MCP do Supabase (`apply_migration`), ou pelo próprio usuário no SQL Editor.
- **Sem commits**, a menos que o usuário peça.
- Navegador: só o MCP `chrome-devtools`. Mobile por `emulate`.

## Review Focus

1. A mesma palavra com caixa ou pontuação diferente ("Hello!" e "hello") deve usar uma única entrada do cache. O teste de `pronKey` fica na Task 1.
2. Resposta do Gemini com chaves em outra caixa, chaves a mais ou valores vazios: só ficam os textos pedidos, casados pela chave normalizada. Teste de `normalizePronMap` na Task 5.
3. Uma lista grande (vocabulário com mais de 350 itens, flashcards com 870) não pode gerar dezenas de pedidos nem repetir texto. Teste de `pronBatches` na Task 5.
4. Uma consulta com `generate: false` nunca chama o Gemini, nem com chave disponível. Verificação com `curl` e log na Task 5.
5. Planos antigos (`en=pt`) e traduções com "=" continuam abrindo. Teste de `parseItems` na Task 3.

---

### Task 1: Regra de estilo, `pronounce` e mapa semente vazio

**Files:**
- Modify: `lib/pronunciation.ts`
- Create: `lib/pron-seed.ts` (`export const PRON_SEED: Record<string, string> = {};`)
- Test: `scripts/test-logic.ts`

**Interfaces:**
- Produces:
  - `PRON_STYLE: string`: as regras de estilo em português.
  - `PRON_EXAMPLES: [en: string, say: string][]`: de 8 a 10 pares tirados de `WORD_SAY`/`LINE_SAY`.
  - `pronKey(text: string): string`: apara, troca espaços repetidos por um só, passa para minúsculas e tira `.`, `!`, `?` e `,` do fim.
  - `pronounce(en: string, explicit?: string): string | undefined`: devolve `explicit?.trim()` se houver, senão `sayPhrase(en)`, senão `PRON_SEED[pronKey(en)]`.

- [ ] **Step 1: testes**

```ts
check("pronKey ignora caixa, espacos e pontuacao final", () => {
  if (pronKey("  Hello!  ") !== "hello") throw new Error("hello");
  if (pronKey("How   are you?") !== "how are you") throw new Error("how are you");
  if (pronKey("Dr. Smith") !== "dr. smith") throw new Error("ponto no meio fica");
});
check("pronounce: explicita, dicionario, semente", () => {
  if (pronounce("book", "búk!") !== "búk!") throw new Error("explicita");
  if (pronounce("book") !== sayPhrase("book")) throw new Error("dicionario");
  if (pronounce("zzqx") !== undefined) throw new Error("desconhecida");
  if (pronounce("book", "  ") !== sayPhrase("book")) throw new Error("explicita vazia");
});
check("estilo e exemplos para o prompt", () => {
  if (!PRON_STYLE.includes("rr")) throw new Error("regra do h");
  if (PRON_EXAMPLES.length < 8) throw new Error("exemplos");
});
```

- [ ] **Step 2:** `npm test` deve falhar.
- [ ] **Step 3:** implementar e importar no teste.
- [ ] **Step 4:** `npm test` e `npx tsc --noEmit` sem erros.

---

### Task 2: Subagente `pronuncia` do Claude Code

**Files:**
- Create: `.claude/agents/pronuncia.md`

- [ ] **Step 1:** criar o subagente com o frontmatter `name: pronuncia`, uma `description` ("Escreve a pronúncia aproximada em sons do português para textos em inglês nos arquivos do english-roadmap. Use para preencher `say` em lib/vocabulary.ts, a 3ª parte `=pronúncia` nos itens de lib/weeks-*.json e o mapa lib/pron-seed.ts") e `tools: Read, Edit, Bash`. Sem `model`: ele herda o modelo da sessão. O corpo traz:
  - a regra de estilo, **copiada** de `PRON_STYLE`, e os pares de `PRON_EXAMPLES`;
  - as proibições das Global Constraints (só campos de pronúncia; não mexer em `en`, `pt`, ordem ou `; `);
  - a forma de cada arquivo: `it("en", "pt", "say")` em `lib/vocabulary.ts`, `en=pt=say` dentro de `items` nos JSON e `"pronkey": "say"` em `lib/pron-seed.ts`;
  - o critério de pronto: rodar `npm test` e só parar quando os testes de cobertura da sua parte passarem;
  - o retorno: o número de itens preenchidos por arquivo e as palavras em que ficou em dúvida.
- [ ] **Step 2:** conferir que `/agents` (ou o Agent tool com `subagent_type: "pronuncia"`) enxerga o subagente. Se ele não aparecer na sessão atual, avisar o usuário de que é preciso reiniciar o Claude Code para carregá-lo e parar aqui até isso acontecer.

---

### Task 3: `Card.say` e formato `en=pt=pronúncia` nos planos

**Files:**
- Modify: `lib/weeks.ts` (`Card`, `parseItems`)
- Modify: `lib/normalize.ts:71-82`
- Modify: `lib/prompt.ts` (formato dos itens, por volta das linhas 222 e 241)
- Test: `scripts/test-logic.ts`

**Interfaces:**
- Consumes: `PRON_STYLE`, `PRON_EXAMPLES` (Task 1).
- Produces: `Card = { en: string; pt: string; group: string; id: string; say?: string }`.

- [ ] **Step 1: testes**

```ts
check("parseItems le a pronuncia como 3a parte", () => {
  const [w] = buildWeeks([{ ...semanaMinima, vocab: [{ group: "G", items: "book=livro=búk; pen=caneta" }] }]);
  if (w.cards[0].say !== "búk" || w.cards[0].pt !== "livro") throw new Error("3 partes");
  if (w.cards[1].say !== undefined || w.cards[1].pt !== "caneta") throw new Error("2 partes");
});
check("vocabulario em objeto aceita say/pron/pronuncia", () => {
  const w = normalizeWeek({ ...semanaBruta, vocab: [{ group: "G", items: [{ en: "book", pt: "livro", pron: "búk" }] }] }, 1, 5, 20);
  if (w.vocab[0].items !== "book=livro=búk") throw new Error(w.vocab[0].items);
});
check("prompt da semana pede a pronuncia", () => {
  const m = weekMessage(p, { n: 1, theme: "T", subtitle: "s", why: "w", grammarTopic: "g", milestone: "m" }, ["1. T"]);
  if (!m.includes("=uârd") || !m.includes("rr")) throw new Error("formato ou estilo ausente");
});
```

`semanaMinima`/`semanaBruta`: extrair para constantes no topo a semana que os checks das linhas 45-82 já montam.

- [ ] **Step 2:** `npm test` deve falhar.
- [ ] **Step 3:** em `parseItems`, partir por `=`: a 1ª parte é `en`, a **última** é `say` só quando houver 3 ou mais partes, e o meio, reunido com `=`, é `pt`. Em `normalize.ts`, montar `en=pt=say` quando vier `say ?? pron ?? pronuncia`. No prompt: formato `"word=palavra=uârd; to work=trabalhar=tu uârk"`, com `PRON_STYLE` e 4 pares de `PRON_EXAMPLES`.
- [ ] **Step 4:** `npm test` deve passar, incluindo os testes antigos.

---

### Task 4: Conteúdo fixo preenchido pelo subagente

**Files:**
- Modify (pelo subagente): `lib/vocabulary.ts`, `lib/weeks-a.json`, `lib/weeks-b.json`, `lib/weeks-c.json`, `lib/pron-seed.ts`
- Test: `scripts/test-logic.ts`

**Interfaces:**
- Consumes: subagente `pronuncia` (Task 2), formato `en=pt=say` (Task 3), `pronounce`/`PRON_SEED` (Task 1).

- [ ] **Step 1: testes de cobertura** (os JSON são lidos com `readFileSync`, porque o Node não importa JSON sem atributo):

```ts
const sampleRaw = ["a", "b", "c"].flatMap((s) => JSON.parse(readFileSync(new URL(`../lib/weeks-${s}.json`, import.meta.url), "utf8")));
check("todo item fixo do vocabulario tem pronuncia", () => {
  const faltam = CATEGORIES.flatMap((c) => c.groups.flatMap((g) => g.items.filter((i) => !i.say?.trim()).map((i) => `${c.id}/${i.en}`)));
  if (faltam.length) throw new Error(`${faltam.length} sem say: ${faltam.slice(0, 10).join(", ")}`);
});
check("todo card do plano de exemplo tem pronuncia", () => {
  const faltam = buildWeeks(sampleRaw).flatMap((w) => w.cards.filter((c) => !c.say?.trim()).map((c) => c.en));
  if (faltam.length) throw new Error(`${faltam.length} sem pronuncia: ${faltam.slice(0, 10).join(", ")}`);
});
check("frases do dia e exemplos de gramatica do plano de exemplo tem pronuncia", () => {
  const textos = sampleRaw.flatMap((w: RawWeek) => [...w.days.map((d) => d.speak), ...w.grammar.examples]);
  const faltam = textos.filter((t) => t && !pronounce(t));
  if (faltam.length) throw new Error(`${faltam.length} sem pronuncia: ${faltam.slice(0, 5).join(" | ")}`);
});
```

- [ ] **Step 2:** `npm test` deve falhar com "245 sem say", "870 sem pronuncia" e as frases que faltam.
- [ ] **Step 3:** chamar o subagente (`subagent_type: "pronuncia"`) **uma vez por bloco**, para cada chamada caber no contexto dele: (a) `lib/vocabulary.ts`; (b) `weeks-a.json`; (c) `weeks-b.json`; (d) `weeks-c.json`; (e) `lib/pron-seed.ts`, com as frases do dia e os exemplos de gramática das 12 semanas. Cada chamada leva o arquivo, o teste que precisa passar e as proibições.
- [ ] **Step 4:** revisar uma amostra de 20 itens de cada bloco contra o estilo. Com `git diff --stat` e `git diff --word-diff`, conferir que nos JSON só mudou o trecho `=pronúncia` (os ids dos cards dependem da posição e guardam o "Já sei").
- [ ] **Step 5:** `npm test` deve passar.

---

### Task 5: Tabela `app_pron`, prompt e rota `/api/pron`

**Files:**
- Create: `lib/pron-prompt.ts` (puro)
- Create: `lib/pron-store.ts`
- Create: `app/api/pron/route.ts`
- Test: `scripts/test-logic.ts`

**Interfaces:**
- Consumes: `pronKey`, `PRON_STYLE`, `PRON_EXAMPLES` (Task 1). `lib/pron-prompt.ts` recebe estilo e exemplos por parâmetro.
- Produces:
  - `pronSystemPrompt(style: string, examples: [string, string][]): string`
  - `pronUserPrompt(texts: string[]): string`: pede `{ "<texto exatamente como enviado>": "<pronúncia>" }`.
  - `normalizePronMap(raw: unknown, texts: string[], key: (t: string) => string): Record<string, string>`: chaves = `key(texto)` dos textos pedidos. Ignora chaves não pedidas e valores vazios ou que não sejam string.
  - `pronBatches(texts: string[], key: (t: string) => string, size = 40): string[][]`: remove textos vazios, com mais de 200 caracteres e repetidos, e divide em lotes.
  - `getStoredPron(keys: string[]): Promise<Record<string, string>>` e `saveStoredPron(map: Record<string, string>): Promise<void>` (`on conflict (text) do nothing`). Os dois são vazio/no-op sem `databaseConfigured`, e engolem erro de banco com `console.error`.
  - `POST /api/pron` com body `{ texts: string[]; generate?: boolean; apiKey?: string; accessCode?: string }` → `200 { say: Record<pronKey, string> }`. Body inválido → 400.

- [ ] **Step 1: testes**

```ts
check("normalizePronMap fica so com o que foi pedido", () => {
  const m = normalizePronMap({ Hello: "rre-lôu", extra: "x", "Good night!": "" }, ["hello", "good night"], pronKey);
  if (m.hello !== "rre-lôu" || "extra" in m || "good night" in m) throw new Error(JSON.stringify(m));
});
check("pronBatches tira repetidos e corta em 40", () => {
  const textos = [...Array(90).keys()].map((i) => `w${i}`).concat(["W1", "", "x".repeat(201)]);
  const lotes = pronBatches(textos, pronKey);
  if (lotes.length !== 3 || lotes[0].length !== 40 || lotes.flat().length !== 90) throw new Error("lotes");
});
check("prompt de pronuncia leva estilo e textos", () => {
  if (!pronSystemPrompt(PRON_STYLE, PRON_EXAMPLES).includes("rr")) throw new Error("estilo");
  if (!pronUserPrompt(["Good morning"]).includes("Good morning")) throw new Error("texto");
});
```

- [ ] **Step 2:** `npm test` deve falhar.
- [ ] **Step 3:** implementar `lib/pron-prompt.ts` e `lib/pron-store.ts`.
- [ ] **Step 4:** a rota (`runtime = "nodejs"`, `dynamic = "force-dynamic"`) faz `pronBatches(texts, pronKey)[0]` e `getStoredPron`. Se `generate !== true` ou não faltar nada, devolve o que está guardado. Senão, `resolveKey(apiKey, accessCode)`: com erro, devolve o guardado. Com chave, `askGemini({ system, user, maxTokens: 4000, temperature: 0.2 })` → `extractJson` → `normalizePronMap` → `saveStoredPron` e devolve tudo junto. Falha do Gemini devolve 200 com o guardado e `console.error`. O cliente entende "pediu `generate` e a chave não veio" como falha.
- [ ] **Step 5:** pedir ao usuário a autorização para criar a tabela, e só então executar:

```sql
create table if not exists app_pron (text text primary key, say text not null, created_at timestamptz not null default now());
alter table app_pron enable row level security;
```

- [ ] **Step 6:** `npm test` e `npx tsc --noEmit` sem erros. Com `npm run dev`: `curl -s -X POST localhost:3000/api/pron -H 'content-type: application/json' -d '{"texts":["serendipity"]}'` → `{"say":{}}` e nenhuma chamada ao Gemini no log. Com `"generate":true` e sem chave → 200 `{"say":{}}`, nunca 500.

---

### Task 6: Hook `usePron`, `<Pron>` e `<PronListButton>`

**Files:**
- Modify: `lib/storage.ts` (exportar `readStored`)
- Create: `lib/use-pron.ts` (`"use client"`)
- Create: `components/Pron.tsx`
- Modify: `app/globals.css` (`.pron-btn`, pequeno e discreto, no estilo de `.btn small`)

**Interfaces:**
- Consumes: `pronounce`, `pronKey` (Task 1), `pronBatches` (Task 5), `POST /api/pron`.
- Produces:
  - `readStored<T>(key: string, fallback: T): T`.
  - `type PronStatus = "ready" | "checking" | "missing" | "generating" | "failed"`.
  - `usePron(en: string, explicit?: string): { say?: string; status: PronStatus; generate: () => Promise<void> }`. No primeiro render, `pronounce(en, explicit)` (ou `"checking"` sem nada), para não quebrar a hidratação. Depois da montagem: cache local e, por fila, `generate: false`.
  - `generatePron(texts: string[]): Promise<Record<string, string>>`: gera em lotes de 40 com `generate: true` e grava no cache. Usado pelo botão de lista e pelo formulário.
  - `<Pron text explicit? className? noButton? />`: `ready` → `<span className="say">`; `missing`/`failed` → `<button className="pron-btn">Gerar pronúncia</button>` (com `failed`, antes vem `<span className="say-result bad">Não deu para gerar agora</span>`); `generating` → botão desabilitado "Gerando…"; `checking` → nada. `noButton` esconde o botão (a lista usa o botão dela).
  - `<PronListButton texts={string[]} />`: conta os textos sem pronúncia (`pronounce` + cache, depois da consulta). Com 0, não renderiza nada. Senão, "Gerar pronúncia de N itens", que chama `generatePron`.

- [ ] **Step 1:** implementar a fila em módulo: `Map` de cache carregado uma vez de `readStored("pronCache", {})` e salvo em `english-roadmap:pronCache`, `Set` de pendentes para consulta, assinantes por chave e estado por chave (`checking`/`missing`/`generating`/`failed`). Espera de 300 ms entre consultas. `apiKey`/`accessCode` vêm de `readStored("geminiApiKey", "")`/`readStored("accessCode", "")`.
- [ ] **Step 2:** `npx tsc --noEmit` sem erros.

---

### Task 7: Pronúncia e botões na tela, e "Minhas palavras"

**Files:**
- Modify: `lib/vocabulary.ts` (`MyWord.say?: string`)
- Modify: `lib/server-data.ts:188-210` (`cleanWords` aceita `say`, até 300)
- Modify: `components/VocabularyPage.tsx`: `categoryDeck` (linha ~35) usa `say` em vez de `pt (say)`. As listas fixas continuam com `i.say`, e `MyWordsView` (formulário e lista) e `LearnedView` usam `<Pron noButton>` + `<PronListButton>` no título.
- Modify: `components/VerbsView.tsx:74-80`: o card usa `say`, e não mais `pt (say)`.
- Modify: `components/Flashcards.tsx:136-150`: `<Pron text={card.en} explicit={card.say} />` abaixo do inglês, na frente (en→pt) e no verso (pt→en).
- Modify: `components/Roadmap.tsx:379-411`: exemplos de gramática (`<Pron>` em cada um) e vocabulário da semana (`<Pron noButton>` + `<PronListButton>` no título de cada grupo).
- Modify: `components/DayDrawer.tsx:78-81`: frase do dia com `<Pron>`.
- Test: `scripts/test-logic.ts`

**Interfaces:**
- Consumes: `<Pron>`, `<PronListButton>`, `generatePron` (Task 6), `Card.say` (Task 3).

- [ ] **Step 1: teste**

```ts
check("cleanWords guarda a pronuncia com limite", () => {
  const [w] = cleanWords([{ id: "1", en: "book", pt: "livro", say: "búk" }]);
  if (w.say !== "búk") throw new Error("say");
  const [l] = cleanWords([{ id: "2", en: "a", pt: "b", say: "x".repeat(400) }]);
  if ((l.say ?? "").length !== 300) throw new Error("limite");
});
```

Se importar `lib/server-data.ts` no teste falhar por causa do `pg`, mover `cleanWords` (e o `texto` que ele usa) para `lib/vocabulary.ts` e reexportar de `server-data.ts`.

- [ ] **Step 2:** `npm test` deve falhar.
- [ ] **Step 3:** `MyWord.say` e `cleanWords`. Formulário: campo "Pronúncia (opcional)" com o botão "Gerar" ao lado (`generatePron([en])` preenche o campo). Na lista, `say` aparece como `.say`, ou, se faltar, o botão de lista no título gera e grava em cada palavra com `setWords`. `say` é editável junto com os outros campos.
- [ ] **Step 4:** trocar a exibição nos componentes da lista acima. O `Speak` continua recebendo só o texto em inglês.
- [ ] **Step 5:** `npm test` e `npx tsc --noEmit` sem erros.
- [ ] **Step 6: verificação no navegador** (MCP `chrome-devtools`, com `npm run dev`):
  - `/vocabulario`: Alfabeto (Para soletrar), Perguntas e pronomes, Cores e adjetivos, Casa, cidade e comida, e Corpo, saúde e roupas, todos com pronúncia e sem botão.
  - Flashcards de uma seção: a pronúncia aparece uma vez só.
  - Plano de exemplo (`/`): flashcards, gramática, vocabulário e frase do dia, tudo com pronúncia e sem botão.
  - Minhas palavras: adicionar uma palavra fora do dicionário. Ela aparece sem pronúncia e com o botão. No clique, com chave, a pronúncia aparece. Sem chave, "Não deu para gerar agora".
  - Rede: abrir `/vocabulario` não dispara nenhuma chamada com `generate: true`.
  - Mobile (`emulate`, 390×844): as linhas `.say` e os botões não estouram o layout.
  - Console sem erros de hidratação.
