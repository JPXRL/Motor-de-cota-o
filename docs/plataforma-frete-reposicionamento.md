# Plataforma de Frete RARE WAY — Reposicionamento e Plano de Maturidade

> Documento escrito em 09/09/2026, a pedido do Juan: *"quero que pare de considerar como um projeto amador e repense toda a estrutura do projeto. Pare de pensar que é algo momentâneo e pense em um projeto que dure, que tenha manutenção regular, acompanhamento."*
>
> **Decisões tomadas pelo Juan nesta data, que orientam todo o resto deste documento:**
> 1. **O motor deixa de ser interino e passa a ser a plataforma oficial de frete da RARE WAY**, construída com esse objetivo. A documentação das transportadoras continua sendo entregue à TI, mas o motor também vai **expor uma API** para o sistema de força de vendas consumir — "para que tudo seja por aqui, pois se no futuro não tiver mais a força de vendas deles, ainda terá esse motor de frete".
> 2. **Os dashboards vivem no Sankhya, em tabelas customizadas** (padrão `AD_`) alimentadas pela plataforma, para que os painéis nativos cruzem com `TGFCAB` (venda, frete, cliente) sem exportar nada.
> 3. **"Realizado" começa pelo `VLRFRETETOTAL` da nota** (já existe no Sankhya) e evolui para a **fatura/CT-e** da transportadora, passando a comparar três números: cotado × pago à transportadora × cobrado do cliente.
> 4. **As três empresas do grupo (1, 4 e 6) entram desde já** — empresa passa a ser um campo do sistema (remetente, credenciais e visibilidade por empresa).
>
> Este documento **substitui** as decisões conflitantes registradas em `motor-cotacao-frete-arquitetura.md` e `plano-projeto-cotacao-frete.md` — a seção 8 lista uma por uma o que muda e por quê.

---

## 1. O que muda quando o projeto deixa de ser momentâneo

A diferença entre uma ferramenta interina e uma plataforma não é quantidade de recurso: é **quem depende dela e por quanto tempo**. Uma ferramenta interina pode ter dono único, pode viver numa conta pessoal, pode não registrar quem fez o quê, pode não ter backup — porque a expectativa é que ela seja descartada. Uma plataforma não pode nada disso, porque a empresa passa a tomar decisões de dinheiro em cima dela.

E a RARE WAY já toma. O levantamento jan-jul 2026 (`levantamento-frete-jan-jul-2026.md`) mostra **R$ 269 mil de frete em sete meses** nas empresas 1, 4 e 6 — cerca de R$ 38 mil por mês, sobre 1.630 notas. São aproximadamente **onze cotações por dia útil**. Esse número é importante duas vezes: primeiro porque justifica tratar a ferramenta como plataforma (é dinheiro real e recorrente); segundo porque mostra que **o volume é pequeno em termos de computação** — nenhuma decisão técnica aqui precisa ser dimensionada para escala grande, o que deixa o projeto barato e simples de manter. O desafio nunca vai ser volume; vai ser confiabilidade, continuidade e qualidade de informação.

O reposicionamento tem três consequências diretas, e é bom nomeá-las antes de entrar em detalhe. A primeira é que **a plataforma passa a ser sistema de registro**, não só de apoio: se ela é a única que sabe quais cotações existiram e onde as cargas estão, os dados dela precisam de backup, versão e auditoria. A segunda é que **ela precisa sobreviver ao dono** — hoje ela depende da conta pessoal do Juan no Vercel e no GitHub, o que significa que a continuidade da operação de frete da empresa está amarrada a uma pessoa. A terceira é que **a fronteira com o Sankhya precisa ser explícita**, porque a decisão original ("Sankhya é a fonte da verdade, sem banco externo") foi tomada quando o escopo era só agilizar digitação, e ela não sobrevive ao escopo novo.

**Sobre o nome:** o Juan mencionou que o nome está a decidir. Vale trocar, e não por estética: "motor de cotação" descreve um terço do que a coisa faz hoje (cota, rastreia e vai medir desempenho) e vai descrever menos ainda depois deste plano. Um nome curto e neutro de escopo — algo como **Rota**, **RW Frete** ou **Malha** — envelhece melhor e evita a conversa de "o motor de cotação agora também faz rastreio?". A recomendação é escolher antes da Onda 1, porque o nome entra no repositório, no domínio, nas tabelas do Sankhya e na documentação da API — trocar depois custa retrabalho bobo.

---

## 2. Diagnóstico — o que está ruim hoje

Antes de criticar, vale registrar o que está sólido, porque é mais do que a maioria das ferramentas internas tem: credenciais nunca chegam ao navegador, HTTPS forçado, headers de segurança, proteção contra XSS e CSRF, timeout por chamada, validação de dados antes de gastar chamada paga, três integrações reais funcionando em produção, código em Git com deploy automático, e um banco Postgres de verdade já conectado. Nada disso precisa ser refeito.

