# Estudo do dia: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** página `/estudo-diario` com teoria, dicas e os 5 exercícios do dia, nessa ordem, gerados juntos pelo Gemini e avançando dia a dia, com link no menu.

**Architecture:** a lição diária existente (`app_lesson`, `/api/lesson`, `components/Lessons.tsx`) ganha um campo `study` (teoria e dicas), gerado na mesma chamada que as questões. O prompt recebe os assuntos dos últimos 7 dias, para avançar sem repetir. O componente `Lessons` sai da aba do plano e passa a viver na página nova, que lê o contexto do plano (semana atual) do navegador e da nuvem.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript 5.9, `pg` (Supabase Postgres), Gemini via `lib/gemini.ts`, `npm test`.

**Spec:** `docs/superpowers/specs/2026-11-23-estudo-do-dia-design.md`

**Depende de:** `docs/superpowers/plans/2026-11-23-pronuncia-em-todo-app.md` (usa `<Pron>`). Executar aquele plano antes.

## Global Constraints

- Textos em português do Brasil simples, sem jargão gramatical (ou com o jargão traduzido na mesma frase).
- Ordem da página: Teoria → Dicas → Exercícios → Lembrete diário.
- As 5 questões praticam exatamente o assunto da teoria. A mistura continua 2 fáceis, 2 médias e 1 difícil (`MIX`).
- `study.explanation`: de 2 a 4 parágrafos. `study.examples`: de 3 a 5. `study.tips`: de 2 a 4.
- `assuntosRecentes`: os últimos 7 `study.topic`.
- `maxTokens` da geração: 12000.
- `lib/lesson-normalize.ts` e `lib/lesson-prompt.ts` sem imports em tempo de execução.
- O `pron` do exemplo só é exibido (`<Pron text={en} explicit={pron} />`) e nunca vai para o `say` do `Speak`.
- Banco: `alter table app_lesson add column if not exists study jsonb;` só com a autorização explícita do usuário no momento (MCP do Supabase), ou rodado por ele.
- A página não entra no `sitemap.ts`.
- **Sem commits**, a menos que o usuário peça.
- Navegador: só o MCP `chrome-devtools`. Mobile por `emulate`.

## Review Focus

1. Uma lição antiga (`study = null`) aberta pelo backlog: a página mostra o aviso "Esta lição é anterior à teoria…" e os exercícios, sem quebrar. Verificação manual na Task 5 e tipo `Study | null` na Task 3.
2. A resposta do Gemini como array puro (formato antigo), sem `study`: a geração falha com "A IA não devolveu a teoria. Tente gerar de novo." e nada é salvo. Teste na Task 1.
3. A pessoa abre `/estudo-diario` direto, num aparelho sem plano no `localStorage`: com login, a semana vem de `/api/data`. Sem plano em lugar nenhum, vale a semana 1 do plano de exemplo. Verificação na Task 5.
4. Exemplo sem `pron` ou dica sem `wrong`/`right`: a seção aparece sem os campos opcionais. Teste de `normalizeStudy` na Task 1 e verificação visual na Task 4.
5. Cabeçalho com um botão a mais no celular (390 px): os botões quebram em linha sem sair da tela. Verificação na Task 6.

---

### Task 1: Tipo `Study` e `normalizeStudy`

**Files:**
- Modify: `lib/lesson-prompt.ts` (tipo)
- Modify: `lib/lesson-normalize.ts`
- Test: `scripts/test-logic.ts`

**Interfaces:**
- Produces:

