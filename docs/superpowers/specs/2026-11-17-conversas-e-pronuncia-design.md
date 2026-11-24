# Conversas do mês, pronúncia aproximada e menu enxuto

Data: 2026-11-17 · Branch: `gemini-e-flashcards`

## Por que

A pessoa quer chegar bem preparada para **reuniões, entrevistas e calls** em inglês.
O `/vocabulario` já ensina palavras soltas; falta o treino em situação, com
continuidade, e a pronúncia escrita do jeito que se lê em português em todo o conteúdo.

## O que entra

Três partes, nesta ordem de entrega:

1. **Pronúncia aproximada em tudo** que aparece no `/vocabulario`.
2. **Menu enxuto**: três entradas no topo em vez de 13 chips.
3. **Conversas**: uma história de 30 dias, um episódio por dia, com diálogo, áudio,
   falas para repetir em voz alta e questionário.

### Metas

- Toda palavra, frase e fala de diálogo mostra a pronúncia aproximada (`say`).
- A história de um mês tem os mesmos personagens e fatos do começo ao fim, e o
  tom vai do apresentar-se até reuniões formais, calls com cliente e entrevista.
- Cada mês sorteia uma situação diferente.
- O episódio é curto o bastante para caber nos minutos diários do perfil.

### Fora do escopo (agora)

- Corrigir fala livre com IA (o microfone só compara com a frase esperada, como
  o `SayIt` já faz).
- Vozes diferentes por personagem (fica como melhoria; ver "Deixado para quem constrói").
- Exercícios de escrita, ranking, compartilhar a história.

### O que faria isto fracassar mesmo funcionando

- Personagens mudam de nome, cargo ou fatos de um dia para o outro.
- Inglês acima do nível do perfil (um A1 recebendo diálogo de B2).
- Questionário que dá para acertar sem ler o diálogo.
- Pronúncia escrita em estilos diferentes entre as listas fixas e o que o Gemini gera.
- Um episódio novo por dia virar obrigação: perder um dia não pode quebrar a história.

## Abordagens consideradas

| | Como funciona | Troca |
|---|---|---|
| **A. Enredo do mês + episódio do dia** (escolhida) | 1ª chamada gera o enredo (situação, personagens, resumo dos 30 episódios). Cada episódio é gerado quando a pessoa chega nele, com o enredo e o resumo do que já aconteceu. | Chamada curta por dia, pouco limite gasto, raramente cortada. Exige guardar o enredo. Mesmo padrão da geração do plano (esboço → semana). |
| B. Mês inteiro numa chamada | Uma resposta com 30 episódios. | A rota do plano já esbarra em `MAX_TOKENS`; alto risco de corte e de perder tudo numa falha. |
| C. Diálogos fixos à mão | Biblioteca estática. | Não é aleatório e repete depois do 1º mês. Usada só como **episódio de exemplo** para quem não pode gerar. |

Escolha: **A**, decidida por mim com aval da pessoa ("pode fazer conforme essas sugestões").

## Decisões tomadas

- **A pessoa é a protagonista**: nome, profissão, nível e objetivo profissional vêm do
  perfil salvo (`Profile`). Sem nome, o protagonista é "you" e os outros a chamam de "Alex".
- **Perder um dia não quebra nada**: a história espera. Libera no máximo **um episódio
  novo por dia de calendário**, e só depois do anterior ter o questionário respondido.
- **Ao terminar os 30**, oferece começar uma história nova com outra situação.
- **Conversas é uma página própria** (`/conversas`). O topo de `/vocabulario` e de
  `/conversas` mostra a mesma navegação: `Temas · Minhas palavras · Conversas`.

## Parte 1: pronúncia aproximada

> Substituída por `2026-11-23-pronuncia-em-todo-app-design.md`, que estende a pronúncia ao
> app inteiro (plano, flashcards, frase do dia e Estudo do dia) com cache do Gemini.

- `lib/vocabulary.ts`: preencher `say` nas 309 entradas sem ele (hoje 108 de 417 têm).
  Seguir o estilo atual: sílabas separadas por hífen, acento na sílaba tônica,
  nota curta entre parênteses só onde o som não existe em português
  ("th com a língua entre os dentes"). Inglês americano, como o arquivo já declara.
- Frases longas: pronúncia da frase inteira, com as palavras ligadas como se fala
  ("uát-chu-dú" para *what do you do*) só quando a ligação for o normal na fala.
