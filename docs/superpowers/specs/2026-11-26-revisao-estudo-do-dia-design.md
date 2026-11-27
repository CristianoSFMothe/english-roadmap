# Rever os estudos do dia já criados

## Intenção

Poder voltar a um estudo do dia já gerado para **revisar**: reler a teoria, as perguntas, as
respostas dadas, as correções e as formas de melhorar. Hoje, um dia passado que foi concluído
não abre mais: só aparece em "Últimos dias" como etiqueta, e dias com mais de 14 dias não
aparecem em lugar nenhum, embora tudo esteja salvo em `app_lesson`.

## Objetivos

- Clicar num dia de "Últimos dias" abre esse dia na própria página `/estudo-diario`.
- Dia passado concluído abre **só para leitura**.
- Endereço com `?data=AAAA-MM-DD` abre direto aquele dia (dá para guardar ou mandar o link).
- "Ver dias anteriores" carrega mais 14 dias por vez, até acabar o histórico.

## Fora do escopo

- Refazer exercícios ou guardar uma nova tentativa.
- Página separada de histórico ou calendário do mês.
- Mudanças no banco (os dados já existem).

## Abordagens

1. **Etiquetas de "Últimos dias" clicáveis, na mesma página, com `?data=`**: escolhida. Menor
   mudança, usa a página que já existe, e o `?data=` resolve o link direto para um dia.
2. Página `/estudo-diario/historico` + `/estudo-diario/[data]`: endereço próprio e lista
   completa, mas tira a pessoa da página do estudo e cria duas páginas.
3. Calendário do mês: boa visão de frequência, mas mais trabalho e apertado no celular.

## Como fica (decidido)

- Etiquetas de "Últimos dias" viram botões; a do dia aberto fica destacada (`aria-pressed`).
- Ao abrir um dia passado, o topo mostra a data e o botão **"Voltar para hoje"** (que tira o
  `?data=` do endereço).
- Clicar num dia troca o `?data=` no endereço sem recarregar a página.

## Decisões minhas (para conferir)

- **Rótulo:** "Só leitura · 24/11/26". Não uso "Revisão" porque esse nome já é da parte 6
  (domingo) das Lições.
- **Só leitura vale para dia passado concluído** (`completedAt` preenchido). Dia passado não
  concluído continua como hoje: abre para responder, igual aos botões de "Não completei…".
  O dia de hoje, mesmo concluído, continua como está (chat e "Gerar 3 respostas" ativos).
- **No modo só leitura:** some o campo de resposta e o botão "Gerar 3 respostas"; as melhorias
  já geradas aparecem. A conversa com o professor aparece com as mensagens antigas, sem o campo
  de enviar. Ouvir e pronúncia continuam funcionando.
- **`?data=` de um dia sem estudo salvo** (ou data inválida): mostra o aviso "Não há estudo
  salvo em 24/11/26" e abre o dia de hoje. Não gera estudo sozinho.
- **API:** `GET /api/lesson?data=AAAA-MM-DD` devolve a lição daquele dia;
  `GET /api/lesson?antes=AAAA-MM-DD` devolve os 14 dias do histórico anteriores a essa data.
  "Ver dias anteriores" só aparece enquanto a última página vier cheia (14 dias).

## Fica para quem implementar

- Como ler o `?data=` no cliente (`useSearchParams` com `Suspense`, ou ler `searchParams` na
  página do servidor e passar como prop).
- Como deixar o `TeacherChat` só para leitura (prop nova ou renderização à parte).
