# Resultados da calibração — 15/09/2026

Dezessete consultas executadas por Juan no DbExplorer (usuário 106), em 14 e 15/09/2026.
Este documento é o **retrato de dados do projeto**: substitui premissa por contagem em
quase tudo que estava em aberto.

Duas consultas **falharam** e uma voltou **vazia** — o §8 trata das três.

---

## 1. O recorte, agora com números

### 1.1 A empresa 3 é mesmo o B2C — e a prova é o ticket

| Empresa | Notas com frete | Frete | Ticket médio |
|---|---:|---:|---:|
| 1 — Matriz | 1.024 | R$ 193.154,70 | R$ 188,63 |
| **3 — B2C** | **1.376** | **R$ 26.762,18** | **R$ 19,45** |
| 4 — Anova SP | 781 | R$ 100.955,39 | R$ 129,26 |
| 6 — Anova RJ | 95 | R$ 20.816,11 | R$ 219,12 |

A empresa 3 tem **mais notas que a Matriz** e um sétimo do frete. Ticket de R$ 19,45
contra R$ 166 no B2B — é outro negócio, com outra logística e outra economia. A separação
não é arbitrária, é a coisa certa a fazer. E não existe nenhuma quinta empresa.

### 1.2 As TOPs — a lista de exclusão, fechada

| TOP | Descrição | Emp | Notas | Frete | Situação |
|---|---|---|---:|---:|---|
| 1101 | VENDA NF-E (PRODUCAO) | 1 | 923 | R$ 166.925,54 | **dentro** |
| 1100 | VENDA NF-E (REVENDA) | 4 | 776 | R$ 100.521,51 | **dentro** |
| 1100 | VENDA NF-E (REVENDA) | 6 | 95 | R$ 20.816,11 | **dentro** |
| 1103 | VENDA NF-E (SUFRAMA) | 1 | 29 | R$ 14.816,53 | **dentro** |
| 1145 | VENDA EXPORTACAO - SHOPIFY ZK | 1 | 61 | R$ 3.403,42 | exportação |
| 1123 | VENDA NF-E (EXPORTAÇÃO) S/ ESTOQUE | 1 | 1 | R$ 2.757,00 | exportação |
| 1133 | EXPORTAÇÃO EM CONSIGNACAO SHOPIFY | 1 | 1 | R$ 2.757,00 | exportação |
| 1117 | VENDA NF-E (BONIFICAÇÃO,BRINDE) | 1 | 5 | R$ 915,50 | bonificação |
| 1117 | VENDA NF-E (BONIFICAÇÃO,BRINDE) | 4 | 5 | R$ 433,88 | bonificação |
| 1017 | VENDA BONIFICAÇÃO PESSOA FISICA MATRIZ | 1 | 3 | R$ 129,71 | bonificação |
| 1130 | REMESSA PARA IND POR ENCOMENDA | 1 | 1 | R$ 1.450,00 | **caso à parte** |

**Listas para o bloco de recorte:**

- Exportação: `1145, 1123, 1133`
- Bonificação: `1117, 1017`
- Remessa para industrialização: `1130` — não é venda a cliente; proponho fora dos
  indicadores comerciais, mas é frete real e entra no custo absoluto, igual à bonificação.

**SUFRAMA (1103) fica dentro.** Zona Franca de Manaus é território nacional. Vale marcar
como caso especial na cotação — prazo e cobertura para Manaus são diferentes de tudo —
mas é venda B2B nacional e não sai do escopo.

### 1.3 O escopo limpo

| | Notas | Frete | Ticket |
|---|---:|---:|---:|
| **Escopo B2B nacional, sem bonificação** | **1.823** | **R$ 303.079,69** | R$ 166,25 |
| Exportação (fora) | 63 | R$ 8.917,42 | |
| Bonificação (fora dos relativos) | 13 | R$ 1.479,09 | |
| Remessa industrialização (fora) | 1 | R$ 1.450,00 | |
| *Total medido* | *1.900* | *R$ 314.926,20* | |