- **Minhas palavras**: `MyWord` ganha `say?: string`. Ao salvar uma palavra sem `say`,
  o app pede ao Gemini (rota de conversas, etapa `say`, em lote). Sem acesso ao Gemini,
  o formulário tem um campo opcional para a pessoa escrever. Também editável depois.
  `cleanWords` passa a aceitar `say` (até 300 caracteres).
- Onde o `say` aparece: listas, flashcards (já mostra no verso via `categoryDeck`),
  Minhas palavras e cada fala dos diálogos.
- O prompt do Gemini leva 10 exemplos tirados do `lib/vocabulary.ts` para manter o estilo.

## Parte 2: menu

- Topo com três entradas: **Temas**, **Minhas palavras · N**, **Conversas**.
  As duas primeiras são abas em `/vocabulario`; Conversas é link para `/conversas`.
  Vira um componente compartilhado (ex.: `VocabNav`).
- **Temas** mostra uma grade compacta com os 11 temas + "Aprendidas". Escolher um tema
  abre a lista; um "← Todos os temas" volta para a grade. O tema aberto continua
  lembrado no navegador (`vocabTab`, como hoje).
- No celular, a grade fica em 2 colunas.

```
[ Temas ]  [ Minhas palavras · 1 ]  [ Conversas ]
┌───────────┬───────────┬───────────┬────────────┐
│ Alfabeto  │ Números   │ Dias e    │ Família    │
│ 35 itens  │ 52 itens  │ meses     │            │
├───────────┼───────────┼───────────┼────────────┤
│ Verbos    │ Expressões│ Perguntas │ Cores e    │
│           │           │           │ adjetivos  │
├───────────┼───────────┼───────────┼────────────┤
│ Casa e    │ Corpo e   │ Preposições│ Aprendidas│
│ cidade    │ roupas    │           │            │
└───────────┴───────────┴───────────┴────────────┘
```

## Parte 3: Conversas

### Tela

```
Conversas · "First month at Northwind Labs"          Dia 4 de 30
───────────────────────────────────────────────────────────────
Episódio 4 · Weekly sync with the client (call · formal)
Contexto: Na sua primeira call com a cliente Priya, você precisa ...

 Priya (cliente)   Good morning, everyone. Can you hear me?      🔊
                   Bom dia a todos. Vocês me ouvem?
                   gúd mór-nin, év-ri-uân. kén iú hír mí?
 ▶ Você            Yes, loud and clear. Thanks for joining.      🔊 🎤
                   ...
───────────────────────────────────────────────────────────────
Frases-chave do episódio  (vão para Minhas palavras com 1 clique)
Questionário · 5 perguntas                         [ Começar ]
───────────────────────────────────────────────────────────────
Episódios anteriores: 1 ✓ 4/5 · 2 ✓ 5/5 · 3 ✓ 3/5
Próximo episódio: amanhã
```

- Cada fala: inglês, tradução (pode ocultar), pronúncia aproximada, botão de ouvir.
- Falas da pessoa destacadas, com o botão de repetir em voz alta (`SayIt`).
- Modo "só ouvir": esconde texto e tradução para treinar listening.
- Frases-chave: 4 a 8 expressões úteis do episódio, com botão para guardar em
  Minhas palavras (já com `say`).
- Episódios anteriores ficam abertos para rever e refazer o questionário.

### Questionário