```ts
export type StudyExample = { en: string; pt: string; pron?: string };
export type StudyTip = { text: string; wrong?: string; right?: string };
export type Study = {
  topic: string;
  goal: string;
  explanation: string[];
  pattern?: string;
  examples: StudyExample[];
  tips: StudyTip[];
};
```

  - `normalizeStudy(raw: unknown): Study` em `lib/lesson-normalize.ts`. Procura o objeto em `raw.study ?? raw.estudo ?? raw.teoria`. Aceita as chaves `topic|assunto`, `goal|objetivo`, `explanation|explicacao` (string vira array de 1 item), `pattern|formula`, `examples|exemplos` (`en|ingles`, `pt|traducao`, `pron|pronuncia|say`), `tips|dicas` (string ou `{ text|texto, wrong|errado, right|certo }`). Corta nos máximos das Global Constraints, descarta exemplo sem `en` e dica sem `text`. Sem `topic` ou sem nenhum parágrafo: `throw new Error("A IA não devolveu a teoria. Tente gerar de novo.")`.

- [ ] **Step 1: testes**

```ts
check("estudo completo normalizado", () => {
  const s = normalizeStudy({ study: { topic: "To be negativo", goal: "g", explanation: ["a", "b"], pattern: "P", examples: [{ en: "I am not", pt: "Eu não sou", pron: "ái ém nót" }, { pt: "sem en" }], tips: [{ text: "t", wrong: "I not am", right: "I am not" }, "dica solta"] } });
  if (s.topic !== "To be negativo" || s.examples.length !== 1 || s.tips.length !== 2) throw new Error(JSON.stringify(s));
  if (s.tips[1].text !== "dica solta" || s.examples[0].pron !== "ái ém nót") throw new Error("campos");
});
check("estudo com chaves em portugues e sem opcionais", () => {
  const s = normalizeStudy({ estudo: { assunto: "A", explicacao: "um parágrafo", exemplos: [{ ingles: "Hi", traducao: "Oi" }], dicas: [] } });
  if (s.explanation.length !== 1 || s.pattern !== undefined || s.examples[0].pron !== undefined) throw new Error("opcionais");
});
check("resposta sem teoria e recusada", () => {
  let threw = false;
  try { normalizeStudy(JSON.parse(licaoBruta(5))); } catch { threw = true; }
  if (!threw) throw new Error("deveria recusar array sem study");
});
check("questoes saem do objeto novo", () => {
  const qs = normalizeQuestions({ study: {}, questions: JSON.parse(licaoBruta(5)) }, ORDEM);
  if (qs.length !== TOTAL_QUESTOES) throw new Error("questions no objeto");
});
```

- [ ] **Step 2:** `npm test` deve falhar (`normalizeStudy` não existe).
- [ ] **Step 3:** implementar e importar no teste.
- [ ] **Step 4:** `npm test` deve passar.

---

### Task 2: Prompt com teoria, dicas e evolução diária

**Files:**
- Modify: `lib/lesson-prompt.ts` (`lessonSystemPrompt`, `lessonUserPrompt`)
- Test: `scripts/test-logic.ts`

**Interfaces:**
- Produces: `lessonUserPrompt(args: { level: string; tema?: string; gramatica?: string; vocabulario?: string[]; errosRecentes?: string[]; assuntosRecentes?: string[]; data: string }): string`. A resposta pedida passa a ser o objeto `{ "study": {...}, "questions": [...] }` do spec.

- [ ] **Step 1: testes**

```ts
check("prompt da licao pede teoria ligada as questoes", () => {
  const s = lessonSystemPrompt(sampleProfile);
  if (!/teoria/i.test(s) || !/jarg/i.test(s)) throw new Error("regras da teoria");
  const u = lessonUserPrompt({ level: "A1", data: "2026-11-23", gramatica: "to be", assuntosRecentes: ["To be afirmativo", "To be negativo"] });
  if (!u.includes('"study"') || !u.includes('"questions"')) throw new Error("formato");
  if (!u.includes("To be negativo") || !/não repita/i.test(u)) throw new Error("assuntos recentes");
  if (!u.includes('"pron"')) throw new Error("pronuncia nos exemplos");
});
```

