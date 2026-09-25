# Pacote de consultas no Sankhya — B2B nacional, sem bonificação

Atualizado em 14/09/2026 · Dialeto: **SQL Server** · Executar no DbExplorer, uma por aba.

**Recorte oficial:** B2B nacional, sem bonificação. Regra completa em
`claude/recorte-b2b-nacional.md`.

Legenda: ⏳ ainda não rodou · ✅ rodou, resultado registrado · 🔑 calibração (roda primeiro)

---

## O bloco de recorte

Todas as consultas abaixo carregam este bloco. **Copiar e colar, nunca reescrever de
memória.**

```sql
  AND CAB.TIPMOV     = 'V'
  AND CAB.CODEMP     IN (1, 4, 6)   -- B2B: exclui a empresa 3 (pessoa física + marketplace)
--AND CAB.CODTIPOPER NOT IN (000, 000, 000)   -- FORA DO ESCOPO: exportação + bonificação (preencher após a C2)
```

Enquanto a última linha estiver comentada, o resultado é
**"B2B, exportação e bonificação ainda incluídas"** — e nenhum número nesse estado sai do
projeto para a empresa.

**Bonificação tem tratamento especial:** sai dos indicadores de custo relativo, fica no
custo absoluto como linha própria, e continua dentro de OTD/OCT/Perfect Order Rate.
O porquê está no §2 do documento de recorte. Por isso a C2 pede os códigos de bonificação
**separados** dos de exportação — para dar a opção de somar só uma das duas exclusões.

---

# Bloco 0 — Calibração 🔑

Cinco consultas curtas que fecham as definições. **Rodar antes de qualquer outra coisa**,
porque elas preenchem o bloco de recorte que todas as demais usam.

### C1 🔑 Todas as empresas, para confirmar a fronteira

Confirma que a empresa 3 é mesmo o B2C, mostra o tamanho do que está sendo excluído e
revela se existe outra empresa faturando frete que ninguém citou.

```sql
SELECT
    CAB.CODEMP,
    COUNT(*)                            AS QTD_NOTAS,
    SUM(ISNULL(CAB.VLRFRETETOTAL,0))    AS FRETE,
    MIN(CAB.DTNEG)                      AS PRIMEIRA,
    MAX(CAB.DTNEG)                      AS ULTIMA
FROM TGFCAB CAB
WHERE CAB.TIPMOV = 'V'
  AND CAB.DTNEG >= '20260101'
  AND ISNULL(CAB.VLRFRETETOTAL,0) > 0
GROUP BY CAB.CODEMP
ORDER BY 1
```

### C2 🔑 Quais são as TOPs — exportação e bonificação em separado

**A mais importante do pacote.** É ela que preenche a lista de exclusão. Ao ler a saída,
marcar cada TOP como: dentro do escopo, exportação, ou bonificação. Guardar as duas listas
separadas.

```sql
SELECT
    CAB.CODEMP,
    CAB.CODTIPOPER,
    TOPE.DESCROPER,
    COUNT(*)                                    AS QTD_NOTAS,
    SUM(ISNULL(CAB.VLRFRETETOTAL,0))            AS FRETE,
    SUM(ISNULL(CAB.VLRNOTA,0))                  AS VLR_NOTAS,
    COUNT(DISTINCT CAB.CODPARCTRANSP)           AS QTD_TRANSPORTADORAS
FROM TGFCAB CAB
LEFT JOIN TGFTOP TOPE
       ON TOPE.CODTIPOPER = CAB.CODTIPOPER
      AND TOPE.DHALTER = (SELECT MAX(T2.DHALTER)
                            FROM TGFTOP T2
                           WHERE T2.CODTIPOPER = CAB.CODTIPOPER)
WHERE CAB.TIPMOV = 'V'
  AND CAB.CODEMP IN (1, 4, 6)
  AND CAB.DTNEG >= '20260101'
  AND ISNULL(CAB.VLRFRETETOTAL,0) > 0
GROUP BY CAB.CODEMP, CAB.CODTIPOPER, TOPE.DESCROPER
ORDER BY 5 DESC
```

