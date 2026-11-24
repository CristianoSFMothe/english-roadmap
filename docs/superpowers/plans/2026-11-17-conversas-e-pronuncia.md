# Conversas do mês, pronúncia aproximada e menu enxuto: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pronúncia aproximada em tudo do `/vocabulario`, menu de três entradas e uma página `/conversas` com uma história de 30 dias gerada pelo Gemini, um episódio por dia, com questionário.

**Architecture:** Lógica pura (normalização, regra de liberação, sorteio, limpeza) em `lib/*.ts` sem aliases `@/`, testada por `scripts/test-logic.ts`. Uma rota `POST /api/conversa` (etapas `arc`, `episode`, `say`) reaproveita a chamada ao Gemini extraída da rota do plano. A história fica no navegador e, com conta, na tabela `app_story` via `GET/PUT /api/story`.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, `pg` (Supabase), Gemini REST, Web Speech/Kokoro já existentes em `lib/speech.ts`.

**Spec:** `docs/superpowers/specs/2026-11-17-conversas-e-pronuncia-design.md`

## Global Constraints

- Testes rodam com `npm test` (`node --experimental-strip-types`): arquivos importados pelos testes usam só imports relativos com extensão `.ts` e não importam `pg`, `better-auth` nem `next`.
- Textos de interface em português do Brasil, com acentos.
- `say` = pronúncia aproximada escrita para quem fala português (inglês americano): sílabas com hífen, acento na tônica, nota entre parênteses só para som inexistente em português.
- História: 30 episódios; no máximo 1 episódio novo por dia de calendário **local**; só libera o próximo depois do questionário do anterior respondido; pular dias não pula episódios.
- Questionário: 5 perguntas (3 `compreensao`, 2 `situacao`), 4 opções, 1 certa, explicação em português.
- Protagonista sem nome no perfil: "Alex".
- Chave do Gemini: mesma regra da rota do plano (chave do visitante se `ALLOW_VISITOR_KEY !== "false"`; senão a do servidor para conta autorizada ou `APP_ACCESS_CODE`).
- Criar a tabela `app_story` no Supabase só depois de avisar a pessoa.
- O prop `say` do componente `Speak` é **o texto em inglês a falar**, não a pronúncia em português. Nunca passar `RefItem.say`, `MyWord.say` ou `Line.say` para ele.

## Review Focus

1. **Pronúncia em português indo para a voz**: passar `say` (pt) ao `Speak` faz a voz ler português. Esperado: o áudio sempre fala o inglês. Verificação por grep nas Tasks 5 e 11.
2. **Gemini devolve o nome do personagem em vez do id** (`"speaker": "Priya"` ou `"You"`). Esperado: a fala é mapeada para o personagem certo, não descartada. Teste na Task 7.
3. **Questionário malformado** (3 opções, `answer: 4`, opções repetidas). Esperado: pergunta descartada; com menos de 4 válidas a geração falha com mensagem, sem mostrar quiz quebrado. Teste na Task 7.
4. **Virada do dia**: concluir às 23:50 e abrir às 00:10 libera o próximo; a data é a local, não UTC. Teste na Task 7.
5. **História salva em formato antigo ou corrompido** (navegador ou nuvem). Esperado: a página oferece começar outra história em vez de quebrar. Teste na Task 9.

---

### Task 1: Pronúncia nas palavras guardadas e limpeza pura

**Files:**
- Modify: `lib/vocabulary.ts` (tipo `MyWord`; recebe `cleanWords`)
- Modify: `lib/server-data.ts` (remove `cleanWords`, reexporta de `./vocabulary`)
- Test: `scripts/test-logic.ts`

**Interfaces:**
- Produces: `MyWord.say?: string`; `cleanWords(raw: unknown): MyWord[]` em `lib/vocabulary.ts` (mesmo comportamento de hoje + `say` com `trim` e até 300 caracteres, omitido se vazio). `lib/server-data.ts` continua exportando `cleanWords`.

