# Tempos verbais na página de verbos — design

Data: 2026-11-21 · Status: aguardando aprovação
Estende: [verbos conjugados](2026-11-21-verbos-conjugados-design.md), que deixou
"outros tempos verbais" fora do escopo.

## Intenção

O site ensina inglês a brasileiros que começam do zero. A aba "Verbos mais usados"
(`/vocabulario`) hoje mostra, para cada um dos 40 verbos, uma tabela "básica":
presente, passado, futuro (will), negativa, pergunta e contrações, com pronúncia
aproximada e tradução.

O pedido: ao abrir um verbo, a pessoa continua vendo exatamente essa tabela. Um botão
dá acesso aos outros tempos verbais, um de cada vez, cada um explicado em português
simples e ligado ao tempo equivalente do português (presente, pretérito perfeito,
imperfeito, futuro do presente, futuro do pretérito).

## Objetivos

- Tabela básica continua sendo o que aparece primeiro, sem mudança de conteúdo.
- A coluna **Pessoa** volta (I / eu, you / você…), em todas as tabelas.
- Ao lado de "Escolha o verbo" fica **"Escolha o tempo"**, sempre visível, com
  "Básico" selecionado. Trocar o tempo troca a tabela.
- **Antes da tabela**, um bloco de explicação do tempo escolhido (ver abaixo).
- Cada tempo mostra a explicação e a tabela das 7 pessoas.
- Toda forma em inglês tem pronúncia aproximada entre parênteses e tradução.
- Flashcards da página praticam o tempo que está selecionado.

## Não objetivos

- Não ensinar todos os 12 tempos do inglês (past perfect, future perfect, perfect
  continuous ficam de fora).
- Não comparar dois tempos lado a lado.
- Não mudar o conteúdo das seções Frases / Perguntas / Palavras / Conversa. Pedido posterior: elas ganham pronúncia aproximada ao lado de cada frase (dicionário por palavra em `lib/pronunciation.ts`).

## Anti-objetivos (seria fracasso mesmo funcionando)

- Ensinar inglês errado gerado por regra, como "I am knowing" ou "I am wanting".
- Tela que assusta o iniciante com tudo aberto de uma vez.
- Tradução em português artificial ("isso está sabendo").

## Tempos incluídos (ordem no seletor)

| Botão | Português equivalente | Quando usar (texto da tela) |
|---|---|---|
| Básico (padrão) | presente, pretérito perfeito, futuro | Tabela atual |
| Present continuous | presente + gerúndio: estou trabalhando | Algo acontecendo agora |
| Past continuous | pretérito imperfeito: eu estava trabalhando / trabalhava | Algo que estava acontecendo num momento do passado |
| Going to | futuro planejado: vou trabalhar | Plano ou intenção já decidida |
| Present perfect | "já" + pretérito perfeito: eu já trabalhei | Experiência de vida ou algo do passado que importa agora, sem dizer quando |
| Would | futuro do pretérito: eu trabalharia | Hipótese, condição ou pedido educado |

O simple present, simple past e will continuam no Básico. O quadro de explicação do
Básico diz quais tempos do português ele cobre.

## Tela

```
Escolha o verbo              Escolha o tempo
[ to work · trabalhar  ▾ ]   [ Present continuous · estou trabalhando ▾ ]

to work = trabalhar (uârk) 🔊   Passado: worked · Particípio: worked

┌ Present continuous — "estou trabalhando" ──────────────────────────┐
│ O que é: algo acontecendo agora, neste momento.                    │
│ Em português: estar + verbo com -ndo (estou trabalhando).          │
│ Como montar: pessoa + am/is/are + verbo com -ing                   │
│   I am working · He is working · They are working                  │
│ Negativa: coloque not depois de am/is/are → I am not working       │
│ Pergunta: am/is/are vai para a frente → Are you working?           │
│ Dica: palavras que costumam vir junto: now, right now, today.      │
└────────────────────────────────────────────────────────────────────┘

Pessoa | Afirmativa | Negativa | Pergunta | Contrações
...
```

### Bloco de explicação (antes da tabela)

Todo tempo, inclusive o Básico, tem os mesmos itens, em português simples:

1. **O que é**: uma frase.
2. **Em português**: o tempo equivalente, com exemplo do verbo escolhido.
3. **Como montar**: a fórmula (pessoa + auxiliar + forma do verbo) e três exemplos
   com o verbo escolhido.
4. **Negativa** e **Pergunta**: onde entra o `not` e o que vai para a frente.
5. **Dica**: palavras que costumam acompanhar (yesterday, now, already, ever…) ou o
   erro mais comum do brasileiro naquele tempo.

O bloco do **Básico** explica as três colunas de tempo (presente, passado e futuro
com will), o do/does/did da negativa e da pergunta, as contrações, e que o texto
entre parênteses é a pronúncia aproximada.

Os exemplos usam o verbo selecionado (gerados pela mesma regra da tabela). O texto
fixo de cada tempo fica numa constante em `lib/verbs.ts`.

