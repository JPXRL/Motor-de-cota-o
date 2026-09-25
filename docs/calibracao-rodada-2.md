# Calibração — rodada 2 (15/09/2026)

Continuação de `claude/resultados-calibracao-sankhya.md`. Seis consultas, duas com erro,
e o erro rendeu uma regra que vale para o resto do projeto.

---

## 1. A regra que explica os dois erros: `CALCULADO = 'S'`

As consultas falharam com `Nome de coluna 'TIPOCTE' inválido` e
`Nome de coluna 'PESOBRUTOITENS' inválido` — campos que estavam na lista de 68 que a
própria `TDDCAM` devolveu.

A resposta estava na coluna `CALCULADO`, que eu tinha trazido e não usei:

| Campo | `CALCULADO` |
|---|---|
| `M3AENTREGAR` | **S** |
| `PESOAENTREGAR` | **S** |
| `PESOBRUTOITENS` | **S** |
| `PESOLIQITENS` | **S** |
| `TIPOCTE` | **S** |
| `TIPSERVCTE` | **S** |
| `DESCTERMACORD` | **S** |

> **Regra do projeto:** na `TDDCAM`, `CALCULADO = 'S'` significa **campo virtual** — ele
> existe na camada do ERP, não como coluna física. SQL não enxerga. Antes de usar qualquer
> campo do dicionário numa consulta, conferir o `CALCULADO`.

**Isso não é só sobre consultas.** A plataforma lê o Sankhya por
`DbExplorerSP.executeQuery`, que é SQL puro — logo **não tem acesso a nenhum campo
calculado**. Cubagem (`M3AENTREGAR`) e peso consolidado dos itens (`PESOBRUTOITENS`,
`PESOLIQITENS`) estão fora do alcance por essa via, e a cotação precisa dos dois.

Saídas possíveis: somar a partir da `TGFITE` (peso por item × quantidade), usar o
`PESOBRUTO` físico, ou ler pela camada do ERP com `DatasetSP`. É decisão de arquitetura e
entra na lista de perguntas à T.I.

---

## 2. `TGFNCT`: o vínculo existe, tem 33.045 linhas, e é melhor do que eu esperava

| Campo | Descrição |
|---|---|
| `NUNOTA` | **Nro. Único CT-e** |
| `SEQUENCIA` | Sequência |
| `CHAVENFE` | **Chave NF-e** |
| `NUMERO`, `SERIE`, `CODMODDOC` | Número, série e modelo do documento |
| `DTEMISSAO` | Dh. Emissão |
| `CFOP` | CFOP |
| `VLRNOTA`, `VLRTOTPROD` | Valor da nota e dos produtos |
| **`PESOB`, `PESOL`** | **Peso bruto e líquido** |
| `BASEICMS`, `VLRICMS`, `BASEST`, `VLRST` | Impostos |

**A estrutura é: uma linha por NF-e coberta por um conhecimento de transporte.** O `NUNOTA`
é do CT-e; a `CHAVENFE` aponta para a nota de venda que ele transportou.

Isso é exatamente a ligação documento a documento que eu tinha listado como "talvez
exista". Com ela, o Cotado × Realizado deixa de ser comparação de totais e vira a lista de
notas onde o frete pago divergiu.

E tem um bônus que eu não tinha previsto: **`PESOB` e `PESOL` são o peso que a
transportadora declarou no CT-e**. Comparado com o peso da nossa nota, isso responde
sozinho uma das causas clássicas de diferença entre cotado e cobrado — a transportadora
recubar por peso ou cubagem maior. É um indicador que nasce de graça.

**33.045 linhas** é volume de operação real, não tabela vazia. Falta saber quantas são de
2026 e quantas casam com as nossas notas — consultas no §6.

---

## 3. O motor de frete nativo está morto — e isso é boa notícia

