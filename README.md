# Trilha de Inglês

Gerador de roteiros de estudo de inglês, semana por semana, montados pela Claude a partir
do perfil de quem vai estudar: nível atual, nível desejado, dificuldades, objetivos pessoais
e profissionais, profissão, área de conhecimento e o que a pessoa gosta de assistir, ler,
ouvir e fazer no tempo livre.

Next.js (App Router, TypeScript), sem banco de dados: o plano, o progresso, os flashcards e
as anotações ficam no navegador de quem usa.

## O que o app faz

- **Perfil**: formulário com nível, dificuldades, objetivos, profissão, filmes, séries,
  animações, livros, músicas, hobbies, prazeres, restrições, minutos por dia, dias por
  semana e quantas semanas gerar.
- **Geração**: a Claude monta primeiro o esboço das semanas e depois desenvolve uma a uma,
  com tema, tópico gramatical ligado ao tema, 70 a 100 itens de vocabulário, recursos
  gratuitos, conteúdos para consumir e a atividade de cada dia.
- **Progresso geral** no topo: porcentagem e dias concluídos.
- **Atividade diária**: clique no dia para ver o que estudar, em qual recurso e por quantos
  minutos, com a frase do dia e a versão para dia cansado.
- **Checklist** de dias concluídos.
- **Flashcards** do vocabulário da semana, com filtro por grupo, inversão de direção e pilha
  "só as que faltam".
- **Anotações** por semana e por dia.
- **Plano de exemplo** já carregado, para a pessoa ver o formato antes de gerar o seu.

Regra de conteúdo: o plano só recomenda material **gratuito**. Cursos, assinaturas e
leituras graduadas pagas ficam de fora; séries e filmes entram como conteúdo opcional,
sempre com uma alternativa gratuita no mesmo dia.

## Chave da API

A chave **nunca** vai para o navegador. A geração passa por uma rota de servidor
(`app/api/plan/route.ts`), que lê a chave das variáveis de ambiente.

Há dois modos, e os dois podem conviver:

| Modo | Como funciona | Quando usar |
| --- | --- | --- |
| Chave do servidor | `ANTHROPIC_API_KEY` configurada no deploy | Uso próprio ou time fechado |
| Chave do visitante | A pessoa informa a chave dela, salva só no navegador dela | Site público |

Se o site for público e a chave do servidor estiver configurada, defina também
`APP_ACCESS_CODE`: sem o código, ninguém gera plano com a sua chave. Para desligar de vez a
opção de chave própria, use `ALLOW_VISITOR_KEY=false`.

### Configurar

1. Crie a chave em [console.anthropic.com](https://console.anthropic.com).
2. Local: copie `.env.example` para `.env.local` e preencha.
3. Vercel: **Settings → Environment Variables** → `ANTHROPIC_API_KEY` (e, se quiser,
   `APP_ACCESS_CODE`), para Production e Preview. Depois, **Redeploy**.

Variáveis disponíveis estão em `.env.example`. Nenhuma delas vai para o código do cliente.

## Rodando localmente

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # testes de prompt, parsing e normalização
npm run build
```

## Estrutura

```
app/
  page.tsx            carrega o plano de exemplo
  api/plan/route.ts   chama a API da Anthropic (esboço e semanas)
  globals.css         tokens de cor, tema claro e escuro
components/
  Roadmap.tsx         estado geral, progresso, abas
  ProfileForm.tsx     formulário do perfil
  Generator.tsx       geração passo a passo, com progresso
  DayDrawer.tsx       detalhe do dia + anotação
  Flashcards.tsx      cartões do vocabulário
  Notes.tsx           anotações da semana e dos dias
lib/
  prompt.ts           o prompt do projeto, montado com os dados do perfil
  profile.ts          tipos e campos do perfil
  normalize.ts        validação da resposta do modelo
  weeks.ts            tipos e cálculo das semanas
  weeks-*.json        conteúdo do plano de exemplo
scripts/test-logic.ts testes de prompt, parsing e normalização
```

O prompt vive em `lib/prompt.ts`: é ele que descreve o método (Comprehensible Input,
imersão ativa e passiva, shadowing, revisão espaçada), as regras de conteúdo gratuito e o
formato JSON que o app espera de volta. Mudou o prompt, mudou o plano gerado.