- [ ] **Step 1: Teste que falha**

```ts
import { cleanWords } from "../lib/vocabulary.ts";
check("cleanWords guarda say aparado e descarta vazio", () => {
  const [a, b] = cleanWords([
    { id: "1", en: "hello", pt: "olá", say: "  rê-lôu  " },
    { id: "2", en: "bye", pt: "tchau", say: "   " },
  ]);
  if (a.say !== "rê-lôu") throw new Error(`say: ${a.say}`);
  if ("say" in b) throw new Error("say vazio deveria sumir");
  if (cleanWords([{ id: "3", en: "x", say: "y".repeat(400) }])[0].say!.length !== 300)
    throw new Error("say sem limite");
});
```

- [ ] **Step 2:** `npm test` → falha (`cleanWords` não exportado de `lib/vocabulary.ts`).
- [ ] **Step 3:** Mover `cleanWords` (e `MAX_WORDS`, `texto`) para `lib/vocabulary.ts`, adicionar `say`; em `lib/server-data.ts` trocar por `export { cleanWords } from "./vocabulary";`.
- [ ] **Step 4:** `npm test` e `npx tsc --noEmit` → passam.
- [ ] **Step 5:** Commit `Guarda a pronúncia aproximada nas palavras do vocabulário`.

### Task 2: Pronúncia aproximada em todas as entradas fixas

**Files:**
- Modify: `lib/vocabulary.ts` (309 chamadas `it(en, pt)` ganham o 3º argumento)
- Test: `scripts/test-logic.ts`

**Interfaces:**
- Produces: todo `RefItem` em `CATEGORIES` com `say` não vazio; `SAY_EXAMPLES: RefItem[]` (10 itens variados com `say`, incluindo palavra, frase, número e o `three`) exportado de `lib/vocabulary.ts` para os prompts.

- [ ] **Step 1: Teste que falha**

```ts
import { CATEGORIES, SAY_EXAMPLES } from "../lib/vocabulary.ts";
check("toda entrada fixa tem pronúncia aproximada", () => {
  const faltando = CATEGORIES.flatMap((c) => c.groups.flatMap((g) => g.items))
    .filter((i) => !i.say?.trim()).map((i) => i.en);
  if (faltando.length) throw new Error(`${faltando.length} sem say: ${faltando.slice(0, 5).join(", ")}`);
  if (SAY_EXAMPLES.length !== 10) throw new Error("SAY_EXAMPLES deve ter 10");
});
```

- [ ] **Step 2:** `npm test` → falha com "309 sem say".
- [ ] **Step 3:** Escrever o `say` de cada entrada, categoria por categoria, no estilo das 108 existentes (ex.: `"three" → "thrí (th com a língua entre os dentes)"`, `"Monday" → "mân-dêi"`). Verbos `say · said · said` levam as três formas separadas por ` · `. Frases: a frase inteira, ligando palavras só quando é o normal da fala.
- [ ] **Step 4:** `npm test` → passa. Revisar 20 entradas aleatórias contra o áudio.
- [ ] **Step 5:** Commit `Adiciona a pronúncia aproximada em todo o vocabulário fixo`.

### Task 3: Chamada ao Gemini compartilhada

**Files:**
- Create: `lib/gemini.ts` (puro: `callGemini`, `pickKey`, `GEMINI_MODEL`)
- Create: `lib/gemini-access.ts` (servidor: `geminiKeyFor`)
- Modify: `app/api/plan/route.ts` (passa a usar os dois; comportamento igual)
- Test: `scripts/test-logic.ts`

