# Desenho de campos e tabelas para a TI criar no Sankhya

> Resposta ao pedido da TI em 14/09/2026: *"Mande o desenho (campos, tipos, chave) que criamos — só peça antes de codar em cima."*
>
> **Entregue como página em 15/09/2026:** artefato **"Campos de Frete no Sankhya"**, que é a versão para enviar — autocontida, com o desenho inteiro, as perguntas e as consultas. Este documento aqui é o registro durável do mesmo conteúdo, para o projeto.
>
> O desenho segue as três recomendações que a TI deu: **só o `AD_RASTREIO` é reaproveitado** (os outros `AD_` estão ocupados); **campo próprio em vez do `NUMCOTACAO` nativo**; e **consolidação de transportadora por CNPJ**, nunca por `CODPARC`. Está dividido em duas ondas para não criar campo que a gente ainda não tem certeza de como vai usar.

---

## Convenções

Tipos escritos como aparecem no Builder do ERP: **Inteiro**, **Decimal (precisão, escala)**, **Texto (tamanho)**, **Data**, **Data/Hora**.

Nomes com sufixo `FR` existem para **não colidir** com os campos homônimos já ocupados (`AD_DTCOLETA`, `AD_DTENTREGA`). Se o padrão de nomenclatura da casa pedir outra coisa, o nome é o que menos importa — só precisa ficar claro que são campos diferentes dos antigos.

Toda gravação será feita pela plataforma de frete via `DatasetSP.save`, de forma idempotente, usando `CODEMP + NUNOTA` como chave — reprocessar uma sincronização não duplica nem sobrescreve com valor pior.

---

## Onda 1 — Campos no `TGFCAB`

São os campos que ficam visíveis na própria nota, para quem abre o pedido no ERP.

### Bloco A — a cotação escolhida

| Campo | Tipo | Descrição |
|---|---|---|
| `AD_NUMCOTFRETE` | Texto (30) | Protocolo da cotação na transportadora, com prefixo de origem — ex.: `BRA-373232792`, `JAM-8841207`, `ROD-222156913`. *(Nome sugerido pela própria TI.)* |
| `AD_VLRCOTFRETE` | Decimal (15,2) | Valor da cotação escolhida |
| `AD_PRZCOTFRETE` | Inteiro | Prazo cotado, em **dias úteis** |
| `AD_PERCFRETE` | Decimal (9,4) | Percentual do frete sobre o valor da mercadoria |
| `AD_TRANSPCOT` | Inteiro | `CODPARC` da transportadora escolhida |
| `AD_MOTIVOCOT` | Texto (30) | Motivo da escolha — lista fechada, ver domínios abaixo |
| `AD_DTCOTFRETE` | Data/Hora | Quando a cotação foi feita |
| `AD_USUCOTFRETE` | Texto (30) | Usuário que cotou |

### Bloco B — o acompanhamento do envio

| Campo | Tipo | Descrição |
|---|---|---|
| `AD_RASTREIO` | *(já existe)* | **Reaproveitado** — código/chave de rastreio da transportadora. É o único dos antigos que está limpo |
| `AD_DTCOLETAFR` | Data | Data **real** da coleta *(separado do `AD_DTCOLETA` antigo, que tem 771 usos históricos)* |
| `AD_DTPREVFRETE` | Data | Data **prometida**, calculada como coleta + prazo cotado em dias úteis *(separado do `AD_DTENTREGA`, que é previsão de outro processo e tem leitor ativo)* |
| `AD_DTENTREGAFR` | Data | Data **real** da entrega |
| `AD_SITFRETE` | Texto (20) | Situação do envio — lista própria, ver domínios abaixo |

> **Por que não reaproveitar `AD_DTENTREGA` e `AD_STATUSENTREGA`:** conforme a TI mediu, o `AD_DTENTREGA` significa data *prevista* e é lido pelo componente 614 e pelo robô do WhatsApp; e o `AD_STATUSENTREGA` está em 100% das notas com três estados que não cobrem rastreio de verdade. Regra adotada, na frase deles: campo novo é barato, bug silencioso em indicador de diretoria não é.

### Domínios a registrar

Os dois campos abaixo têm lista fechada. Como a TI apontou que domínio em `TDDOPC` vira dropdown na tela nativa, fica a critério deles registrar como domínio ou deixar como texto — do nosso lado funciona dos dois jeitos, mas registrado fica melhor para quem usa o ERP.

**`AD_MOTIVOCOT`** — por que aquela transportadora foi escolhida:

