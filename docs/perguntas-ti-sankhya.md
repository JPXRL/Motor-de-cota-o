# Perguntas para a TI — Sankhya e integração da plataforma de frete

> Preparado em 14/09/2026 a pedido do Juan. As perguntas nasceram dos campos que ele próprio encontrou no dicionário de dados do `TGFCAB` (`NUNOTA`, `NUMNOTA`, `NUMCOTACAO`, `VLRFRETE`, `TIPFRETE`, `AD_RASTREIO`, `AD_DTCOLETA`, `AD_DTENTREGA`, `AD_STATUSENTREGA`, `STATUSCTE`, `SITUACAOCTE`, `VLRFRETECALCULO`, `FRETEVLRPAGO`) e do que a plataforma precisa para entregar os cinco indicadores pedidos.
>
> **Atualizado em 14/09/2026 com uma resposta do próprio Juan:** os campos `AD_RASTREIO`, `AD_DTCOLETA`, `AD_DTENTREGA` e `AD_STATUSENTREGA` **foram criados pela própria TI e hoje ninguém preenche — estão abandonados.** As perguntas do Bloco B foram reduzidas ao que ainda falta saber, e a consulta do Bloco F foi ajustada (ver "O que essa resposta já resolve", abaixo).
>
> **Como usar:** o bloco "Mensagem pronta" no fim pode ser copiado e enviado direto. As seções acima explicam *por que* cada pergunta existe — servem para o Juan responder se a TI perguntar "para que vocês querem isso?", não para serem enviadas.

---

## O que a resposta sobre os campos `AD_` já resolve (e o que ela tira)

**Resolve:** o destino da gravação do rastreio já existe e está livre. Não é preciso pedir a criação de campo nenhum no pedido para guardar data de coleta, data de entrega e situação da entrega — e, como ninguém preenche, não há processo de outra área para respeitar nem risco de sobrescrever o trabalho de alguém. Só falta o "pode usar" formal da TI.

**Tira:** a esperança de calcular indicadores com o histórico. Campo abandonado é campo vazio, então **não existe base histórica de prazo** — não dá para medir um OTD ou um tempo de trânsito de referência de 2026. Esses indicadores vão começar a existir a partir do momento em que a plataforma começar a preencher. Na prática isso significa que **quanto antes o rastreio persistente entrar no ar, antes a série histórica começa** — e isso reforça a prioridade dessa etapa no roadmap.

**Sobra uma dúvida útil:** a TI criou esses campos para algum projeto que não foi adiante. Vale perguntar qual era, porque pode haver uma definição pronta (uma lista de status, um desenho de integração) que a gente reaproveita em vez de inventar.

---

## Se só der para perguntar cinco

Estas cinco destravam mais trabalho que todas as outras somadas:

1. O que exatamente significa **`FRETEVLRPAGO`**, e ele está preenchido nas notas de 2026?
2. Podemos **assumir e preencher** os campos `AD_DTCOLETA`, `AD_DTENTREGA`, `AD_STATUSENTREGA` e `AD_RASTREIO`, que a própria TI criou e hoje estão sem uso?
3. **Como acessamos a API** (URL, autenticação, usuário de integração) e existe ambiente de homologação?
4. Podemos **criar tabelas customizadas (`AD_`)** e cruzá-las com `TGFCAB` nos painéis?
5. Qual campo guarda o **número do CT-e** e qual guarda a **transportadora** do embarque?

---

## Bloco A — Significado dos campos de frete

O "Cotado x Realizado" é uma subtração simples, mas só funciona se estiver claro qual número é qual. Há quatro campos de valor de frete no `TGFCAB` e eles certamente não significam a mesma coisa.

1. Qual a diferença exata entre **`VLRFRETE`**, **`VLRFRETETOTAL`**, **`VLRFRETECALCULO`** e **`FRETEVLRPAGO`**? Especificamente: qual deles é o frete **cobrado do cliente** (o que vai na nota) e qual é o **pago à transportadora** (o custo da empresa)?
2. **`FRETEVLRPAGO` é preenchido na prática hoje?** Em que momento e por quem — digitação manual, integração, ou na conferência da fatura da transportadora?
3. **`TIPFRETE`** — quais os valores possíveis e o que cada um significa (CIF, FOB, outros)?
4. **`NUMCOTACAO`** é usado por algum módulo nativo do Sankhya? Podemos gravar nele o protocolo que a transportadora devolve, ou é melhor criarmos um campo customizado próprio para não conflitar?

