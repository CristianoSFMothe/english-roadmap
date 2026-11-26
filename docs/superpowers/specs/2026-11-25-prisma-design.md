# Prisma como ORM e banco recriado do zero

Data: 2026-11-25 · Branch: `gemini-e-flashcards` · Etapa 1 de 3 (depois vêm as Lições e
a retirada do conteúdo do código)

## Intenção

Hoje 6 arquivos falam com o Postgres por SQL escrito à mão (`pg`), e o esquema do banco não
está no repositório: as tabelas foram criadas à mão no Supabase. O usuário quer o **Prisma
como ORM**, com o esquema e as migrações versionados, e o banco **recriado do zero** a
partir do Prisma.

O banco continua no **Supabase** (projeto `english-roadmap`, `opjwsfzygsefbqnxliby`), tanto
local quanto na Vercel. A ida para o CasaOS foi considerada e descartada: o login do Google,
o microfone e as vozes exigem `https`.

## Metas

- `prisma/schema.prisma` descreve todas as tabelas: as do login (Better Auth), as do app e
  as 3 das Lições (`docs/superpowers/specs/2026-11-25-licoes-design.md`).
- Uma migração inicial em `prisma/migrations/` cria tudo num banco vazio.
- Todo o acesso ao banco passa pelo Prisma Client: `lib/server-data.ts`, `lib/lessons.ts`,
  `lib/pron-store.ts`, `app/api/calendar/reminder/route.ts`, `app/api/health/route.ts`
  (via `lib/db.ts`) e o login (`lib/auth.ts`, com `prismaAdapter` do Better Auth).
- O banco do Supabase é apagado (schema `public`) e recriado pela migração.
- `npm test`, `npx tsc --noEmit` e `next build` passando; login e as páginas funcionando
  depois da troca.

## Fora do escopo

- Copiar os dados antigos para o banco novo. O usuário pediu para começar do zero. O backup
  das tabelas `app_*` (sem tokens) está em
  `/home/mothe/Documentos/backups/english-roadmap/2026-11-25-antes-do-prisma.json`, para
  reimportar o plano à mão se ele quiser.
- Mudar o formato dos dados (as colunas `jsonb` continuam `jsonb`, com `Json` no Prisma).
- Tirar o conteúdo do código (etapa 3).

## Abordagens

1. **Prisma para todo o acesso (escolhida).** Schema, migrações, Client em todas as
   consultas e adaptador Prisma no Better Auth. Atende o pedido de "ORM para gerenciar o
   banco".
2. **Prisma só para o schema e as migrações**, mantendo as consultas em `pg`. Menos
   mudança, mas fica com dois jeitos de falar com o banco, e o ORM não gerencia nada no dia
   a dia.

## Como funciona

### Versão e conexão

- Prisma 7 (estável atual, `prisma` + `@prisma/client` + `@prisma/adapter-pg`), com
  `prisma.config.ts`. O Client usa o driver adapter `pg`, que já está no projeto.
- **Duas URLs:** `DATABASE_URL` (Transaction pooler, porta 6543) para o app em tempo de
  execução, e `DIRECT_URL` (Session pooler, porta 5432) para as migrações, que não rodam
  pelo pooler de transação. `DIRECT_URL` vai para o `.env` local. Na Vercel, só
  `DATABASE_URL` é necessária (as migrações rodam da máquina local).
- TLS: segue o que a URL pedir (`sslmode`). Sem `sslmode`, liga TLS sem verificar o
  certificado para hosts que não são locais, como faz o `lib/db.ts` hoje (o Supabase
  exige).
- O Client é um só, guardado em `globalThis` fora de produção, como o `pool` de hoje.
  Pool pequeno (`max: 3`), por ser serverless.
- `lib/db.ts` passa a exportar `prisma`, `databaseConfigured` e `databaseStatus()`, com as
  mesmas mensagens de diagnóstico de hoje.
- `prisma generate` roda no `postinstall` e antes do `build`, para a Vercel gerar o Client.

### Schema

Os nomes de tabelas e colunas no banco ficam **iguais aos de hoje** (`@@map`/`@map`), para o
SQL que continua em `$queryRaw` e para a leitura no Supabase. Os modelos usam nomes em
camelCase no TypeScript.

Tabelas de hoje, com as mesmas colunas, padrões, chaves e índices:

- Login (Better Auth): `user`, `session`, `account`, `verification`. As colunas destas já
  estão em camelCase no banco (`userId`, `createdAt`…).