| Valor | Significado |
|---|---|
| `MENOR_PRECO` | Menor preço |
| `MENOR_PRAZO` | Menor prazo |
| `EXIG_CLIENTE` | Exigência do cliente |
| `RESTR_REGIAO` | Restrição de região |
| `TRANSP_BLOQ` | Transportadora bloqueada |
| `OUTRO` | Outro |

**`AD_SITFRETE`** — situação do envio:

| Valor | Significado |
|---|---|
| `AGUARD_COLETA` | Aguardando coleta |
| `COLETADO` | Coletado |
| `EM_TRANSITO` | Em trânsito |
| `SAIU_ENTREGA` | Saiu para entrega |
| `ENTREGUE` | Entregue |
| `OCORRENCIA` | Com ocorrência |
| `DEVOLVIDO` | Devolvido |
| `EXTRAVIADO` | Extraviado |

---

## Onda 1 — Tabelas

Três tabelas. Volume estimado: cerca de **3 mil linhas/mês somadas** (36 mil/ano), já validado com a TI como pequeno para esta base.

### `AD_FRETECOT` — uma linha por cotação feita

| Campo | Tipo | Observação |
|---|---|---|
| `NUCOTFRETE` | Inteiro | **Chave primária**, sequencial |
| `CODEMP` | Inteiro | Empresa remetente (1, 4 ou 6) |
| `NUNOTA` | Inteiro | Pedido — **aceita nulo** (cotação que não virou pedido) |
| `CODPARC` | Inteiro | Destinatário |
| `CNPJDEST` | Texto (14) | Só dígitos |
| `CEPDEST` | Texto (8) | Só dígitos |
| `CIDADEDEST` | Texto (60) | |
| `UFDEST` | Texto (2) | |
| `DTCOTACAO` | Data/Hora | |
| `USUARIO` | Texto (30) | Quem cotou |
| `VLRMERCAD` | Decimal (15,2) | Valor da mercadoria |
| `PESOTOTAL` | Decimal (12,3) | Em kg |
| `QTDVOLUMES` | Inteiro | |
| `TIPFRETE` | Texto (1) | `S` ou `N`, mesmo domínio do `TGFCAB` |
| `QTDCONSULT` | Inteiro | Transportadoras consultadas |
| `QTDRESP` | Inteiro | Quantas responderam com sucesso |
| `VLRMENOR` | Decimal (15,2) | Menor valor recebido na rodada |
| `VLRESCOLHIDO` | Decimal (15,2) | Valor da escolhida |
| `DIFERENCA` | Decimal (15,2) | Escolhido − menor (zero quando escolheu a mais barata) |
| `TRANSPESCOLHIDA` | Inteiro | `CODPARC` da escolhida |
| `CNPJTRANSP` | Texto (14) | **Consolidação** — é por aqui que o relatório agrupa, não pelo `CODPARC` |
| `MOTIVOESCOLHA` | Texto (30) | Mesmo domínio do `AD_MOTIVOCOT` |
| `SITUACAO` | Texto (1) | `A` aberta · `E` escolhida · `D` descartada |

**Índices pedidos:** `NUNOTA + CODEMP` (é como o BI vai cruzar com o `TGFCAB`) e `DTCOTACAO`.

### `AD_FRETECOTITEM` — uma linha por transportadora consultada

Inclui as **perdedoras** e as que deram erro. É desta tabela que saem taxa de vitória, distância até o vencedor e disponibilidade por transportadora.

| Campo | Tipo | Observação |
|---|---|---|
| `NUCOTITEM` | Inteiro | **Chave primária**, sequencial |
| `NUCOTFRETE` | Inteiro | Cotação a que pertence |
| `CODPARCTRANSP` | Inteiro | |
| `CNPJTRANSP` | Texto (14) | Consolidação |
| `NOMETRANSP` | Texto (60) | Nome consolidado (Jamef, Braspress, Rodonaves) |
| `MODAL` | Texto (1) | `R` rodoviário · `A` aéreo |
| `SITUACAO` | Texto (20) | `OK` · `ERRO` · `TIMEOUT` · `SEM_COBERTURA` |
| `VLRFRETE` | Decimal (15,2) | Nulo quando não respondeu |
| `PRAZODIAS` | Inteiro | Nulo quando não respondeu |
| `PROTOCOLO` | Texto (30) | Protocolo devolvido pela transportadora |
| `MSGERRO` | Texto (200) | Motivo, quando falhou |
| `MSRESPOSTA` | Inteiro | Tempo de resposta em milissegundos |

**Índice pedido:** `NUCOTFRETE`.

### `AD_FRETEENVIO` — uma linha por embarque

