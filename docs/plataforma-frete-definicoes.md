# Plataforma de Frete — Definições Técnicas e Decisões Confirmadas

> Complementa `plataforma-frete-reposicionamento.md` (09/09/2026), que traz o diagnóstico e o roadmap. Este documento registra as decisões e definições fechadas na rodada de **10/09/2026**, a partir das respostas e ideias do Juan — e ajusta os pontos do documento anterior que essas decisões substituem (seção 16).
>
> **Atualizado em 14/09/2026:** CNPJs e endereços das três empresas corrigidos e a cidade da Anova SP confirmada no próprio Sankhya (seção 4); confirmado que os campos `AD_` de rastreio estão abandonados e vazios, com a consequência para os indicadores (seção 5); definição concreta de "blindar a operação" (seção 1.1); e análise de como operar sem custo (seção 17).
>
> Documentos irmãos: prévia visual **"Zuma Frete"** · perguntas para a TI em `perguntas-ti-sankhya.md` · justificativa do custo em `justificativa-custo-plataforma.md`.

---

## 1. Titularidade — código do Juan, operação da empresa

Definição do Juan: *"O sistema é e não é oficial. A RARE WAY vai sim desfrutar, mas é meu sistema, e quero que fique tudo em minha posse já que serve como meu material de estudos."*

Isso é legítimo e muda a recomendação da Onda 0 do documento anterior, que pedia para mover tudo para contas da empresa. A recomendação revisada separa duas coisas que estavam sendo tratadas como uma só:

**O código e o conhecimento continuam do Juan.** Repositório na conta dele, arquitetura dele, documentação dele, material de estudo e de portfólio dele. Nada aqui pede que ele entregue isso.

**A operação passa a ter o mínimo de blindagem**, e o motivo é que ela também protege o Juan, não só a empresa. Três coisas concretas: as **credenciais de API das transportadoras são contratos da RARE WAY**, não dele — assim como os dados operacionais (CNPJ de clientes, tabelas de preço negociadas, histórico de frete). Manter dado e credencial da empresa numa conta pessoal é uma exposição para os dois lados, e num eventual desentendimento é uma posição ruim de defender. Segundo, o **plano gratuito (Hobby) do Vercel é para uso não comercial** — ver seção 17 para as saídas possíveis. Terceiro, **um segundo administrador não é um segundo desenvolvedor**: é alguém que consegue restaurar acesso se o Juan perder o celular com o segundo fator. São cinco minutos de configuração que evitam uma catástrofe.

### 1.1 O que é "blindar a operação", concretamente

Blindar **não é entregar**. É reduzir a chance de a ferramenta parar, de o dado sumir, e de um problema técnico virar um problema pessoal do Juan às onze da noite. São seis itens, todos pequenos:

| # | O que | Por quê |
|---|---|---|
| 1 | **Segundo fator com códigos de recuperação** guardados fora do notebook (impressos ou em cofre de senhas) | Perder o celular hoje significa perder o acesso à ferramenta que opera o frete de três empresas |
| 2 | **Um segundo administrador** no projeto de hospedagem — não no código | Alguém consegue restaurar o acesso. Não é sócio, não é desenvolvedor: é chave reserva |
| 3 | **Backup diário fora do provedor** (seção 12) | Protege contra o que a recuperação do próprio banco não cobre: conta suspensa, projeto apagado |
| 4 | **Mapa dos segredos** — uma lista de qual variável é de qual transportadora e a quem pedir reset. Os valores nunca, só o mapa | Quando uma senha expira numa sexta, qualquer pessoa consegue agir |
| 5 | **Um documento de uma página de "como assumir"** — onde está o quê, como publicar, o que fazer quando cada coisa falha | É o que permite férias de verdade, e é o que separa ferramenta de refém |
| 6 | **Alguém sabe quando quebra** — monitor de disponibilidade e alerta de erro | Hoje, se cair numa sexta à tarde, só se descobre quando alguém reclama |

Nenhum desses seis toca na propriedade do código. Os itens 1, 3, 4 e 5 são gratuitos e dependem só de decisão; o 6 tem versão gratuita; o 2 depende do plano de hospedagem (seção 17).

O desenho recomendado, então: código no GitHub pessoal (privado); instância de produção com um segundo administrador de confiança; banco de dados e credenciais de transportadora tratados como ativos da RARE WAY; e o documento de "como assumir" guardado junto. O Juan segue como único desenvolvedor e dono do código.

---

## 2. Nome — recomendação: Zuma

O Juan propôs três: **Malha Log** (malha logística), **Suma-Fractum** (somadora de frete) e **Zuma** (de somadora, com Z porque é a última letra, como o processo final).