> **Dica de leitura:** a bonificação se denuncia sozinha na coluna `VLR_NOTAS` — frete
> normal com valor de nota muito baixo, ou razão frete ÷ nota absurdamente alta. É o padrão
> a procurar mesmo que a descrição da TOP não diga "bonificação".

> **Se der erro no join:** a `TGFTOP` tem chave composta (`CODTIPOPER` + `DHALTER`) e é o
> ponto frágil aqui. Sem o `LEFT JOIN` e sem `TOPE.DESCROPER` a consulta roda igual — a
> descrição de cada TOP se lê na tela de Tipos de Operação. Me manda o erro que eu ajusto.

### C3 🔑 Pessoa física dentro de 1, 4 e 6

Resolve o ponto que a definição de B2C não fechou: quanto de pessoa física existe **dentro**
do B2B. Marginal, a regra "empresa 3 = B2C" basta; relevante, precisa de uma frase a mais.

```sql
SELECT
    CAB.CODEMP,
    ISNULL(PAR.TIPPESSOA, '(nulo)')     AS TIPPESSOA,
    COUNT(*)                            AS QTD_NOTAS,
    SUM(ISNULL(CAB.VLRFRETETOTAL,0))    AS FRETE,
    SUM(ISNULL(CAB.VLRNOTA,0))          AS VLR_NOTAS,
    COUNT(DISTINCT CAB.CODPARC)         AS QTD_CLIENTES
FROM TGFCAB CAB
LEFT JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC
WHERE CAB.TIPMOV = 'V'
  AND CAB.CODEMP IN (1, 4, 6)
  AND CAB.DTNEG >= '20260101'
  AND ISNULL(CAB.VLRFRETETOTAL,0) > 0
GROUP BY CAB.CODEMP, ISNULL(PAR.TIPPESSOA, '(nulo)')
ORDER BY 1, 2
```

Leitura: ticket da pessoa física perto do da jurídica → é revenda comprando no CPF,
mantém. Ticket muito menor e muitos clientes distintos → é varejo disfarçado, exclui.

### C4 🔑 TOP × transportadora — onde exportação e bonificação realmente estão

Confirma a C2 por outro caminho e mostra a exportação que **não** vai por UPS — justamente
a que um filtro por transportadora deixaria passar.

```sql
SELECT
    CAB.CODTIPOPER,
    ISNULL(TRA.RAZAOSOCIAL, '(sem transportadora)')     AS TRANSPORTADORA,
    COUNT(*)                                            AS QTD_NOTAS,
    SUM(ISNULL(CAB.VLRFRETETOTAL,0))                    AS FRETE
FROM TGFCAB CAB
LEFT JOIN TGFPAR TRA ON TRA.CODPARC = CAB.CODPARCTRANSP
WHERE CAB.TIPMOV = 'V'
  AND CAB.CODEMP IN (1, 4, 6)
  AND CAB.DTNEG >= '20260101'
  AND ISNULL(CAB.VLRFRETETOTAL,0) > 0
GROUP BY CAB.CODTIPOPER, ISNULL(TRA.RAZAOSOCIAL, '(sem transportadora)')
ORDER BY 1, 4 DESC
```

### C5 🔑 Rede de segurança: bonificação que não tem TOP própria

Se na C2 a bonificação **não** aparecer como TOP separada, ela está escondida dentro de
uma TOP de venda comum e o filtro por TOP não pega. Esta consulta procura o rastro pelo
comportamento: notas cujo frete é desproporcional ao valor.