| Campo | Notas com valor (2.936 no total) |
|---|---|
| `NUCFR` — Cód. cálculo de frete | **0** |
| `VLRFRETECALC` — Vlr. frete calc. | **0** |
| `NUPEDFRETE` — Nro. Pedido Frete | **0** |
| `NUMCF` — Nro. Conhec. de Frete | **0** |
| `CODPARCTRANSPFINAL` — Transportadora Final | **0** |
| `CODRASTREAMENTOECT` — Rastreamento Correios | **0** |

Zero em tudo, nas três empresas.

**Não há colisão.** O receio do §2.2 da rodada 1 se dissolve: `AD_VLRCOTFRETE` não briga com
`VLRFRETECALC`, porque ninguém usa o segundo.

Mas abre uma pergunta melhor: **por que criar `AD_` quando existem campos nativos vazios com
exatamente o significado que precisamos?** `VLRFRETECALC` é literalmente "valor de frete
calculado" — é a cotação. `NUCFR` é o identificador do cálculo. `CODPARCTRANSPFINAL` é o
redespacho que hoje a gente não tem onde guardar.

O contra é o mesmo alerta que a T.I. deu sobre o `NUMCOTACAO`: **campo nativo pode ser
escrito por rotina do ERP sem aviso**. Um campo zerado hoje pode ser preenchido amanhã se
alguém ligar um módulo.

**Vira pergunta para a T.I., não decisão nossa.** E note que ela já tinha dito que o bloco
`FRETEVLRPAGO` estava livre para o módulo assumir — a resposta pode valer para o conjunto.

---

## 4. `CODUFENTREGA` está 100% vazio — o mapa de cobertura muda de caminho

O campo existe, é físico, e **não é preenchido em nenhuma das 1.823 notas**. Todas as oito
linhas do resultado vieram com `SEM_UF` igual ao total.

Era a minha aposta para o mapa de cobertura, e caiu. O caminho correto apareceu na consulta
de metadados:

- **`TSIEND` não tem UF nem cidade** — só `CODEND`, `NOMEEND`, `TIPO`, `TIPOENDERECO`. Era
  por isso que a consulta original quebrava. O erro não era de sintaxe, era de modelo.
- **`TSICID` tem `CODCID`, `NOMECID`, `UF` (código inteiro), `UFNOMECID` ("Cidade - UF") e
  `AD_NOMEUF` ("Nome + UF")**.
- **`TSIUFS` tem `CODUF` e `UF` (sigla)**.

O caminho é `TGFCAB.CODPARC` → `TGFPAR.CODCID` → `TSICID` → `TSIUFS`. Ou, mais curto,
`TSICID.UFNOMECID`, que já vem pronto. Consulta corrigida no §6.

---

## 5. O achado colateral: o Sankhya tem tabela de frete por cidade

A `TSICID` — cadastro de cidades — carrega isto:

| Campo | Descrição |
|---|---|
| `VLRFRETEKM` | Valor de frete por KM |
| `VLRFRETEMIN` | Valor de frete mínimo |
| `VLRFRETETON` | Valor de frete por tonelada |
| `TIPOFRETE` | Tipo de frete |
| `DISTANCIA` | Distância |
| `VLRTAXAENT` | Valor taxa de entrada |
| `SEQENTREGA` | Sequência de entrega |
| `VENDAMIN` | Venda Mínima |
| `LATITUDE`, `LONGITUDE` | Coordenadas |

**O ERP tem estrutura nativa de tabela de frete por cidade**, com distância, mínimo, valor
por km e por tonelada — e coordenadas, que serviriam para roteirização.

Se estiver preenchida, existe uma tabela de frete que ninguém no projeto sabia que existia.
Se estiver vazia, é um lugar pronto para a plataforma guardar a tabela negociada de cada
transportadora — embora `TSICID` seja cadastro de cidade e não tenha dimensão de
transportadora, então provavelmente serve para frete próprio, não para terceiros.

De qualquer forma, precisa ser medido antes de a gente desenhar a nossa. Consulta no §6.

---

## 6. `TSIFER` resolve o OTD por completo