O que está ruim se divide em três naturezas diferentes, e confundir elas é o que faz projeto virar retrabalho.

### 2.1 Riscos de continuidade — o que pode parar a operação

O problema número um é que **a plataforma mora em contas pessoais**. O repositório é `JPXRL/Motor-de-cota-o` (conta pessoal) e o projeto Vercel está na conta pessoal do Juan. Isso já estava registrado como pendência na arquitetura, mas com o reposicionamento deixa de ser "pendência" e passa a ser risco inaceitável: férias longas, troca de computador ou saída da empresa deixam a RARE WAY sem controle de uma ferramenta que gasta R$ 38 mil por mês. Há ainda um detalhe contratual que reforça isso: o plano Hobby do Vercel é destinado a uso não comercial — uma ferramenta corporativa em conta pessoal no Hobby é irregular além de frágil.

O segundo é que **não existe identidade de usuário**. Hoje há uma senha única compartilhada. Isso foi uma escolha consciente e correta no contexto de então (a tentativa de login individual não funcionou de forma confiável e o Juan pediu simplicidade). Mas com o escopo novo ela quebra três coisas ao mesmo tempo: não dá para saber quem cotou nem quem escolheu uma transportadora mais cara, não dá para separar a visibilidade por empresa (que é uma exigência já registrada — cada empresa deve ver só o que é dela), e não dá para medir desempenho por pessoa ou por unidade. **Auditoria deixou de ser um requisito de segurança e passou a ser um requisito de dados.**

O terceiro é que **não existe backup nem monitoramento**. O banco Neon no plano gratuito tem retenção limitada de recuperação; se alguém rodar um comando errado ou o histórico corromper, não há de onde voltar. E se a plataforma cair numa sexta à tarde, ninguém descobre até alguém reclamar — o alerta de "sistema fora do ar" (Plano B nível 2) e o de "transportadora falhando demais" (nível 3) estão descritos na arquitetura desde o início do projeto e nunca foram implementados.

### 2.2 Lacunas de informação — o que impede os relatórios que você quer

Esta é a parte mais importante do diagnóstico, porque é a que bloqueia diretamente os cinco dashboards pedidos. A tabela `historico_cotacoes` de hoje tem cliente, CNPJ, cidade, peso, valor, transportadora vencedora, valor, prazo e percentual. **Ela não tem o número do pedido.** Sem `NUNOTA`, nenhuma cotação pode ser cruzada com a nota que de fato saiu — e "Cotado x Realizado" é, literalmente, esse cruzamento. Hoje cada registro de cotação é um órfão.

Faltam, além disso: a **empresa** (`CODEMP`) — o que também explica por que o motor só consegue cotar para um dos três CNPJs do grupo, já que o remetente está fixo; o **usuário** que cotou; o **motivo da escolha**, quando o operador não escolhe a mais barata (sem esse campo, toda análise de custo é desonesta, porque escolher a segunda mais barata por exigência do cliente aparece como desperdício); as **cotações perdedoras em formato consultável** (hoje elas existem dentro de uma coluna JSON, o que serve para conferir um caso mas não para calcular taxa de vitória ou distância média até o vencedor); o **CT-e** e as **datas** de coleta, expedição, prazo prometido e entrega real; e o **valor efetivamente faturado** pela transportadora.

E falta a coisa mais estrutural de todas: **nada do rastreio é guardado**. A tela de Rastreio é uma consulta pontual — o operador digita uma nota, vê o resultado e o resultado desaparece. Isso significa que a plataforma não sabe responder "o que está atrasado agora?", e por consequência não pode calcular OTD, OCT nem Perfect Order Rate, que são três dos cinco relatórios pedidos.

### 2.3 Dívida de estrutura — o que encarece cada manutenção

O `index.html` tem 1.660 linhas com HTML, CSS e JavaScript no mesmo arquivo, e o `login.html` tem outras 240 com o CSS duplicado. Funciona, e para um protótipo foi a decisão certa. Para manutenção regular, é o que faz cada alteração ficar mais lenta e mais arriscada que a anterior.

Há uma consequência visível disso, que aparece na resposta sobre UI mais adiante mas vale registrar como dívida: **as duas telas usam paletas diferentes**. O login usa lilás `#8E3FC9` com dourado `#F5C63D` e nomes de variável próprios (`--acento`, `--tinta-escura`); o app usa rosa `#FD9FB1`, teal `#57D5D1` e lilás `#C0ADDB` com outro conjunto de nomes (`--accent`, `--text`). São, na prática, dois produtos visuais diferentes colados um no outro — e isso acontece justamente porque não existe uma fonte única de tokens de design.

Completam a lista: nenhum teste automatizado (toda mudança é validada visualmente, em produção, contra APIs pagas); nenhum ambiente de teste com credenciais separadas — a Braspress agrava isso porque não tem homologação, só produção; nenhum rastreamento de erro centralizado (os logs vivem no Vercel e ficam difíceis de vasculhar); e código morto acumulado (`api/me.js`, as variáveis `APP_USERS` e `SESSION_SECRET`, e quatro arquivos `.ps1` de depuração soltos na raiz do repositório).