**Recomendado: Zuma.** Três razões. É **curto e falável** — nome de ferramenta de uso diário é digitado, dito em reunião e lido num menu dezenas de vezes por dia, e cada sílaba extra cobra pedágio. É **neutro de escopo** — e isso importa muito aqui, porque o escopo já cresceu de cotação para cotação + rastreio + indicadores + API, e vai crescer de novo; nomes descritivos envelhecem mal justamente quando o produto dá certo (foi o que aconteceu com "motor de cotação"). E é **distintivo o suficiente para virar substantivo interno** — "lança no Zuma", "o Zuma avisou" —, que é o sinal de que uma ferramenta foi adotada de verdade.

**Malha** é o segundo melhor, e é o melhor se a prioridade for ser autoexplicativo: "malha" é vocabulário nativo do setor (a própria Rodonaves chama de "malha de atendimento" a API de cobertura dela), e evoca rede e alcance, que é literalmente o que a plataforma administra. Recomendo **Malha** sem o "Log" — a abreviação enfraquece e envelhece o nome.

**Suma-Fractum** é o mais fraco, e o próprio Juan já intuiu por quê (fixa o produto em somar frete). Somam-se dois problemas práticos: é difícil de falar e de escrever ao telefone, e o latim empresta um tom acadêmico que não combina com uma ferramenta de expedição.

Sugestão final: **Zuma** como nome, "plataforma de frete" como descritor. Se quiser aproveitar a ideia da malha, ela vira o nome da tela de cobertura por transportadora (seção 9) — onde o termo é exatamente preciso.

---

## 3. Identidade visual

Decisão do Juan: o sistema passa a girar em torno do **lilás `#8E3FC9` com dourado `#F5C63D`** (paleta da tela de login, que ele aprovou), abandonando a obrigação de seguir o padrão institucional rosa/teal do resto da RARE WAY. As fontes **Helvetica Now** (Display, Text e Micro) continuam.

Há um cuidado funcional que essa escolha exige, e ele está aplicado na prévia: em ferramenta, **cor é informação, não decoração**. Dourado, na cabeça da maioria das pessoas, lê como "atenção" — então se o dourado é o destaque da marca, o aviso precisa de outra cor, senão os dois significados colidem e nenhum funciona. A divisão adotada:

| Cor | Função exclusiva |
|---|---|
| Lilás `#8E3FC9` | Marca, navegação, ação principal |
| Dourado `#F5C63D` | Destaque — a cotação escolhida, o número que importa |
| Laranja `#F0883C` | Aviso (sem cobertura, prazo vencendo) |
| Verde `#3ED8A0` | Entregue, validado |
| Vermelho `#FF6B6B` | Atraso e erro, nada mais |

O fundo escuro é um **quase-preto com viés lilás** (`#0D0A12`), não cinza neutro — um cinza puro ao lado de um lilás saturado lê como descuido. O tema claro usa os mesmos papéis com valores próprios, e o dourado escurece para `#9C7708` quando é texto, porque dourado sobre branco é ilegível. Isso é exatamente o tipo de decisão que só precisa ser tomada uma vez, se existir um arquivo de tokens.

---

## 4. Empresas, CNPJs e endereços de origem

*(Corrigido em 14/09/2026 com os dados enviados pelo Juan e confirmado na tela de Parceiros do Sankhya. A primeira versão deste documento trazia o CNPJ da Anova RJ errado e, por consequência, uma observação invertida sobre raízes de CNPJ.)*

| CODEMP | Empresa | CNPJ | Endereço de origem | Cidade/UF | CEP |
|---|---|---|---|---|---|
| 1 | Matriz | 08.133.243/0001-00 | Rua Petrolina, 331, loja 3 — Sagrada Família | Belo Horizonte/MG | 31030-370 |
| 4 | Anova SP | 27.621.268/0002-88 | Doutor Pinto Ferraz, 389 — São Bernardo | **Campinas/SP** | 13030-500 |
| 6 | Anova RJ | 27.621.268/0003-69 | General Savaget, 40 — Marechal Hermes | Rio de Janeiro/RJ | 21610-390 |

Razão social das duas filiais: **ANOVA COSMETICOS LTDA** (nome de parceiro "ANOVA COSMETICOS LTDA SP" e "... RJ"). A Anova SP está cadastrada como parceiro de código 4 no Sankhya, com inscrição estadual 122570120116 — ou seja, **as empresas também existem como parceiro**, o que é o padrão do Sankhya e serve de referência cruzada útil na hora de ler e gravar dados.

**Cidade da Anova SP: confirmada como Campinas.** A tela de cadastro mostra código de cidade 958 = Campinas - SP, com "SÃO BERNARDO" sendo o **bairro**, não o município. Isso importa porque o CEP de origem muda a cotação de forma material — uma coleta em Campinas e uma no ABC paulista caem em tabelas diferentes.

**Quem compartilha raiz de CNPJ:** Anova SP e Anova RJ são estabelecimentos da **mesma pessoa jurídica** (raiz 27621268, filiais 0002 e 0003); a **Matriz é outra empresa** (raiz 08133243). Isso importa porque transportadora contrata por CNPJ: é plausível que as duas Anovas compartilhem contrato e credencial de API, e que a Matriz tenha as suas próprias. **Pergunta pendente para as transportadoras:** cada uma das três empresas tem contrato e usuário de API próprios em Jamef, Braspress e Rodonaves, ou o contrato é por raiz?

