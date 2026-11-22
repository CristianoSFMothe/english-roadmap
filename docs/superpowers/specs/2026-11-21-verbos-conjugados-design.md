# Página de verbos conjugados (`/verbos`)

## Intenção

A aba "Verbos mais usados" em `/vocabulario` mostra só a lista `be · was/were · been` e fica confusa.
A pessoa quer ver cada verbo em uso, no formato simples `I am = eu sou / eu estou`, para entender
como montar frases. O pedido é uma **página própria**, com **cada verbo tendo suas abas**, e cada aba
mostrando uma tabela.

## Objetivo

- Página nova `/verbos`.
- No topo, a escolha do verbo (botões, um por verbo).
- Para o verbo escolhido, uma fileira de abas. Cada aba mostra **uma tabela simples**:

| Aba | O que a tabela mostra |
|-----|------------------------|
| Presente | afirmativa por pessoa (I, you, he, she, it, we, they): forma completa, forma curta, português |
| Negativa | negativa do presente: completa (`I am not`), curta (`I'm not`), português |
| Perguntas | pergunta, resposta curta sim, resposta curta não, português |
| Passado | afirmativa, negativa (completa e curta) e pergunta, por pessoa |
| Futuro | `will` (completa e curta: `I will` / `I'll`, `won't`) e `going to` |
| Variações | usos próprios do verbo (to be: `there is/are`, `there was/were`, idade, tempo, lugar; to have: `have got`, `has`; to do: auxiliar; can: `could`, `be able to`...) |
| Frases | 6 a 10 frases do dia a dia com o verbo, misturando os tempos |

- Toda célula em inglês tem o botão de áudio (`Speak`), como no resto do app.
- Tabela legível no celular: na tela estreita, cada linha vira um bloco empilhado
  (`I am · I'm = eu sou / eu estou`), sem rolagem horizontal.
- A tabela de cada aba pode virar flashcards ("Praticar com flashcards"), como em `/vocabulario`.

## Ligação com o resto do app

- Em `/vocabulario`, a aba "Verbos mais usados" deixa de mostrar a lista confusa e passa a ter um
  resumo curto (`go = ir · passado: went`) e um botão "Ver verbos conjugados →" para `/verbos`.
- `/verbos` entra no `app/sitemap.ts` e ganha `metadata` própria, como `/vocabulario`.
- A página `/verbos` tem um link de volta para `/vocabulario`.

## Fora do escopo

- Exercícios novos, correção por IA ou novos tempos verbais (present perfect, continuous etc.).
- Mudar as outras abas de `/vocabulario`.

## Antigoal

Voltar a ficar embolado: nada de linhas com `·` empilhados nem tabela larga que estoure no celular.
Uma ideia por linha.

## Verbos

`to be`, `to have`, `to do`, `to go`, `can`, `to like`, `to want`, `to need`, `to work`,
`to live`, `to get`, `to make`, `to know`, `to see`, `to come`, `to say`.
São 16 verbos, os mais frequentes para iniciante. A lista é minha escolha e pode mudar.

## Abordagens consideradas

- **A. Um verbo por vez, com blocos por tempo (escolhida e refinada).** A pessoa pediu que isso fosse
  uma página separada, com abas por verbo e tabela em cada aba.
- B. Aba só do to be. Rápida, mas resolve um verbo só.
- C. Todos os verbos conjugados numa página longa. A rolagem enorme é o problema atual.

## Como fica (decisões minhas, para conferir)

- **Dados.** Novo `lib/verbs.ts`. Os verbos comuns têm a conjugação gerada por regra (terceira
  pessoa `-s/-es/-ies`, `do/does`, `did`, `will`, `going to`), com o passado irregular informado.
  `be`, `can`, `have` e `do` são escritos à mão. O português é escrito à mão por verbo, com uma forma
  por pessoa (`ele trabalha`), porque não dá para gerar o português de forma confiável. As
  variações e as frases são sempre escritas à mão.
- **Tela.** `app/verbos/page.tsx` (metadata) e `components/VerbsPage.tsx` (cliente). O verbo e a aba
  escolhidos ficam salvos como em `/vocabulario` (`usePersistentState`). As tabelas usam um `<table>`
  semântico com CSS que empilha as linhas abaixo de 640px.
- **Pronúncia escrita (`say`).** Na forma base de cada verbo e nas formas do presente e do passado do
  to be. O áudio cobre o resto.
- **Testes.** `scripts/test-logic.ts` ganha verificações da regra de conjugação: `he works`,
  `she studies`, `he goes`, `he has`, `I didn't work`, `Does she like...?`, `I'll work`,
  `I'm going to work`.