**O recorte tirou 3,8% do frete e 77 notas.** É pequeno, como eu tinha estimado — mas
agora é medido, e a soma das partes fecha exatamente com o total, o que confirma que
nenhuma TOP ficou de fora da classificação.

### 1.4 Pessoa física dentro do B2B: resolvido, é marginal

| Empresa | Tipo | Notas | Frete | Clientes |
|---|---|---:|---:|---:|
| 1 | Física | 8 | R$ 766,06 | 8 |
| 1 | Jurídica | 1.016 | R$ 192.388,64 | 581 |
| 4 | Jurídica | 781 | R$ 100.955,39 | 377 |
| 6 | Física | 1 | R$ 142,31 | 1 |
| 6 | Jurídica | 94 | R$ 20.673,80 | 46 |

Nove notas de pessoa física em toda a base B2B — **0,3% do frete**. E três delas são a TOP
1017 (bonificação a pessoa física), que já sai pelo filtro de bonificação. Sobram seis
notas no ano inteiro.

**Decisão: a regra "empresa 3 = B2C" basta.** Não precisa de cláusula sobre tipo de pessoa.
O ponto que eu tinha deixado em aberto está fechado, com contagem.

### 1.5 A bonificação tem TOP própria — o filtro funciona

A consulta C5 procurou bonificação escondida em TOP de venda comum, listando notas com
frete acima de 25% do valor. Das 26 encontradas, **as que são bonificação já estão na TOP
1117**; o resto são vendas normais de valor baixo, onde o frete pesa proporcionalmente
muito — o que é outro achado (§7.3), não bonificação disfarçada.

**Conclusão: filtrar por TOP resolve.** Não precisa de critério por natureza de operação
nem por CFOP.

---

## 2. A descoberta que muda o pedido à T.I.

A consulta de campos da `TGFCAB` devolveu **68 campos** relacionados a frete, transporte,
peso e CT-e. Boa parte do que o projeto ia construir do zero **já existe no ERP**.

### 2.1 Já existe e a plataforma deveria usar

| Campo | Descrição | Por que importa |
|---|---|---|
| `PESO`, `PESOBRUTO`, `PESOBRUTOITENS`, `PESOLIQITENS`, `PESOAENTREGAR` | Peso em cinco variações | A cotação precisa de peso. Está tudo na nota — não precisa ser recalculado nem guardado de novo |
| `M3AENTREGAR`, `VOLUME`, `NUMERACAOVOLUMES` | Cubagem e volumes | Idem. Cubagem é o que define o frete de carga leve e volumosa, que é exatamente o nosso caso |
| `CODCIDENTREGA`, `CODUFENTREGA` | Cidade e UF **de entrega** | Resolve sozinho o erro da consulta de cobertura (§8.2) e é mais correto que o endereço do cadastro: entrega pode ser em lugar diferente do cadastro do parceiro |
| `LOCALCOLETA`, `LOCALENTREGA`, `MODENTREGA` | Local de coleta, de entrega e modalidade | Campos de logística nativos que ninguém tinha mapeado |
| `CODPARCTRANSPFINAL` | Transportadora **final** | Redespacho. Quando a Braspress entrega via parceira local, é aqui que isso cabe |
| `CODRASTREAMENTOECT` | Código de rastreamento dos Correios | Rastreio nativo, específico dos Correios |
| `NUMCF`, `NOTASCF` | Número e notas do **conhecimento de frete** | Vínculo nota ↔ conhecimento já previsto pelo ERP |
| `CHAVECTEREF`, `VLRFRETECPL`, `VENCFRETE` | CT-e referenciado, frete complementar, vencimento do frete | Complementam a conciliação |
| `FRETEVLRPAGO` | Vlr. frete pago | Confirmado zerado (§3.1) — livre, como a T.I. disse |