**Consequência técnica:** cada empresa tem CEP de origem diferente (Belo Horizonte, Campinas e Rio), e hoje o CEP de origem está fixo em `31030370` no código. Sem a dimensão empresa, cotar para Anova SP ou RJ produziria **valores errados** — não é questão de organização, é de correção do resultado. Por isso a empresa entra como campo obrigatório e o remetente (CNPJ, CEP, endereço) passa a ser derivado dela.

O modelo, então: uma tabela de empresas com CODEMP, razão social, CNPJ, CEP e endereço de origem; e as credenciais de transportadora por empresa, guardadas como variável de ambiente com sufixo (`JAMEF_USERNAME_EMP1`, `JAMEF_USERNAME_EMP4`, …) em vez de no banco — assim o segredo continua fora do banco de dados.

---

## 5. Campos do TGFCAB — o que já existe, e o que já sabemos sobre eles

O Juan foi ao dicionário de dados do Sankhya e trouxe esta lista: `NUNOTA`, `NUMNOTA`, `NUMCOTACAO`, `VLRFRETE`, `TIPFRETE`, `AD_RASTREIO`, `AD_DTCOLETA`, `AD_DTENTREGA`, `AD_STATUSENTREGA`, `STATUSCTE`, `SITUACAOCTE`, `VLRFRETECALCULO`, `FRETEVLRPAGO`.

| Campo | Uso na plataforma | Situação |
|---|---|---|
| `NUNOTA` | Chave que amarra cotação ↔ pedido. **É o campo que destrava o Cotado x Realizado** | Passa a ser preenchido no formulário de cotação |
| `NUMNOTA` | Número da nota — é o que a Braspress usa para rastrear | Necessário para o registro de envios |
| `NUMCOTACAO` | Candidato a guardar o protocolo da cotação | **Confirmar com a TI** se o Sankhya já usa esse campo no módulo de frete nativo; se usa, não sequestrar — criar um `AD_` próprio |
| `TIPFRETE` | CIF/FOB — entra na cotação e filtra a análise (só CIF é custo nosso) | Confirmar os valores possíveis |
| `VLRFRETE`, `VLRFRETECALCULO`, `FRETEVLRPAGO` | São o coração do "cotado x realizado" | **Confirmar a semântica exata com a TI.** Se `FRETEVLRPAGO` for o valor pago à transportadora e estiver preenchido na prática, **a fase 2 (cotado × pago) fica disponível sem precisar ingerir fatura nenhuma** — é a única pergunta pendente que ainda pode encurtar o projeto |
| `AD_RASTREIO`, `AD_DTCOLETA`, `AD_DTENTREGA`, `AD_STATUSENTREGA` | Destino da gravação do rastreio | **Confirmado em 14/09/2026:** criados pela própria TI e **abandonados — ninguém preenche.** Ver abaixo |
| `STATUSCTE`, `SITUACAOCTE` | Situação do CT-e | Ajuda a saber se o embarque foi efetivado; **falta localizar onde mora o número do CT-e**, que é a chave de reconciliação com a transportadora |

### O que a descoberta sobre os campos `AD_` significa

São duas consequências opostas, e as duas importam.

**A boa:** o destino da escrita do rastreio já existe e está livre. Não é preciso pedir campo novo no pedido para data de coleta, data de entrega, situação e código de rastreio — e, como ninguém preenche, não há processo de outra área a respeitar nem risco de sobrescrever trabalho alheio. Falta só o "pode usar" formal da TI.

**A ruim:** campo abandonado é campo vazio, então **não existe base histórica de prazo de entrega**. A esperança registrada na versão anterior deste documento — calcular um OTD e um tempo de trânsito de referência a partir do histórico de 2026 — **não se sustenta**. Esses indicadores começam do zero, no dia em que a plataforma começar a preencher.

Isso tem um efeito direto na prioridade: **quanto antes o rastreio persistente entrar no ar, antes a série histórica começa a existir.** Cada mês de adiamento é um mês de indicador que nunca vai poder ser calculado retroativamente. O único indicador que ainda pode nascer com histórico é o de custo, e só se `FRETEVLRPAGO` estiver populado — daí a importância da pergunta 23 de `perguntas-ti-sankhya.md`.

Vale também perguntar **para qual projeto esses campos foram criados**: pode haver uma definição pronta daquela época (uma lista de status esperados, um desenho de integração) que a gente reaproveite em vez de inventar.

---

## 6. Sankhya — o que sobe, e como a API é usada

### 6.1 Resposta à pergunta "levar só o real ou criar tabela das cotações não realizadas?"

**As duas coisas, e sem tabela separada para "não realizada".** O desenho recomendado:

| Onde | O que | Granularidade |
|---|---|---|
| Campos no próprio pedido (`TGFCAB`) | Protocolo, valor, prazo e percentual da cotação escolhida | 1 por pedido — é o que o operador vê ao abrir o pedido |
| `AD_FRETE_COTACAO` | Uma linha por cotação feita: empresa, pedido, cliente, destino, peso, valor da mercadoria, quantas transportadoras responderam, menor valor recebido, valor escolhido, diferença, motivo da escolha, usuário | 1 por cotação |
| `AD_FRETE_COTACAO_ITEM` | Uma linha por transportadora **incluindo as perdedoras**: valor, prazo, protocolo, situação (ok/erro/sem cobertura) | ~3-4 por cotação |
| `AD_FRETE_ENVIO` | Uma linha por embarque: datas (emissão, coleta, prometida, entrega), situação final, contagem de ocorrências por categoria, valores cotado/nota/pago | 1 por envio |

O "realizado" não fica em outra tabela — fica marcado por um **campo de situação** na própria linha da cotação (virou pedido / não virou). Uma regra só ("tudo que importa sobe, e um campo diz o que se concretizou") é mais fácil de manter que duas tabelas com critérios diferentes, e permite a pergunta que interessa: quantas cotações são feitas por pedido efetivado.

A conta de volume confirma que isso é seguro: cerca de 233 pedidos com frete por mês, digamos duas ou três cotações por pedido e quatro transportadoras — algo entre 2 e 3 mil linhas por mês na tabela de itens, 30 mil por ano. É volume irrelevante para o Sankhya. **O que não sobe** são os eventos individuais de rastreio (dez a trinta por envio, sem valor analítico isolado): eles ficam na plataforma, e o que sobe é o resumo.

### 6.2 Como a API do Sankhya vai ser usada

São três usos, dois de leitura e um de escrita:

**Leitura 1 — dados do cliente**, quando o operador informa o código do parceiro: traz razão social, CNPJ e endereço, encerrando a busca simulada que existe hoje (e mantendo a consulta por CNPJ na CNPJá como reserva, para cliente ainda não cadastrado).

**Leitura 2 — notas emitidas com frete**, periodicamente: é o que alimenta o registro de envios a rastrear (o recorte é o mesmo do levantamento jan-jul: `TIPMOV = 'V'`, `VLRFRETETOTAL > 0`, `CODEMP in (1,4,6)`).

**Escrita — de volta ao pedido e às tabelas `AD_`**: os quatro campos da cotação escolhida, os campos `AD_` de rastreio e as linhas dos fatos, de forma incremental.

Sobre o mecanismo: o padrão do Sankhya é um **gateway de serviços** — autentica-se uma vez (usuário/senha ou chave de aplicação, dependendo da versão), recebe-se um token ou sessão, e a partir daí cada operação é uma chamada a um serviço nomeado, com JSON, sobre HTTPS. Leitura por serviço de consulta, escrita por serviço de CRUD sobre a entidade correspondente. Duas recomendações firmes, independentes da versão: **nunca escrever direto no banco do Sankhya** (só pela camada de serviço, senão as regras e gatilhos do ERP são furados, e é assim que se corrompe nota fiscal); e **toda escrita ser idempotente**, com o par empresa+pedido como chave, para que reprocessar uma sincronização não duplique linha. Os nomes exatos dos serviços e qual gateway a instalação da RARE WAY usa são a primeira pergunta para a TI — variam entre versões, e não vale chutar.

---

## 7. Rastreio — como vai funcionar, passo a passo

> Pergunta do Juan: *"Como resolver sobre o rastreio, não entendi como vai ficar?"*

O que existe hoje é uma **busca**: o operador escolhe a transportadora, digita um número, vê o resultado, e o resultado desaparece. O que vai existir é um **painel que já está pronto quando abre**. A diferença é que a plataforma passa a saber, sozinha, o que precisa acompanhar.

O ciclo tem cinco passos:

**1. A plataforma descobre o que rastrear.** Uma vez por dia (ou algumas vezes), ela lê no Sankhya as notas emitidas com frete e cria uma linha no registro de envios para cada uma: empresa, transportadora, nota, CT-e, prazo prometido. Isso responde à pergunta que nenhuma transportadora responde — *quais* cargas existem. Nenhuma API de transportadora aceita "liste tudo o que é meu e está em trânsito"; todas só respondem "onde está este documento aqui".

**2. Cada transportadora atualiza pelo mecanismo que ela tem.** A Jamef avisa sozinha: cadastra-se uma URL da plataforma no portal dela e ela manda um aviso a cada ocorrência, na hora. Braspress e Rodonaves não têm esse recurso, então uma rotina roda a cada 15 a 30 minutos e consulta **só os envios que ainda não foram entregues** — quando um envio é entregue, ele sai da fila de consulta. Com algumas dezenas de envios abertos, isso é irrelevante em custo e em tempo.