---

## 3. Os processos e as informações que cada um precisa

O Juan perguntou: *"quais informações os principais processos necessitam?"*. Essa é a pergunta que organiza todo o resto, porque cada relatório pedido depende de um processo capturar um dado no momento em que ele existe — depois não dá para recuperar. Hoje a plataforma cobre bem o processo 1, parcialmente o 3, e não cobre 2, 4 e 5.

| # | Processo | O que a plataforma precisa capturar | Situação hoje |
|---|---|---|---|
| 1 | **Cotar** | Empresa, pedido (`NUNOTA`), cliente (`CODPARC`), destino (CEP/cidade/UF), mercadoria (valor, peso, volumes, cubagem), tipo de frete, modal, usuário que cotou | Captura quase tudo, **menos empresa, pedido e usuário** |
| 2 | **Escolher e despachar** | Qual cotação foi escolhida, **por quem, quando e por qual motivo**; e a amarração com o embarque real: nº da nota, CT-e, data de coleta | **Não existe** — a escolha só aparece como "melhor" (a mais barata), sem decisão registrada |
| 3 | **Acompanhar** | Lista persistente de envios em trânsito, com identificadores, prazo prometido, status atual, histórico de eventos e comprovante | **Consulta pontual, nada guardado** |
| 4 | **Conferir** | Valor cotado × valor na nota × valor faturado pela transportadora, com tolerância e motivo da divergência (reentrega, TDA, diferença de peso/cubagem, generalidades) | **Não existe** — é o objetivo original do projeto (Fase 6), nunca construído |
| 5 | **Analisar e negociar** | Série histórica de todas as cotações (vencedoras e perdedoras), R$/kg por rota, taxa de vitória, disponibilidade e pontualidade por transportadora | **Não existe** de forma consultável |

Vale destacar o processo 2, porque é o menos óbvio e o que mais destrava. Duas informações ali valem mais que qualquer tela nova. A primeira é o **`NUNOTA`**: como o fluxo já previsto na arquitetura começa com o operador informando o código do parceiro *do pedido*, o pedido já existe no Sankhya na hora da cotação — então pedir também o número do pedido é uma mudança de um campo no formulário que converte todo o histórico de cotações em base analítica cruzável. É a melhor relação entre esforço e valor de todo este documento.

A segunda é o **motivo da escolha**. Sem ele, um dashboard de custo mostra "a empresa deixou R$ 4.200 na mesa escolhendo transportadoras mais caras" sem distinguir desperdício de decisão correta (cliente que exige transportadora específica, região que a mais barata não atende, prazo que não cabia). Um campo com cinco ou seis opções fixas, preenchido em um clique no momento da escolha, é a diferença entre um relatório que gera ação e um que gera discussão.

---

## 4. Acompanhar todas as transportadoras ao mesmo tempo

> Pergunta do Juan: *"como faço para acompanhar em todas transportadoras ao mesmo tempo? Persistência de dados é um caminho? pois ele pesquisa todas as notas e apresenta."*

**Sim — persistência não é *um* caminho, é o único.** E vale entender exatamente por quê, porque a razão determina o desenho.

As APIs de rastreio das três transportadoras respondem à pergunta "onde está *este* documento?". Nenhuma delas responde "liste tudo o que está em trânsito para o CNPJ da RARE WAY". Ou seja: para montar um painel com todos os envios de todas as transportadoras, a plataforma precisa **já saber quais envios existem antes de perguntar**. Essa lista não pode vir da transportadora — ela tem que vir de dentro da empresa. E o lugar onde ela existe é o Sankhya: são as notas emitidas com frete, exatamente o recorte do levantamento jan-jul (`TIPMOV = 'V'`, `VLRFRETETOTAL > 0`).

A arquitetura, então, é esta divisão de papéis: **o Sankhya diz o que rastrear; as transportadoras dizem onde está; a plataforma guarda o histórico e normaliza tudo num formato só.**

Na prática, isso são duas tabelas novas e um mecanismo de atualização. A tabela de **envios** é o registro de embarques: uma linha por nota embarcada, criada quando a nota é emitida (lida do Sankhya) ou quando uma cotação é escolhida, guardando empresa, transportadora, nota, CT-e, cotação de origem, prazo prometido, status atual e data de entrega real. A tabela de **eventos de rastreio** é um histórico que só cresce: uma linha por ocorrência, com data, código da transportadora, código Proceda, descrição, local e a categoria normalizada. Eventos repetidos são descartados por uma chave de duplicidade, porque tanto o webhook quanto a consulta periódica podem trazer o mesmo evento duas vezes.