| Campo | Descrição |
|---|---|
| `DTFERIADO` | Data do feriado |
| `DESCRFERIADO` | Descrição |
| `NACIONAL` | Tipo |
| **`CODCID`** | Cód. Cidade |
| **`CODUF`** | Estado |
| `CODPAIS` | País |
| `RECORRENTE` | Recorrente |
| `OBRIGATORIO` | Obrigatório |
| `USANOPONTO` | Usar no Ponto/Pessoal |

Tem as três dimensões — **nacional, estadual e municipal** — mais recorrência, que é o que
evita recadastrar Natal todo ano.

O OTD precisa de prazo em dias úteis com feriado da praça de destino, e essa tabela entrega
exatamente isso. **Some do projeto a tarefa de manter calendário de feriados**, desde que
ela esteja povoada — o que também precisa de contagem.

---

## 7. Próxima rodada — sete consultas

### 7.1 🔴 Como é uma linha da `TGFNCT` de verdade

```sql
SELECT TOP 50
    NCT.NUNOTA,
    NCT.SEQUENCIA,
    NCT.NUMERO,
    NCT.SERIE,
    NCT.CODMODDOC,
    NCT.CFOP,
    NCT.DTEMISSAO,
    NCT.CHAVENFE,
    NCT.VLRNOTA,
    NCT.VLRTOTPROD,
    NCT.PESOB,
    NCT.PESOL
FROM TGFNCT NCT
ORDER BY NCT.NUNOTA DESC
```

Mostra se a `CHAVENFE` está de fato preenchida e como as sequências se comportam quando um
CT-e cobre várias notas.

### 7.2 🔴 Onde moram os CT-e — pela `TGFNCT`, que é caminho mais seguro

Substitui o diagnóstico que falhou. Em vez de partir do `CHAVECTE` e adivinhar os status,
parte dos documentos que a `TGFNCT` referencia.

```sql
SELECT
    CAB.CODEMP,
    CAB.TIPMOV,
    CAB.CODTIPOPER,
    ISNULL(CAB.STATUSCTE,   '(nulo)')   AS STATUSCTE,
    ISNULL(CAB.SITUACAOCTE, '(nulo)')   AS SITUACAOCTE,
    COUNT(*)                            AS QTD,
    SUM(ISNULL(CAB.VLRNOTA,0))          AS VLR_TOTAL,
    MIN(CAB.DTNEG)                      AS PRIMEIRA,
    MAX(CAB.DTNEG)                      AS ULTIMA
FROM TGFCAB CAB
WHERE CAB.DTNEG >= '20260101'
  AND CAB.NUNOTA IN (SELECT DISTINCT NCT.NUNOTA FROM TGFNCT NCT)
GROUP BY CAB.CODEMP, CAB.TIPMOV, CAB.CODTIPOPER,
         ISNULL(CAB.STATUSCTE,'(nulo)'),
         ISNULL(CAB.SITUACAOCTE,'(nulo)')
ORDER BY 6 DESC
```

Sem filtro de empresa, sem filtro de tipo de movimento, sem chutar valores de status.
Devolve de uma vez em que empresa, com que TOP e com que status os conhecimentos entram —
e é o que permite escrever o recorte do lado da compra.

### 7.3 🔴 Quantas das nossas notas têm CT-e vinculado

A pergunta que vale o projeto. Requer que a `TGFCAB` tenha `CHAVENFE` — se der erro de
coluna, me avise que eu troco o caminho.