**Interfaces:**
- Produces:
  - `GEMINI_MODEL: string` (`process.env.GEMINI_MODEL || "gemini-3.8-flash"`)
  - `callGemini(key: string, system: string, user: string, maxTokens: number): Promise<string>` (corpo atual da rota do plano, mensagens de erro iguais; a de `MAX_TOKENS` vira genérica: "A resposta foi cortada por tamanho. Tente de novo.")
  - `pickKey(i: { visitorKey: string; allowOwnKey: boolean; serverKey: string; signedIn: boolean; accessCode?: string; expectedCode?: string }): { key: string } | { error: string; status: number }`
  - `geminiKeyFor(body: { apiKey?: unknown; accessCode?: unknown }): Promise<{ key: string } | { error: string; status: number }>` (lê env e `allowedUser()`, delega a `pickKey`)

- [ ] **Step 1: Teste que falha**

```ts
import { pickKey } from "../lib/gemini.ts";
check("pickKey segue a regra da rota do plano", () => {
  const base = { visitorKey: "", allowOwnKey: true, serverKey: "S", signedIn: false };
  const r1 = pickKey({ ...base, visitorKey: "V" });
  if (!("key" in r1) || r1.key !== "V") throw new Error("chave do visitante");
  const r2 = pickKey({ ...base, expectedCode: "abc", accessCode: "x" });
  if (!("status" in r2) || r2.status !== 403) throw new Error("código errado deveria dar 403");
  const r3 = pickKey({ ...base, expectedCode: "abc", accessCode: "abc" });
  if (!("key" in r3) || r3.key !== "S") throw new Error("código certo libera a do servidor");
  const r4 = pickKey({ ...base, signedIn: true });
  if (!("key" in r4) || r4.key !== "S") throw new Error("conta libera a do servidor");
  const r5 = pickKey({ ...base, serverKey: "" });
  if (!("status" in r5) || r5.status !== 400) throw new Error("sem chave dá 400");
});
```

- [ ] **Step 2:** `npm test` → falha (módulo inexistente).
- [ ] **Step 3:** Criar os dois arquivos e trocar o código duplicado em `app/api/plan/route.ts`.
- [ ] **Step 4:** `npm test`, `npx tsc --noEmit` → passam. `GET /api/plan` em dev responde igual a antes.
- [ ] **Step 5:** Commit `Extrai a chamada ao Gemini para reuso`.

### Task 4: Etapa `say` da rota de conversas

**Files:**
- Create: `lib/story-prompt.ts` (por ora só `sayMessage` e `SAY_SYSTEM`)
- Create: `app/api/conversa/route.ts`
- Modify: `lib/normalize.ts` (adiciona `normalizeSay`)
- Test: `scripts/test-logic.ts`

**Interfaces:**
- Consumes: `callGemini`, `geminiKeyFor` (Task 3); `SAY_EXAMPLES` (Task 2); `extractJson`.
- Produces:
  - `sayMessage(items: string[]): string` (lista numerada + os 10 exemplos)
  - `normalizeSay(data: unknown, items: string[]): Record<string, string>` (aceita `[{en, say}]` ou `{items:[...]}`; casa por `en` sem diferenciar maiúsculas; chave do resultado = o item pedido; ignora o que não foi pedido)
  - `POST /api/conversa` `{ stage: "say", items: string[], apiKey?, accessCode? }` → `{ say: Record<string, string> }`. Máx. 40 itens de até 200 caracteres; `maxTokens` 2000.

- [ ] **Step 1: Teste que falha**

```ts
import { normalizeSay } from "../lib/normalize.ts";
import { sayMessage } from "../lib/story-prompt.ts";
check("normalizeSay casa por en e ignora o que não foi pedido", () => {
  const r = normalizeSay({ items: [{ en: "Hello", say: "rê-lôu" }, { en: "extra", say: "x" }] }, ["hello"]);
  if (r.hello !== "rê-lôu" || "extra" in r) throw new Error(JSON.stringify(r));
});
check("sayMessage leva os itens e os exemplos de estilo", () => {
  const m = sayMessage(["deadline"]);
  if (!m.includes("deadline") || !m.includes("thrí")) throw new Error("faltou item ou exemplo");
});
```