## Estrutura de cada tempo (exceto Básico)

Colunas: **Pessoa · Afirmativa · Negativa · Pergunta · Contrações**.

Exemplo, `work`, Present continuous, linha "he":

- Pessoa: he / ele
- Afirmativa: He is working (rrí íz uâr-king) — ele está trabalhando
- Negativa: He is not working (rrí íz nót uâr-king) — ele não está trabalhando
- Pergunta: Is he working? (íz rrí uâr-king?) — ele está trabalhando?
- Contrações: He's working, He isn't working (com pronúncia)

Contrações por tempo:

| Tempo | Contrações |
|---|---|
| Present continuous | I'm working · I'm not working (demais: aren't / isn't) |
| Past continuous | I wasn't working · You weren't working |
| Going to | I'm going to work · I'm not going to work |
| Present perfect | I've worked · I haven't worked (he's worked · he hasn't worked) |
| Would | I'd work · I wouldn't work |

## Verbos de estado (decisão minha, corrija se discordar)

Alguns verbos quase nunca vão para o contínuo: **be, know, want, need, like,
understand, see, have**. Para esses, Present continuous e Past continuous **não
mostram tabela**; mostram um aviso: "Não se diz *I am knowing*. Para algo agora, use
o presente: *I know*." O botão do tempo continua visível, para a pessoa aprender a
regra. Os demais tempos funcionam normalmente.

- `have` ganha uma linha extra no aviso: "Exceção: em expressões como *I'm having
  lunch* (estou almoçando) e *We're having fun* (estamos nos divertindo)."
- `think` e `feel` **não** entram na lista: "I'm thinking about it" e "I'm feeling
  better" são comuns e corretos.

Lista fica no código, numa constante com teste.

## Abordagens consideradas

- **A) Um tempo por vez, com seletor (escolhida).** Mantém o formato que o aluno já
  conhece, não sobrecarrega, funciona no celular e permite flashcards por tempo.
  Custo: não compara tempos lado a lado.
- B) Todos os tempos em cartões empilhados. Página enorme, assusta iniciante.
- C) Clicar numa pessoa abre todos os tempos dela. Esconde o padrão entre as pessoas.

O usuário escolheu A. Depois pediu que a troca de tempo fique sempre visível (seletor "Escolha o tempo") e que cada tempo tenha explicação antes da tabela.

## Como se monta (decidido)

- **Inglês por regra** em `lib/verbs.ts`, como já é hoje: forma -ing
  (`ingForm`: tira o "e" final — making; dobra a consoante — getting, putting;
  study → studying), particípio (campo `participle` já existe; padrão = passado),
  auxiliares am/is/are, was/were, have/has, would, going to.
- **to be** segue escrito à mão, como hoje.
- **Pronúncia** segue o padrão atual (pessoa + forma do verbo, "rr" para o h):
  um mapa por verbo com a forma -ing e o particípio quando irregular
  (done "dân", gone "gón", written "rí-ten"…). Regular reaproveita o passado.
- **Português por regra a partir do infinitivo**, com lista de exceções:
  - gerúndio: trabalhar → trabalhando (pôr → pondo);
  - imperfeito: -ar → -ava/-ávamos/-avam; -er/-ir → -ia/-íamos/-iam;
    exceções: ser → era, ter → tinha, vir → vinha, pôr → punha;
  - futuro do pretérito: infinitivo + -ia/-íamos/-iam; exceções: fazer → faria,
    dizer → diria, trazer → traria;
  - present perfect usa "já" + o pretérito perfeito que já existe ("eu já trabalhei").
  - Verbos com sentido composto usam o campo `inf` existente.
- **Tela**: seletor "Escolha o tempo" ao lado de "Escolha o verbo", com "Básico"
  como padrão. Trocar de verbo mantém o tempo escolhido. O tempo não é salvo entre
  visitas (volta ao Básico).
- **Flashcards**: o baralho usa o tempo selecionado (colunas dele + seções de baixo).
  O id de cada cartão inclui o tempo, para "já sei" de um tempo não marcar outro.
  O Básico mantém os ids de hoje, para não perder o progresso salvo.
- **Celular**: mesmo padrão da tabela atual (cada pessoa vira um bloco, com o nome da
  coluna à esquerda); a pessoa aparece como título do bloco. Os dois seletores
  ficam um embaixo do outro.
- **Testes** em `scripts/test-logic.ts`: formas -ing, imperfeito e futuro do pretérito
  de verbos regulares e irregulares; nenhum verbo de estado gera tabela contínua;
  toda célula de todo tempo de todo verbo tem inglês, português e pronúncia sem
  "undefined".

## Fica com quem construir

- Texto exato dos quadros "quando usar" (curto, português simples, um exemplo).
- Visual do bloco de explicação (reaproveitar o estilo de `.verb-note`).
- Ajuste fino de traduções que soem estranhas por regra (corrigir no mapa de exceções).
