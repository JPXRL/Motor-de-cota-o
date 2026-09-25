# Diagnóstico das 91 notas com AD_STATUSENTREGA preenchido

Data: 14/09/2026 · Fonte: consulta executada por Juan no DbExplorer (usuário 106) ·
Recorte: todas as notas com `AD_STATUSENTREGA` não nulo.

> Regra em vigor no projeto: premissa sobre o estado do dado só entra em documento
> com contagem por trás. Tudo abaixo veio da medição, não de suposição.

---

## 0. A descoberta operacional primeiro: o banco é SQL Server

A consulta original falhou com `'EXTRACT' não é um nome da função interna reconhecido`.
Essa mensagem é literalmente a tradução do erro `is not a recognized built-in function name`
do **SQL Server**. `EXTRACT(YEAR FROM ...)` é sintaxe Oracle/PostgreSQL.

Consequência para o projeto inteiro, não só para esta consulta:

- Data: `YEAR()`, `MONTH()`, `DATEDIFF()`, `DATEADD()`, `CONVERT(VARCHAR(7), campo, 120)`.
- Literal de data: `'20260101'` (formato ISO sem separador é o único imune a
  configuração regional no SQL Server). `'01/01/2026'` é ambíguo e pode virar 1º de janeiro
  ou 1º de janeiro dependendo do `DATEFORMAT` da sessão — não usar.
- Concatenação: `+`, não `||`.
- Limite de linhas: `SELECT TOP 100`, não `ROWNUM` nem `LIMIT`.
- NVL não existe: `ISNULL()` ou `COALESCE()`.
- Sem `DUAL`.

Isso também vale para qualquer consulta que a plataforma venha a mandar via
`DbExplorerSP.executeQuery` — o dialeto do motor precisa ser SQL Server.

---

## 1. O tamanho real do preenchimento

| Medida | Valor |
|---|---|
| Notas com `AD_STATUSENTREGA` preenchido | 91 |
| Empresas envolvidas | **só a 1 (Matriz)** — zero na 4 e zero na 6 |
| Valores usados do domínio | só `C` e `E`. **`P` nunca foi usado** |
| Distribuição | 19 `C` · 72 `E` |
| Tipos de movimento | 57 venda (V) · 15 devolução (D) · 1 compra (C) · 1 pedido (P) — mais 17 vendas fora do recorte de status C |
| Período | jan/2026 a ago/2026, com 29 notas só em janeiro |

**Leitura:** não é um processo, é um teste que alguém fez. O pico em janeiro (29 notas,
sendo 15 das 19 marcadas como `C`), seguido de um rastro de 5 a 11 notas por mês
quase todas marcadas direto como `E`, tem a assinatura de um piloto que foi abandonado
e depois de um preenchimento esporádico e manual.

---

## 2. Quem aparece nessas notas

| Cliente | Notas |
|---|---|
| ANOVA COSMETICOS LTDA (CODPARC 4 e 8) | **58** |
| HIPER CARIJOS LTDA | 8 |
| NP INDUSTRIA E COMERCIO DE COSMETICOS | 4 |
| Demais (um cada) | 21 |

**58 de 91 são transferências entre as nossas próprias empresas.** Ou seja: o pouco
acompanhamento que existe hoje foi feito sobre carga interna (Matriz → Anova), não
sobre entrega a cliente. O indicador de OTD que interessa ao negócio — entrega ao
cliente final — nunca foi medido nem uma vez.

| Transportadora | Notas |
|---|---|
| Braspress | 62 |
| *(sem `CODPARCTRANSP`)* | 24 |
| Correios | 4 |
| Rodonaves | 2 |

24 notas (26%) não têm transportadora vinculada. Confirma a medição anterior da T.I.
de que `CODPARCTRANSP` está preenchido em ~49% da base: mesmo no subconjunto que alguém
cuidou de marcar manualmente, um quarto ficou sem transportadora.

---

## 3. A qualidade das datas — o capítulo mais útil

`AD_DTENTREGA` é, segundo a T.I., **data prevista**. Com isso,
`AD_DTENTREGA − AD_DTCOLETA` é o prazo prometido, não o realizado.

Nas 71 vendas com o par de datas coerente:

| Estatística | Dias |
|---|---|
| Média | 3,5 |
| Mediana | 3 |
| P75 | 4 |
| Máximo | 33 |

Por transportadora (amostra minúscula, serve como ordem de grandeza, não como número):

| Transportadora | Notas | Média | Mediana | Máx |
|---|---|---|---|---|
| Braspress | 58 | 3,5 | 3 | 11 |
| Correios | 4 | 9,0 | 1 | 33 |
| Rodonaves | 1 | 9,0 | 9 | 9 |
| *(sem transportadora)* | 8 | 0,1 | 0 | 1 |

