# Levantamento de Frete — Jan a Jul (Empresas 1, 4 e 6)

## Fonte
Consulta SQL no Sankhya (TGFCAB), notas de venda (TIPMOV = 'V'), empresas (CODEMP) 1, 4 e 6.

```sql
SELECT 
    NUNOTA, NUMNOTA, CODEMP, DTNEG, VLRNOTA, VLRFRETETOTAL,
    CASE WHEN VLRNOTA > 0 THEN (VLRFRETETOTAL / VLRNOTA) * 100 ELSE 0 END AS PERC_FRETE
FROM TGFCAB
WHERE TIPMOV = 'V'
  AND CODEMP IN (1, 4, 6)
  AND VLRFRETETOTAL > 0
  AND DTNEG BETWEEN '01/01/AAAA' AND '31/07/AAAA'
ORDER BY CODEMP, DTNEG DESC
```

## Resultado 2026 (Jan-Jul, 1.630 notas)

| Empresa | Qtd Notas | Total Vendas (R$) | Total Frete (R$) | % Frete médio (por nota) | % Frete ponderado (Frete/Vendas) |
|---|---|---|---|---|---|
| 1 | 890 | 5.275.165,42 | 168.760,45 | 6,67% | 3,20% |
| 4 | 659 | 2.691.849,24 | 83.740,25 | 5,67% | 3,11% |
| 6 | 81 | 421.863,73 | 16.538,92 | 7,94% | 3,92% |
| **Geral** | **1.630** | **8.388.878,39** | **269.039,62** | **6,33%** | **3,21%** |

## Resultado 2025 (Jan-Jul, 1.557 notas)

| Empresa | Qtd Notas | Total Vendas (R$) | Total Frete (R$) | % Frete médio (por nota) | % Frete ponderado (Frete/Vendas) |
|---|---|---|---|---|---|
| 1 | 893 | 3.316.102,77 | 143.516,19 | 8,88% | 4,33% |
| 4 | 615 | 3.288.877,64 | 69.390,29 | 4,86% | 2,11% |
| 6 | 49 | 271.408,51 | 9.432,90 | 7,10% | 3,48% |
| **Geral** | **1.557** | **6.876.388,92** | **222.339,38** | **7,23%** | **3,23%** |

## Comparativo 2025 x 2026 (% Frete Ponderado)

| Empresa | 2025 | 2026 | Variação (p.p.) | Variação Total Frete (R$) |
|---|---|---|---|---|
| 1 | 4,33% | 3,20% | -1,13 p.p. | +17,6% |
| 4 | 2,11% | 3,11% | +1,00 p.p. | +20,7% |
| 6 | 3,48% | 3,92% | +0,44 p.p. | +75,3% |
| **Geral** | **3,23%** | **3,21%** | **-0,03 p.p.** | **+21,0%** |

Observações: o percentual ponderado geral ficou praticamente estável entre os dois anos (~3,2%), mas o gasto absoluto com frete cresceu ~21% (acompanhando o crescimento das vendas). A Empresa 1 melhorou a eficiência do frete (percentual caiu), enquanto Empresa 4 e principalmente Empresa 6 pioraram proporcionalmente — Empresa 6 quase dobrou o gasto absoluto com frete (+75%) e teve o percentual ponderado subir de 3,48% para 3,92%.

- % Frete médio = média simples do percentual de frete calculado nota a nota.
- % Frete ponderado = Total Frete ÷ Total Vendas do período (mais representativo do peso real do frete no faturamento).

## Arquivos entregues
- `Levantamento_Frete_Jan-Jul2026.xlsx` — detalhado + resumo 2026.
- `Comparativo_Frete_2025_2026.xlsx` — detalhado 2025, resumo 2025 e comparativo 2025 x 2026.