**3. Tudo vira o mesmo formato.** Cada evento recebido é traduzido para um formato único (data, descrição, local, categoria) e gravado num histórico que só cresce. Evento repetido é descartado por uma chave de duplicidade — necessário porque tanto o aviso automático quanto a consulta podem trazer o mesmo evento duas vezes. É essa tradução que permite uma tela só para as três transportadoras.

**4. A tela mostra por situação, não por transportadora.** Cinco grupos: em trânsito, prazo vencendo hoje, atrasada, com ocorrência que exige ação, entregue. O operador não precisa saber qual transportadora levou para achar uma carga — e é aqui que entra o **filtro por CODEMP** que o Juan pediu: cada gestor de filial vê o que é da responsabilidade do CNPJ dele, e o Juan vê as três. Isso sai de graça do login individual.

**5. O resumo volta para o Sankhya.** Datas de coleta e entrega e situação final sobem para os campos `AD_` do pedido (que já existem e estão livres — seção 5) e para a tabela de fatos.

O ponto que vale sublinhar: **o histórico de eventos e as datas que esse ciclo produz são exatamente o insumo de OTD, OCT e Perfect Order Rate**. Construir o painel de rastreio e construir três dos cinco relatórios é o mesmo trabalho, feito uma vez — e, como não existe histórico de prazo no Sankhya (seção 5), é também o único jeito de esses indicadores passarem a existir. A prévia visual mostra essa tela na aba "Rastreio".

---

## 8. Regras de frete — melhor valor, melhor prazo, ou a razão entre os dois

Ideia do Juan: regras simples de melhor valor, melhor prazo, "ou até mesmo uma razão sobre ambas".

A recomendação é que a regra **sugira, e o operador decida** — porque sempre vai existir exceção (cliente que exige transportadora, carga que não pode esperar), e um sistema que escolhe sozinho ou acerta e não é auditável, ou erra e é contornado. Com o motivo da escolha registrado, dá para medir depois quantas vezes a sugestão foi seguida, o que é a forma honesta de calibrar a régua.

Sobre a "razão entre ambas": em vez de uma fórmula com pesos (que ninguém consegue explicar depois), recomendo uma régua que se explica numa frase — **quanto vale um dia de prazo**. Define-se um valor, digamos R$ 30, e a regra passa a ser: *escolha a mais barata, a menos que outra entregue mais rápido por uma diferença menor que R$ 30 por dia ganho.* Nesse caso a sugestão vira a mais rápida.

No exemplo da prévia: Jamef a R$ 412,30 em 3 dias e Braspress a R$ 438,90 em 2 dias. A diferença é R$ 26,60 por um dia ganho — abaixo da régua de R$ 30, então valeria pagar. A tela mostra exatamente essa conta em texto, e é isso que torna a regra defensável numa reunião. O número da régua pode variar por cliente ou por tipo de mercadoria mais adiante; começar com um só é suficiente.

Vale também uma regra dura, sem julgamento: se a diferença de preço passar de um limite (por exemplo 40% acima da mais barata), a opção aparece marcada como fora de padrão — protege contra erro de digitação de peso, que é como o incidente do peso 3.537 kg com mercadoria de R$ 6,60 aconteceu.

---

## 9. Cobertura por estado — a regra que evita cotar quem não coleta

Ideia do Juan, motivada por um caso real: *"já ocorreu de uma transportadora não levar mesmo após cotar."*

Essa é uma das melhores ideias desta rodada, porque resolve um problema que custa duas vezes (o tempo da cotação e o retrabalho de refazer o embarque). O desenho: uma tabela de **cobertura por transportadora**, e a transportadora que não atende o destino é **excluída antes da cotação**, com um aviso na tela dizendo o motivo — em vez de aparecer no comparativo e furar depois. Na prévia, é o bloco laranja "Ativa Logística fora desta rodada".

Duas recomendações de implementação. **Começar por UF** (simples, valor imediato), mas prever exceção por município ou faixa de CEP, porque na prática cobertura raramente é o estado inteiro — muitas transportadoras atendem só capital e região metropolitana, e é justamente na exceção que o problema aparece. E **fechar o ciclo de aprendizado**: quando uma transportadora recusar ou devolver uma carga por cobertura, o operador marca isso na tela e a malha aprende — assim a tabela reflete a realidade, não o que foi prometido no contrato.

Uma oportunidade concreta: a **Rodonaves tem uma API de malha de atendimento** (`unittocity-apigateway.rte.com.br`, já vista e testada no levantamento das APIs dela). Ou seja, para uma das três a cobertura pode ser carregada automaticamente em vez de cadastrada à mão. Vale perguntar a Jamef e Braspress se têm equivalente.

---

## 10. Filtros

Pedido do Juan: filtro no histórico por parceiro, transportadora ou remetente; e filtro por CODEMP no rastreio.

