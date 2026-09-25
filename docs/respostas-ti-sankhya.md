# Respostas da TI sobre o Sankhya — o que muda no projeto

> A TI respondeu as 21 perguntas de `perguntas-ti-sankhya.md` em **14/09/2026**, medindo na base de produção (189.575 notas em `TGFCAB`, dicionário `TDDCAM`/`TDDOPC`, cadastro `TGFPAR`) em vez de responder por suposição. Dezessete perguntas vieram medidas; quatro dependem de gente fora da TI — **duas delas já respondidas pelo Juan em 15/09/2026, ver seção 7.**
>
> Este documento registra o que foi confirmado, **o que caiu** e o que isso muda no plano. Ele **substitui** os pontos correspondentes de `plataforma-frete-definicoes.md` (seções 4, 5 e 6) e de `perguntas-ti-sankhya.md` — onde houver divergência, vale o que está aqui, porque aqui é medição e lá era premissa.

---

## 1. Quatro premissas nossas que não se sustentaram

Vale começar por elas, porque duas teriam virado bug.

**`VLRFRETECALCULO` não existe nesta instância.** Estava na lista que levantamos do dicionário; a TI aponta que provavelmente veio de documentação de outra versão do Sankhya. Existem três campos de frete no cabeçalho, não quatro.

**`TIPFRETE` não é CIF/FOB.** Este documento anterior registrou que era, e estava errado. O domínio real, cadastrado em `TDDOPC`, tem dois valores: **`S` = Incluso** (12.958 notas em 2026) e **`N` = Extra nota** (9.817). O campo é `NOT NULL`. A diferença muda o significado dos valores — ver seção 2.

**Os campos `AD_` de rastreio não estão abandonados.** Esta é a correção mais importante, e a premissa era minha: registrei como fato que "ninguém preenche, estão abandonados". A medição mostra que **três dos quatro estão em uso**, e um deles tem dois consumidores ativos. Se tivéssemos gravado em cima, quebraríamos um indicador de diretoria em silêncio. Detalhe na seção 3.

**A chave do CT-e não fica na nota de venda.** Ela só existe em notas de **compra** (`TIPMOV = 'C'`) — 2.320 de 4.309 em 2026, e **nenhuma** nota de venda. O CT-e entra no ERP como documento próprio. Ligar venda ↔ CT-e exige um *join*, não a leitura de um campo. Isso muda o desenho da conciliação — e, como a seção 6 mostra, para muito melhor do que parece à primeira vista.

**E uma quinta descoberta, que nem estava na lista:** existe uma segunda família de campos de frete, a **`BH_`**, de marketplace ("Custo Frete Mkt Place", "Data Prometida Market Place", "Cód Rastreio Market Place"), e ela **acordou em 2026** — `BH_DTENTREGA` e `BH_CUSTOFRETE` estão recebendo dado agora. Não é terreno vazio, e não devemos encostar.

---

## 2. Os campos de valor de frete

| Campo | Descrição oficial | Notas > 0 em 2026 | O que é |
|---|---|---|---|
| `VLRFRETE` | Vlr. do Frete | 4.293 | Frete que **compõe o valor da nota** |
| `VLRFRETETOTAL` | Vlr. Frete Total | 4.519 | **Frete total do embarque** |
| `FRETEVLRPAGO` | Vlr. frete pago | **0** | Nunca preenchido, em toda a história |
| `VLRFRETECALCULO` | — | — | Não existe |

O que separa os dois primeiros é o `TIPFRETE`. Quando é **`N` (Extra nota)**, os dois são idênticos. Quando é **`S` (Incluso)**, `VLRFRETE = 0` e `VLRFRETETOTAL` carrega o valor — o frete existiu e custou, mas não foi cobrado em separado porque já estava embutido no preço. A nota 423713 (empresa 1, 11/09/2026) é o caso exemplar: `VLRFRETE = 0,00`, `VLRFRETETOTAL = 339,43`.

**Consequência direta para o "Cotado x Realizado":** o campo a usar como realizado-da-nota é **`VLRFRETETOTAL`**, não `VLRFRETE`. Usar `VLRFRETE` faria toda nota com frete incluso aparecer como frete zero. *(O levantamento de jan-jul já usava `VLRFRETETOTAL` — aquela análise continua válida.)*

**Ressalva registrada pela TI:** a regra não é absoluta na base inteira — 331 notas `'S'` e 43 notas `'N'` de 2026 divergem entre os dois campos. Vale confirmar esse caso de borda com o comercial antes de amarrar regra em cima.