- [ ] **Step 2:** `npm test` deve falhar.
- [ ] **Step 3:** no sistema, acrescentar as regras da teoria. Português simples. Jargão só com tradução na mesma frase. Exemplos do dia a dia e da profissão. `pron` no estilo de `PRON_STYLE`, com o texto do estilo colado no prompt, porque este arquivo não importa nada em tempo de execução. As 5 questões praticam o `topic`, e a difícil combina o assunto com o vocabulário da semana. No usuário: o bloco "Assuntos dos últimos dias (não repita, avance a partir deles dentro da gramática da semana)" quando houver, e o formato JSON novo com os limites das Global Constraints.
- [ ] **Step 4:** `npm test` deve passar, incluindo os testes antigos de prompt da lição.

---

### Task 3: Banco, `lib/lessons.ts` e rota

**Files:**
- Modify: `lib/lessons.ts`
- Modify: `app/api/lesson/route.ts` (`gerar`)

**Interfaces:**
- Consumes: `Study`, `normalizeStudy` (Task 1), `lessonUserPrompt` com `assuntosRecentes` (Task 2).
- Produces:
  - `Lesson.study: Study | null`
  - `createLesson(args: { userId; date; level; weekN; questions; study: Study }): Promise<Lesson>`: `study` no `insert` e no `on conflict do update`.
  - `assuntosRecentes(userId: string, limite = 7): Promise<string[]>`
  - O `GET /api/lesson` devolve as lições com `study`.

- [ ] **Step 1:** pedir ao usuário a autorização e executar `alter table app_lesson add column if not exists study jsonb;`
- [ ] **Step 2:** `study` em todos os `select`/`returning` de `lib/lessons.ts`, no `Row` e no `paraLesson` (`r.study ?? null`). Implementar `assuntosRecentes`.
- [ ] **Step 3:** em `gerar`: `Promise.all([errosRecentes(...), assuntosRecentes(...)])`, `maxTokens: 12000`, `const bruto = extractJson(texto)`, depois `normalizeStudy(bruto)` **antes** de `normalizeQuestions(bruto, ORDEM)`, e `createLesson({ ..., study })`.
- [ ] **Step 4:** `npm test` e `npx tsc --noEmit` sem erros.

---

### Task 4: Teoria e dicas no componente `Lessons`

**Files:**
- Create: `components/StudySections.tsx`
- Modify: `components/Lessons.tsx`
- Modify: `app/globals.css` (classes `study-*`)

**Interfaces:**
- Consumes: `Lesson.study` (Task 3), `<Pron>` (plano de pronúncia), `<Speak>` (`components/SpeechButtons.tsx`).
- Produces: `<StudySections study={Study | null} />`. Com `study`, renderiza a seção "Teoria" (`topic` como h2, `goal`, parágrafos, `pattern` em `.study-pattern` e exemplos `.study-example` com inglês, `<Speak text={en} showIpa={false} />`, `<Pron text={en} explicit={pron} />` e tradução) e a seção "Dicas" (lista. Com `wrong`/`right`: `.study-wrong` "✗ …" e `.study-right` "✓ …", e `right` com `<Pron>`). Com `null`, um único `<p className="study-old">Esta lição é anterior à teoria. As próximas já vêm com explicação e dicas.</p>`.

- [ ] **Step 1:** criar `StudySections` e usá-lo em `Lessons.tsx` logo antes de `<ol className="lesson-list">`, para a lição ativa (de hoje ou atrasada).
- [ ] **Step 2:** em `Lessons.tsx`, trocar o título "Lição do dia" por "Estudo do dia". O texto antes de gerar passa a ser: "Hoje você recebe uma explicação, dicas e 5 exercícios sobre um assunto da semana {week.n}." O botão vira "Gerar o estudo de hoje", e durante a geração aparece "Preparando teoria, dicas e exercícios… pode levar até um minuto."
- [ ] **Step 3:** CSS com as variáveis e os padrões de `.panel`/`.section-title`/`.tip` já existentes.
- [ ] **Step 4:** `npx tsc --noEmit` sem erros.

---

### Task 5: Página `/estudo-diario`

**Files:**
- Create: `app/estudo-diario/page.tsx`
- Create: `components/DailyStudyPage.tsx`