### 2.2 O achado que precisa de resposta antes de qualquer código

Existem **`NUCFR` — "Cód. cálculo de frete"** e **`VLRFRETECALC` — "Vlr. frete calc."**,
além de **`NUPEDFRETE`/`NUNOTAPEDFRET` — "Nro. Pedido Frete"**.

Isso sugere que **o Sankhya tem uma estrutura nativa de cálculo e pedido de frete**. Se ela
existir e for utilizável, parte do que a plataforma faria já tem lugar no ERP — e gravar a
cotação em campo `AD_` próprio seria duplicar conceito, exatamente o erro que a T.I.
alertou.

**Não sei se está em uso ou se é estrutura morta.** Consulta para medir está no §9.

### 2.3 Veredito sobre os doze campos pedidos

**O pedido não é duplicata na maior parte.** Os oito campos de cotação (`AD_NUMCOTFRETE`,
`AD_VLRCOTFRETE`, `AD_PRZCOTFRETE`, `AD_PERCFRETE`, `AD_TRANSPCOT`, `AD_MOTIVOCOT`,
`AD_DTCOTFRETE`, `AD_USUCOTFRETE`) e os quatro de acompanhamento (`AD_DTCOLETAFR`,
`AD_DTPREVFRETE`, `AD_DTENTREGAFR`, `AD_SITFRETE`) **realmente não existem** com esses
significados.

Mas três ajustes são necessários:

1. **`AD_VLRCOTFRETE` pode colidir com `VLRFRETECALC`.** Precisa da medição do §9 antes.
2. **As tabelas encolhem.** `AD_FRETECOT` previa guardar `PESOTOTAL`, `QTDVOLUMES`,
   `CIDADEDEST` e `UFDEST`. Tudo isso já está na nota (`PESOBRUTO`, `VOLUME`,
   `CODCIDENTREGA`, `CODUFENTREGA`). Guardar de novo cria duas versões da mesma verdade —
   o clássico jeito de os números pararem de bater. Devem sair, **exceto** para a cotação
   que ainda não virou nota, onde não há nota de onde ler.
3. **`AD_RASTREIO` não é o único campo de rastreio.** Existem `CODRASTREAMENTOECT`
   (Correios) e `BH_RASTREIO` (marketplace). A plataforma escreve só no `AD_RASTREIO`, e o
   desenho precisa dizer isso explicitamente para ninguém tentar unificar depois.

**Nenhum desses três invalida o pedido.** Recomendo um adendo curto à T.I., não uma
retirada — a página já está com eles e retirar agora custa credibilidade sem ganho.

### 2.4 A família `BH_` é enorme e é do B2C

63 campos `AD_`/`BH_` na `TGFCAB`. A família `BH_` (28 campos) é marketplace puro —
Mercado Livre, Tray, Shopify, com `BH_CARRIER`, `BH_CUSTOFRETE`, `BH_DTENTREGA`,
`BH_RASTREIO`, `BH_METODO`, `BH_MODOENVIO`. Há ainda `AD_ORIGEMVENDA` e
`AD_ORIGEMVENDAB2C` — **dois campos com a mesma descrição**, sinal de que alguém criou
duplicado.

Confirma que o B2C tem toda uma logística paralela já instrumentada. **Regra: a plataforma
não toca em nada `BH_`.**

---

## 3. Os campos de valor, decididos

### 3.1 `FRETEVLRPAGO` está zerado — confirmado

| Empresa | Notas | Tem `VLRFRETE` | Tem `VLRFRETETOTAL` | Tem `FRETEVLRPAGO` | Divergem |
|---|---:|---:|---:|---:|---:|
| 1 | 1.883 | 1.013 | 1.024 | **0** | 13 |
| 4 | 902 | 781 | 781 | **0** | 0 |
| 6 | 151 | 93 | 95 | **0** | 2 |