- App: `app_profile`, `app_plan`, `app_progress` (com `anki`), `app_calendar_export`,
  `app_lesson` (com `study`), `app_reminder`, `app_vocab`, `app_pron`.
- Índices de hoje: `app_plan (user_id, created_at desc)`, `app_lesson (user_id,
  lesson_date desc)`, `app_lesson (user_id, completed_at)`, `app_lesson unique (user_id,
  lesson_date)`, `app_calendar_export (user_id, created_at desc)`, `session (userId)`,
  `account (userId)`, `verification (identifier)`.
- Chaves estrangeiras para `user(id)` com `on delete cascade` nas mesmas tabelas de hoje.
  `app_reminder` hoje não tem: ganha (cascade), para não sobrar lixo ao apagar a conta.

Tabelas das Lições: as de `2026-11-25-licoes-design.md`, como modelos Prisma
(`WeekLesson`, `LessonPart`, `LessonChat`) e as colunas novas de `app_lesson`
(`week_lesson_id`, `part_idx`). Elas entram já na migração inicial, mesmo que o código das
Lições venha na etapa 2.

**RLS:** a migração inicial termina com `alter table … enable row level security` em todas
as tabelas, sem políticas, igual a hoje. O app acessa pelo servidor com o usuário dono do
banco, e a chave pública do Supabase não lê nada.

### Consultas

- Leituras e gravações simples viram chamadas do Client (`findUnique`, `upsert`,
  `updateMany`…).
- Continuam em SQL, por `prisma.$queryRaw` (com parâmetros, nunca concatenação):
  - `saveAnswer` e `setImprovements` (`lib/lessons.ts`): atualizam o JSON no próprio banco
    e têm a trava contra clique duplo (`results ? $3 and moreGenerated = false`);
  - `historico` e `errosRecentes`: usam `jsonb_array_length`, `jsonb_each`;
  - qualquer outra consulta de hoje que dependa de operadores `jsonb`.
- As funções exportadas mantêm a mesma assinatura e o mesmo retorno. As rotas não mudam.
- O tratamento de datas (`lesson_date` como `date`, ISO `YYYY-MM-DD` no retorno) continua
  igual.

### Recriar o banco

1. Conferir que o backup existe (feito).
2. Gerar o SQL da migração inicial sem precisar de banco
   (`prisma migrate diff --from-empty --to-schema …`), acrescentar o RLS e conferir o SQL.
3. **Com a confirmação do usuário na hora:** apagar todas as tabelas do schema `public`
   (as 12 de hoje, com `drop table … cascade`). O schema em si fica, para não mexer nas
   permissões padrão que o Supabase dá a `anon`, `authenticated` e `service_role`.
4. `prisma migrate deploy` com `DIRECT_URL`.
5. Conferir no Supabase as tabelas, os índices e o RLS.
6. Entrar de novo com o Google, gerar o plano e usar as páginas.

### Testes e verificação

- `npm test` e `npx tsc --noEmit` passando.
- `next build` passando (o Client gerado e o adaptador funcionando no build).
- Navegador pelo MCP `chrome-devtools`: `/api/health` com `banco: ok`, página inicial,
  vocabulário, preferências e Estudo do dia sem login. O login com o Google no perfil
  isolado depende do usuário. Se não der, pedir que ele entre e teste: salvar perfil, gerar
  plano, gerar lição, corrigir resposta, "Gerar 3 respostas".

## Decisões do usuário

- Prisma como ORM com Postgres.
- Continuar no Supabase.
- Apagar o banco todo e criar de novo, sem copiar dados. Backup antes (feito).

## Decisões minhas (o usuário pode corrigir)

- Prisma 7.10.1 (fixo; a tag `latest` do pacote `prisma` aponta para um 8.0 ainda em RC)
  com o adaptador `pg`, `DATABASE_URL` + `DIRECT_URL`. `DIRECT_URL` é a mesma URL do
  pooler na porta 5432 (Session pooler do Supabase), então dá para montá-la a partir da
  `DATABASE_URL` sem o usuário copiar nada.
- Apagar as tabelas, e não o schema `public`, para manter as permissões do Supabase.
- Nomes de tabelas e colunas iguais aos de hoje.
- As tabelas das Lições entram na migração inicial.
- `app_reminder` ganha a chave estrangeira para `user`.
- As consultas com `jsonb` e as travas continuam em SQL via `$queryRaw`.
- O backup não inclui `account`, `session` e `verification` (tokens do Google).