A atualização entra por transportadora, pelo mecanismo que cada uma realmente oferece — o desenho já recomendado em `levantamento-webhooks-ocorrencias-transportadoras.md` continua válido e agora tem onde ser implementado. A **Jamef** avisa sozinha, por webhook de eventos de ocorrências configurável no portal dela: a plataforma expõe uma URL e recebe os eventos na hora, sem nenhuma rotina programada. A **Braspress** não tem webhook, então precisa de consulta periódica na API de tracking v3, percorrendo só os envios ainda não entregues. A **Rodonaves** tem os endpoints de rastreio já documentados (`especificacao-api-rodonaves.md`, seção 5) e entra por consulta periódica também — com a alternativa de o EDI OCOREN ser configurado como envio automático, o que ainda depende da pergunta pendente ao contato deles.

Dois detalhes de implementação que importam. O primeiro: com onze notas por dia e prazos de poucos dias, a lista de envios abertos fica na casa de algumas dezenas — uma varredura completa a cada quinze ou trinta minutos é trivial, e o custo é irrelevante. O segundo: o agendamento no plano Hobby do Vercel permite apenas uma execução diária, o que é insuficiente para um painel de acompanhamento — é um dos motivos concretos para mover o projeto para uma conta de time paga, junto com a questão contratual já mencionada.

Feito isso, o painel que você descreveu ("ele pesquisa todas as notas e apresenta") deixa de ser uma busca e passa a ser uma tela que já está pronta quando abre, com os envios agrupados por situação: em trânsito no prazo, **em risco de atraso** (prazo vence hoje ou amanhã e ainda não saiu para entrega), **atrasados**, com ocorrência que exige ação, e entregues. E o mais importante: as duas tabelas que sustentam esse painel são exatamente as que produzem OTD, OCT e Perfect Order Rate. **O painel de rastreio e os três relatórios de serviço são o mesmo investimento.**

---

## 5. Levar informação para o Sankhya e montar os cinco dashboards

> Decisão registrada: dashboards no Sankhya, em tabelas customizadas (`AD_`) alimentadas pela plataforma.

### 5.1 O desenho da integração

São três caminhos de ida e volta, com propósitos diferentes, e é importante não confundi-los.

O primeiro são os **quatro campos customizados no próprio pedido** (protocolo, valor, prazo e percentual sobre o pedido), decisão já registrada e que continua válida. A função deles é operacional: quem abre o pedido no Sankhya vê qual frete foi decidido, sem sair da tela. Eles não servem para análise histórica.

O segundo são as **duas tabelas customizadas**, que são a base analítica de verdade. A sugestão é `AD_FRETE_COTACAO`, com uma linha por pedido cotado, e `AD_FRETE_ENVIO`, com uma linha por embarque. Elas ficam propositalmente "achatadas" — sem JSON, sem lista dentro de campo — porque o objetivo é que os painéis nativos do Sankhya consigam cruzá-las com `TGFCAB` por `NUNOTA` e `CODEMP` diretamente, sem transformação. A plataforma envia para elas de forma incremental, só o que mudou desde a última sincronização, e mantém um registro do que subiu para permitir reprocessamento.

O terceiro é a **leitura do Sankhya pela plataforma**: buscar os dados do cliente pelo código do parceiro (encerrando a busca simulada que existe hoje) e buscar as notas emitidas com frete para alimentar o registro de envios. Esse caminho é o que amarra tudo, e depende do acesso à API do Sankhya que já está disponível em desenvolvimento.

Uma observação sobre o detalhe de eventos: os eventos de rastreio individuais **não** devem subir para o Sankhya. São de dez a trinta linhas por envio, de baixo valor analítico isoladamente, e inflariam a tabela sem benefício. O que sobe é o resumo por envio — datas, situação final, contagem de ocorrências por categoria. O histórico completo fica na plataforma, que é quem tem tela para ele.

### 5.2 Os cinco relatórios, campo por campo

**Cotado x Realizado.** O cotado vem do valor da cotação escolhida; o realizado, na fase 1, é o `VLRFRETETOTAL` da nota, já disponível em `TGFCAB`. A métrica é a divergência em reais e em percentual, e o indicador de gestão é o percentual de pedidos dentro de uma tolerância a definir (±5% é um ponto de partida razoável). O pré-requisito absoluto é o `NUNOTA` na cotação — sem ele este relatório não existe. Na fase 2, com a fatura da transportadora ingerida, o relatório passa a ter três colunas: cotado, pago à transportadora e cobrado do cliente. A comparação entre as duas últimas é um indicador que ninguém pediu mas que provavelmente vale mais que o resto: **a margem de repasse do frete**, ou seja, quanto do frete pago está sendo efetivamente recuperado no faturamento.