```sql
SELECT TOP 200
    CAB.CODEMP,
    CAB.NUNOTA,
    CAB.NUMNOTA,
    CAB.DTNEG,
    CAB.CODTIPOPER,
    CAB.CODPARC,
    PAR.NOMEPARC,
    CAB.VLRNOTA,
    CAB.VLRFRETETOTAL,
    CASE WHEN ISNULL(CAB.VLRNOTA,0) > 0
         THEN CAST(CAB.VLRFRETETOTAL * 100.0 / CAB.VLRNOTA AS DECIMAL(10,2))
         ELSE 9999 END                              AS PERC_FRETE
FROM TGFCAB CAB
LEFT JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC
WHERE CAB.TIPMOV = 'V'
  AND CAB.CODEMP IN (1, 4, 6)
  AND CAB.DTNEG >= '20260101'
  AND ISNULL(CAB.VLRFRETETOTAL,0) > 0
  AND (ISNULL(CAB.VLRNOTA,0) = 0
       OR CAB.VLRFRETETOTAL > CAB.VLRNOTA * 0.25)
ORDER BY 10 DESC
```

Nota com frete acima de 25% do valor, ou com valor zero, é candidata a bonificação,
amostra ou remessa. Se vierem muitas e com a mesma TOP de venda comum, a exclusão precisa
de outro critério além da TOP — e aí o caminho é a natureza de operação / CFOP, que eu
mapeio quando você me mandar o resultado.

---

# Bloco 1 — As que travam decisão agora

### 1.1 ⏳ Quais campos de frete a `TGFCAB` já tem

**Independe do recorte** — é metadado. Pode rodar junto com a calibração.

Urgente porque o pedido que está com a T.I. ("Campos de Frete no Sankhya") pede a criação
de doze campos. Se algum já existir com outro nome, estamos pedindo duplicata e deixando de
usar algo que o ERP já alimenta.

```sql
SELECT
    CAM.NOMECAMPO,
    CAM.DESCRCAMPO,
    CAM.TIPCAMPO,
    CAM.TAMANHO,
    CAM.CALCULADO,
    CAM.DOMAIN
FROM TDDCAM CAM
WHERE CAM.NOMETAB = 'TGFCAB'
  AND (   CAM.NOMECAMPO  LIKE '%FRETE%'
       OR CAM.DESCRCAMPO LIKE '%rete%'
       OR CAM.NOMECAMPO  LIKE '%TRANSP%'
       OR CAM.NOMECAMPO  LIKE '%CTE%'
       OR CAM.NOMECAMPO  LIKE '%ENTREG%'
       OR CAM.NOMECAMPO  LIKE '%COLETA%'
       OR CAM.NOMECAMPO  LIKE '%RASTR%'
       OR CAM.NOMECAMPO  LIKE '%PESO%'
       OR CAM.NOMECAMPO  LIKE '%VOLUME%'
       OR CAM.NOMECAMPO  LIKE '%PRAZO%')
ORDER BY CAM.NOMECAMPO
```

### 1.2 ⏳ Campos customizados da `TGFCAB` (`AD_` e `BH_`)

Também metadado. Evita colisão com a família `BH_` do marketplace — que agora sabemos ser
o canal B2C, logo **fora do escopo e a não ser tocada** pela plataforma. No SQL Server o
`_` é curinga no `LIKE`, daí o `[_]`.

```sql
SELECT
    CAM.NOMECAMPO,
    CAM.DESCRCAMPO,
    CAM.TIPCAMPO,
    CAM.TAMANHO,
    CAM.DOMAIN
FROM TDDCAM CAM
WHERE CAM.NOMETAB = 'TGFCAB'
  AND (CAM.NOMECAMPO LIKE 'AD[_]%' OR CAM.NOMECAMPO LIKE 'BH[_]%')
ORDER BY CAM.NOMECAMPO
```

### 1.3 ⏳ O denominador: quantas notas B2B nacionais existem, com e sem frete

A 2.1 entregou o universo **com** frete. Falta o total, para saber que fatia das vendas
B2B tem frete lançado.