*Por que importa:* se `FRETEVLRPAGO` já for o valor pago e estiver populado, conseguimos comparar cotado × pago imediatamente, sem precisar construir a ingestão de faturas — que é a etapa mais cara do plano. **É a única pergunta desta lista que ainda pode encurtar o projeto.**

## Bloco B — Os campos de rastreio abandonados

*(Reduzido: já sabemos que foram criados pela TI e que ninguém preenche.)*

5. Esses campos foram criados para **qual projeto**? Existe alguma definição pronta daquela época — uma lista de status esperados, um desenho de integração — que possamos reaproveitar?
6. A plataforma de frete **pode assumir esses campos** e passar a preenchê-los automaticamente (data de coleta, data de entrega, situação e código de rastreio)?
7. O **`AD_STATUSENTREGA`** foi criado com algum domínio/lista de valores definida, ou é texto livre?
8. Qual campo guarda o **número do CT-e**? E existe campo com a **transportadora do embarque** (algo como `CODPARCTRANSP`) que seja preenchido de forma confiável?
9. O que significam **`STATUSCTE`** e **`SITUACAOCTE`**, e quais valores assumem?

*Por que importa:* as perguntas 5 a 7 são para não reinventar o que já foi pensado uma vez; a 8 é a chave que amarra a nota ao documento que a transportadora rastreia.

## Bloco C — Acesso à API

10. Qual **produto/versão de integração** a instalação da RARE WAY usa, e qual a **URL base** de desenvolvimento e de produção?
11. Como é a **autenticação** (usuário e senha de integração, chave de aplicação, token) e quais os **limites de chamadas** por minuto/dia?
12. Quais **serviços estão liberados** para leitura e para escrita no nosso acesso?
13. Podem criar um **usuário de integração dedicado** para a plataforma de frete, com permissão mínima: ler parceiro e nota, escrever nos campos de frete e nas tabelas customizadas?
14. Existe **ambiente de homologação** separado, com dados de teste, ou só produção?

*Por que importa:* toda escrita vai ser feita pela camada de serviço do Sankhya, nunca direto no banco — é o que garante que as regras do ERP não sejam furadas. Precisamos saber quais serviços temos.

## Bloco D — Tabelas customizadas e painéis

15. A **criação de tabelas customizadas (`AD_`)** é liberada? Qual o padrão de nomenclatura da casa e quem cria?
16. Qual **módulo de painel/BI** está licenciado, e ele consegue **cruzar uma tabela customizada com o `TGFCAB`** (por `NUNOTA` e `CODEMP`)?
17. Existe alguma **restrição de volume ou retenção** para tabelas customizadas? *(Estimativa nossa: cerca de 3 mil linhas por mês.)*

*Por que importa:* é onde os cinco relatórios vão morar. Se tabela customizada não for liberada, o desenho muda.

## Bloco E — Processo e regras de negócio

18. O frete que vai na nota é **sempre o que foi cotado**, ou é ajustado depois? Quem ajusta, e em que momento?
19. Como a **divergência entre o frete cotado e a fatura da transportadora** é tratada hoje — existe conferência, e quem faz?
20. As transportadoras estão cadastradas como parceiro no Sankhya? Se sim, podemos ter o **código de parceiro (`CODPARC`) de Jamef, Braspress e Rodonaves** para amarrar os dados?
21. Sobre os **acessos individuais** (6 pessoas de expedição nas três empresas + administrador): a TI prefere criar esses usuários no ambiente de vocês, ou a plataforma gerencia os próprios usuários?
22. A **força de vendas** vai querer consumir a API da plataforma de frete (cotação e rastreio prontos, sem refazer as integrações)? Se sim, quem define o contrato dessa API?

## Bloco F — Um pedido de consulta (rápido e muito útil)

23. Poderiam rodar uma consulta simples nas notas de venda de 2026 das empresas 1, 4 e 6, contando **quantas têm `FRETEVLRPAGO` maior que zero** — e, se houver, trazer uma amostra de dez linhas com `NUNOTA`, `VLRFRETE`, `VLRFRETETOTAL` e `FRETEVLRPAGO` lado a lado?