**Custo de transporte (validando a transportadora).** A base já existe e já foi medida: o percentual ponderado de frete sobre venda ficou em 3,21% em 2026 contra 3,23% em 2025, com o gasto absoluto crescendo 21%. O que falta é decompor. Com peso e destino vindos da cotação, entram **R$ por quilo e R$ por rota** — que são as medidas que revelam reajuste de tabela, coisa que o percentual sobre venda esconde (se o ticket médio subir, o percentual cai mesmo com o frete encarecendo). E com as cotações perdedoras armazenadas como linhas, entram os indicadores que efetivamente "validam a transportadora": **taxa de vitória**, **distância média até o vencedor** (quanto a perdedora custaria a mais), **disponibilidade** (percentual de vezes que respondeu sem erro) e **prazo médio ofertado**. Cruzando isso com pontualidade real, aparece a matriz que interessa numa negociação: quem é barata e cumpre, quem é barata e atrasa, e quem só faz volume.

**On-Time Delivery.** Precisa de duas datas: a prometida e a real. A real vem do evento de entrega no rastreio. A prometida é calculada a partir do prazo cotado em **dias úteis** contados da coleta — e aqui há uma exigência fácil de esquecer que quebra o indicador silenciosamente: **um calendário de feriados**, nacionais e das praças relevantes. Sem ele, todo prazo que atravessa um feriado gera atraso falso. Recomendo medir duas versões do indicador: OTD contra o prazo que a transportadora cotou (que é performance dela) e, se houver data prometida ao cliente, OTD contra ela (que é performance da empresa). E medir também o **atraso médio quando atrasa**, porque 90% de pontualidade com atrasos de um dia é uma operação saudável, e 90% com atrasos de duas semanas não é.

**Order Cycle Time.** É o tempo do pedido até a entrega, mas medido como número único ele não gera ação. O valor está em decompor em três etapas: pedido até faturamento (interno, comercial/financeiro, vem do Sankhya), faturamento até coleta (expedição e agendamento da transportadora, vem do primeiro evento de rastreio) e coleta até entrega (transportadora). Só assim o relatório responde onde o tempo se perde. Recomendação técnica: usar **mediana e percentil 90**, não média — em logística a média é dominada por poucos casos extremos e engana.

**Perfect Order Rate.** É o indicador mais exigente porque é uma combinação: percentual de pedidos entregues completos, no prazo, sem avaria e com documentação correta. Cada componente tem fonte diferente — completo vem do Sankhya (itens faturados contra pedidos), no prazo vem do OTD, sem avaria e sem erro documental vêm da **classificação dos eventos de ocorrência**. Por isso ele depende de uma peça que não existe hoje e precisa ser construída: uma **tabela de-para de códigos de ocorrência**, traduzindo os códigos Proceda de cada transportadora em categorias de negócio (entregue, tentativa frustrada, avaria, extravio, devolução, erro de documentação, aguardando retirada) e marcando quais delas descaracterizam um pedido perfeito e de quem é a responsabilidade. Recomendo lançar uma versão 1 com os dois componentes que a plataforma entrega sozinha (prazo e ocorrência) e evoluir para os quatro quando a TI expuser os dados de completude e documentação — um indicador parcial e honesto, com o critério declarado na tela, vale mais que esperar seis meses pelo completo.

### 5.3 Perguntas que precisam ir para a TI

Cinco definições dependem da TI e valem ser perguntadas de uma vez, antes da Onda 3: se a criação de tabelas customizadas (`AD_`) é liberada e qual o padrão de nomenclatura da casa; qual módulo de painel/BI do Sankhya está licenciado, para saber o que os dashboards conseguem fazer nativamente; se o pedido já registra a transportadora escolhida em campo próprio (algo como `CODPARCTRANSP`) e se há campo de peso e cubagem; quais serviços da API do Sankhya estão liberados para escrita e quais os limites de chamada; e quem cria os sete logins individuais e como eles se relacionam com a autenticação da plataforma.

---

## 6. Frontend — sair do padrão atual e elevar o nível

> Perguntas do Juan: *"Como faço para sair desse padrão e elevar meu nível de UI/UX? Melhorar minha estrutura de layout é possível? Deixar de uma forma que visualmente fique apresentável?"*

A resposta honesta é que o que separa a tela atual de uma tela profissional **não é talento visual nem gosto** — é a ausência de três coisas mecânicas e aprendíveis: um sistema de decisões pré-tomadas, um layout desenhado para a tarefa, e o cuidado com os estados. Nenhuma delas exige ser designer.

### 6.1 A causa real: cada decisão está sendo tomada uma vez

Dá para ver isso no código. A tela usa hoje os tamanhos de fonte 9,5 / 11 / 12 / 12,5 / 13 / 13,5 / 14 / 14,5 / 15 e 32 pixels — dez tamanhos, escolhidos um por um, no momento de escrever cada elemento. As cores são derivadas por `color-mix()` caso a caso, sem uma escala definida. Os espaçamentos, radios e sombras seguem a mesma lógica de decisão pontual. E, como já registrado no diagnóstico, login e app acabaram com **duas paletas diferentes**, porque não existe um lugar único que defina o que é "a cor de destaque da RARE WAY".