Registrado como requisito, e é barato quando as colunas existirem. Recomendo o conjunto: **período** (o filtro mais usado em qualquer histórico), **empresa/remetente**, **transportadora**, **parceiro**, **UF de destino** e um marcador de **"só as que viraram pedido"**. Esse último é o que separa análise de custo real de tentativa de cotação. No rastreio, o filtro por empresa é o mesmo mecanismo e já está desenhado na prévia.

---

## 11. On-Time Delivery — dois números diferentes

> Pergunta do Juan: *"No On-Time Delivery, para pegar a data cumprida real vamos pegar a variação de dt final − dt inicial para ter os dias que demorou de fato?"*

Aqui há uma confusão que vale desfazer, porque são duas medidas com nomes parecidos e usos diferentes.

**`data_entrega − data_coleta` é o tempo de trânsito real** — quantos dias a carga levou de fato. Serve para planejamento e é um componente do OCT. É o número que o Juan descreveu.

**OTD é outra pergunta: cumpriu ou não o que foi prometido?** É um sim ou não por envio, e depois um percentual sobre o conjunto:

```
data_prometida = data_coleta + prazo_cotado   (em dias ÚTEIS, respeitando feriados)
envio pontual  = data_entrega_real <= data_prometida
OTD %          = envios pontuais ÷ envios entregues no período
```

E vale medir junto o **atraso médio quando atrasa** (`data_entrega_real − data_prometida`, só quando positivo), porque 90% de pontualidade com atrasos de um dia é uma operação saudável e 90% com atrasos de duas semanas não é — o percentual sozinho esconde isso.

Os dois números juntos ainda revelam um terceiro insight, que é o mais útil numa negociação: comparar **prazo cotado contra tempo de trânsito real** por transportadora mostra quem promete de menos e entrega antes (cotou 5, entregou em 3 — confiável, e você está planejando com folga desnecessária) e quem promete de mais e não cumpre (cotou 2, entregou em 5 — é essa que precisa ser confrontada com dados).

Uma exigência fácil de esquecer e que quebra o indicador em silêncio: o cálculo da data prometida precisa de um **calendário de feriados** (nacionais e das praças relevantes). Sem ele, todo prazo que atravessa um feriado gera atraso falso e o OTD fica artificialmente ruim.

---

## 12. Backup — opções e recomendação

> *"Não sei como me decidir sobre o backup, preciso de ideias."*

A decisão fica fácil respondendo duas perguntas: **quanto de dado você aceita perder** (uma hora? um dia? uma semana?) e **em quanto tempo precisa estar de volta no ar**. Para este caso — histórico de frete, cerca de onze cotações por dia, dado que é base de indicador e não de emissão fiscal — perder algumas horas é chato e recuperável; perder tudo é o que não pode acontecer.

Três caminhos, do mais simples ao mais completo:

**A. Recuperação no tempo, do próprio banco.** O Neon nos planos pagos permite restaurar o banco para qualquer instante dentro de uma janela (dias ou semanas). Zero código, protege contra o erro mais comum ("apaguei sem querer há dez minutos"). Custa em torno de US$ 19/mês.

**B. Cópia diária para fora do provedor.** Uma rotina agendada gera o arquivo de despejo do banco e grava num armazenamento separado. Custa quase nada — no caminho gratuito da seção 17, é uma rotina do GitHub Actions — e protege contra o que o item A não cobre: problema no provedor, conta suspensa, projeto apagado por engano.

**C. Os dois.** É o recomendado quando os dashboards entrarem no ar, porque aí o histórico passa a sustentar decisão de dinheiro.

**Recomendação prática:** começar por **B agora** — é gratuito, protege do pior cenário e é um exercício de aprendizado direto no que o Juan quer estudar (rotina agendada, credencial de armazenamento, restauração). Adicionar **A** se e quando migrar para o plano pago do banco.

Dois pontos que costumam ser esquecidos. Primeiro: **um backup que ninguém restaurou é uma hipótese, não um backup** — vale fazer uma restauração de teste na primeira semana e repetir uma vez por ano. Segundo, como consolo: uma vez que a sincronização com o Sankhya exista, os fatos também vivem lá, e as transportadoras guardam os registros delas — uma perda total do banco apagaria a camada de análise, não a verdade do negócio. É um alívio, não um substituto.

---

## 13. Catálogo de erros — requisito registrado

> *"Me lembre de fazer as mensagens de erro pensando em todos os erros."*

Registrado como requisito de projeto, e não como polimento: em integração com terceiros, a mensagem de erro **é** a interface na hora em que mais importa. O método é enumerar os modos de falha de cada ponto de integração e escrever a mensagem de cada um antes de codificar, com três informações — o que aconteceu em português claro, se o operador pode resolver, e qual é a próxima ação.

A lista de partida, por categoria:

