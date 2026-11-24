# Explicação mais detalhada dos tempos verbais

Data: 2026-11-23 · Branch: `gemini-e-flashcards` · Tamanho: mudança pequena (design curto)

Estende `2026-11-21-tempos-verbais-design.md` (quadro de explicação antes da tabela).

## Intenção

O quadro de explicação de cada tempo, na aba de verbos de `/vocabulario`, é curto demais
para quem começa do zero. O usuário pediu "mais explicação, mais detalhada", principalmente
nos verbos.

## Problemas encontrados no quadro atual (`components/VerbsView.tsx:111`, `lib/verbs.ts:1429`)

- No Básico, "Como montar" explica presente, passado e futuro, mas os exemplos só mostram
  o presente ("I am · He is · They are").
- Os exemplos não têm tradução, pronúncia nem botão de ouvir.
- Faltam: quando usar (com situações), resposta curta, regras de escrita, pronúncia das
  terminações, palavras-sinal e erros comuns.

## Abordagem

Layout escolhido pelo usuário: **A) resumo + "Ver explicação completa"**. Descartado: B)
tudo aberto, que empurra a tabela para longe a cada troca de verbo.

O conteúdo fica fixo em `lib/verbs.ts` (no padrão de hoje, escrito à mão e revisado). Os
exemplos de montagem saem do verbo escolhido. Não há IA nesta parte.

## O que muda

**Sempre visível** (o resumo):
- O que é, um pouco mais explicado (2 ou 3 frases).
- Em português.
- Como montar: a fórmula e as frases **afirmativa, negativa e pergunta** completas, com o
  verbo escolhido, cada uma com 🔊, tradução e pronúncia. No Básico, isso vem em três
  blocos: presente, passado e futuro.

**Em "Ver explicação completa"** (`<details>`, que lembra se ficou aberto):
- Quando usar: de 2 a 4 situações, cada uma com uma frase-exemplo fixa (🔊, tradução e
  pronúncia).
- Resposta curta: Yes, I do / No, I don't (e o equivalente de cada tempo), montada a
  partir do verbo escolhido.
- Regras de escrita: -s/-es/-ies e verbos irregulares (Básico), -ed e passado irregular
  (Básico), -ing (contínuos e going to) e particípio (present perfect).
- Pronúncia das terminações, só no Básico: -s ("s", "z", "iz") e -ed ("t", "d", "id"),
  com exemplos.
- Palavras-sinal: as palavras que costumam acompanhar o tempo, com tradução.
- Erros comuns de quem fala português: de 2 a 4 por tempo, no formato ✗ errado → ✓ certo +
  porquê em uma frase.
- Dica (a de hoje).

## Dados (`lib/verbs.ts`)

- `TenseInfo` ganha `when: { text: string; ex: Line }[]`, `spelling: string[]`,
  `signals: { en: string; pt: string }[]`, `mistakes: { wrong: string; right: string; why: string }[]`
  e, só no Básico, `endings: { text: string; ex: Line }[]`.
- Funções novas, puras e testáveis:
  - `buildExamples(verb, tense)`: devolve os blocos de exemplo, cada um com
    `{ title?: string; affirmative: Line; negative: Line; question: Line }`. Básico = 3 blocos
    (presente, passado, futuro); os outros tempos = 1 bloco. Para verbos de estado no
    contínuo, usa `work`, como a explicação já faz.
  - `shortAnswers(verb, tense)`: devolve `Line[]` com resposta curta positiva e negativa
    (no Básico, uma de cada para presente, passado e futuro; o to be usa am/was/will).
- Todo `Line` fixo novo (situações e terminações) tem `say`, escrito à mão no estilo de
  `lib/pronunciation.ts`.

## Testes

- Para todo verbo e todo tempo, `buildExamples` e `shortAnswers` saem completos (sem texto
  vazio nem "undefined", e com `say`).
- Todo `TenseInfo` tem pelo menos 2 itens em `when`, `signals` e `mistakes`, e todo `ex` tem
  `en`, `pt` e `say`.
- Casos fixos: `shortAnswers(work, "basic")` contém "Yes, I do." e "No, I didn't.";
  `shortAnswers(be, "basic")` contém "Yes, I am."; `buildExamples(work, "basic")[1].negative.en === "I did not work"`.

## Verificação

Navegador só pelo MCP `chrome-devtools`, em desktop e mobile (`emulate` 390×844): o resumo
aparece; "Ver explicação completa" abre e continua aberto ao trocar de verbo e de tempo; o
Básico mostra presente, passado e futuro; os botões de ouvir funcionam; nada estoura no
celular.

## Decisões minhas (o usuário pode corrigir)

- O "aberto/fechado" da explicação completa fica salvo no navegador.
- As frases de "Quando usar" são fixas, uma por situação. Só os exemplos de montagem e as
  respostas curtas usam o verbo escolhido.
- Este trabalho é independente dos planos de pronúncia e do Estudo do dia e pode ser feito
  antes deles.