Zero ocorrências em 2.936 notas. O campo está livre, como a T.I. afirmou — agora com
contagem por trás.

### 3.2 `VLRFRETETOTAL` é o campo certo

Divergem em **15 notas de 2.936** (0,5%), e o `VLRFRETETOTAL` é sempre o maior:
R$ 193.154,70 contra R$ 188.765,84 na empresa 1 — R$ 4.388,86 de diferença concentrados
em 13 notas. Há ainda 11 notas com `VLRFRETETOTAL` e sem `VLRFRETE`.

Coerente com a definição: `VLRFRETE` compõe o valor da nota; `VLRFRETETOTAL` é o frete
total do embarque. **Para "realizado da nota", é o `VLRFRETETOTAL`.** Decidido.

### 3.3 `TIPFRETE`: 95% é extra nota

| Empresa | `N` extra nota | `S` incluso |
|---|---:|---:|
| 1 | 1.793 notas · R$ 188.039,09 | 90 notas · R$ 5.115,61 |
| 4 | 899 notas · R$ 100.955,39 | 3 notas · R$ 0,00 |
| 6 | 149 notas · R$ 20.506,26 | 2 notas · R$ 309,85 |

**Quase todo o frete é extra nota** — não compõe o `VLRNOTA`. Isso simplifica o Custo de
Transporte: a razão frete ÷ valor da mercadoria é direta, sem precisar descontar frete
embutido. As 95 notas `S` são exceção e podem ser tratadas como tal.

---

## 4. A premissa da Braspress estava errada

| Raiz CNPJ | Transportadora | Cadastros | Notas 2026 | Frete 2026 |
|---|---|---:|---:|---:|
| 48740351 | Braspress | **2** | 1.597 | R$ 233.372,59 |
| 74155052 | UPS | 1 | 294 | R$ 6.160,42 |
| 44914992 | Rodonaves | **2** | 218 | R$ 40.492,82 |
| 53237962 | Pajuçara | 1 | 132 | R$ 20.816,11 |
| 34028316 | Correios | 1 | 93 | **R$ 0,00** |
| 20147617 | Jamef | 1 | 6 | R$ 1.003,39 |
| 03104013 | JRL | 1 | 2 | R$ 2.757,00 |
| 82110818 | Alfa | 1 | 1 | R$ 1.450,00 |

O projeto vinha repetindo que **"a Braspress tem 12+ cadastros de `CODPARC`"**. No universo
que importa — transportadoras usadas em notas de 2026 — são **dois**. Rodonaves, dois.
Todo o resto, um.

**A consolidação por raiz de CNPJ continua certa** (é barata e à prova de futuro), mas ela
**não é um problema grande** como se supunha, e não deve ser usada como justificativa de
esforço. Os 12+ cadastros devem existir na `TGFPAR` como clientes ou fornecedores inativos,
não como transportadoras em uso.

> Mais uma premissa que caiu por contagem. Padrão que já se repetiu três vezes neste
> projeto: `AD_DTENTREGA`, agora a Braspress. A regra de só afirmar com número atrás está
> se pagando.

### 4.1 Correios: 93 notas, frete zero

Aparecem com transportadora vinculada e **R$ 0,00 de frete lançado** em todas. Ou o custo
dos Correios não é lançado na nota, ou é pago por outra via. Noventa e três remessas por
ano sem custo registrado é um buraco pequeno mas real na conta — e pode explicar parte da
diferença que a reconciliação com CT-e vai mostrar.

---

## 5. Existe calendário de feriados no ERP

A consulta devolveu exatamente uma tabela: **`TSIFER` — "Feriado"** (módulo `erpcore`).

**Não precisamos construir nem manter calendário de feriados.** O OTD calcula dias úteis a
partir da tabela do próprio ERP, que já é mantida por alguém e já está certa para as
praças onde a empresa opera. Some um item recorrente de manutenção do projeto.