- [ ] **Step 2:** `npm test` → falha.
- [ ] **Step 3:** Implementar. Rota com `runtime = "nodejs"`, `maxDuration = 60`, erros no mesmo formato `{ error }` da rota do plano.
- [ ] **Step 4:** `npm test` → passa. Em dev, `POST /api/conversa` com `{"stage":"say","items":["deadline"]}` (logado) → JSON com `say.deadline`.
- [ ] **Step 5:** Commit `Gera a pronúncia aproximada com o Gemini`.

### Task 5: Pronúncia nas suas palavras e nas aprendidas

**Files:**
- Create: `lib/say.ts` (cliente: `staticSay`, `useSayCache`)
- Modify: `components/VocabularyPage.tsx` (`MyWordsView`, `LearnedView`)

**Interfaces:**
- Consumes: `POST /api/conversa` stage `say` (Task 4); chaves `geminiApiKey` e `accessCode` do `usePersistentState`.
- Produces:
  - `staticSay(en: string): string | undefined` (mapa de `CATEGORIES` por `en` minúsculo)
  - `useSayCache(): { cache: Record<string, string>; fill(items: string[]): Promise<Record<string, string>>; busy: boolean; error: string | null }` (persistido em `sayCache`; `fill` pula o que já tem `staticSay` ou cache; lotes de 40; devolve o que conseguiu)

- [ ] **Step 1:** Minhas palavras: campo opcional "Pronúncia aproximada" no formulário; ao salvar sem `say`, chama `fill([en])` e grava o resultado em `MyWord.say`; falha não bloqueia salvar. Mostrar `say` na lista e permitir editar.
- [ ] **Step 2:** Aprendidas (palavras do plano): mostrar `staticSay(en) ?? cache[en]`; se faltar algum, botão "Gerar pronúncia das que faltam" chama `fill`.
- [ ] **Step 3:** `grep -n "say={" components/*.tsx` → nenhum resultado passa `.say` de `RefItem`/`MyWord` ao `Speak`.
- [ ] **Step 4:** `npx tsc --noEmit` passa. No navegador (chrome-devtools MCP): salvar "deadline" sem pronúncia → aparece a pronúncia; deslogado e sem chave → salva sem pronúncia, campo continua editável.
- [ ] **Step 5:** Commit `Mostra a pronúncia nas suas palavras e nas aprendidas`.

### Task 6: Menu com três entradas e grade de temas

**Files:**
- Create: `components/VocabNav.tsx`
- Modify: `components/VocabularyPage.tsx`, `app/globals.css`

**Interfaces:**
- Produces: `VocabNav({ active, mineCount, onSelect }: { active: "temas" | "minhas" | "conversas"; mineCount?: number; onSelect?: (t: "temas" | "minhas") => void })`. "Conversas" é `<Link href="/conversas">`; sem `onSelect`, as outras duas são links para `/vocabulario?aba=temas|minhas`.
- `vocabTab` passa a guardar `"temas" | "minhas" | "aprendidas" | <id do tema>`; o valor antigo da constante `MINE` vira `"minhas"`. `?aba=` na URL tem prioridade ao abrir.

- [ ] **Step 1:** Implementar a navegação, a grade (12 cartões: 11 temas com contagem de itens + "Aprendidas") e o "← Todos os temas". Grade: 4 colunas, 2 abaixo de 640px.
- [ ] **Step 2:** `npx tsc --noEmit` passa. No navegador, desktop e emulação 390px: sem rolagem horizontal; abrir tema, voltar, recarregar mantém o tema aberto; `/vocabulario?aba=minhas` abre Minhas palavras.
- [ ] **Step 3:** Commit `Enxuga o menu do vocabulário em três entradas`.

### Task 7: Núcleo da história (tipos, sorteio, regra do dia, normalização)

**Files:**
- Create: `lib/story.ts`
- Test: `scripts/test-logic.ts`