| Falha | O operador pode resolver? | Direção da mensagem |
|---|---|---|
| Credencial inválida ou expirada | Não | Avisa que é configuração e quem acionar; não sugere tentar de novo |
| Sem cobertura para o destino | Sim | Diz que a transportadora não atende e não foi consultada |
| Dado inválido (CEP, CNPJ, peso, valor) | Sim | Aponta o campo exato e o que está errado |
| Transportadora não respondeu no tempo | Sim (tentar só ela) | Diz que as outras seguiram, oferece repetir só aquela |
| Transportadora fora do ar | Não | Sugere seguir com as que responderam |
| Resposta em formato inesperado | Não | Registra o retorno bruto e avisa que a integração precisa de ajuste |
| Limite de chamadas atingido | Sim (aguardar) | Diz quanto tempo esperar |
| Banco indisponível | Não | Deixa claro que a cotação vale, mas não foi registrada |
| Sessão expirada | Sim | Leva ao login preservando o que foi digitado |
| Pedido não encontrado no Sankhya | Sim | Pergunta se o número está certo, permite seguir sem amarrar |

Duas regras que valem para todas: **nunca mostrar retorno técnico bruto como mensagem principal**, mas **sempre deixar o detalhe técnico acessível** num campo copiável — foi exatamente esse padrão, criado para depurar a Rodonaves em 08/09, que permitiu descobrir em uma tentativa que os campos reais eram `ProtocolNumber` e `Value`. O que era um recurso de emergência vira padrão da casa. E **todo erro é registrado** com contexto (empresa, pedido, transportadora, retorno) mesmo quando a tela mostra a versão amigável.

---

## 14. Operação por teclado — o que significa na prática

> *"Não entendi muito bem sobre operação por teclado."*

Significa que o operador consegue fazer uma cotação inteira **sem tocar no mouse**. Não é acessibilidade abstrata: com onze cotações por dia e uns doze campos cada, cada ida e volta ao mouse cobra alguns segundos, e a soma disso é a diferença entre uma ferramenta que a expedição adora e uma que ela tolera.

Concretamente, sete comportamentos: a página abre com o cursor **já dentro do primeiro campo**; **Tab** anda na ordem visual, de cima para baixo (e não pula para a barra lateral no meio do formulário); **Enter** dispara a cotação de qualquer campo do formulário; **Esc** limpa (com a opção de desfazer); o CEP e o CNPJ **se formatam durante a digitação** e o campo avança sozinho quando completa; **as setas** escolhem o tipo de caixa sem abrir a lista; e um atalho para as duas ações principais, mostrado na própria barra de ação — como está na prévia (`Enter cota · Esc limpa · Tab avança`). Mostrar o atalho na tela é parte do recurso: atalho que ninguém descobre não existe.

---

## 15. Como subir de nível em interface — o ponto 6.5, reexplicado

> *"Não entendi o ponto 6.5."*

Aquele item era abstrato. Em termos práticos, são três hábitos e um teste.

**Copie estrutura, não estética.** Escolha duas ou três ferramentas do mesmo tipo do seu sistema (painéis de operação, não sites bonitos) e, em vez de olhar as cores, olhe as **decisões**: quantas colunas usam, quão apertadas são as linhas de tabela, onde fica o botão principal, como mostram uma lista de resultados, como sinalizam situação. Você está copiando o raciocínio, que é transferível, não a aparência, que não é.

**Dê um emprego a cada cor e não deixe ela fazer bico.** Vermelho é erro — então nada mais é vermelho. Dourado é destaque — então aviso é laranja. Quando tudo é colorido, nada se destaca; a paleta da seção 3 é exatamente esse exercício aplicado.

**Desenhe antes de codificar.** É o que estamos fazendo com a prévia: decidir o layout numa tela descartável e implementar uma vez só. Você já fez isso certo em 02/09, quando aprovou o mockup antes de aplicar o padrão do WMS — é para virar hábito, não exceção.

**E o teste, que é o mais útil de todos: conte.** Abra uma tela sua e conte quantos tamanhos de fonte, quantas cores e quantos espaçamentos diferentes ela usa. Se passar da sua escala (oito tamanhos, seis cores de função, sete espaçamentos), você derrapou em algum lugar. Foi essa contagem que revelou os dez tamanhos de fonte e as duas paletas do sistema atual. É um diagnóstico que você faz sozinho, em cinco minutos, sem designer nenhum — e é o mais próximo de um "medidor de nível" que existe em interface.

---

## 16. Ajustes ao documento de reposicionamento

Três pontos de `plataforma-frete-reposicionamento.md` ficam substituídos pelo que está aqui:

**Onda 0, "titularidade".** Onde se lia "repositório numa organização GitHub da RARE WAY e projeto num time Vercel da empresa", vale agora a seção 1 deste documento: código na conta do Juan, instância com segundo administrador, credenciais e dados tratados como ativos da RARE WAY, mais um documento de "como assumir".

**Seção 5, "onde vive o BI".** Fica detalhado pela seção 6.1: quatro destinos (campos no pedido, `AD_FRETE_COTACAO`, `AD_FRETE_COTACAO_ITEM` e `AD_FRETE_ENVIO`), com as perdedoras subindo como linha e o "realizado" marcado por campo de situação, não por tabela separada.