**`FRETEVLRPAGO` está zerado, e isso não é só um dado — é um diagnóstico.** Zero registros maiores que zero em 2023, 2024, 2025, 2026 e nas 4 notas já lançadas com data de 2027. O mesmo vale para `FRETEVLRNEGOC`, `FRETEVLRBRUTO` e `NUPEDFRETE`. Como a TI resume: o bloco inteiro de "frete pago" **está livre para o módulo assumir, sem disputar com ninguém**.

Morreu, portanto, a esperança de que o cotado × pago viesse de graça do histórico. Mas nasceu algo melhor — ver seção 6.

**Sobre o `NUMCOTACAO`:** é nativo, do tipo inteiro, e está praticamente vazio (10 notas em toda a história, nenhuma em 2026). Mesmo assim a TI **recomenda campo próprio**, por três motivos que valem registrar: é `int` e protocolo de transportadora costuma ser alfanumérico; sendo nativo, uma rotina do Sankhya pode escrever nele sem avisar, e chave de conciliação só vale se ninguém mais escreve; e as 10 linhas provam que alguém já usou. É a mesma decisão que eles tomaram na Força de Vendas, criando `AD_NUMSYNAPSE` em vez de usar o `NUMPEDIDO2` nativo. Sugestão deles, acatada: **`AD_NUMCOTFRETE`, texto, com prefixo da transportadora**.

---

## 3. Os campos `AD_` de rastreio — a correção que evitou um bug

| Campo | Histórico | 2026 | Veredito da TI |
|---|---|---|---|
| `AD_RASTREIO` | 0 | 0 | **Livre** — vazio em 189.575 notas |
| `AD_DTCOLETA` | 771 | 89 | Quase livre — em desuso, confirmar com quem usou |
| `AD_STATUSENTREGA` | 102.464 | 22.771 | **Ocupado** — está em 100% das notas |
| `AD_DTENTREGA` | 20.222 | 5.075 | **Não assumir** — tem leitor ativo |
| `BH_RASTREIO` | 0 | 0 | Vazio, mas é da família do marketplace |
| `BH_DTENTREGA` | 282 | 282 | Não mexer — integração nova, ativa |
| `BH_CUSTOFRETE` | 183 | 183 | Não mexer — idem |

**A armadilha principal é o `AD_DTENTREGA`.** O nome diz "Dt. Entrega", mas o significado real é **data prevista/prometida**, preenchida na criação do pedido. Ela é lida hoje por dois consumidores: o componente **614 Torre de Controle** e o **robô de indicadores do WhatsApp**. E não é hipótese: essa mesma confusão **já gerou um bug real em agosto de 2026**, quando uma consulta tratou o campo como data de entrega realizada e zerou um indicador inteiro.

**O `AD_STATUSENTREGA` é um caso mais sutil.** Está em 100% das notas, mas 99,6% estão paradas no default. É lista fechada (`P` Não Coletado — 22.684; `E` Entregue — 72, última em 28/08/2026; `C` Coletado — 19, última em 07/05/2026). Dá para assumir, mas **alguém movimentou 91 notas à mão este ano**, e a TI vai descobrir quem antes de qualquer automação passar por cima. Além disso, três estados são poucos para rastreio de verdade — falta em trânsito, saiu para entrega, insucesso, devolvido — e, por estar em `TDDOPC`, acrescentar status novo **muda o que o usuário do ERP vê na tela nativa**, não é alteração invisível.

**Decisão adotada, seguindo a recomendação da TI:** usar **apenas o `AD_RASTREIO`** (que está genuinamente limpo) e **criar campos próprios para todo o resto**. Nas palavras deles, que valem como regra do projeto: *"Campo `AD_` novo é barato; bug silencioso em indicador de diretoria não é."*

**Lição de método, que vale registrar:** eu havia encodado "os campos estão abandonados" como fato a partir de um relato, e a medição mostrou o contrário. Daqui em diante, premissa sobre o estado do dado só entra em documento com contagem por trás.

---

## 4. CT-e, transportadora e os domínios de status

**CT-e:** o campo é **`CHAVECTE`** (chave de acesso de 44 dígitos — conferido: mínimo e máximo são 44), acompanhado de **`NUMPROTOCCTE`**. Só aparece em notas de compra.