| Campo | Tipo | Observação |
|---|---|---|
| `NUENVIO` | Inteiro | **Chave primária**, sequencial |
| `CODEMP` | Inteiro | |
| `NUNOTA` | Inteiro | Nota de venda |
| `NUMNOTA` | Inteiro | Número da NF |
| `CHAVENFE` | Texto (44) | Chave de acesso da NF-e |
| `NUCOTFRETE` | Inteiro | Cotação de origem — aceita nulo |
| `CODPARCTRANSP` | Inteiro | |
| `CNPJTRANSP` | Texto (14) | Consolidação |
| `CHAVECTE` | Texto (44) | **Chave do CT-e conciliado** — aceita nulo até a conciliação acontecer |
| `NUNOTACTE` | Inteiro | A nota de **compra** onde o CT-e entrou — aceita nulo |
| `DTEMISSAO` | Data | Emissão da NF |
| `DTCOLETA` | Data | Coleta real |
| `DTPREVISTA` | Data | Prometida (coleta + prazo, em dias úteis) |
| `DTENTREGA` | Data | Entrega real |
| `DIASTRANSITO` | Inteiro | Entrega − coleta |
| `OTDOK` | Texto (1) | `S` / `N` — cumpriu o prazo prometido |
| `SITUACAO` | Texto (20) | Mesmo domínio do `AD_SITFRETE` |
| `QTDOCORRENCIAS` | Inteiro | Ocorrências que exigiram ação |
| `VLRCOTADO` | Decimal (15,2) | O que foi cotado |
| `VLRNOTA` | Decimal (15,2) | `VLRFRETETOTAL` da nota |
| `VLRPAGO` | Decimal (15,2) | O que veio no CT-e — nulo até conciliar |

**Índices pedidos:** `NUNOTA + CODEMP` e `CHAVECTE`.

> **O que não sobe:** os eventos individuais de rastreio (de dez a trinta por envio) ficam no banco da plataforma. Para o Sankhya sobe só o resumo — datas, situação final e contagem de ocorrências. Não faz sentido inflar a base com uma linha por "chegou na filial de Salvador".

---

## Onda 2 — depois de validar, não agora

Três coisas que **não** foram pedidas ainda, de propósito, por causa do alerta da TI de que campo criado errado depois dá trabalho para desfazer:

**Gravar no `FRETEVLRPAGO` nativo.** A TI mediu que ele e os vizinhos estão zerados em toda a história e disse que o bloco está livre para o módulo assumir. Faz sentido usar o campo nativo em vez de criar outro — o significado é exatamente esse. **Pergunta feita a eles:** existe alguma rotina do Sankhya que possa escrever nesse campo sem aviso, como no caso do `NUMCOTACAO`? Se houver, criamos um `AD_` próprio.

**`AD_NUMCTEFRETE` no `TGFCAB`** (Texto 44), para a chave do CT-e conciliado aparecer na própria nota. Só faz sentido depois que o método de conciliação estiver validado.

**Campos de divergência** (valor e motivo da diferença entre cotado e pago). Dependem de rodar a conciliação primeiro e ver que categorias aparecem de verdade — reentrega, TDA, diferença de peso, generalidades.

---

## Como isso foi entregue

O conteúdo acima virou a página **"Campos de Frete no Sankhya"** (artefato publicado em 15/09/2026), que é o que vai para a TI. Ela é autocontida: traz a carta de abertura, os doze campos, os dois domínios, as três tabelas com índices, a onda 2, as três perguntas e as duas consultas agregadas de CT-e × nota.

**Antes de mandar, é preciso compartilhar a página** pelo menu de compartilhamento do próprio artefato — ela nasce privada.

Recado curto para acompanhar o link:

> Pessoal, montei a resposta como página, no mesmo espírito da de vocês. Está tudo lá: os doze campos novos com tipo e tamanho, os dois domínios, as três tabelas com os índices, o que eu deliberadamente **não** estou pedindo ainda, e três perguntas no fim — mais um pedido de consulta que pode valer mais que o resto todo. Qualquer coisa que estiver fora do padrão de nomenclatura de vocês, é só ajustar.

### Perguntas que ficaram registradas para eles

1. O `FRETEVLRPAGO` nativo corre risco de ser escrito por rotina do Sankhya?
2. Aceite do **relay** para menor privilégio — quando der, conversar antes de escrever a integração.
3. Prioridade no teste do `DatasetSP.save` contra o `TGFCAB`, que é o único ponto da arquitetura ainda não exercitado.
4. As duas consultas agregadas (`VLRFRETETOTAL` das vendas × valor dos CT-e de compra, por mês e transportadora), que dão o primeiro retrato de quanto vem passando sem conferência.