Isso é exatamente a assinatura de interface amadora — e a correção é mecânica. Define-se uma vez, num único arquivo de tokens: uma **escala tipográfica** de seis a sete degraus (por exemplo 12, 14, 16, 20, 24, 32, 40) e nada fora dela; uma **escala de espaçamento** baseada em 4 pixels (4, 8, 12, 16, 24, 32, 48) para todo padding, margem e gap; **dois ou três raios** de borda; **três níveis** de elevação; e **cores semânticas** com papel declarado (superfície, borda, texto, texto secundário, destaque, sucesso, atenção, erro), unificadas entre as duas telas. A partir daí, "que tamanho uso aqui?" deixa de ser uma decisão criativa e passa a ser uma escolha entre sete opções — e a consistência, que é 80% da percepção de qualidade, vem de graça.

O complemento disso é uma página de **guia de estilo viva** (`design-system.html`) dentro do próprio projeto, mostrando todos os tokens e componentes renderizados. É o que permite manter a coerência sem designer e sem depender de memória: antes de criar um componente novo, você olha se ele já existe.

### 6.2 Layout: a tela precisa seguir a tarefa

Hoje o conteúdo é uma coluna central de 880 pixels com painéis empilhados, dentro do shell da barra lateral. O efeito prático para quem cota onze vezes por dia é rolar para baixo para ver o resultado, rolar para cima para ajustar um dado, rolar para baixo de novo. A tela está organizada como uma página de leitura, não como um posto de trabalho.

Para uma ferramenta de uso diário, o desenho que funciona é **duas colunas**: entrada de dados à esquerda, resultado fixo (sticky) à direita, com a barra de ação sempre visível. O operador altera o peso e vê o comparativo mudar sem mover a página. Junto com isso vem um ajuste de **densidade**: ferramenta de operação usa espaçamento mais compacto que página de marketing — o padrão atual, herdado da estética do WMS de Brindes, é generoso demais para entrada de dados.

Vale também rever a **faixa de quatro indicadores** no topo. Ela mostra peso total, valor da mercadoria, transportadoras consultadas e melhor cotação — dados que o operador acabou de digitar ou que já estão na tabela abaixo. É decoração ocupando o espaço mais valioso da tela. Indicador bom mostra o que a pessoa **não** sabe: "esta cotação está 2,1 pontos acima da média desta rota", "esta transportadora atrasou 3 das últimas 10 entregas para esta cidade". Com os dados das ondas 1 e 2 no lugar, esses indicadores passam a ser possíveis — e aí a faixa ganha razão de existir.

### 6.3 Onde o nível realmente aparece: interação e estados

Esta é a parte que separa "bonito" de "bom", e é sistematizável. Para cada elemento que carrega dados, existem **quatro estados** que precisam ser desenhados de propósito: vazio (antes de existir dado, explicando o que fazer), carregando (com esqueleto no lugar do conteúdo, não um spinner genérico no meio da tela), erro (dizendo o que falhou e qual a próxima ação) e sucesso. A regra prática é: se você não desenhou os quatro, o componente não está pronto. Hoje eles existem de forma improvisada — e a mensagem de erro por transportadora, por exemplo, já é um bom começo que merece virar padrão.

Três melhorias concretas de interação, na ordem de impacto para quem usa: **resultado progressivo**, mostrando cada transportadora assim que ela responde em vez de esperar as três (a percepção de velocidade muda completamente, e o dado já existe — é só renderizar por linha); **operação por teclado**, com ordem de tabulação correta, Enter enviando, foco automático no primeiro campo e máscaras de CNPJ e CEP aplicadas durante a digitação; e **desfazer em vez de confirmar**, substituindo o alerta bloqueante por um aviso discreto com opção de reverter — vale especialmente para o botão "Apagar informações", que hoje é irreversível.

Dois pontos de acessibilidade que também são qualidade percebida: verificar o contraste do texto secundário sobre os fundos suaves (a combinação `--muted` sobre `--bg-soft` provavelmente não passa no critério AA, e isso afeta qualquer pessoa lendo em tela de notebook num galpão iluminado), e respeitar `prefers-reduced-motion` nas animações.

E um achado pontual que vale corrigir de imediato, porque é uma limitação falsa: o código não guarda a escolha de tema claro/escuro, com o comentário *"Sem localStorage (não é permitido em artefatos)"*. Essa restrição vem do ambiente de artefatos do Claude e **não se aplica ao site do Vercel**. Hoje o operador que prefere modo escuro perde a escolha a cada recarga, sem motivo.

### 6.4 Estrutura de código do frontend

A recomendação aqui é deliberadamente conservadora: **separar sem trocar de tecnologia**. Dividir o `index.html` em arquivos de CSS (tokens, base, componentes) e módulos de JavaScript nativos — um por tela (cotação, rastreio, caixas, histórico) mais dois compartilhados (chamadas à API e componentes de interface) — usando módulos ES, que funcionam direto no navegador sem etapa de build.

