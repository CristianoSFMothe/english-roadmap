# Explicação dos tempos verbais: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o quadro de explicação de cada tempo, na aba de verbos, mostra um resumo com exemplos completos (com o verbo escolhido, áudio, tradução e pronúncia) e, em "Ver explicação completa", quando usar, resposta curta, regras de escrita, terminações, palavras-sinal e erros comuns.

**Architecture:** conteúdo fixo novo em `TENSES` (`lib/verbs.ts`) e duas funções puras, `buildExamples` e `shortAnswers`, que montam as frases a partir do verbo escolhido. `TenseIntro` (`components/VerbsView.tsx`) passa a renderizar o resumo e um `<details>` cujo aberto/fechado fica salvo no navegador.

**Tech Stack:** Next.js 15, React 19, TypeScript 5.9, `npm test` (`scripts/test-logic.ts`).

**Spec:** `docs/superpowers/specs/2026-11-23-explicacao-dos-tempos-design.md`

## Global Constraints

- Português do Brasil simples, sem jargão (ou com o jargão traduzido na mesma frase).
- Todo `Line` fixo novo tem `en`, `pt` e `say`. O `say` segue o estilo de `lib/pronunciation.ts` ("rr" para o h, acento na sílaba forte, sílabas com hífen).
- `lib/verbs.ts` continua sem imports em tempo de execução.
- Quantidades por tempo: `when` de 2 a 4, `signals` 2 ou mais, `mistakes` de 2 a 4. `endings` só no Básico.
- O `say` da pronúncia nunca vai para o `say` do `Speak` (o `Speak` recebe só o inglês).
- **Sem commits**, a menos que o usuário peça.
- Navegador: só o MCP `chrome-devtools`. Mobile por `emulate`.

## Review Focus

1. To be no Básico: a negativa e a pergunta do passado e do futuro usam was/were e will be ("I was not", "Were you?", "I will not be"), e não "did". Teste na Task 1.
2. Verbo de estado num tempo contínuo (know + Present continuous): os exemplos usam `work`, como a explicação de hoje. Teste na Task 1.
3. Verbo irregular no passado (go → went): a negativa e a pergunta voltam para a base ("I did not go", "Did you go?"). Teste na Task 1.
4. Trocar de verbo ou de tempo com a explicação completa aberta: ela continua aberta. Verificação na Task 3.
5. Mobile (390 px): os três blocos do Básico e as linhas ✗/✓ quebram em linha sem estourar. Verificação na Task 3.

---

### Task 1: `buildExamples` e `shortAnswers`

**Files:**
- Modify: `lib/verbs.ts`
- Test: `scripts/test-logic.ts`

**Interfaces:**
- Produces:
  - `type ExampleBlock = { title?: string; affirmative: Line; negative: Line; question: Line }`
  - `buildExamples(verb: Verb, tense: TenseId): ExampleBlock[]`. Básico: 3 blocos com `title` "Presente", "Passado" e "Futuro". A afirmativa e a negativa usam `I`, e a pergunta usa `you`. Os outros tempos: 1 bloco, sem título, a partir de `buildTense`. Se `buildTense` der `null` (verbo de estado), usa `findVerb("work")`. Todo `Line` com `en`, `pt` e `say`. As formas longas ("did not") são as usadas, porque as contrações aparecem em "Resposta curta".
  - `shortAnswers(verb: Verb, tense: TenseId): Line[]`. Básico: 6 linhas (presente, passado e futuro, nessa ordem, com sim e não). Os outros tempos: 2 linhas. A resposta é sempre para "you" → "I". Exemplo de forma: `{ en: "Yes, I do.", pt: "Sim (eu trabalho).", say: "iés, ái dú" }`. Auxiliares: do/did/will. No to be: am/was/will. Continuous e going to: am. Past continuous: was. Present perfect: have. Would: would.

- [ ] **Step 1: testes**

