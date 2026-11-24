# Verbos conjugados na aba "Verbos mais usados" de `/vocabulario`

## Intenção

A aba "Verbos mais usados" mostrava 64 verbos no formato `be · was/were · been`, sem
conjugação, e ficava confusa. A pessoa quer ver cada verbo conjugado numa tabela simples, no
estilo `I am = eu sou / eu estou`, dentro da própria página de vocabulário (sem página nova).

## O que a aba mostra

1. **Um select** com os 40 verbos principais. O padrão é **To Be**, e a escolha fica salva.
2. **Cabeçalho do verbo:** `to work = trabalhar`, pronúncia aproximada, áudio, passado e particípio.
3. **Uma tabela**, com uma linha por pessoa (I, you, he, she, it, we, they) e estas colunas:
   - Presente: `I work = eu trabalho`
   - Passado: `I worked = eu trabalhei`
   - Futuro: `I will work = eu vou trabalhar`
   - Negativa: `I do not work = eu não trabalho`
   - Contrações: `I don't work`, `I didn't work`, `I'll work`, `I won't work`.
     No to be: `I'm`, `I'm not`, `I wasn't`, `I'll be`.
   - Cada forma em inglês tem botão de áudio.
4. **Abaixo da tabela**, para o verbo escolhido: Frases, Perguntas, Palavras e expressões, e
   Conversa (um diálogo curto A/B). Cada linha no formato `inglês = português`, com áudio.
5. "Praticar com flashcards" continua funcionando, agora com as formas e as frases do verbo
   escolhido.

## Verbos (40)

be, have, do, go, get, make, know, think, take, see, come, want, like, need, say, tell, give,
find, work, live, study, learn, speak, understand, read, write, eat, drink, buy, pay, call, ask,
help, try, use, feel, leave, put, keep, start.

## Fora do escopo

- Página separada.
- Outros tempos verbais (present perfect, continuous). Tratados depois em [tempos verbais](2026-11-21-tempos-verbais-design.md).
- Mudar as outras abas.

## Antigoal

Ficar embolado de novo. A tabela não pode estourar a largura no celular: abaixo de 900px, cada
pessoa vira um bloco empilhado com o nome da coluna em cada linha.

## Como fica (decisões minhas)

- **`lib/verbs.ts`** (TS puro, testável):
  - O inglês da tabela sai de uma regra: 3ª pessoa `-s/-es/-ies`, `do/does not`, `did`, `will`,
    contrações. O passado irregular é informado por verbo.
  - O português é escrito à mão por verbo, em 4 formas (eu, você/ele/ela/isso, nós, eles), no
    presente e no passado. O futuro usa `vou/vai/vamos/vão` + infinitivo.
  - O to be é escrito à mão.
  - Frases, perguntas, palavras e conversa são escritas à mão.
- **`components/VerbsView.tsx`:** usado pela `VocabularyPage` quando a aba `verbos` está ativa.
  A categoria `verbos` continua em `CATEGORIES`, para a aba salva de quem já usa, mas sem a
  lista antiga de 64 itens.
- **Testes** em `scripts/test-logic.ts`: regra da 3ª pessoa, tabela do `work`, linha `I am` do
  to be, 40 verbos com todas as seções preenchidas e sem ids repetidos.