*Por que importa:* a amostra lado a lado responde de uma vez as perguntas 1 e 2 deste documento — ver os quatro números juntos em notas reais deixa óbvio qual é qual, sem depender de interpretação de dicionário de dados. *(A contagem de `AD_DTCOLETA`/`AD_DTENTREGA` saiu desta pergunta: já sabemos que esses campos estão vazios.)*

---

## Mensagem pronta para enviar

> Pessoal, estou estruturando a plataforma de cotação e rastreio de frete e preciso de algumas definições do Sankhya para desenhar a integração sem chutar nada. Separei por assunto — se der para responder mesmo que parcialmente, já ajuda muito.
>
> **Campos de frete no TGFCAB**
> 1. Qual a diferença entre `VLRFRETE`, `VLRFRETETOTAL`, `VLRFRETECALCULO` e `FRETEVLRPAGO`? Qual deles é o frete cobrado do cliente e qual é o valor pago à transportadora?
> 2. O `FRETEVLRPAGO` é preenchido hoje? Em que momento e por quem?
> 3. Quais os valores possíveis de `TIPFRETE`?
> 4. O campo `NUMCOTACAO` é usado por algum módulo nativo? Podemos gravar nele o protocolo da cotação da transportadora ou é melhor criar um campo próprio?
>
> **Campos de rastreio que já existem**
> 5. Os campos `AD_RASTREIO`, `AD_DTCOLETA`, `AD_DTENTREGA` e `AD_STATUSENTREGA` foram criados por vocês para algum projeto — qual era? Ficou alguma definição daquela época (lista de status, desenho de integração) que eu possa reaproveitar?
> 6. Como hoje eles não são preenchidos por ninguém, a plataforma de frete pode assumir esses campos e passar a preenchê-los automaticamente?
> 7. O `AD_STATUSENTREGA` tem uma lista de valores definida ou é texto livre?
> 8. Qual campo guarda o número do CT-e? E existe campo com a transportadora do embarque preenchido de forma confiável?
> 9. O que significam `STATUSCTE` e `SITUACAOCTE`?
>
> **Acesso à API**
> 10. Qual versão/produto de integração usamos e qual a URL base de desenvolvimento e produção?
> 11. Como é feita a autenticação e quais os limites de chamada?
> 12. Quais serviços estão liberados para leitura e escrita?
> 13. Conseguem criar um usuário de integração dedicado, com permissão mínima (ler parceiro e nota, escrever nos campos de frete)?
> 14. Existe ambiente de homologação separado?
>
> **Tabelas customizadas e painéis**
> 15. Podemos criar tabelas customizadas (`AD_`)? Qual o padrão de nome e quem cria?
> 16. Qual módulo de painel/BI temos licenciado, e ele cruza tabela customizada com o `TGFCAB` por `NUNOTA` e `CODEMP`?
> 17. Há restrição de volume? Estimamos cerca de 3 mil linhas por mês.
>
> **Processo**
> 18. O frete que vai na nota é sempre o cotado, ou é ajustado depois? Por quem?
> 19. Existe hoje conferência entre o frete cotado e a fatura da transportadora? Quem faz?
> 20. As transportadoras estão cadastradas como parceiro? Conseguem me passar o `CODPARC` da Jamef, Braspress e Rodonaves?
>
> **Um pedido de consulta**
> 21. Conseguem rodar uma contagem nas notas de venda de 2026 das empresas 1, 4 e 6 de quantas têm `FRETEVLRPAGO` maior que zero? E, se houver, me mandar uma amostra de dez linhas com `NUNOTA`, `VLRFRETE`, `VLRFRETETOTAL` e `FRETEVLRPAGO` lado a lado? Ver os quatro números juntos em notas reais já responde as perguntas 1 e 2 de cara.
>
> Obrigado!

---

## O que fazer com as respostas

Três delas mudam o plano de forma relevante, e vale registrar assim que chegarem:

**Se `FRETEVLRPAGO` estiver populado** — a comparação cotado × pago sai imediatamente e a ingestão de faturas deixa de ser prioridade. É a melhor notícia possível, e é a única resposta desta lista que ainda pode encurtar o projeto.

**Se a TI liberar os campos `AD_` de rastreio** (o mais provável, já que estão abandonados) — a gravação do rastreio tem destino pronto e nenhum campo novo precisa ser criado no pedido.

**Se tabela customizada não for liberada** — os dashboards precisam de outro destino (ferramenta de BI lendo os dois bancos), e isso deve ser decidido antes de construir a sincronização.