Falta confirmar se ela tem feriado **municipal** ou só nacional e estadual — consulta no §9.

---

## 6. A tabela que liga CT-e a nota existe: `TGFNCT`

A busca por tabelas de CT-e devolveu 18, e uma delas responde a pergunta mais importante do
projeto:

| Tabela | Descrição |
|---|---|
| **`TGFNCT`** | **"Notas Conhecimento Transporte"** |
| `TGFECTE` | Eventos do CT-e |
| `TGFNCTE` | Arquivos XML de CT-e |
| `TGFCCE` | Carta de Correção CT-e |
| `TGFCTENT` | Nota Técnica CT-e |
| `TGFPAXN` | Acesso ao XML da NF-e/CT-e |

`TGFNCT` é, pelo nome, **a relação entre o conhecimento de transporte e as notas que ele
cobre** — o vínculo documento a documento que eu tinha listado como "talvez exista".

Se ela estiver povoada, o Cotado × Realizado deixa de ser uma comparação de totais e vira
**a lista de notas onde o frete pago divergiu do cotado**. É a diferença entre dizer
"gastamos 8% a mais" e apontar as quarenta notas que explicam os 8%.

E mais: `TGFECTE` (eventos do CT-e) pode conter datas de entrega oficiais, o que seria uma
fonte de OTD independente das APIs das transportadoras.

**É a prioridade número um da próxima rodada.**

---

## 7. Outros achados que valem registro

### 7.1 O denominador

| Empresa | Notas B2B | Com frete | Com transportadora | % frete sobre venda |
|---|---:|---:|---:|---:|
| 1 | 1.883 | 1.024 (54,4%) | 81,0% | 2,01% |
| 4 | 902 | 781 (86,6%) | 91,6% | 2,56% |
| 6 | 151 | 95 (62,9%) | 88,7% | 2,59% |
| **Total** | **2.936** | **1.900 (64,7%)** | | |

**Só 54,4% das notas da Matriz têm frete lançado.** As outras 45% ou são retirada no
balcão, ou frete por conta do cliente, ou frete não lançado. A diferença entre 81% com
transportadora e 54% com frete — 27 pontos — são notas que **têm transportadora e não têm
valor de frete**. Isso é um buraco de dados relevante e ninguém tinha olhado.

### 7.2 Duas notas de exportação com valores idênticos

TOP 1123 e TOP 1133 têm, cada uma: 1 nota, R$ 2.757,00 de frete, R$ 64.261,00 de valor.
Valores idênticos, transportadoras diferentes (JRL e UPS).

Quase certamente **a mesma remessa documentada duas vezes** — uma como venda de exportação
sem estoque, outra como exportação em consignação. Está fora do escopo, então não afeta
nossos números, mas é o tipo de duplicidade que distorce qualquer relatório de frete que
alguém faça por fora. Vale avisar quem cuida de exportação.

### 7.3 Frete de 25% a 45% do valor da nota

A consulta C5 não achou bonificação escondida, mas achou isto: notas de venda normal com
frete desproporcional. Exemplos:

| Nota | Empresa | Cliente | Valor | Frete | % |
|---|---|---|---:|---:|---:|
| 333813 | 1 | I. DE MELO LIMA LTDA | R$ 1.501,97 | R$ 677,99 | 45,1% |
| 330916 | 1 | A. C. C. MAGALHAES | R$ 1.454,01 | R$ 625,00 | 43,0% |
| 302713 | 1 | I. DE MELO LIMA LTDA | R$ 1.392,29 | R$ 545,99 | 39,2% |
| 317930 | 4 | RICARDO COSMETICOS LTDA | R$ 1.072,88 | R$ 422,78 | 39,4% |

O mesmo cliente (I. DE MELO LIMA) aparece duas vezes, em janeiro e abril, com frete acima
de 39% nas duas. **Isso é margem indo embora em silêncio**, e é exatamente o tipo de coisa
que a plataforma deveria sinalizar na hora da cotação: "esta cotação representa 45% do
valor da mercadoria — confirma?".