```sql
SELECT
    CAB.CODEMP,
    YEAR(CAB.DTNEG)                                                        AS ANO,
    MONTH(CAB.DTNEG)                                                       AS MES,
    COUNT(*)                                                               AS QTD_NOTAS,
    SUM(CASE WHEN ISNULL(CAB.VLRFRETETOTAL,0) > 0 THEN 1 ELSE 0 END)       AS COM_FRETE,
    SUM(CASE WHEN ISNULL(CAB.CODPARCTRANSP,0) > 0 THEN 1 ELSE 0 END)       AS COM_TRANSPORTADORA,
    SUM(ISNULL(CAB.VLRFRETETOTAL,0))                                       AS FRETE_TOTAL,
    SUM(ISNULL(CAB.VLRNOTA,0))                                             AS VLR_NOTAS
FROM TGFCAB CAB
WHERE CAB.DTNEG >= '20260101'
  AND CAB.TIPMOV     = 'V'
  AND CAB.CODEMP     IN (1, 4, 6)
--AND CAB.CODTIPOPER NOT IN (000, 000, 000)   -- exportação + bonificação (preencher após a C2)
GROUP BY CAB.CODEMP, YEAR(CAB.DTNEG), MONTH(CAB.DTNEG)
ORDER BY 1, 2, 3
```

---

# Bloco 2 — As que provam o valor do projeto

### 2.1 ✅→⏳ Lado A — frete que foi para a nota de venda *(rerodar com o recorte)*

Rodou em 14/09; resultado em `claude/mapa-transportadoras-2026.md`: 62 linhas, 1.892 notas,
R$ 313.408,94, reproduzindo ao centavo o total jan–jul do levantamento anterior.
**Já é B2B** (filtrava `CODEMP IN (1,4,6)`), mas **ainda inclui exportação e bonificação**.

Rerodar com a lista de TOPs preenchida:

```sql
SELECT
    CAB.CODEMP,
    YEAR(CAB.DTNEG)                                 AS ANO,
    MONTH(CAB.DTNEG)                                AS MES,
    ISNULL(TRA.RAZAOSOCIAL, '(sem transportadora)') AS TRANSPORTADORA,
    SUBSTRING(RIGHT('00000000000000'
        + CAST(ISNULL(TRA.CGC_CPF,'') AS VARCHAR(14)), 14), 1, 8) AS RAIZ_CNPJ,
    COUNT(*)                                        AS QTD_NOTAS,
    SUM(CAB.VLRFRETETOTAL)                          AS FRETE_NA_NOTA
FROM TGFCAB CAB
LEFT JOIN TGFPAR TRA ON TRA.CODPARC = CAB.CODPARCTRANSP
WHERE CAB.DTNEG >= '20260101'
  AND CAB.VLRFRETETOTAL > 0
  AND CAB.TIPMOV     = 'V'
  AND CAB.CODEMP     IN (1, 4, 6)
--AND CAB.CODTIPOPER NOT IN (000, 000, 000)   -- exportação + bonificação (preencher após a C2)
GROUP BY CAB.CODEMP, YEAR(CAB.DTNEG), MONTH(CAB.DTNEG),
         ISNULL(TRA.RAZAOSOCIAL, '(sem transportadora)'),
         SUBSTRING(RIGHT('00000000000000'
            + CAST(ISNULL(TRA.CGC_CPF,'') AS VARCHAR(14)), 14), 1, 8)
ORDER BY 1, 2, 3, 4
```

**Rodar três vezes e guardar as três saídas:** sem exclusão (a que já temos), só sem
exportação, e sem exportação e bonificação. As diferenças entre elas *são* o tamanho de
cada exclusão — e é assim que a bonificação vira a "linha própria no custo absoluto" que o
recorte pede, em vez de simplesmente sumir.

### 2.2 ⏳ Lado B — frete efetivamente pago (CT-e como nota de compra)

**A mais importante depois da calibração.** O lado A já está medido; falta o outro lado
para fechar o Cotado × Realizado.

Atenção: o CT-e é nota de **compra**, então `TIPMOV = 'C'` e o bloco padrão não se aplica
tal como está. O B2C continua saindo pela empresa; exportação e bonificação, porém, não dão
para cortar pela TOP de venda — o CT-e tem TOP de compra própria. Por isso esta consulta
traz `CODTIPOPER` na saída, para identificarmos depois quais correspondem a frete
internacional e a remessa de bonificação.