**Transportadora:** `CODPARCTRANSP` está preenchido em **11.208 das 22.774 notas de 2026 (49%)**. É confiável onde existe, **mas não é único por transportadora** — a Braspress tem pelo menos 12 cadastros de `CODPARC`, um por filial. Instrução da TI, adotada como regra: **agrupar por CNPJ (ou razão social), nunca por `CODPARC`**, sob pena de o relatório mostrar a mesma transportadora doze vezes.

Cadastros com movimento real em 2026:

| CODPARC | Cadastro | Notas 2026 |
|---|---|---|
| 1286 | BRASPRESS — CONTAGEM, MG | 2.329 |
| 1976 | BRASPRESS — CAMPINAS | 1.692 |
| 1289 | RODONAVES — RIBEIRÃO PRETO | 556 |
| 15124 | RODONAVES — CONTAGEM | 44 |
| 1263 | JAMEF — BHZ/CONTAGEM | 18 |
| 17562 | RODONAVES — SÃO PAULO | 2 |
| 1317 / 29538 / 30780 | BRASPRESS (Guarulhos, matriz, SJP) | 1 cada |
| 31045 / 31211 | RODONAVES (dois cadastros novos) | 1 cada |

Mais de 14 outros cadastros existem com zero notas em 2026. Os quatro últimos da lista são **duplicação de cadastro em andamento** — razão social quase igual à dos antigos, uma nota cada. E a amostra da pergunta 21 ainda trouxe um `13632` (Rodonaves, empresa 6) que nem aparece nesta tabela.

Dois números que saltam aos olhos e valem uma conversa de negócio: somando os cadastros, a **Braspress responde por cerca de 4.000 notas em 2026 e a Jamef por 18**. Se a Jamef está no comparativo mas quase nunca ganha, ou ela é sistematicamente cara, ou algo no processo está impedindo que ela seja escolhida — vale olhar com o dado do histórico de cotações assim que ele existir.

**Domínios de status do CT-e**, para a conciliação:

`STATUSCTE` (estado perante a SEFAZ): `A` Aprovada · `E` Aguardando Autoriz. · `I` Enviada · `S` Enviada EPEC · `R` Aguardando Correção · `V` Com erro de Validação · `D` Denegada · **`T` CT-e Terceiros** · `M` Não é CT-e · `null` Não enviada.

`SITUACAOCTE` (ciclo de vida): `N` Normal · `A` Anulado · `L` Em Anulação · `B` Em Substituição · `S` Substituído.

**Regra de conciliação:** documento válido e vigente é `STATUSCTE = 'A'` com `SITUACAOCTE = 'N'`. O valor **`T`** marca CT-e emitido por terceiro — que é exatamente o caso do frete contratado, ou seja, o nosso.

---

## 5. Acesso à API — o que está liberado e a pegadinha que importa

**Gateway REST oficial da Sankhya**, em `https://api.sankhya.com.br`. Serviços por `/gateway/v1/mge/service.sbr?serviceName=...`, comerciais por `/gateway/v1/mgecom/...`. É o mesmo caminho que a Força de Vendas e o Dashboard Comercial já usam em produção.

**Autenticação:** OAuth 2.0 *client credentials* — `POST /authenticate` com header `X-Token` e corpo em `client_id`/`client_secret`. Retorna `access_token` válido por **300 segundos**, que viaja como `Bearer`.

> ⚠️ **A pegadinha não documentada, medida pela TI em 08/09/2026: o Gateway aceita uma chamada por vez por bearer. Requisição paralela no mesmo token falha.** Nas palavras deles, "foi a pegadinha que mais nos custou tempo".

Isso **não** afeta o disparo paralelo para Jamef, Braspress e Rodonaves — essas são APIs das transportadoras, não do Sankhya. Afeta as chamadas ao Sankhya em si (buscar cliente, ler notas, gravar de volta), que precisam ser **enfileiradas** ou usar um bearer por trilha. Com o volume da operação isso é trivial de resolver, desde que o desenho já nasça sabendo.

**Serviços liberados:**

| Serviço | Para quê | Observação |
|---|---|---|
| `DbExplorerSP.executeQuery` | Leitura por SQL | Só aceita `SELECT` — DDL é recusado |
| `CACSP.incluirNota` | Gravar nota/pedido | Em produção desde julho |
| `DatasetSP.save` | Gravar registro | Usado hoje para cadastro de parceiro |
| `MobileLoginSP.login` | Validar usuário/senha | Abre sessão; exige logout |