Vira requisito de tela, e é um dos poucos que se pagam sozinhos.

---

## 8. As três consultas que não deram certo

### 8.1 O CT-e voltou **vazio** — o achado mais desconfortável

A consulta do Lado B (`TIPMOV='C'` + `CHAVECTE IS NOT NULL` + `STATUSCTE='A'` +
`SITUACAOCTE='N'` + `CODEMP IN (1,4,6)` + 2026) devolveu **zero linhas**.

Isso contradiz a medição anterior da T.I., de que 2.320 de 4.309 notas de compra de 2026
tinham CT-e. Hipóteses, em ordem de probabilidade:

1. **`STATUSCTE`/`SITUACAOCTE` têm outros valores** — `'A'` e `'N'` vieram de documentação,
   não de medição. Provável.
2. **Os CT-e estão em outra empresa.** Se o frete é centralizado, pode tudo entrar numa
   empresa que não está no `IN (1,4,6)`.
3. **Não são `TIPMOV='C'`.** Pode ser `'O'` (outras) ou outro tipo específico de
   conhecimento.
4. **A data não é `DTNEG`.** Para nota de entrada, pode ser `DTENTSAI` que importa.

Não vou escolher uma hipótese sem medir. A consulta de diagnóstico do §9 testa as quatro de
uma vez, removendo todos os filtros e mostrando onde os CT-e realmente estão.

**Enquanto isso não fechar, o Cotado × Realizado continua sem o lado do realizado.**

### 8.2 O mapa de cobertura: `'UF'` inválido

Erro: `Nome de coluna 'UF' inválido` — a `TSIEND` não tem coluna `UF`.

**A correção é melhor que o original:** a `TGFCAB` tem `CODUFENTREGA` e `CODCIDENTREGA`
próprios. Usar o endereço de entrega da nota é mais correto do que o endereço de cadastro
do parceiro, porque entrega pode ser em lugar diferente. Consulta corrigida no §9.

### 8.3 O join da `TGFTOP` funcionou

Registrando porque eu tinha avisado que era frágil: o `LEFT JOIN` com `MAX(DHALTER)` rodou
sem erro e trouxe as descrições. Padrão validado para uso futuro.

---

## 9. Próxima rodada — seis consultas

### 9.1 🔴 Onde estão os CT-e (diagnóstico, prioridade máxima)

```sql
SELECT
    CAB.CODEMP,
    CAB.TIPMOV,
    ISNULL(CAB.STATUSCTE,   '(nulo)')   AS STATUSCTE,
    ISNULL(CAB.SITUACAOCTE, '(nulo)')   AS SITUACAOCTE,
    ISNULL(CAB.TIPOCTE,     '(nulo)')   AS TIPOCTE,
    COUNT(*)                            AS QTD,
    SUM(ISNULL(CAB.VLRNOTA,0))          AS VLR_TOTAL,
    MIN(CAB.DTNEG)                      AS PRIMEIRA,
    MAX(CAB.DTNEG)                      AS ULTIMA
FROM TGFCAB CAB
WHERE CAB.CHAVECTE IS NOT NULL
  AND CAB.DTNEG >= '20260101'
GROUP BY CAB.CODEMP, CAB.TIPMOV,
         ISNULL(CAB.STATUSCTE,'(nulo)'),
         ISNULL(CAB.SITUACAOCTE,'(nulo)'),
         ISNULL(CAB.TIPOCTE,'(nulo)')
ORDER BY 6 DESC
```

Sem filtro de empresa, sem filtro de tipo de movimento, sem filtro de status. Mostra de uma
vez onde os CT-e moram e quais valores os campos de status realmente assumem.

### 9.2 🔴 O que é a `TGFNCT`