```sql
SELECT
    VEN.CODEMP,
    YEAR(VEN.DTNEG)                                     AS ANO,
    MONTH(VEN.DTNEG)                                    AS MES,
    COUNT(DISTINCT VEN.NUNOTA)                          AS NOTAS_VENDA,
    COUNT(DISTINCT NCT.NUNOTA)                          AS CTE_DISTINTOS,
    SUM(ISNULL(VEN.VLRFRETETOTAL,0))                    AS FRETE_NA_NOTA
FROM TGFCAB VEN
LEFT JOIN TGFNCT NCT ON NCT.CHAVENFE = VEN.CHAVENFE
WHERE VEN.DTNEG >= '20260101'
  AND ISNULL(VEN.VLRFRETETOTAL,0) > 0
  AND VEN.TIPMOV     = 'V'
  AND VEN.CODEMP     IN (1, 4, 6)
  AND VEN.CODTIPOPER NOT IN (1145, 1123, 1133, 1117, 1017, 1130)
GROUP BY VEN.CODEMP, YEAR(VEN.DTNEG), MONTH(VEN.DTNEG)
ORDER BY 1, 2, 3
```

Se `CTE_DISTINTOS` chegar perto de `NOTAS_VENDA`, a reconciliação nota a nota está
destravada e o Cotado × Realizado sai completo.

### 7.4 Peso e destino — refeita sem os campos calculados

```sql
SELECT
    CAB.CODEMP,
    COUNT(*)                                                             AS QTD,
    SUM(CASE WHEN ISNULL(CAB.PESO,0)          > 0 THEN 1 ELSE 0 END)     AS TEM_PESO,
    SUM(CASE WHEN ISNULL(CAB.PESOBRUTO,0)     > 0 THEN 1 ELSE 0 END)     AS TEM_PESOBRUTO,
    SUM(CASE WHEN ISNULL(CAB.VOLUME,'')      <> '' THEN 1 ELSE 0 END)    AS TEM_VOLUME,
    SUM(CASE WHEN ISNULL(CAB.CODCIDENTREGA,0) > 0 THEN 1 ELSE 0 END)     AS TEM_CIDENTREGA,
    SUM(CASE WHEN ISNULL(CAB.LOCALENTREGA,'')<> '' THEN 1 ELSE 0 END)    AS TEM_LOCALENTREGA,
    AVG(ISNULL(CAB.PESOBRUTO,0))                                         AS PESO_MEDIO,
    MAX(ISNULL(CAB.PESOBRUTO,0))                                         AS PESO_MAXIMO
FROM TGFCAB CAB
WHERE CAB.DTNEG >= '20260101'
  AND ISNULL(CAB.VLRFRETETOTAL,0) > 0
  AND CAB.TIPMOV     = 'V'
  AND CAB.CODEMP     IN (1, 4, 6)
  AND CAB.CODTIPOPER NOT IN (1145, 1123, 1133, 1117, 1017, 1130)
GROUP BY CAB.CODEMP
ORDER BY 1
```

Se `PESOBRUTO` vier zerado também, a cotação terá que somar o peso a partir da `TGFITE`, e
isso muda o desenho — a plataforma passa a precisar dos itens, não só do cabeçalho.

### 7.5 O mapa de cobertura, pelo caminho certo

```sql
SELECT
    CAB.CODEMP,
    ISNULL(CID.UFNOMECID, '(sem cidade)')               AS CIDADE_UF,
    ISNULL(TRA.RAZAOSOCIAL, '(sem transportadora)')     AS TRANSPORTADORA,
    COUNT(*)                                            AS QTD_NOTAS,
    SUM(ISNULL(CAB.VLRFRETETOTAL,0))                    AS FRETE
FROM TGFCAB CAB
LEFT JOIN TGFPAR TRA ON TRA.CODPARC = CAB.CODPARCTRANSP
LEFT JOIN TGFPAR CLI ON CLI.CODPARC = CAB.CODPARC
LEFT JOIN TSICID CID ON CID.CODCID  = CLI.CODCID
WHERE CAB.DTNEG >= '20260101'
  AND ISNULL(CAB.VLRFRETETOTAL,0) > 0
  AND CAB.TIPMOV     = 'V'
  AND CAB.CODEMP     IN (1, 4, 6)
  AND CAB.CODTIPOPER NOT IN (1145, 1123, 1133, 1117, 1017, 1130)
GROUP BY CAB.CODEMP, ISNULL(CID.UFNOMECID, '(sem cidade)'),
         ISNULL(TRA.RAZAOSOCIAL, '(sem transportadora)')
ORDER BY 1, 5 DESC
```

