# Rever os estudos do dia — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Abrir qualquer estudo do dia já criado na página `/estudo-diario`, pelos dias de "Últimos dias" ou por `?data=AAAA-MM-DD`, só para leitura quando for um dia passado concluído.

**Architecture:** Regras puras (validar a data do endereço, decidir o modo só leitura, saber se há mais histórico) ficam em `lib/lesson-parts.ts` e são testadas em `scripts/test-logic.ts`. O `GET /api/lesson` ganha `?data=` (uma lição) e `?antes=` (página do histórico). A página do servidor lê o `?data=` e passa para `Lessons`, que abre o dia, troca o endereço com `history.replaceState` e esconde o que escreve no modo só leitura.

**Tech Stack:** Next.js 15 (App Router), React 19, Prisma 7, TypeScript; testes com `npm test` (node `--experimental-strip-types`).

**Spec:** `docs/superpowers/specs/2026-11-26-revisao-estudo-do-dia-design.md`

## Global Constraints

- Textos da interface em pt-BR com acentos; datas na tela no formato `dataCurta` (`24/11/26`).
- Rótulo do modo só leitura: `Só leitura · 24/11/26`. Não usar "Revisão" (é o nome da parte 6 das Lições).
- Botão do topo para sair de um dia passado: `Voltar para hoje`.
- Aviso de dia sem estudo: `Não há estudo salvo em 24/11/26.`; data inválida no endereço: `Não há estudo salvo nessa data.`
- Página do histórico: 14 dias. Botão: `Ver dias anteriores`.
- Sem mudanças no banco/schema do Prisma.
- Não rodar `npm run build` com o `next dev` ligado (a build derruba o dev server); para checar tipos use `npx tsc --noEmit`.

## Review Focus

- `?data=` com data impossível (`2026-02-30`), lixo (`abc`) ou vazio: a página não quebra, mostra o aviso de data inválida e abre hoje.
- `?data=` de hoje: modo normal (chat e "Gerar 3 respostas" ativos), não só leitura.
- Dia passado **não** concluído aberto por "Últimos dias" ou `?data=`: continua respondível.
- Cliques rápidos em dois dias: a resposta do primeiro pedido não pode sobrescrever o segundo dia aberto.
- Lição antiga sem `weekLessonId` (teoria salva na própria lição): abre em só leitura sem o chat e sem erro.

---

### Task 1: Regras puras do modo só leitura e do histórico

**Files:**
- Modify: `lib/lesson-parts.ts` (perto de `parseWeekParam`)
- Test: `scripts/test-logic.ts` (seção `// ---------- Lições ----------`, mais o import da linha 15)

**Interfaces:**
- Produces:
  - `parseDateParam(v: string | null | undefined): string | null`: devolve a data `AAAA-MM-DD` só se for uma data real do calendário; senão `null`.
  - `isReadOnlyLesson(lesson: { date: string; completedAt: string | null }, today: string): boolean`: `true` só quando `lesson.date < today` e `completedAt` não é nulo.
  - `HISTORY_PAGE = 14`
  - `hasMoreHistory(pageLength: number): boolean`: `pageLength >= HISTORY_PAGE`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