```sql
SELECT CAM.NOMECAMPO, CAM.DESCRCAMPO, CAM.TIPCAMPO, CAM.TAMANHO
FROM TDDCAM CAM
WHERE CAM.NOMETAB = 'TGFNCT'
ORDER BY CAM.NOMECAMPO
```

E, em outra aba, o volume:

```sql
SELECT COUNT(*) AS QTD_LINHAS FROM TGFNCT
```

Se tiver colunas que liguem `NUNOTA` da venda ao conhecimento, é o vínculo documento a
documento — e o Cotado × Realizado nota a nota fica destravado.

### 9.3 O mapa de cobertura, corrigido

```sql
SELECT
    CAB.CODEMP,
    ISNULL(CAB.CODUFENTREGA, 0)                         AS COD_UF_ENTREGA,
    ISNULL(TRA.RAZAOSOCIAL, '(sem transportadora)')     AS TRANSPORTADORA,
    COUNT(*)                                            AS QTD_NOTAS,
    SUM(ISNULL(CAB.VLRFRETETOTAL,0))                    AS FRETE,
    SUM(CASE WHEN ISNULL(CAB.CODUFENTREGA,0) = 0 THEN 1 ELSE 0 END) AS SEM_UF
FROM TGFCAB CAB
LEFT JOIN TGFPAR TRA ON TRA.CODPARC = CAB.CODPARCTRANSP
WHERE CAB.DTNEG >= '20260101'
  AND ISNULL(CAB.VLRFRETETOTAL,0) > 0
  AND CAB.TIPMOV     = 'V'
  AND CAB.CODEMP     IN (1, 4, 6)
  AND CAB.CODTIPOPER NOT IN (1145, 1123, 1133, 1117, 1017, 1130)
GROUP BY CAB.CODEMP, ISNULL(CAB.CODUFENTREGA, 0),
         ISNULL(TRA.RAZAOSOCIAL, '(sem transportadora)')
ORDER BY 1, 2, 5 DESC
```

`CODUFENTREGA` é inteiro (código da UF). Se vier muito `0`, o campo não é usado e o caminho
passa a ser a cidade do parceiro — aí eu mando a versão alternativa. Para traduzir código em
sigla depois:

```sql
SELECT CAM.NOMETAB, CAM.NOMECAMPO, CAM.DESCRCAMPO, CAM.TIPCAMPO
FROM TDDCAM CAM
WHERE CAM.NOMETAB IN ('TSIUFS', 'TSICID', 'TSIEND')
ORDER BY 1, 2
```

### 9.4 O motor de frete nativo está vivo?

```sql
SELECT
    CAB.CODEMP,
    COUNT(*)                                                                 AS QTD,
    SUM(CASE WHEN ISNULL(CAB.NUCFR,0)        > 0 THEN 1 ELSE 0 END)          AS TEM_NUCFR,
    SUM(CASE WHEN ISNULL(CAB.VLRFRETECALC,0) > 0 THEN 1 ELSE 0 END)          AS TEM_VLRFRETECALC,
    SUM(CASE WHEN ISNULL(CAB.NUPEDFRETE,0)   > 0 THEN 1 ELSE 0 END)          AS TEM_NUPEDFRETE,
    SUM(CASE WHEN ISNULL(CAB.NUMCF,0)        > 0 THEN 1 ELSE 0 END)          AS TEM_NUMCF,
    SUM(CASE WHEN ISNULL(CAB.CODPARCTRANSPFINAL,0) > 0 THEN 1 ELSE 0 END)    AS TEM_TRANSPFINAL,
    SUM(CASE WHEN ISNULL(CAB.CODRASTREAMENTOECT,'') <> '' THEN 1 ELSE 0 END) AS TEM_RASTREIOECT,
    SUM(ISNULL(CAB.VLRFRETECALC,0))                                          AS SOMA_VLRFRETECALC
FROM TGFCAB CAB
WHERE CAB.TIPMOV = 'V'
  AND CAB.CODEMP IN (1, 4, 6)
  AND CAB.DTNEG >= '20260101'
GROUP BY CAB.CODEMP
ORDER BY 1
```