`UFNOMECID` já vem como "Cidade - UF", então não precisa do join com `TSIUFS`. Se o
resultado vier muito granular para ler, eu agrego por UF depois — o importante é confirmar
que o caminho funciona.

### 7.6 A tabela de frete por cidade está preenchida?

```sql
SELECT
    COUNT(*)                                                              AS QTD_CIDADES,
    SUM(CASE WHEN ISNULL(CID.VLRFRETEKM,0)  > 0 THEN 1 ELSE 0 END)        AS TEM_FRETEKM,
    SUM(CASE WHEN ISNULL(CID.VLRFRETEMIN,0) > 0 THEN 1 ELSE 0 END)        AS TEM_FRETEMIN,
    SUM(CASE WHEN ISNULL(CID.VLRFRETETON,0) > 0 THEN 1 ELSE 0 END)        AS TEM_FRETETON,
    SUM(CASE WHEN ISNULL(CID.DISTANCIA,0)   > 0 THEN 1 ELSE 0 END)        AS TEM_DISTANCIA,
    SUM(CASE WHEN ISNULL(CID.LATITUDE,'')  <> '' THEN 1 ELSE 0 END)       AS TEM_COORDENADA,
    SUM(CASE WHEN ISNULL(CID.VLRTAXAENT,0)  > 0 THEN 1 ELSE 0 END)        AS TEM_TAXAENT
FROM TSICID CID
```

### 7.7 A `TSIFER` está povoada?

```sql
SELECT
    ISNULL(FER.NACIONAL, '(nulo)')                                        AS TIPO,
    ISNULL(FER.RECORRENTE, '(nulo)')                                      AS RECORRENTE,
    COUNT(*)                                                              AS QTD,
    SUM(CASE WHEN ISNULL(FER.CODUF,0)  > 0 THEN 1 ELSE 0 END)             AS COM_UF,
    SUM(CASE WHEN ISNULL(FER.CODCID,0) > 0 THEN 1 ELSE 0 END)             AS COM_CIDADE,
    MIN(FER.DTFERIADO)                                                    AS PRIMEIRO,
    MAX(FER.DTFERIADO)                                                    AS ULTIMO
FROM TSIFER FER
GROUP BY ISNULL(FER.NACIONAL,'(nulo)'), ISNULL(FER.RECORRENTE,'(nulo)')
ORDER BY 3 DESC
```

Se `COM_CIDADE` for zero, só há feriado nacional e estadual, e o municipal continua sendo
trabalho nosso — o que ainda assim é muito menos do que manter os três.

---

## 8. O que muda

1. **`CALCULADO='S'` vira regra fixa** — e um limite real da arquitetura: campos calculados
   são invisíveis para o `DbExplorerSP.executeQuery`.
2. **A `TGFNCT` é o vínculo CT-e ↔ NF-e**, com 33 mil linhas e ainda traz o peso declarado
   pela transportadora. É por ela que o diagnóstico do CT-e deve passar, não pelo
   `CHAVECTE`.
3. **Nenhum campo nativo de frete está ocupado.** Sem colisão — e com a pergunta aberta de
   se vale usar os nativos em vez de criar `AD_`.
4. **`CODUFENTREGA` não serve.** O destino vem pela cidade do parceiro, via `TSICID`.
5. **O calendário de feriados do ERP tem as três dimensões.** Falta só confirmar que está
   povoado.
6. **Existe estrutura nativa de frete por cidade** que ninguém conhecia. Medir antes de
   desenhar a nossa.
7. **Duas perguntas novas para a T.I.:** campos nativos de frete correm risco de escrita
   por rotina? E como a plataforma deve obter cubagem e peso consolidado, já que são
   calculados e o SQL não os enxerga?