Para atualizar campo de frete numa nota existente, o caminho é o **`DatasetSP.save`** — e este é **o único ponto da arquitetura ainda não exercitado**: a TI nunca rodou esse serviço contra `TGFCAB` e vai testar antes de a gente depender dele.

**Usuário de integração: sim.** Existe o grupo `(TI) INTEGRAÇÃO` com quatro contas (`N8N`, `PLOOMES`, `NEIMAR_N8N`, `ESPRESSO`); criar a quinta é rotina.

**Permissão mínima: não existe, e isso importa.** A tabela de permissões da base tem 105 linhas, de 2 usuários; a de bloqueios tem uma única linha de grupo na base inteira. **Nenhum dos quatro integradores tem restrição nenhuma** — o grupo é rótulo, não permissão. Não há perfil "só frete" para herdar.

A TI ofereceu a solução que já usaram duas vezes: um **relay externo** que guarda a credencial real do Sankhya e expõe só a porta específica, entregando a quem chama um segredo de baixo escopo. **Recomendo aceitar** — resolve o menor privilégio de verdade, e tem um benefício extra para o nosso lado: a credencial do ERP nunca chega a morar na plataforma de frete.

**Homologação:** a Sankhya oferece sandbox (a documentação do Gateway lista IPs próprios de produção e de sandbox para liberação de firewall), mas a TI não sabe se a RARE WAY tem um provisionado e com base populada — nunca usaram. Todo o desenvolvimento deles foi contra produção, só leitura. O alerta deles é direto e eu assino embaixo: *"um módulo que escreve frete em nota é justamente o tipo de coisa que não se estreia em produção."* **Perguntar à Sankhya é uma das ações mais urgentes desta lista.**

---

## 6. A descoberta que muda a prioridade do projeto

Juntando três respostas — o `FRETEVLRPAGO` zerado, o CT-e que entra como nota de compra, e a ausência de conferência — a TI chegou a uma conclusão que vale citar na íntegra:

> *"A matéria-prima existe: os CT-e entram como nota de compra, com chave e valor. O que não existe é o vínculo automático entre o CT-e e a venda que ele transportou. **Fechar esse vínculo é, provavelmente, o maior valor que o seu módulo pode entregar** — e ninguém está ocupando esse espaço."*

Isso reabre, por um caminho melhor, a porta que o `FRETEVLRPAGO` zerado tinha fechado. **O valor que a RARE WAY efetivamente paga de frete já está dentro do ERP** — são as 2.320 notas de compra com CT-e de 2026. O que falta é saber *qual venda cada CT-e transportou*.

E a plataforma está numa posição privilegiada para fechar esse vínculo, porque ela vai ser a única coisa que sabe, ao mesmo tempo: qual transportadora levou qual nota (da cotação escolhida), qual o número e a chave da nota fiscal (do registro de envios), e o que a transportadora respondeu no rastreio (que normalmente inclui o número do CT-e). Com isso, o casamento CT-e ↔ venda deixa de ser adivinhação e vira chave.

**Consequência para o roadmap:** a conciliação, que estava na última onda por depender de ingerir faturas, **sobe de prioridade** — não depende mais de transportadora nenhuma, depende de um join dentro de casa. E o indicador que ela destrava é o de maior valor financeiro do projeto: quanto foi cotado, quanto foi para a nota, e quanto de fato se pagou.

### E dá para começar a medir antes de construir qualquer coisa

Uma consequência prática das respostas do Juan (seção 7): como **nunca houve conferência**, ninguém sabe o tamanho da diferença entre o que vai na nota e o que as transportadoras cobram. Só que os dois lados dessa conta **já existem no ERP hoje**, e um primeiro retrato dá para tirar **sem nenhum join documento a documento**:

- de um lado, a soma de `VLRFRETETOTAL` das notas de **venda**, por mês e por transportadora (`CODPARCTRANSP`, consolidado por CNPJ);
- do outro, a soma do valor das notas de **compra** com `CHAVECTE` preenchida, `STATUSCTE = 'A'` e `SITUACAOCTE = 'N'`, pelo mesmo recorte.

Se os dois totais baterem de perto, ótimo — o processo está saudável e a conciliação fina vira refinamento. Se abrirem, a diferença agregada é a primeira medida real de quanto está passando sem ninguém olhar. **É uma consulta só, que a TI consegue rodar, e que pode produzir um número relevante antes de escrevermos uma linha de código.** Vale pedir junto com o desenho das tabelas.

---

## 7. O que ficou pendente, e com quem