Decide se `AD_VLRCOTFRETE` colide com `VLRFRETECALC` e se existe processo nativo de pedido
de frete que a plataforma deveria alimentar em vez de contornar.

### 9.5 Peso e cubagem estão preenchidos?

A cotação depende disso. Se os campos existem mas estão vazios, a plataforma vai ter que
calcular a partir dos itens — o que muda o desenho.

```sql
SELECT
    CAB.CODEMP,
    COUNT(*)                                                              AS QTD,
    SUM(CASE WHEN ISNULL(CAB.PESOBRUTO,0)      > 0 THEN 1 ELSE 0 END)     AS TEM_PESOBRUTO,
    SUM(CASE WHEN ISNULL(CAB.PESOBRUTOITENS,0) > 0 THEN 1 ELSE 0 END)     AS TEM_PESOITENS,
    SUM(CASE WHEN ISNULL(CAB.M3AENTREGAR,0)    > 0 THEN 1 ELSE 0 END)     AS TEM_M3,
    SUM(CASE WHEN ISNULL(CAB.VOLUME,'')       <> '' THEN 1 ELSE 0 END)    AS TEM_VOLUME,
    SUM(CASE WHEN ISNULL(CAB.CODUFENTREGA,0)   > 0 THEN 1 ELSE 0 END)     AS TEM_UFENTREGA,
    SUM(CASE WHEN ISNULL(CAB.CODCIDENTREGA,0)  > 0 THEN 1 ELSE 0 END)     AS TEM_CIDENTREGA,
    AVG(ISNULL(CAB.PESOBRUTO,0))                                          AS PESO_MEDIO
FROM TGFCAB CAB
WHERE CAB.TIPMOV = 'V'
  AND CAB.CODEMP IN (1, 4, 6)
  AND CAB.DTNEG >= '20260101'
  AND ISNULL(CAB.VLRFRETETOTAL,0) > 0
GROUP BY CAB.CODEMP
ORDER BY 1
```

### 9.6 A `TSIFER` cobre feriado municipal?

```sql
SELECT CAM.NOMECAMPO, CAM.DESCRCAMPO, CAM.TIPCAMPO, CAM.TAMANHO
FROM TDDCAM CAM
WHERE CAM.NOMETAB = 'TSIFER'
ORDER BY CAM.NOMECAMPO
```

Se tiver `CODCID` ou `CODUF`, cobre municipal e estadual e o OTD está resolvido. Se só
tiver data, é feriado nacional e precisamos complementar.

---

## 10. O que muda no projeto

1. **O recorte está fechado e medido.** 1.823 notas, R$ 303.079,69. As listas de TOP estão
   no §1.2 e vão para o bloco de recorte padrão.
2. **A questão da pessoa física está resolvida** — 0,3%, não precisa de regra.
3. **A `TGFNCT` é a nova prioridade máxima**, junto com o diagnóstico dos CT-e. As duas
   juntas decidem se o Cotado × Realizado é nota a nota ou só agregado.
4. **O pedido à T.I. precisa de um adendo**, não de retirada: três perguntas sobre
   `VLRFRETECALC`/`NUCFR`, a redução das tabelas por causa dos campos nativos de peso e
   destino, e o registro de que existem três campos de rastreio diferentes.
5. **O calendário de feriados sai da lista de coisas a construir.**
6. **A premissa dos 12 cadastros da Braspress cai.** Corrigir onde aparece.
7. **Dois requisitos novos de tela**, ambos vindos dos dados: alerta quando a cotação passa
   de um percentual do valor da mercadoria (§7.3), e obrigatoriedade de transportadora
   quando há frete (27 pontos de diferença no §7.1).