**Interfaces:**
- Produces (tipos do spec, com `premiseId: string` em `Story`):
  - `STORY_DAYS = 30`, `PREMISES: Premise[]` (12; `Premise = { id: string; pt: string; en: string }`), `pickPremise(lastId: string | null, rand?: () => number): Premise`
  - `localDay(d?: Date): string` (AAAA-MM-DD pela data local)
  - `type StoryState = { kind: "needs-episode"; n: number } | { kind: "current"; n: number } | { kind: "wait"; n: number } | { kind: "finished" }`
  - `storyState(story: Story, today: string): StoryState`. Último concluído `k` (maior `n` em `results`, 0 se nenhum): `k === 30` → `finished`; `results[k].doneOn === today` → `wait(k+1)`; `episodes[k+1]` existe → `current(k+1)`; senão `needs-episode(k+1)`.
  - `normalizeArc(data: unknown, protagonist: string): Pick<Story, "scenario" | "characters" | "arc">`: garante personagem `{ id: "me", name: protagonist }`; 3 a 6 personagens; exatamente 30 `arc` (menos → erro; mais → corta; `n` renumerado).
  - `normalizeEpisode(data: unknown, n: number, characters: Character[]): Episode`: `speaker` por id, senão por nome (sem diferenciar maiúsculas), senão `you|me|você|<nome do protagonista>` → `"me"`, senão descarta; < 6 falas → erro; pergunta válida = 4 opções não vazias e distintas + `answer` inteiro 0–3; < 4 válidas → erro; corta em 5 perguntas, 8 frases, 24 falas.

- [ ] **Step 1: Testes que falham**

```ts
import { storyState, localDay, pickPremise, normalizeEpisode, normalizeArc, PREMISES } from "../lib/story.ts";
// story(results, episodes?) monta uma Story mínima com arc de 30
check("não libera dois episódios no mesmo dia", () => {
  const s = story({ 1: { score: 4, total: 5, doneOn: "2026-11-17" } });
  if (storyState(s, "2026-11-17").kind !== "wait") throw new Error("deveria esperar");
  if (storyState(s, "2026-11-18").kind !== "needs-episode") throw new Error("deveria liberar o 2");
});
check("pular dias não pula episódios", () => {
  const st = storyState(story({ 1: { score: 5, total: 5, doneOn: "2026-11-01" } }), "2026-11-20");
  if (st.kind !== "needs-episode" || st.n !== 2) throw new Error(JSON.stringify(st));
});
check("episódio gerado sem questionário fica como atual", () => {
  const st = storyState(story({}, { 1: episodioValido(1) }), "2026-11-17");
  if (st.kind !== "current" || st.n !== 1) throw new Error(JSON.stringify(st));
});
check("dia 30 concluído encerra a história", () => {
  const r = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, { score: 5, total: 5, doneOn: "2026-11-01" }]));
  if (storyState(story(r), "2026-12-30").kind !== "finished") throw new Error();
});
check("localDay usa a data local", () => {
  if (localDay(new Date(2026, 10, 17, 23, 50)) !== "2026-11-17") throw new Error("23:50");
  if (localDay(new Date(2026, 10, 18, 0, 10)) !== "2026-11-18") throw new Error("00:10");
});
check("sorteio não repete a premissa anterior", () => {
  for (let i = 0; i < 50; i++) if (pickPremise(PREMISES[0].id, Math.random).id === PREMISES[0].id) throw new Error("repetiu");
});
check("fala com nome do personagem é mapeada para o id", () => {
  const chars = [{ id: "me", name: "Alex", role: "", relation: "" }, { id: "priya", name: "Priya", role: "", relation: "" }];
  const ep = normalizeEpisode(episodioCom(["Priya", "You", "Alex", "Ninguém", "priya", "me", "Priya"]), 4, chars);
  const s = ep.lines.map((l) => l.speaker).join(",");
  if (s !== "priya,me,me,priya,me,priya") throw new Error(s);
});
check("questionário malformado é descartado ou falha", () => {
  // 2 válidas + 3 opções + answer 4 + opções repetidas → só 2 válidas → lança erro
  // 4 válidas + 1 inválida → quiz com 4
});
check("normalizeArc exige 30 episódios e cria o protagonista", () => {
  // 29 → lança; 31 → arc.length 30; sem "me" → characters inclui { id: "me", name: "Alex" }
});
```