- 5 perguntas por episódio: 3 de **compreensão** ("O que a cliente pediu?") e
  2 de **situação** ("A reunião atrasou e você precisa interromper com educação.
  O que você diz?").
- Múltipla escolha, 4 opções, uma certa. Enunciado em português, opções de situação
  em inglês. Correção na hora, com explicação curta em português.
- Guarda acertos por episódio. Responder libera o próximo dia.

### Formato dos dados

```ts
type Character = { id: string; name: string; role: string; relation: string };

type ArcEpisode = {
  n: number;            // 1..30
  title: string;        // inglês
  kind: "apresentacao" | "conversa" | "reuniao" | "call" | "entrevista";
  formal: boolean;
  summary: string;      // português, 1-2 frases
  goal: string;         // o que a pessoa treina neste episódio
};

type Story = {
  id: string;
  createdAt: number;
  scenario: { title: string; setting: string /* pt */ };
  characters: Character[];   // 3 a 6, protagonista com id "me"
  arc: ArcEpisode[];         // 30
  episodes: Record<number, Episode>;
  results: Record<number, { score: number; total: number; doneOn: string /* AAAA-MM-DD */ }>;
};

type Line = { speaker: string /* Character.id */; en: string; pt: string; say: string };

type Question = {
  type: "compreensao" | "situacao";
  q: string;
  options: string[];   // 4
  answer: number;      // índice
  explain: string;     // pt
};

type Episode = {
  n: number;
  context: string;           // pt
  lines: Line[];             // 10 a 24, conforme minutos/dia e nível
  phrases: { en: string; pt: string; say: string }[];
  quiz: Question[];          // 5
  recap: string;             // pt, 2-3 frases; alimenta o próximo episódio
};
```

### Geração (Gemini)

- **Sorteio da situação no código**, não no modelo, para variar de verdade: lista de
  ~12 premissas (ex.: primeiro mês num time internacional, lançamento de produto com
  cliente estrangeiro, processo seletivo até a entrevista final, viagem a uma conferência,
  migração de sistema com fornecedor, mentoria de um colega novo). Sorteia uma que não
  tenha sido usada na história anterior.
- **Etapa `arc`**: perfil + premissa → cenário, personagens e os 30 `ArcEpisode`, em
  progressão: dias 1-5 apresentações e conversa informal, depois reuniões e calls,
  entrevista perto do fim, fechamento no 30.
- **Etapa `episode`**: perfil + cenário + personagens + `ArcEpisode` do dia + `recap`
  dos 3 últimos episódios + resumo de uma linha dos anteriores → `Episode`.
- **Etapa `say`**: lista de palavras/frases → pronúncia de cada uma (para Minhas palavras).
- Nível: o diálogo usa o nível atual do perfil e sobe aos poucos rumo ao nível desejado
  ao longo dos 30 dias.
- Normalização com o mesmo cuidado do plano (`extractJson` + funções `normalizeArc`,
  `normalizeEpisode`): descarta falas sem `speaker` conhecido, corta excessos, garante
  4 opções e `answer` válido; se o questionário vier inválido, falha a geração em vez
  de mostrar algo quebrado.

### Rota e acesso

- `POST /api/conversa` com `stage: "arc" | "episode" | "say"`.
- Mesma regra de chave da rota do plano: chave do visitante, ou a do servidor para
  conta autorizada ou código de acesso. Extrair `callGemini` e a escolha da chave da
  rota do plano para `lib/gemini.ts` e usar nas duas rotas.
- Sem acesso ao Gemini: a página mostra o **episódio de exemplo** fixo (escrito à mão,
  com questionário) e explica como liberar a geração.

### Onde fica salvo

- Navegador: `usePersistentState("story", …)`, como o resto do app.
- Conta logada: tabela nova **`app_story`** (`user_id text primary key`, `data jsonb`,
  `updated_at timestamptz`, RLS ligado como as outras), rotas `GET/PUT /api/story`
  com o mesmo padrão de `/api/vocab` (o servidor vale ao entrar; se vazio, sobe o local).
  Validação no servidor limita tamanho e formato antes de gravar.
- A tabela precisa ser criada no Supabase antes do deploy (o repositório não tem migrations).
  Atualizar a lista de tabelas no README.

## Testes

Em `scripts/test-logic.ts`:

- `normalizeArc` e `normalizeEpisode` com respostas boas, com campos faltando e com lixo.
- Regra de liberação (função pura, ex.: `nextEpisodeState(story, hoje)`):
  não libera dois no mesmo dia; não libera sem questionário respondido; pular dias
  não pula episódios; dia 30 concluído oferece história nova.
- Sorteio não repete a premissa da história anterior.

## Detalhes decididos na revisão (chamadas minhas)

- **"Dia"** é a data local do navegador (`AAAA-MM-DD`), não UTC.
- **Falha na geração** (rede, limite do Gemini, JSON inválido): mostra o erro com
  "Tentar de novo"; nada muda no progresso.
- **Perfil e chave**: `/conversas` lê o mesmo perfil e as mesmas chave/código de acesso
  que o gerador do plano já guarda, sem pedir de novo.
- **Recomeçar no meio do mês**: botão "Começar outra história", com confirmação; a
  história atual é substituída (sem histórico de histórias antigas, além da premissa
  usada, para o sorteio não repetir).
- **Criar a tabela `app_story`** no Supabase é feito com aviso à pessoa antes.

## Deixado para quem constrói

- Texto exato dos prompts, desde que siga as regras acima.
- Visual fino da grade de temas e da tela de conversas, dentro do estilo de `globals.css`.
- Vozes diferentes por personagem com o Kokoro (tem várias vozes): fazer se for barato,
  sem atrasar o resto.
- Quantas falas por episódio para cada faixa de minutos/dia.