O motivo de não recomendar React ou similar é específico deste projeto: a aplicação é formulário e tabela, não precisa de framework; e, mais importante, **quem vier depois precisa conseguir manter**. Um projeto sem etapa de build é um projeto que qualquer pessoa abre, entende e altera em dez minutos, e que não quebra por dependência desatualizada dois anos depois. Se um dia houver uma equipe dedicada, essa decisão pode ser revista com custo baixo — a separação em módulos já é o preparo para isso.

### 6.5 Como subir de nível na prática

Três hábitos, em ordem de retorno. Primeiro, **copiar estrutura, não estética**: escolher duas ou três ferramentas da mesma categoria (painéis de operação — Linear, Stripe, ferramentas internas estilo Retool) e estudar como elas organizam densidade, hierarquia e ações, não que cor usam. Segundo, **restringir a paleta a significado**: cor comunica estado (sucesso, atenção, erro, destaque) e nunca decora; a marca aparece em um ou dois pontos de âncora por tela, não em tudo. Terceiro, **desenhar antes de codar**, mesmo que grosseiramente — o mockup aprovado antes de aplicar o padrão do WMS de Brindes, em 02/09, é exatamente o hábito certo, e vale repetir sempre.

---

## 7. Operação — o que faz o projeto durar

Nada nas seções anteriores sobrevive sem esta. As mudanças aqui são baratas e quase todas de uma vez só.

| Frente | O que fazer | Por que importa |
|---|---|---|
| **Titularidade** | Repositório numa organização GitHub da RARE WAY e projeto num time Vercel da empresa (plano pago), com pelo menos dois administradores | Elimina o risco de dono único e resolve a questão contratual do plano Hobby em uso comercial |
| **Identidade** | Login individual por pessoa, com empresa e papel — retomando a regra dos 7 acessos já registrada | Requisito de dados (auditoria, visibilidade por empresa), não só de segurança |
| **Ambientes** | Produção e pré-produção separadas, com credenciais próprias (Jamef tem homologação; Braspress não tem, então precisa de **modo simulado** obrigatório) | Hoje toda mudança é testada em produção, contra API paga |
| **Testes** | Conjunto pequeno e automatizado nos pontos que custam dinheiro: validação de CNPJ/CEP, cálculo de percentual, contagem de dias úteis, tradução de campos de cada transportadora | Roda a cada envio de código, de graça, e impede quebra silenciosa |
| **Observabilidade** | Rastreamento de erro (Sentry, gratuito), monitor de disponibilidade e alerta de "transportadora falhando demais" | Implementa o Plano B níveis 2 e 3, descritos desde o início e nunca construídos |
| **Backup** | Retenção adequada do banco (plano pago do Neon) ou rotina diária de cópia | A plataforma passou a ser sistema de registro; perder o histórico é perder a base dos indicadores |
| **Documentação** | Manter os documentos deste projeto como registro de decisões (já funcionam assim), mais um histórico de mudanças e um roteiro de incidentes | É o que permite outra pessoa assumir |
| **Ritual** | Meia hora por mês: revisar indicadores, saúde das integrações e prioridades | "Manutenção regular" só existe se estiver na agenda |
| **LGPD** | Hoje só há dado de empresa (CNPJ). Se entrar CPF de pessoa física, precisa de política de retenção | Vale manter no radar antes de acontecer |

O custo total dessa profissionalização fica em torno de **US$ 40 por mês** (time Vercel, banco com backup, rastreamento de erro e monitor gratuitos) — algo como R$ 220. Contra um gasto de frete de R$ 38 mil mensais, é **0,6% do que a plataforma administra**. Vale dizer isso em voz alta na hora de justificar internamente.

---

## 8. Decisões anteriores que este documento revisa

Quatro decisões registradas foram corretas no contexto em que foram tomadas e deixam de ser com o escopo novo. Registro aqui explicitamente para não haver dúvida sobre qual versão vale.

**"O motor é interino; a TI constrói o definitivo dentro da força de vendas."** → **Revisada.** O motor é a plataforma oficial de frete e passa a expor API para a força de vendas consumir. A entrega das especificações de transportadora à TI continua, mas como documentação de apoio, não como transferência de responsabilidade. Razão declarada pelo Juan: se a força de vendas deixar de existir no futuro, a plataforma de frete permanece.

**"Não guardar as cotações que não foram escolhidas."** → **Revisada.** Todas as cotações passam a ser guardadas, uma linha por transportadora. A decisão original tinha uma justificativa boa (sem risco operacional, já que a coleta nunca é automática) e a própria arquitetura já reconhecia a limitação: uma transportadora que fica sempre em segundo lugar, ficando cada vez mais caro, nunca apareceria. Com "validar transportadora" e negociação como objetivos explícitos, as perdedoras deixam de ser descarte e passam a ser o principal ativo analítico — é delas que saem taxa de vitória, distância até o vencedor e detecção de reajuste.