(Os auxiliares `story()`, `episodioValido()` e `episodioCom()` ficam no próprio arquivo de teste.)

- [ ] **Step 2:** `npm test` → falha.
- [ ] **Step 3:** Implementar `lib/story.ts`. As 12 premissas cobrem trabalho, entrevista, calls com cliente e reuniões (as 6 do spec + 6 no mesmo espírito).
- [ ] **Step 4:** `npm test` → passa.
- [ ] **Step 5:** Commit `Adiciona o núcleo da história de 30 dias`.

### Task 8: Prompts e etapas `arc` e `episode`

**Files:**
- Modify: `lib/story-prompt.ts`, `app/api/conversa/route.ts`
- Test: `scripts/test-logic.ts`

**Interfaces:**
- Consumes: `Profile`, `clampProfile`; tipos e `normalizeArc`/`normalizeEpisode` (Task 7); `callGemini`/`geminiKeyFor` (Task 3).
- Produces:
  - `protagonistName(p: Profile): string` (`p.name.trim() || "Alex"`)
  - `storySystemPrompt(p: Profile): string` (nível atual → nível desejado, profissão, objetivo profissional, sotaque, restrições `avoid`, regras de `say` com `SAY_EXAMPLES`, "responda só JSON")
  - `arcMessage(p: Profile, premise: Premise): string` (progressão: 1–5 apresentações e conversa informal; depois reuniões e calls; entrevista perto do fim; fechamento no 30)
  - `type EpisodeRequest = { n: number; scenario: Story["scenario"]; characters: Character[]; arc: ArcEpisode[]; recaps: { n: number; recap: string }[] }`
  - `episodeMessage(p: Profile, r: EpisodeRequest): string` (inclui o `ArcEpisode` do dia, os `recap` dos 3 últimos por inteiro e, dos anteriores, só o `summary` do `arc`; nº de falas: 10 se `minutesPerDay` ≤ 20, 16 até 40, 24 acima)
  - Rota: `{ stage: "arc", profile, premiseId }` → `{ scenario, characters, arc }` (`maxTokens` 6000); `{ stage: "episode", profile, request: EpisodeRequest }` → `{ episode }` (`maxTokens` 8000). `premiseId` desconhecido → 400.

- [ ] **Step 1: Testes que falham**

```ts
check("protagonista sem nome vira Alex", () => {
  if (protagonistName({ ...sampleProfile, name: "  " }) !== "Alex") throw new Error();
});
check("episodeMessage leva só os 3 últimos recaps por inteiro", () => {
  const m = episodeMessage(sampleProfile, reqCom5Recaps); // n: 6, recaps "RECAP-1".."RECAP-5"
  for (const r of ["RECAP-3", "RECAP-4", "RECAP-5"]) if (!m.includes(r)) throw new Error(`faltou ${r}`);
  if (m.includes("RECAP-1")) throw new Error("RECAP-1 não deveria ir por inteiro");
});
check("prompt do enredo leva premissa, nível e profissão", () => {
  const p = { ...sampleProfile, profession: "QA analyst" };
  const m = arcMessage(p, PREMISES[0]);
  for (const s of [PREMISES[0].en, p.level, p.target, "QA analyst"]) if (!m.includes(s)) throw new Error(s);
});
```

- [ ] **Step 2:** `npm test` → falha.
- [ ] **Step 3:** Implementar prompts e etapas.
- [ ] **Step 4:** `npm test` → passa. Em dev, `arc` e depois `episode` 1 → JSON válido, mesmos personagens nos dois.
- [ ] **Step 5:** Commit `Gera o enredo do mês e o episódio do dia com o Gemini`.

