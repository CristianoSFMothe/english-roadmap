# Tempos verbais e pronúncia nas frases — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seletor de tempo verbal com explicação antes da tabela, coluna Pessoa de volta e pronúncia aproximada em todas as frases da aba de verbos.

**Architecture:** O inglês, o português e a pronúncia de cada tempo saem por regra em `lib/verbs.ts`
(sem imports, roda direto no Node). A pronúncia das frases vem de um dicionário por palavra em
`lib/pronunciation.ts`, com correção por frase para palavras ambíguas. `components/VerbsView.tsx` junta tudo.

**Tech Stack:** Next.js (App Router), React, TypeScript, testes em `scripts/test-logic.ts` (`npm test`).

**Spec:** `docs/superpowers/specs/2026-11-21-tempos-verbais-design.md`

## Global Constraints

- Pronúncia escrita com sons do português, "rr" para o h, mesmo padrão já usado (`rrév`, `uârk`).
- `lib/verbs.ts` e `lib/pronunciation.ts` sem imports (o `npm test` roda os arquivos no Node).
- Básico mantém o conteúdo e os ids de flashcard atuais.
- Verbos de estado (be, know, want, need, like, understand, see, have) não geram tabela contínua.

## Review Focus

- Verbo de estado no Present/Past continuous: mostrar aviso, nunca "I am knowing".
- "read" no passado ("I read a good book last month") deve sair `réd`, não `ríd`.
- Números e nomes nas frases (30, 10:05, São Paulo, M-A-R-I-A) precisam de pronúncia.
- Trocar de verbo com um tempo selecionado mantém o tempo e não quebra flashcards.
- Celular (390px): sem rolagem horizontal com os dois seletores e o bloco de explicação.

---

### Task 1: Pronúncia das frases

**Files:** Create `lib/pronunciation.ts` · Test `scripts/test-logic.ts`

**Interfaces:**
- Produces: `sayPhrase(en: string): string | undefined` — tira o prefixo `A: ` / `B: `, pronuncia palavra por
  palavra, mantém `?`, `/` e `!`; devolve `undefined` se faltar alguma palavra no dicionário.

- [ ] Teste: `sayPhrase("I live in São Paulo.")`, `sayPhrase("I read a good book last month.")` contém `réd`;
      toda linha de `phrases/questions/words/conversation` de todos os verbos tem `sayPhrase` definido.
- [ ] Rodar `npm test` — falha.
- [ ] Implementar `WORD_SAY` (528 palavras) + `LINE_SAY` (correções por frase) + `sayPhrase`.
- [ ] Rodar `npm test` — passa.

### Task 2: Tempos verbais em `lib/verbs.ts`

**Interfaces:**
- Produces: `type TenseId = "basic" | "presentContinuous" | "pastContinuous" | "goingTo" | "presentPerfect" | "would"`;
  `TENSES: TenseInfo[]` (`id, name, label, what, pt, how, negative, question, tip`);
  `type TenseRow = { person; affirmative: Line; negative: Line; question: Line; short: string[]; shortSay: string[] }`;
  `buildTense(verb: Verb, tense: Exclude<TenseId, "basic">): TenseRow[] | null`;
  `statNotice(verb, tense): string`; `ingForm(base)`, `ptGerund(inf)`, `ptConditional(inf): PtForms`; `STATIVE`.
  `Verb.forms` com base/ing/particípio (inglês e pronúncia) e variantes do português (`{ inf, past }[]`; to be = ser e estar).

- [ ] Testes: ingForm (working, making, getting, putting, seeing, studying, using, coming, leaving, calling, eating,
      starting); `work` em cada tempo (ex.: "He is working (rrí íz uâr-king)" = "ele está trabalhando";
      "She has worked" = "ela já trabalhou"; "They would work" = "eles trabalhariam"); `make` → "eu faria";
      to be → "eu vou ser / eu vou estar", "I have been" = "eu já fui / eu já estive";
      `buildTense(know, "presentContinuous") === null`, `think` não; todo verbo × tempo sem célula vazia.
- [ ] Rodar `npm test` — falha. Implementar. Rodar — passa.

### Task 3: Tela

**Files:** `components/VerbsView.tsx`, `app/globals.css`

- [ ] Coluna Pessoa de volta (I / eu) no Básico e nos tempos; estilo do `tbody th` restaurado (desktop e celular).
- [ ] Seletor "Escolha o tempo" ao lado do verbo (estado local, padrão "basic").
- [ ] Bloco de explicação antes da tabela: O que é · Em português · Como montar (+3 exemplos do verbo) ·
      Negativa · Pergunta · Dica. Verbo de estado no contínuo: bloco + aviso, sem tabela.
- [ ] Flashcards do tempo selecionado (id com o tempo; Básico mantém ids atuais) e pronúncia nos cartões das frases.
- [ ] Frases/Perguntas/Palavras/Conversa com `(pronúncia)` ao lado do inglês.
- [ ] `npx tsc --noEmit`, `npm test`, conferir no navegador (desktop e 390px).