Quatro das 21 perguntas não dependiam da TI. **Duas foram respondidas pelo próprio Juan em 15/09/2026**, e as respostas são mais consequentes do que pareciam.

### 18 — O frete da nota é sempre o cotado? Quem ajusta?

> *"Não. O frete passou a ser cotado agora, com o motor de cotação, e nunca houve conferência."*

Isso muda o significado do indicador "Cotado x Realizado": **até agora não existia um "cotado"**. O valor que ia para a nota vinha de outro lugar — tabela, estimativa, negociação, prática — e não de uma cotação registrada em algum lugar. Duas consequências:

A primeira é que **não há linha de base histórica** para esse indicador. Ele não pode ser calculado retroativamente porque metade da conta nunca existiu. Ele começa a existir a partir das cotações que o motor registrar — o que reforça, de novo, a urgência de capturar pedido, empresa, usuário e motivo desde já.

A segunda é que o motor **não está automatizando um processo que já existia: ele está criando o processo**. Isso é uma notícia melhor do que parece, porque significa que não há um jeito antigo competindo com o novo — mas também significa que a adoção precisa de cuidado, já que a expedição está aprendendo um passo que antes não existia.

### 19 — Existe conferência entre o frete cotado e a fatura da transportadora?

> *"Não existe essa conferência."*

A TI tinha inferido isso do banco ("evidência forte de que não", pelos campos zerados); agora está confirmado por quem opera. E a consequência é grande: **ninguém nunca verificou se o que as transportadoras cobraram corresponde ao que foi combinado** — sobre uma base de cerca de R$ 38 mil por mês, R$ 461 mil por ano, nas três empresas.

Não dá para afirmar que há erro, e seria leviano chutar um percentual. O que dá para afirmar é que **é um valor relevante que nunca foi verificado**, e que a matéria-prima para verificar já está no ERP. A consulta proposta ao final da seção 6 é o jeito mais barato de descobrir se existe algo ali — e, se existir, esse número passa a ser o principal argumento de valor do projeto inteiro.

### As duas que ainda dependem de terceiros

| # | Pergunta | Com quem |
|---|---|---|
| 14 | Existe sandbox provisionado para a RARE WAY? | **Sankhya** (comercial/suporte) — urgente |
| 16 | Qual licença de BI está contratada | Quem administra o contrato Sankhya |

**O que a TI assumiu de compromisso:** criar os campos `AD_` que desenharmos (pedem tipos e tamanhos); criar o usuário de integração e conversar sobre o relay; testar `DatasetSP.save` contra `TGFCAB`; e descobrir quem movimentou as 91 notas de `AD_STATUSENTREGA` em 2026.

**O que fica do nosso lado:** o desenho dos campos e tabelas — que eles pediram explicitamente e que está em `desenho-campos-sankhya.md`, pronto para enviar —, mais o pedido da consulta agregada da seção 6.

---

## 8. Outros pontos úteis confirmados

**Tabelas customizadas: liberadas.** Prefixo `AD_` é obrigatório — é o espaço que a Sankhya reserva para customização e o que garante que atualização de versão não passe por cima. A TI já tem as suas (`AD_MODELO`, `AD_FVACESSO`) e cria pelo Builder do ERP. Pedido deles: **mandar o desenho antes de codar em cima**, porque campo criado errado depois dá trabalho para desfazer.

**Volume: sem problema.** Nossa estimativa de 3 mil linhas/mês (36 mil/ano) contra uma `TGFCAB` de 189.575 linhas acumuladas é pequena. A ressalva não é de volume, é de índice: **se a tabela nova for consultada por `NUNOTA`, pedir o índice junto da criação.**

**BI: dá para cruzar.** O que a TI usa de fato é o **Construtor de Componentes BI** do Sankhya, publicando componentes HTML5 próprios — foi assim que nasceram o 614 Torre de Controle e o Dashboard Comercial. Como o SQL é deles, cruzar tabela customizada com `TGFCAB` por `NUNOTA` + `CODEMP` é *join* comum, "sem cerimônia". O Sankhya Analytics tem a tabela de permissão zerada, o que indica que não está em uso.

**Perfil de frete das notas:** em 2026, 4.293 das 22.774 notas (19%) têm `VLRFRETE > 0` na base inteira — a maioria sai sem frete destacado, provavelmente com `TIPFRETE = 'S'`. Nas nossas três empresas o perfil é outro: das 2.931 notas de venda, 1.880 têm frete destacado (cerca de 64%).