```sql
SELECT
    CAB.CODEMP,
    YEAR(CAB.DTNEG)                                     AS ANO,
    MONTH(CAB.DTNEG)                                    AS MES,
    CAB.CODTIPOPER,
    ISNULL(TRA.RAZAOSOCIAL, '(sem parceiro)')           AS TRANSPORTADORA,
    SUBSTRING(RIGHT('00000000000000'
        + CAST(ISNULL(TRA.CGC_CPF,'') AS VARCHAR(14)), 14), 1, 8) AS RAIZ_CNPJ,
    COUNT(*)                                            AS QTD_CTE,
    SUM(CAB.VLRNOTA)                                    AS FRETE_PAGO
FROM TGFCAB CAB
LEFT JOIN TGFPAR TRA ON TRA.CODPARC = CAB.CODPARC
WHERE CAB.TIPMOV = 'C'
  AND CAB.CHAVECTE IS NOT NULL
  AND CAB.STATUSCTE = 'A'
  AND CAB.SITUACAOCTE = 'N'
  AND CAB.CODEMP IN (1, 4, 6)
  AND CAB.DTNEG >= '20260101'
GROUP BY CAB.CODEMP, YEAR(CAB.DTNEG), MONTH(CAB.DTNEG), CAB.CODTIPOPER,
         ISNULL(TRA.RAZAOSOCIAL, '(sem parceiro)'),
         SUBSTRING(RIGHT('00000000000000'
            + CAST(ISNULL(TRA.CGC_CPF,'') AS VARCHAR(14)), 14), 1, 8)
ORDER BY 1, 2, 3, 8 DESC
```

Comparar com a 2.1 por mês e por raiz de CNPJ produz o primeiro número de Cotado ×
Realizado da história da empresa, sem uma linha de código.

### 2.3 ⏳ Existe vínculo documento a documento entre CT-e e nota de venda?

Metadado, independe do recorte. Se existir estrutura ligando o CT-e às NF-e que ele cobre,
a comparação deixa de ser agregada e vira **lista de notas onde o pago divergiu do cotado**
— a diferença entre "gastamos 8% a mais" e "estas 40 notas explicam os 8%". É também o que
permitiria separar o CT-e de bonificação sem depender de TOP.

```sql
SELECT
    TAB.NOMETAB,
    TAB.DESCRTAB,
    TAB.DOMAIN
FROM TDDTAB TAB
WHERE TAB.NOMETAB  LIKE '%CTE%'
   OR TAB.DESCRTAB LIKE '%CT-e%'
   OR TAB.DESCRTAB LIKE '%onhecimento%'
ORDER BY 1
```

Aparecendo tabela promissora, listar as colunas dela com a consulta do §1.1 trocando o
`NOMETAB`.

---

# Bloco 3 — As que fecham o desenho dos campos

### 3.1 ⏳ Qual dos três campos de valor é o "realizado da nota"

O desenho assume `VLRFRETETOTAL` como valor certo e `FRETEVLRPAGO` como nunca usado (logo
livre para a plataforma ocupar). Ainda é premissa; esta é a contagem que vira fato.

```sql
SELECT
    CAB.CODEMP,
    COUNT(*)                                                                    AS QTD,
    SUM(CASE WHEN ISNULL(CAB.VLRFRETE,0)      > 0 THEN 1 ELSE 0 END)            AS TEM_VLRFRETE,
    SUM(CASE WHEN ISNULL(CAB.VLRFRETETOTAL,0) > 0 THEN 1 ELSE 0 END)            AS TEM_VLRFRETETOTAL,
    SUM(CASE WHEN ISNULL(CAB.FRETEVLRPAGO,0)  > 0 THEN 1 ELSE 0 END)            AS TEM_FRETEVLRPAGO,
    SUM(CASE WHEN ISNULL(CAB.VLRFRETE,0) <> ISNULL(CAB.VLRFRETETOTAL,0)
             THEN 1 ELSE 0 END)                                                 AS DIVERGEM,
    SUM(ISNULL(CAB.VLRFRETE,0))                                                 AS SOMA_VLRFRETE,
    SUM(ISNULL(CAB.VLRFRETETOTAL,0))                                            AS SOMA_VLRFRETETOTAL,
    SUM(ISNULL(CAB.FRETEVLRPAGO,0))                                             AS SOMA_FRETEVLRPAGO
FROM TGFCAB CAB
WHERE CAB.DTNEG >= '20260101'
  AND CAB.TIPMOV     = 'V'
  AND CAB.CODEMP     IN (1, 4, 6)
--AND CAB.CODTIPOPER NOT IN (000, 000, 000)   -- exportação + bonificação (preencher após a C2)
GROUP BY CAB.CODEMP
ORDER BY 1
```

