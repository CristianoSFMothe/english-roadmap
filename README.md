# Trilha de Inglês QA — A1 → B1

Roteiro interativo de estudos de inglês para QA/SDET, organizado semana por semana.
Construído em Next.js (App Router, TypeScript, export estático).

## O que o app faz

- **Progresso geral** no topo: porcentagem e dias concluídos de 84.
- **12 semanas** (fase 1 do plano), cada uma com tema principal, tópico gramatical
  ligado ao tema, 70 a 100 itens de vocabulário, recursos verificados, conteúdos
  para consumir e a meta da semana.
- **Atividade diária**: clique no dia para abrir o que estudar, em qual recurso e
  por quantos minutos, com a frase do dia e a versão "dia cansado".
- **Checklist**: marque dias concluídos; o progresso atualiza no topo.
- **Flashcards** do vocabulário da semana, com filtro por grupo, inversão de
  direção (inglês → português e vice-versa) e pilha "só as que faltam".
- **Anotações** por semana e por dia.

Progresso, flashcards marcados e anotações ficam no `localStorage` do navegador.

## Rodando localmente

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # gera a versão estática em out/
```

## Estrutura

```
app/            layout, página e CSS (tokens de cor, tema claro e escuro)
components/     Roadmap (estado e progresso), DayDrawer, Flashcards, Notes
lib/            conteúdo das semanas (JSON), tipos e persistência
```

O conteúdo vive em `lib/weeks-a.json`, `weeks-b.json` e `weeks-c.json`
(4 semanas cada). Para acrescentar as semanas 13 em diante, basta adicionar
objetos no mesmo formato: `lib/content.ts` monta a lista e recalcula os totais.