O grupo "sem transportadora" com prazo zero é o retrato do problema: alguém preencheu
coleta e entrega com a mesma data só para fechar o campo.

### 3.1 Os defeitos encontrados — e o que cada um ensina

**a) Datas de 2024 em notas de 2026 — 11 ocorrências, todas em devolução (`TIPMOV='D'`).**

Exemplo: NUNOTA 383251, `DTNEG` 23/06/2026, `AD_DTCOLETA` 19/06/**2024**,
`AD_DTENTREGA` 19/05/**2024**. Cinco notas diferentes de HIPER CARIJOS carregam
exatamente o mesmo par 19/06/2024 + 19/05/2024.

O mesmo par repetido em cinco documentos distintos não é digitação: é **herança de cópia**.
Quando a devolução é gerada a partir da nota original (ou a nota é duplicada), os campos
`AD_` vêm junto.

> **Isso é uma regra de projeto, não uma curiosidade.** Qualquer campo que a plataforma
> escrever na `TGFCAB` será copiado quando a nota for duplicada ou devolvida, e vai poluir
> o histórico sem ninguém perceber. Reforça a decisão de manter o rastreio nas tabelas
> próprias (`AD_FRETERASTREIO` / `AD_FRETEEVENTO`) e usar a `TGFCAB` só para o que precisa
> ser visto na tela da nota — e, mesmo ali, o motor tem que **limpar** os campos de rastreio
> ao detectar `TIPMOV='D'` ou nota copiada.

**b) Inversão dia/mês — 1 ocorrência flagrante.**

NUNOTA 311877: `DTNEG` 04/02/2026, `AD_DTCOLETA` **04/12/2026**, `AD_DTENTREGA` 09/02/2026.
A coleta ficou 298 dias depois da entrega prevista. Alguém digitou 04/12 no lugar de 12/04
ou inverteu dia e mês. Passou sem nenhuma crítica.

> Regra de validação para o motor: `coleta` não pode ser anterior à `DTNEG` nem posterior
> a `DTNEG + 30 dias`; `entrega prevista` não pode ser anterior à coleta. As duas críticas
> pegariam este caso na hora da gravação.

**c) Preenchimento pela metade — 6 notas.** Quatro com coleta e sem entrega prevista,
duas com entrega prevista e sem coleta. Todas as quatro primeiras estão marcadas como `C`,
o que é coerente (coletado, ainda sem previsão), mas as duas últimas estão marcadas como
`E` sem nunca terem tido coleta.

**d) 13 notas (14%) com a coleta a mais de 30 dias de distância da `DTNEG`** — a maioria
sendo o caso (a).

---

## 4. O que isso muda no desenho

1. **O domínio `P/C/E` está confirmado na prática, mas incompleto.** `P` nunca foi usado
   em 91 tentativas. O motor precisa dos estados intermediários que o desenho já previu
   (em trânsito, em rota de entrega, tentativa frustrada, extraviado, devolvido) — o
   domínio de três letras não descreve uma entrega real.

2. **`AD_STATUSENTREGA` não deve ser reaproveitado como está.** O campo tem 102.464
   registros lidos pela Torre de Controle (componente 614) e 22.771 gravações, segundo a
   medição da T.I., mas essas 91 notas mostram que o conteúdo dele é inconsistente e vem
   de digitação manual. O motor escreve no campo novo (`AD_FRETESTATUS`) e o mapeamento
   para o domínio antigo, se a Torre precisar, é uma tradução na saída — nunca uma
   sobreposição do histórico.

3. **A limpeza retroativa não vale a pena.** 91 notas em 8 meses, 58 delas de transferência
   interna, com 11 registros corrompidos por herança de cópia. Não há base histórica a
   preservar. O primeiro dado confiável de entrega será o que o motor gravar.

4. **A validação de data entra na primeira versão**, não numa fase futura. Os três defeitos
   encontrados (herança, inversão, preenchimento parcial) são exatamente os que uma
   gravação por API elimina de graça — desde que as críticas estejam lá.

---

## 5. Consultas corrigidas (SQL Server)

### 5.1 Lado A — frete que foi para as notas de venda

```sql
SELECT
    CAB.CODEMP,
    YEAR(CAB.DTNEG)                                     AS ANO,
    MONTH(CAB.DTNEG)                                    AS MES,
    ISNULL(TRA.RAZAOSOCIAL, '(sem transportadora)')     AS TRANSPORTADORA,
    SUBSTRING(RIGHT('00000000000000'
        + CAST(ISNULL(TRA.CGC_CPF,'') AS VARCHAR(14)), 14), 1, 8) AS RAIZ_CNPJ,
    COUNT(*)                                            AS QTD_NOTAS,
    SUM(CAB.VLRFRETETOTAL)                              AS FRETE_NA_NOTA
FROM TGFCAB CAB
LEFT JOIN TGFPAR TRA ON TRA.CODPARC = CAB.CODPARCTRANSP
WHERE CAB.TIPMOV = 'V'
  AND CAB.CODEMP IN (1, 4, 6)
  AND CAB.DTNEG >= '20260101'
  AND CAB.VLRFRETETOTAL > 0
GROUP BY CAB.CODEMP, YEAR(CAB.DTNEG), MONTH(CAB.DTNEG),
         ISNULL(TRA.RAZAOSOCIAL, '(sem transportadora)'),
         SUBSTRING(RIGHT('00000000000000'
            + CAST(ISNULL(TRA.CGC_CPF,'') AS VARCHAR(14)), 14), 1, 8)
ORDER BY 1, 2, 3, 4
```

A coluna `RAIZ_CNPJ` é o que resolve o problema dos 12+ cadastros da Braspress:
somando por raiz, os cadastros duplicados colapsam num número só.

### 5.2 Lado B — frete efetivamente pago (CT-e como nota de compra)

```sql
SELECT
    CAB.CODEMP,
    YEAR(CAB.DTNEG)                                     AS ANO,
    MONTH(CAB.DTNEG)                                    AS MES,
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
GROUP BY CAB.CODEMP, YEAR(CAB.DTNEG), MONTH(CAB.DTNEG),
         ISNULL(TRA.RAZAOSOCIAL, '(sem parceiro)'),
         SUBSTRING(RIGHT('00000000000000'
            + CAST(ISNULL(TRA.CGC_CPF,'') AS VARCHAR(14)), 14), 1, 8)
ORDER BY 1, 2, 3, 4
```

Comparar 5.1 com 5.2, mês a mês e por raiz de CNPJ, é a primeira medição de
**Cotado × Realizado** possível hoje, sem uma linha de código novo.

### 5.3 Quem mexeu nas 91 notas (proxy pelos campos de usuário)

A `TGFCAB` tem apenas `CODUSU`, `CODUSUINC`, `CODUSUCOMPRADOR` e `DTALTER` — não há
campo de "usuário da última alteração". `DTALTER` marca a última mudança de **qualquer**
campo da nota, então é aproximação, não prova.

```sql
SELECT
    CAB.AD_STATUSENTREGA,
    ISNULL(U1.NOMEUSU, '(sem usuário)')          AS USU_INCLUSAO,
    ISNULL(U2.NOMEUSU, '(sem usuário)')          AS USU_NOTA,
    CONVERT(VARCHAR(7), CAB.DTALTER, 120)        AS MES_ULTIMA_ALTERACAO,
    COUNT(*)                                     AS QTD
FROM TGFCAB CAB
LEFT JOIN TSIUSU U1 ON U1.CODUSU = CAB.CODUSUINC
LEFT JOIN TSIUSU U2 ON U2.CODUSU = CAB.CODUSU
WHERE CAB.AD_STATUSENTREGA IS NOT NULL
GROUP BY CAB.AD_STATUSENTREGA,
         ISNULL(U1.NOMEUSU, '(sem usuário)'),
         ISNULL(U2.NOMEUSU, '(sem usuário)'),
         CONVERT(VARCHAR(7), CAB.DTALTER, 120)
ORDER BY 5 DESC
```

### 5.4 A prova de verdade: existe log de auditoria?

A consulta de tabelas de log devolveu 25 candidatas. A relevante é **`TAPLOG` — "Tabela de
log" (módulo erpcore)**, que é a auditoria de alteração de campos do Sankhya. Antes de
consultá-la, é preciso saber as colunas dela:

```sql
SELECT CAM.NOMECAMPO, CAM.DESCRCAMPO, CAM.TIPCAMPO, CAM.TAMANHO
FROM TDDCAM CAM
WHERE CAM.NOMETAB = 'TAPLOG'
ORDER BY CAM.NOMECAMPO
```

E o volume, para saber se a auditoria está de fato ligada:

```sql
SELECT COUNT(*) AS QTD_LINHAS FROM TAPLOG
```

Se `TAPLOG` estiver vazia ou quase, a auditoria nunca foi habilitada e a resposta para
"quem preencheu" morre no proxy de 5.3 — o que, na prática, já basta: o padrão temporal
(29 notas em janeiro, rastro esporádico depois) diz que foi um piloto abandonado,
independentemente do nome de quem digitou.

---

## 6. Pergunta que nasce daqui, para a T.I.

> A auditoria de campos (`TAPLOG`) está habilitada para a `TGFCAB`? Se sim, desde quando,
> e ela cobre campos `AD_`? Isso decide se conseguimos reconstruir quem alterou o quê
> — e, mais importante para frente, se as gravações do motor vão ficar auditadas
> automaticamente ou se o log de alteração precisa ser responsabilidade da plataforma.