`DIVERGEM` alto → os campos medem coisas diferentes e a escolha precisa de critério.
`TEM_FRETEVLRPAGO` zero → campo livre, como esperado. Diferente de zero → alguém usa e a
plataforma não pode ocupá-lo.

### 3.2 ⏳ `TIPFRETE` — quanto é incluso e quanto é extra nota

`S` = incluso, `N` = extra nota (não é CIF/FOB). A proporção decide se o "realizado da
nota" está dentro do `VLRNOTA` ou se boa parte do custo está fora — muda a fórmula do
Custo de Transporte.

```sql
SELECT
    CAB.CODEMP,
    ISNULL(CAB.TIPFRETE, '(nulo)')      AS TIPFRETE,
    COUNT(*)                            AS QTD,
    SUM(ISNULL(CAB.VLRFRETETOTAL,0))    AS FRETE,
    SUM(ISNULL(CAB.VLRNOTA,0))          AS VLR_NOTAS
FROM TGFCAB CAB
WHERE CAB.DTNEG >= '20260101'
  AND CAB.TIPMOV     = 'V'
  AND CAB.CODEMP     IN (1, 4, 6)
--AND CAB.CODTIPOPER NOT IN (000, 000, 000)   -- exportação + bonificação (preencher após a C2)
GROUP BY CAB.CODEMP, ISNULL(CAB.TIPFRETE, '(nulo)')
ORDER BY 1, 2
```

### 3.3 ⏳ Cadastro duplicado de transportadora

A 2.1 mostrou que a raiz de CNPJ funciona como chave. Falta medir quantos `CODPARC`
distintos cada raiz tem — dimensiona a tabela de consolidação.

```sql
SELECT
    SUBSTRING(RIGHT('00000000000000'
        + CAST(ISNULL(PAR.CGC_CPF,'') AS VARCHAR(14)), 14), 1, 8)  AS RAIZ_CNPJ,
    MIN(PAR.RAZAOSOCIAL)                                           AS RAZAO_EXEMPLO,
    COUNT(DISTINCT PAR.CODPARC)                                    AS QTD_CADASTROS,
    COUNT(*)                                                       AS QTD_NOTAS_2026,
    SUM(ISNULL(CAB.VLRFRETETOTAL,0))                               AS FRETE_2026
FROM TGFCAB CAB
JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARCTRANSP
WHERE CAB.DTNEG >= '20260101'
  AND ISNULL(CAB.CODPARCTRANSP,0) > 0
  AND CAB.TIPMOV     = 'V'
  AND CAB.CODEMP     IN (1, 4, 6)
--AND CAB.CODTIPOPER NOT IN (000, 000, 000)   -- exportação + bonificação (preencher após a C2)
GROUP BY SUBSTRING(RIGHT('00000000000000'
        + CAST(ISNULL(PAR.CGC_CPF,'') AS VARCHAR(14)), 14), 1, 8)
ORDER BY 4 DESC
```

### 3.4 ~~TOPs que carregam frete~~ → virou a **C2**

Absorvida pela calibração, que faz o mesmo trabalho com finalidade maior.

### 3.5 ⏳ O mapa de cobertura: quem atende cada UF

A dimensão que a cotação precisa: **quem entrega onde**. Sem ela o motor não sabe excluir
transportadora por falta de cobertura — regra que já está no desenho da tela. Com o recorte
nacional, a UF de destino passa a ser sempre brasileira: qualquer `(sem UF)` ou UF estranha
vira suspeita de exportação que escapou do filtro.