**Seção 2.2, "lacunas de informação".** Parte das lacunas apontadas já tem campo criado no `TGFCAB` — mas todos vazios (seção 5). O ganho é não precisar criar campo; a perda é que não há histórico, então os indicadores de prazo começam do zero.

**Seção 7, "custo mensal".** O documento anterior estimava cerca de US$ 40/mês. A seção 17 abaixo mostra que a maior parte disso é evitável, e `justificativa-custo-plataforma.md` traz a justificativa pronta para o que sobrar.

Também entram como requisitos novos, não previstos no documento anterior: regra de cobertura por transportadora (seção 9), régua de "quanto vale um dia" (seção 8), catálogo de erros (seção 13) e conjunto de filtros (seção 10).

---

## 17. Dá para rodar sem pagar?

> Pergunta do Juan: *"Tem como fazer o projeto sem pagar?"*

**Quase tudo sim.** Peça por peça, existe camada gratuita suficiente para o volume real da operação (onze cotações por dia, algumas dezenas de envios abertos por vez, milhares de linhas por mês — nada disso chega perto de qualquer limite). Há **um único item que não é negociável por trade-off técnico**, porque é regra de contrato e não limitação de recurso.

| Peça | Opção gratuita | Limite real | Como conviver |
|---|---|---|---|
| Código e versionamento | GitHub, repositório privado | — | Nada a contornar |
| Banco de dados | Neon, camada gratuita (~0,5 GB) | Recuperação no tempo curta; o banco hiberna com inatividade | Nosso volume é de poucos MB; a hibernação só deixa o primeiro acesso mais lento; a recuperação é coberta pelo backup diário |
| Agendamento (rastreio, sincronização, backup) | **GitHub Actions agendado** chamando um endereço protegido da plataforma | 2.000 minutos/mês em repositório privado, e cada execução conta arredondada para 1 minuto | A cada **30 minutos** cabe folgado (~1.440 min/mês). A cada 15 minutos estoura o limite |
| Backup diário | GitHub Actions gerando o despejo e guardando fora do banco | Retenção do arquivo | Um despejo comprimido de milhares de linhas tem poucos KB |
| Rastreamento de erro | Sentry, camada gratuita | ~5 mil eventos/mês | Muito acima do que essa operação gera |
| Monitor de disponibilidade | UptimeRobot ou similar, camada gratuita | Checagem a cada 5 minutos | Suficiente para avisar em minutos |
| Endereço do site | Subdomínio do provedor | Nome menos bonito | Domínio próprio custa R$ 40–60 por ano, se quiser |

**O item que não é trade-off:** o plano **Hobby do Vercel é destinado a uso não comercial**. Uma ferramenta que opera o frete de três empresas é uso comercial. Isso é regra do Vercel, não opinião — e a consequência de descumprir não é uma fatura, é a conta ser suspensa, derrubando a ferramenta em produção sem aviso. Três saídas honestas:

**(a) Migrar a hospedagem para um provedor cuja camada gratuita permita uso comercial.** O Cloudflare Workers é o mais forte candidato: gratuito em volume muito acima do necessário, uso comercial permitido, e com agendamento incluído — o que de quebra resolve o limite de execuções do GitHub Actions. Custo em dinheiro: zero. Custo em trabalho: uma migração real, porque o ambiente de execução é diferente do Vercel. Tem, por outro lado, **valor de estudo alto**, que é um dos objetivos declarados do Juan.

**(b) A RARE WAY custear a hospedagem** (cerca de US$ 20/mês). E aqui vale desfazer um mal-entendido: **a empresa pagar a infraestrutura não transfere a propriedade do código.** Reembolso de hospedagem é despesa operacional; o que define titularidade é o combinado, não quem paga a conta. Se quiser eliminar qualquer dúvida futura, uma linha escrita resolve — algo como *"o código é de autoria do Juan, licenciado para uso interno da RARE WAY; a empresa custeia a hospedagem e é titular dos dados operacionais e das credenciais das transportadoras."* **A justificativa pronta para esse pedido está em `justificativa-custo-plataforma.md`.**

**(c) O Juan pagar do próprio bolso.** Legítimo se ele quiser manter tudo estritamente pessoal, mas é ele bancando uma ferramenta de trabalho da empresa — e com o tempo isso costuma virar desconforto.

**Recomendação:** (b) se a empresa aceitar, porque é o caminho mais curto e o mais correto do ponto de vista de quem se beneficia. (a) se ele quiser custo zero de verdade e encarar a migração — e nesse caso o roadmap não muda, só o lugar onde o código roda.

Vale registrar o mais importante: **nada no roadmap exige infraestrutura paga.** Os cinco indicadores, o rastreio unificado, a API para a TI e os backups cabem inteiros nas camadas gratuitas. O que o dinheiro compra aqui é conforto (agendamento mais frequente, recuperação do banco em um clique) e conformidade com os termos do provedor — não capacidade.