### Task 9: Salvar a história (navegador e nuvem)

**Files:**
- Modify: `lib/story.ts` (adiciona `cleanStory`)
- Create: `lib/cloud-sync.ts`, `app/api/story/route.ts`
- Modify: `lib/server-data.ts` (`loadStory`, `saveStory`), `components/VocabularyPage.tsx` (passa a usar `useCloudSync`), `README.md` (lista de tabelas)
- Test: `scripts/test-logic.ts`

**Interfaces:**
- Produces:
  - `cleanStory(raw: unknown): Story | null` (`null` se faltar `id`, `premiseId`, `scenario`, `characters` com `"me"` ou `arc` de 30; descarta `episodes`/`results` fora de 1–30 ou malformados; `null` se `JSON.stringify` passar de 400 000 caracteres)
  - `useCloudSync<T>(o: { endpoint: string; field: string; userId: string | null; value: T; setValue: (v: T) => void; isEmpty: (v: T) => boolean }): void` (extraído do efeito duplo de `VocabularyPage`, mesmo comportamento: ao entrar o servidor vale; se lá for `null`, sobe o local quando não vazio; depois PUT com debounce de 1 s)
  - `loadStory(userId: string): Promise<Story | null>`, `saveStory(userId: string, story: Story | null): Promise<void>`; `GET /api/story` → `{ signedIn, story }`; `PUT /api/story` `{ story }` (passa por `cleanStory`; inválida e não `null` → 400)
  - Tabela: `create table app_story (user_id text primary key, data jsonb, updated_at timestamptz not null default now()); alter table app_story enable row level security;`
  - A página trata `cleanStory(valorSalvo) === null` como "sem história".

- [ ] **Step 1: Teste que falha**

```ts
check("cleanStory recusa formato antigo e aceita o atual", () => {
  if (cleanStory({ foo: 1 }) !== null) throw new Error("lixo");
  if (cleanStory({ ...storyValida, arc: storyValida.arc.slice(0, 10) }) !== null) throw new Error("arc curto");
  const s = cleanStory({ ...storyValida, results: { 1: { score: 4, total: 5, doneOn: "2026-11-17" }, 99: {} } });
  if (!s || 99 in s.results) throw new Error("result fora da faixa deveria sumir");
});
```

- [ ] **Step 2:** `npm test` → falha.
- [ ] **Step 3:** Implementar `cleanStory`, `useCloudSync`, rotas e funções de banco; trocar a sincronização de `VocabularyPage` por `useCloudSync`.
- [ ] **Step 4:** **Avisar a pessoa** e, com o aval, criar `app_story` no projeto Supabase `opjwsfzygsefbqnxliby` (`apply_migration`, nome `create_app_story`). Atualizar o README.
- [ ] **Step 5:** `npm test`, `npx tsc --noEmit` → passam. Minhas palavras continua sincronizando logado (adicionar palavra, recarregar a página → continua lá).
- [ ] **Step 6:** Commit `Salva a história no navegador e na conta`.

### Task 10: Episódio de exemplo

**Files:**
- Create: `lib/story-sample.ts`
- Test: `scripts/test-logic.ts`

**Interfaces:**
- Produces: `SAMPLE_STORY: Story` com `scenario`, 4 personagens, `arc` de 30 (resumos escritos) e `episodes[1]` escrito à mão: apresentação no primeiro dia num time internacional, 12 falas com `pt` e `say`, 6 frases-chave, 5 perguntas (3 compreensão, 2 situação).

- [ ] **Step 1: Teste que falha**

```ts
check("episódio de exemplo passa pela própria normalização", () => {
  const ep = normalizeEpisode(SAMPLE_STORY.episodes[1], 1, SAMPLE_STORY.characters);
  if (ep.quiz.length !== 5 || ep.lines.length !== 12) throw new Error("exemplo incompleto");
  if (!cleanStory(SAMPLE_STORY)) throw new Error("exemplo não passa no cleanStory");
});
```