**Interfaces:**
- Consumes: `Lessons` (props `week`, `apiKey`, `accessCode`, `signedIn`, sem mudança), `AuthBar`, `useSession`, `usePersistentState`, `buildWeeks`, `GeneratedPlan` (`components/Generator.tsx`).
- Produces: `DailyStudyPage({ sample: RawWeek[]; authEnabled: boolean })`.

- [ ] **Step 1:** `page.tsx` no padrão de `app/vocabulario/page.tsx`: `metadata` com `title: "Estudo do dia: teoria, dicas e exercícios de inglês"`, uma `description` curta e `alternates.canonical: "/estudo-diario"`. Renderiza `<DailyStudyPage sample={sampleRawWeeks} authEnabled={authConfigured} />`.
- [ ] **Step 2:** `DailyStudyPage`:
  - estado de `plan`, `geminiApiKey`, `accessCode` e `week:${planId}` por `usePersistentState`, com as mesmas chaves e iniciais do `Roadmap`;
  - com `userId`, um `fetch("/api/data")` uma vez. Se vier `plan`, usar esse plano e `progress[planId].currentWeek` como semana, só em memória (não gravar por cima do `localStorage`, que é papel do `Roadmap`);
  - `week = weeks.find((w) => w.n === weekN) ?? weeks[0]`;
  - cabeçalho igual ao de `VocabularyPage`: marca "Trilha de inglês" / "Estudo do dia", links "Vocabulário", "Preferências", "← Voltar ao plano" e `<AuthBar enabled={authEnabled} syncing={false} canExport={false} onExport={() => {}} />`;
  - abaixo, a linha "Semana {n} · {theme}" e `<Lessons week={week} apiKey={apiKey} accessCode={accessCode} signedIn={Boolean(userId)} />`.
- [ ] **Step 3:** `npx tsc --noEmit` sem erros.
- [ ] **Step 4: verificação** (MCP `chrome-devtools`): `/estudo-diario` sem login mostra o aviso de entrar, e o console fica sem erros de hidratação.

---

### Task 6: Menu e aba antiga

**Files:**
- Modify: `components/Roadmap.tsx:209` (botão no cabeçalho) e `:471-478` (aba "lesson")
- Modify: `components/VocabularyPage.tsx:505` e `components/PreferencesPage.tsx:570` (botão no cabeçalho)
- Modify: `app/globals.css` (só se o cabeçalho quebrar mal no celular)

- [ ] **Step 1:** `<Link className="btn small primary" href="/estudo-diario">Estudo do dia</Link>` antes de "Preferências" no `Roadmap` e antes de "Vocabulário"/"Preferências" nos outros dois cabeçalhos. Nos dois últimos, usar `btn small`, sem `primary`.
- [ ] **Step 2:** a aba "Lição do dia" do `Roadmap` deixa de renderizar `<Lessons>` e passa a mostrar:

```tsx
<div className="panel">
  <section className="lesson-empty">
    <h2>Estudo do dia</h2>
    <p>A lição do dia agora tem teoria e dicas antes dos exercícios e fica numa página própria.</p>
    <Link className="btn primary" href="/estudo-diario">Abrir o estudo do dia</Link>
  </section>
</div>
```

  Remover o import de `Lessons` do `Roadmap`, se ele ficar sem uso.
- [ ] **Step 3:** `npm test` e `npx tsc --noEmit` sem erros.
- [ ] **Step 4: verificação final** (MCP `chrome-devtools`, desktop e mobile com `emulate` 390×844):
  - o botão "Estudo do dia" aparece e leva à página no plano, no vocabulário e nas preferências, sem o cabeçalho estourar no celular;
  - a aba "Lição do dia" mostra o cartão com o link;
  - com login e chave do Gemini disponíveis no perfil isolado: gerar o estudo de hoje e conferir Teoria → Dicas → Exercícios, a pronúncia nos exemplos, o áudio e a correção de uma resposta;
  - abrir uma lição antiga pelo backlog, se houver, e ver o aviso;
  - se não der para fazer login ou gerar no perfil isolado, dizer isso ao usuário e pedir que ele teste a geração.