```ts
check("exemplos do basico: presente, passado e futuro completos", () => {
  const work = findVerb("work");
  const b = buildExamples(work, "basic");
  if (b.length !== 3 || b[1].negative.en !== "I did not work" || b[1].question.en !== "Did you work?") throw new Error(JSON.stringify(b[1]));
  if (b[2].negative.en !== "I will not work") throw new Error("futuro");
  const go = buildExamples(findVerb("go"), "basic");
  if (go[1].affirmative.en !== "I went" || go[1].negative.en !== "I did not go") throw new Error("irregular");
  const be = buildExamples(findVerb("be"), "basic");
  if (be[1].negative.en !== "I was not" || be[1].question.en !== "Were you?" || be[2].negative.en !== "I will not be") throw new Error("to be");
});
check("exemplos de verbo de estado no continuo usam work", () => {
  const [b] = buildExamples(findVerb("know"), "presentContinuous");
  if (!b.affirmative.en.includes("working")) throw new Error(b.affirmative.en);
});
check("respostas curtas", () => {
  const w = shortAnswers(findVerb("work"), "basic").map((l) => l.en);
  if (!w.includes("Yes, I do.") || !w.includes("No, I didn't.") || w.length !== 6) throw new Error(w.join(" | "));
  if (!shortAnswers(findVerb("be"), "basic").some((l) => l.en === "Yes, I am.")) throw new Error("to be");
  if (shortAnswers(findVerb("work"), "presentPerfect")[1].en !== "No, I haven't.") throw new Error("perfect");
});
check("exemplos e respostas completos em todo verbo e tempo", () => {
  for (const v of VERBS)
    for (const t of TENSES) {
      const ls = [...buildExamples(v, t.id).flatMap((b) => [b.affirmative, b.negative, b.question]), ...shortAnswers(v, t.id)];
      const ruim = ls.find((l) => [l.en, l.pt, l.say ?? ""].some((x) => !x.trim() || /undefined/.test(x)));
      if (ruim) throw new Error(`${v.id} ${t.id}: ${JSON.stringify(ruim)}`);
    }
});
```

- [ ] **Step 2:** `npm test` deve falhar (`buildExamples` não existe).
- [ ] **Step 3:** implementar em `lib/verbs.ts`, reaproveitando `PERSON_SAY`, `WILL_SAY`, `FORM_SAY`, `PT_FUTURE` e as formas de `verb.table`/`verb.forms`. O português da negativa e da pergunta do passado vem de `ptPast` ("eu não trabalhei", "você trabalhou?"), e o do futuro de `PT_FUTURE` + `inf` ("eu não vou trabalhar", "você vai trabalhar?").
- [ ] **Step 4:** `npm test` deve passar.

---

### Task 2: Conteúdo novo de `TENSES`

**Files:**
- Modify: `lib/verbs.ts` (`TenseInfo` e os 6 itens de `TENSES`)
- Test: `scripts/test-logic.ts`

**Interfaces:**
- Produces: `TenseInfo` ganha `when: { text: string; ex: Line }[]`, `spelling: string[]`, `signals: { en: string; pt: string }[]`, `mistakes: { wrong: string; right: string; why: string }[]` e `endings?: { text: string; ex: Line }[]`.

- [ ] **Step 1: teste**

```ts
check("todo tempo tem explicacao completa", () => {
  for (const t of TENSES) {
    if (t.when.length < 2 || t.when.length > 4 || t.signals.length < 2 || t.mistakes.length < 2 || t.mistakes.length > 4) throw new Error(`${t.id}: quantidades`);
    const fixos = [...t.when.map((w) => w.ex), ...(t.endings ?? []).map((e) => e.ex)];
    if (fixos.some((l) => !l.en || !l.pt || !l.say)) throw new Error(`${t.id}: exemplo sem en/pt/say`);
    if (!t.spelling.length) throw new Error(`${t.id}: regras de escrita`);
  }
  const basic = TENSES[0];
  if (!basic.endings || basic.endings.length < 6) throw new Error("terminacoes -s e -ed");
});
```