- [ ] **Step 2:** `npm test` → falha. **Step 3:** escrever o exemplo. **Step 4:** `npm test` → passa.
- [ ] **Step 5:** Commit `Adiciona o episódio de exemplo das conversas`.

### Task 11: Página `/conversas`

**Files:**
- Create: `app/conversas/page.tsx`, `components/StoryPage.tsx`, `components/EpisodeView.tsx`, `components/StoryQuiz.tsx`
- Modify: `app/globals.css`, `app/sitemap.ts`, `components/Roadmap.tsx` (link "Conversas" no topo)

**Interfaces:**
- Consumes: Tasks 6–10; `Speak`, `SayIt`, `SpeedToggle` (exportar de `VocabularyPage` se ainda não for); `usePersistentState` com chaves `story` (`Story | null`), `lastPremiseId` (`string | null`), `profile`, `geminiApiKey`, `accessCode`, `myWords`; `useCloudSync` com `/api/story`.
- Produces: `StoryQuiz({ quiz, onDone }: { quiz: Question[]; onDone: (score: number) => void })`; `EpisodeView({ story, n, onSavePhrase }: { story: Story; n: number; onSavePhrase: (p: { en: string; pt: string; say: string }) => void })`.

- [ ] **Step 1:** `StoryPage`: sem história → cartão "Começar a história do mês" (gera `arc` com `pickPremise(lastPremiseId)`) e, sem acesso ao Gemini (`GET /api/plan` diz se há chave/código/conta), mostra `SAMPLE_STORY` com aviso de como liberar. Com história, usa `storyState(story, localDay())`: `needs-episode` gera o episódio (com "Tentar de novo" em erro, progresso intacto); `current` mostra episódio e questionário; `wait` mostra "Próximo episódio: amanhã"; `finished` oferece história nova. Botão "Começar outra história" com confirmação, que grava `lastPremiseId`.
- [ ] **Step 2:** `EpisodeView`: cada fala com nome, inglês, tradução (alternar), `say`, `<Speak text={line.en} />`; falas `"me"` destacadas com `<SayIt expected={line.en} />`; alternador "Só ouvir" (esconde inglês, tradução e `say`); frases-chave com "Guardar" que adiciona a `myWords` (com `say`, sem duplicar por `en` minúsculo); lista de episódios anteriores com nota, clicável para rever e refazer o questionário (refazer não altera `doneOn`).
- [ ] **Step 3:** `StoryQuiz`: uma pergunta por vez, correção na hora com `explain`, nota no fim; `onDone` grava `results[n] = { score, total: 5, doneOn: localDay() }` só na primeira vez.
- [ ] **Step 4:** `app/conversas/page.tsx` com `metadata` (título "Conversas em inglês: reuniões, calls e entrevistas", canonical `/conversas`); sitemap ganha `/conversas` (priority 0.8); `VocabNav` no topo com `active="conversas"`.
- [ ] **Step 5:** `grep -n "say=" components/EpisodeView.tsx` → nenhum `say={line.say}` nem `say={p.say}` em `Speak`.
- [ ] **Step 6:** `npx tsc --noEmit` e `npm test` passam. No navegador (desktop e 390px): começar história, ver episódio 1, ouvir uma fala, repetir uma fala sua, guardar frase, responder o quiz → "Próximo episódio: amanhã"; recarregar mantém tudo.
- [ ] **Step 7:** Commit `Adiciona a página de conversas com história de 30 dias`.

### Task 12: Fechamento

- [ ] **Step 1:** `npm test`, `npx tsc --noEmit`, `npm run build` → sem erros.
- [ ] **Step 2:** README: seção curta sobre `/conversas` (como funciona o dia a dia, o que precisa do Gemini) e `app_story` na lista de tabelas (se não feito na Task 9).
- [ ] **Step 3:** Commit e push na branch; atualizar a descrição do PR #1 com a nova parte.
