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

## Login com Google e Google Agenda

O login é **opcional**: sem as variáveis abaixo o botão nem aparece e o app segue
guardando tudo no navegador. Com elas configuradas, quem entra com a conta Google tem
perfil, plano, progresso, anotações e flashcards salvos no Postgres e sincronizados
entre aparelhos, e pode jogar o plano no Google Agenda.

- Autenticação: [Better Auth](https://better-auth.com) com provedor Google apenas.
- Banco: Postgres (Supabase). Tabelas do Better Auth (`user`, `session`, `account`,
  `verification`) e do app (`app_profile`, `app_plan`, `app_progress`,
  `app_calendar_export`).
- Agenda: o token do Google fica em `account`, é renovado pelo refresh token quando
  expira e serve para criar um evento por dia de estudo, com as tarefas na descrição.

### Configurar

1. **Banco**: Supabase → Project Settings → Database → Connection string → **Transaction
   pooler** → `DATABASE_URL`.
2. **Google Cloud Console**: ative a **Google Calendar API**; na tela de permissão OAuth
   (tipo Externo) inclua os escopos `userinfo.email`, `userinfo.profile` e
   `calendar.events`, e cadastre seu e-mail em **Usuários de teste**; crie um **ID do
   cliente OAuth** do tipo aplicativo da Web com os redirects:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<seu-domínio>/api/auth/callback/google`
3. `BETTER_AUTH_SECRET`: `openssl rand -base64 32`.
4. `BETTER_AUTH_URL`: a URL pública do app.

### Deixar o app só para você

`ALLOWED_EMAILS` aceita uma lista separada por vírgula. Com ela preenchida:

- só essas contas Google viram usuário (as outras são recusadas no login);
- as rotas de dados e de agenda respondem 401 para qualquer outra conta;
- a chave da Anthropic do servidor só é usada por uma conta autorizada ou por quem
  souber o `APP_ACCESS_CODE`.

Quem chegar ao site sem conta continua vendo o plano de exemplo e pode gerar o próprio
plano com a **própria** chave da Anthropic, sem tocar na sua.

O escopo `calendar.events` é sensível para o Google: em modo **Testing** funciona para os
usuários de teste cadastrados; abrir ao público exige a verificação do Google.

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