- [ ] **Step 2:** `npm test` deve falhar.
- [ ] **Step 3:** escrever o conteúdo. `what` com 2 ou 3 frases. Conteúdo mínimo por tempo:
  - **Básico:** `when` com hábito/verdade, fato terminado e decisão na hora/previsão; `spelling` com -s/-es/-ies (works, watches, studies), have→has, do→does, go→goes, -ed (worked, liked, studied, stopped) e o aviso de que os irregulares (went, made, got) se decoram e estão na tabela; `endings` com -s como "s" (works), "z" (plays) e "iz" (watches), e -ed como "t" (worked), "d" (played) e "id" (wanted); `signals` com every day, usually, yesterday, last week, tomorrow, next year; `mistakes` com "He work" → "He works", "I didn't worked" → "I didn't work", "Do you went?" → "Did you go?" e "I will to work" → "I will work".
  - **Present continuous:** `spelling` com as regras de -ing (make→making, get→getting, die→dying); `mistakes` com "I working" → "I am working" e "I am knowing" → "I know" (verbo de estado).
  - **Past continuous:** `mistakes` com "They was" → "They were".
  - **Going to:** `mistakes` com "I going to work" → "I am going to work" e "I am going to working" → "I am going to work".
  - **Present perfect:** `spelling` com o particípio (regulares = passado; irregulares: gone, made, seen); `mistakes` com "I have worked yesterday" → "I worked yesterday" e "He have" → "He has".
  - **Would:** `mistakes` com "I would to like" → "I would like" e "If I would have" → "If I had".
- [ ] **Step 4:** `npm test` deve passar.

---

### Task 3: Quadro com resumo e "Ver explicação completa"

**Files:**
- Modify: `components/VerbsView.tsx:111-143` (`TenseIntro`) e o lugar onde ele é usado
- Modify: `app/globals.css` (bloco `.verb-intro`, linhas ~1801-1835 e ~1992)

**Interfaces:**
- Consumes: `buildExamples`, `shortAnswers` (Task 1), os campos novos de `TenseInfo` (Task 2), `Speak` (`components/SpeechButtons.tsx`).

- [ ] **Step 1:** `TenseIntro` recebe `{ info: TenseInfo; verb: Verb; tense: TenseId }`. Ele deixa de receber `rows`/`sample`, e o `introRows` de `VerbsView` sai, se ficar sem uso.
  - **Resumo:** O que é, Em português, Como montar (fórmula `info.how` + `buildExamples`: um bloco por título, cada frase em uma linha com `<span className="en">`, `<Speak text={en} showIpa={false} />`, `<span className="say">({say})</span>` e a tradução).
  - **`<details className="verb-intro-more">`** com `<summary>Ver explicação completa</summary>`: Quando usar (`text` + exemplo como no resumo), Resposta curta (`shortAnswers`, no mesmo formato), Regras de escrita (lista), Pronúncia das terminações (`endings`, só se houver), Palavras-sinal (`en` = `pt`, em linha), Erros comuns (`<span className="verb-wrong">✗ {wrong}</span> → <span className="verb-right">✓ {right}</span>` + `why`), Negativa e Pergunta (os textos de hoje) e Dica.
  - O `open` do `<details>` vem de `usePersistentState<boolean>("verbIntroOpen", false)`, atualizado no `onToggle`.
- [ ] **Step 2:** CSS no padrão do `.verb-intro` atual: `.verb-ex` (linha de exemplo com quebra no celular), `.verb-intro-more summary` (com cara de link/botão) e `.verb-wrong`/`.verb-right` com as cores de erro e acerto já usadas em `.say-result.bad`/`.ok`.
- [ ] **Step 3:** `npm test` e `npx tsc --noEmit` sem erros.
- [ ] **Step 4: verificação no navegador** (MCP `chrome-devtools`, `npm run dev`, `/vocabulario`, aba de verbos):
  - Básico com `work`: três blocos (presente, passado e futuro) com afirmativa, negativa e pergunta, cada uma com áudio, pronúncia e tradução;
  - abrir "Ver explicação completa", trocar para `go` e depois para Present perfect: continua aberta, e o conteúdo muda;
  - `know` + Present continuous: exemplos com `work` e o aviso de verbo de estado de hoje;
  - um botão de ouvir de um exemplo toca;
  - mobile (`emulate` 390×844): nada estoura;
  - console sem erros.