**"Sankhya é a fonte da verdade; sem banco de dados externo."** → **Revisada, com fronteira explícita.** O Sankhya continua sendo fonte da verdade de pedido, cliente e financeiro. A plataforma passa a ser fonte da verdade de cotações e de eventos de rastreio — que são listas por envio, não campos de pedido, e não têm como morar em campo customizado. A plataforma devolve ao Sankhya os resumos, nas duas tabelas customizadas e nos quatro campos do pedido.

**"Senha única compartilhada é suficiente."** → **Revisada.** Volta a valer a regra original de login individual (7 acessos: 6 operacionais nas três empresas mais o Juan como administrador), agora com uma razão diferente da de antes: não é só controle de acesso, é a origem dos campos "quem cotou" e "quem escolheu" e da separação de visibilidade por empresa. A tentativa anterior falhou por complexidade de implementação, não por ser a decisão errada — e agora há motivo suficiente para fazer direito.

---

## 9. Roadmap

A ordem abaixo é por destravamento, não por esforço: cada onda existe porque a seguinte depende dela. A trilha de interface corre em paralelo porque não bloqueia nada.

| Onda | Objetivo | Entregas principais |
|---|---|---|
| **0 — Fundação** | Tirar a plataforma da dependência de uma pessoa | Organização GitHub e time Vercel da empresa com dois administradores; login individual com usuário/empresa/papel; dimensão empresa no sistema (as três empresas, remetente e credenciais por empresa); ambiente de pré-produção com modo simulado; rastreamento de erro e monitor de disponibilidade; limpeza do código morto |
| **1 — Modelo de dados** | Transformar o histórico em base analítica | Cotação, itens de cotação (uma linha por transportadora, incluindo perdedoras) e escolha com **motivo**; `NUNOTA` e `CODEMP` na cotação; cadastro de transportadoras; migração do histórico atual sem perder o que já existe |
| **2 — Rastreio persistente** | Painel único de acompanhamento | Registro de envios e histórico de eventos; webhook da Jamef; consulta periódica de Braspress e Rodonaves (incluindo implementar o rastreio da Rodonaves, que ainda não existe no motor); de-para de códigos de ocorrência; painel com em trânsito / em risco / atrasado / com ocorrência / entregue |
| **3 — Sankhya bidirecional** | Os dois primeiros dashboards no ar | Busca real de cliente por código de parceiro; leitura das notas com frete; os quatro campos no pedido; tabelas `AD_FRETE_COTACAO` e `AD_FRETE_ENVIO` com sincronização incremental; dashboards de Cotado x Realizado (fase nota) e de Custo de transporte |
| **4 — Indicadores de serviço** | OTD, OCT e Perfect Order | Calendário de dias úteis e feriados; cálculo de data prometida; OTD nas duas versões; OCT decomposto em três etapas com mediana e p90; Perfect Order Rate versão 1 (prazo e ocorrência) |
| **5 — API e conferência** | Abertura para a TI e fechamento do objetivo original | API versionada (`/v1`) com autenticação por chave por consumidor, documentação e limites; ingestão de fatura/CT-e; Cotado × pago × cobrado, com margem de repasse e motivos de divergência; Perfect Order completo |
| **Paralelo — Interface** | Elevar o nível visual e de uso | Arquivo único de tokens e unificação da paleta entre login e app; separação de CSS e JS em módulos; guia de estilo vivo; layout de duas colunas com resultado fixo; quatro estados por componente; resultado progressivo; operação por teclado; correção do tema não persistido |

**Se for para escolher só três coisas para fazer primeiro**, seriam estas, nesta ordem: mover repositório e hospedagem para contas da empresa (elimina o risco que pode custar mais caro); adicionar `NUNOTA` e `CODEMP` na cotação (um campo no formulário que destrava dois dos cinco dashboards); e passar a guardar as cotações perdedoras como linha (que é o ativo que vai sustentar as negociações com as transportadoras).

---

## 10. Perguntas pendentes

**Para a TI da RARE WAY:** as cinco definições listadas na seção 5.3 (tabelas customizadas, módulo de BI, campos de transportadora/peso no pedido, serviços de escrita da API do Sankhya, criação dos logins).

**Para as transportadoras:** os valores aceitos de `PayerSelected` na Rodonaves e o `401` no endpoint principal de rastreio dela (ambos já com texto pronto, ver `especificacao-api-rodonaves.md`); se o EDI OCOREN da Rodonaves pode ser enviado automaticamente ou precisa ser buscado (pergunta pronta em `levantamento-webhooks-ocorrencias-transportadoras.md`); se a Braspress tem algum recurso de webhook não documentado; a especificação real do payload do webhook de ocorrências da Jamef; e, das três, qual tabela de códigos de ocorrência usam e como a fatura de frete é disponibilizada (arquivo, API ou EDI) — esta última destrava a Onda 5.