```sql
SELECT
    CAB.CODEMP,
    ISNULL(ENDE.UF, '(sem UF)')                         AS UF_DESTINO,
    ISNULL(TRA.RAZAOSOCIAL, '(sem transportadora)')     AS TRANSPORTADORA,
    COUNT(*)                                            AS QTD_NOTAS,
    SUM(ISNULL(CAB.VLRFRETETOTAL,0))                    AS FRETE
FROM TGFCAB CAB
LEFT JOIN TGFPAR TRA  ON TRA.CODPARC  = CAB.CODPARCTRANSP
LEFT JOIN TGFPAR CLI  ON CLI.CODPARC  = CAB.CODPARC
LEFT JOIN TSIEND ENDE ON ENDE.CODEND  = CLI.CODEND
WHERE CAB.DTNEG >= '20260101'
  AND ISNULL(CAB.VLRFRETETOTAL,0) > 0
  AND CAB.TIPMOV     = 'V'
  AND CAB.CODEMP     IN (1, 4, 6)
--AND CAB.CODTIPOPER NOT IN (000, 000, 000)   -- exportação + bonificação (preencher após a C2)
GROUP BY CAB.CODEMP, ISNULL(ENDE.UF, '(sem UF)'),
         ISNULL(TRA.RAZAOSOCIAL, '(sem transportadora)')
ORDER BY 1, 2, 4 DESC
```

> **Ponto frágil desta consulta:** o caminho do endereço do parceiro
> (`TGFPAR` → `TSIEND`) é o que eu menos confio no pacote inteiro. Se der erro de coluna,
> rodar a consulta do §1.1 com `NOMETAB = 'TGFPAR'` e depois com `NOMETAB = 'TSIEND'` e me
> mandar as duas saídas — eu corrijo o caminho. A UF pode estar direto na `TGFPAR` ou vir
> pela cidade (`TSICID`) em vez do endereço.

---

# Bloco 4 — "Quem mexeu" e "dá para auditar"

Detalhadas em `claude/diagnostico-91-notas-statusentrega.md` §5.3 e §5.4. **Não levam
recorte:** ali o objetivo é varrer tudo que existe no campo, inclusive fora do escopo, para
entender a origem do preenchimento.

### 4.1 ⏳ Proxy de autoria nas 91 notas (`CODUSU`, `CODUSUINC`, `DTALTER`)

### 4.2 ⏳ Colunas da `TAPLOG` e volume de linhas

> `TAPLOG` viva e cobrindo campos `AD_` → as gravações da plataforma já nascem auditadas.
> Senão, o log de alteração vira requisito da tabela `AD_FRETERASTREIO`.

---

# Bloco 5 — A que evita construir algo que já existe

### 5.1 ⏳ Existe calendário de feriados no Sankhya?

Com o recorte nacional isso ficou **mais importante, não menos**: o OTD passa a ser
integralmente um cálculo de dias úteis brasileiros, com feriado nacional, estadual e
municipal. Se o ERP já mantém esse calendário, a plataforma consome; senão, manter feriado
municipal de três estados vira trabalho recorrente todo ano.

```sql
SELECT
    TAB.NOMETAB,
    TAB.DESCRTAB,
    TAB.DOMAIN
FROM TDDTAB TAB
WHERE TAB.DESCRTAB LIKE '%eriado%'
   OR TAB.DESCRTAB LIKE '%alendário%'
   OR TAB.DESCRTAB LIKE '%alendario%'
ORDER BY 1
```

---

## Ordem de execução

**Primeiro, de uma vez:** C1, C2, C3, C4, C5 — e, se sobrar aba, 1.1 e 1.2, que são
metadado e não dependem de nada.

Com a C2 e a C5 na mão eu preencho a lista de exclusão, e aí:

**2.2** (fecha o Cotado × Realizado) → **2.1 rerodada em três versões** (mede o tamanho da
exportação e da bonificação) → **2.3** (decide se a reconciliação é nota a nota) →
**3.5** (destrava a regra de cobertura) → o resto na ordem que der.