check("parseDateParam aceita só data real", () => {
  assert(parseDateParam("2026-11-24") === "2026-11-24", "válida");
  assert(parseDateParam("2028-02-29") === "2028-02-29", "bissexto");
  for (const v of ["2026-02-30", "2026-13-01", "abc", "", "2026-1-5", " 2026-11-24", null, undefined])
    assert(parseDateParam(v) === null, String(v));
});
check("só leitura: dia passado concluído", () => {
  const hoje = "2026-11-26";
  assert(isReadOnlyLesson({ date: "2026-11-24", completedAt: "2026-11-24T22:00:00Z" }, hoje), "passado concluído");
  assert(!isReadOnlyLesson({ date: "2026-11-24", completedAt: null }, hoje), "passado pendente");
  assert(!isReadOnlyLesson({ date: hoje, completedAt: "2026-11-26T10:00:00Z" }, hoje), "hoje concluído");
});
check("hasMoreHistory com página cheia", () => {
  assert(HISTORY_PAGE === 14, "14");
  assert(hasMoreHistory(14) && !hasMoreHistory(13) && !hasMoreHistory(0), "limites");
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test 2>&1 | tail -5`
Expected: erro de import (`parseDateParam` não exportado) ou as três checagens com `FALHA`.

- [ ] **Step 3: Implementar as quatro exportações em `lib/lesson-parts.ts`**

`parseDateParam`: regex `^\d{4}-\d{2}-\d{2}$` e depois confirmar com `new Date(\`${v}T12:00:00Z\`).toISOString().slice(0, 10) === v`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test 2>&1 | tail -3`
Expected: `Todos os testes passaram.`

- [ ] **Step 5: Commit**

```bash
git add lib/lesson-parts.ts scripts/test-logic.ts
git commit -m "feat(estudo): regras do modo só leitura e da página do histórico"
```

### Task 2: API devolve um dia e páginas do histórico

**Files:**
- Modify: `lib/lessons.ts:205-229` (`historico`)
- Modify: `app/api/lesson/route.ts` (`GET`)

**Interfaces:**
- Consumes: `parseDateParam`, `HISTORY_PAGE` (Task 1).
- Produces:
  - `historico(userId: string, dias = 7, antes?: string)`: com `antes`, filtra `lesson_date < ${antes}::date`; o resto igual.
  - `GET /api/lesson?data=AAAA-MM-DD` → `{ signedIn: true, date: hoje, lesson: Lesson | null }` (`lesson: null` também para data inválida).
  - `GET /api/lesson?antes=AAAA-MM-DD` → `{ signedIn: true, history: HistItem[] }` com até `HISTORY_PAGE` dias; `antes` inválido → 400 `{ error: "Data inválida." }`.
  - `GET /api/lesson` sem parâmetros: igual a hoje, usando `historico(user.id, HISTORY_PAGE)`.
  - Sem login, os três devolvem `{ signedIn: false, ... }` como hoje.

- [ ] **Step 1: Mudar `historico` e o `GET(request: Request)`**

Ler `new URL(request.url).searchParams`. `?data=` usa `getLesson(user.id, data)` (já completa a teoria da parte). `?data=` e `?antes=` respondem cedo, antes do bloco atual.

- [ ] **Step 2: Checar tipos e testes**

Run: `npx tsc --noEmit && npm test 2>&1 | tail -1`
Expected: sem saída do `tsc`; `Todos os testes passaram.`

- [ ] **Step 3: Checar sem login com o dev server ligado**

Run: `curl -s 'http://localhost:3000/api/lesson?data=2026-11-24'`
Expected: `{"signedIn":false,...}` (status 200, sem erro 500).

- [ ] **Step 4: Commit**

```bash
git add lib/lessons.ts app/api/lesson/route.ts
git commit -m "feat(estudo): GET /api/lesson aceita ?data= e ?antes="
```

### Task 3: Abrir o dia na página, `?data=` e modo só leitura

**Files:**
- Modify: `app/estudo-diario/page.tsx`
- Modify: `components/DailyStudyPage.tsx`
- Modify: `components/Lessons.tsx`
- Modify: `components/TeacherChat.tsx`
- Modify: `app/globals.css` (só se precisar de estilo para o rótulo e as etiquetas clicáveis)

**Interfaces:**
- Consumes: Task 1 (`parseDateParam`, `isReadOnlyLesson`, `hasMoreHistory`, `HISTORY_PAGE`) e Task 2 (as respostas do `GET`).
- Produces:
  - `app/estudo-diario/page.tsx`: `Page({ searchParams }: { searchParams: Promise<{ data?: string | string[] }> })`, que passa `dataInicial: string | null` (o valor cru, só a primeira posição se vier array) para `DailyStudyPage` e depois para `Lessons`.
  - `TeacherChat` ganha `readOnly?: boolean`: mostra as mensagens e esconde `.licao-ask`, o contador e a dica. Sem mensagens, mostra `Nenhuma dúvida foi enviada nesta parte.`

- [ ] **Step 1: `TeacherChat` com `readOnly`**

- [ ] **Step 2: Em `Lessons`, abrir um dia e manter o endereço**

- `mostrar(lesson: Lesson)`: `setAtiva`, limpa `respostas`, e chama `window.history.replaceState(null, "", url)`, com `?data=` quando `lesson.date !== hoje` e sem `?data=` quando é hoje.
- `abrirDia(date: string)`: `fetch('/api/lesson?data=' + date)`; com `lesson`, chama `mostrar`; sem `lesson`, mostra o aviso (`Não há estudo salvo em ${dataCurta(date)}.`) e deixa hoje. Guarde um contador num `useRef`: a resposta só vale se nenhum `abrirDia` mais novo tiver começado (Review Focus: cliques rápidos).
- Ao carregar (`carregar` terminou e `data.date` existe): se `dataInicial` vier preenchido, `parseDateParam(dataInicial)`; inválido → aviso `Não há estudo salvo nessa data.`; válido e diferente de hoje → `abrirDia`. Rodar uma vez só.
- Os chips de "Não completei…" passam a usar `mostrar(lesson)` no lugar de `setAtiva(lesson)`.
- O botão "Ir para hoje" vira **"Voltar para hoje"**: `setAtiva(data.today ?? null)` e tira o `?data=`. Não gera estudo; se hoje ainda não tem estudo, aparece a tela com "Gerar o estudo de hoje".
- O aviso usa a classe `lesson-note`, logo abaixo do título da seção.

- [ ] **Step 3: Modo só leitura**

`const somenteLeitura = ativa ? isReadOnlyLesson(ativa, hoje) : false`.
- Rótulo do topo: `Só leitura · ${dataCurta(ativa.date)}` no lugar de `Atrasada · …`.
- Esconder o bloco `.lesson-more` ("Gerar 3 respostas"). Questão sem resposta mostra `Sem resposta.` no lugar do `textarea`.
- `TeacherChat` recebe `readOnly={somenteLeitura}`.

- [ ] **Step 4: "Últimos dias" clicável e paginado**

- Cada `span.lesson-hist-day` vira `<button type="button">` com `aria-pressed={ativa?.date === h.date}` e `onClick={() => h.date === hoje ? voltarParaHoje() : void abrirDia(h.date)}`. O texto continua o mesmo.
- Estado `anteriores: HistItem[]` e `temMais: boolean` (começa com `hasMoreHistory(data.history.length)`). "Ver dias anteriores" busca `?antes=<data mais antiga mostrada>`, soma no fim da lista e atualiza `temMais` com `hasMoreHistory(resposta.history.length)`. O botão some quando `temMais` é falso.

- [ ] **Step 5: Tipos e testes**

Run: `npx tsc --noEmit && npm test 2>&1 | tail -1`
Expected: sem saída do `tsc`; `Todos os testes passaram.`

- [ ] **Step 6: Conferir no navegador (MCP `chrome-devtools`, com login, dev server na porta 3000)**

Em `http://localhost:3000/estudo-diario`:
1. Clicar num dia concluído de "Últimos dias": o endereço ganha `?data=…`, o topo mostra `Só leitura · …`, sem campo de resposta, sem "Gerar 3 respostas" e sem campo de enviar ao professor.
2. Recarregar a página com esse `?data=`: o mesmo dia abre.
3. `?data=2026-02-30` e `?data=abc`: aviso `Não há estudo salvo nessa data.` e hoje aberto, sem erro no console.
4. `?data=` de um dia sem estudo: aviso com a data.
5. `?data=` com a data de hoje e um dia pendente: os dois respondíveis.
6. "Voltar para hoje": o `?data=` some.
7. "Ver dias anteriores" aparece só se houver 14 dias na lista.
8. Emular viewport de celular (`emulate`): as etiquetas quebram linha sem estourar a tela.

- [ ] **Step 7: Commit**

```bash
git add app/estudo-diario/page.tsx components/DailyStudyPage.tsx components/Lessons.tsx components/TeacherChat.tsx app/globals.css
git commit -m "feat(estudo): rever dias anteriores só para leitura, com ?data= no endereço"
```
