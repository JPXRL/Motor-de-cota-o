# Recorte oficial do projeto: B2B nacional, sem bonificação

Definido por Juan em 14/09/2026. **Calibrado e fechado com medição em 15/09/2026** —
os números estão em `claude/resultados-calibracao-sankhya.md`.

**Vale para tudo daqui para frente:** consultas, indicadores, telas, tabelas de rastreio e
qualquer número que saia da plataforma.

---

## 1. O bloco de recorte — pronto para copiar

```sql
  AND CAB.TIPMOV     = 'V'
  AND CAB.CODEMP     IN (1, 4, 6)   -- B2B: exclui a empresa 3 (pessoa física + marketplace)
  AND CAB.CODTIPOPER NOT IN (1145, 1123, 1133,   -- exportação
                             1117, 1017,          -- bonificação
                             1130)                -- remessa p/ industrialização
```

Para o **custo absoluto**, onde bonificação e remessa devem aparecer como linha própria,
usar só as três TOPs de exportação: `NOT IN (1145, 1123, 1133)`.

---

## 2. A regra

| Dentro | Fora |
|---|---|
| Venda B2B nacional, empresas 1, 4 e 6 | **Empresa 3** — B2C (pessoa física + marketplace) |
| TOPs 1101, 1100, 1103 | TOPs 1145, 1123, 1133 — exportação |
| SUFRAMA (1103) — Manaus é território nacional | TOPs 1117, 1017 — bonificação e brinde |
| | TOP 1130 — remessa para industrialização |

Dois mecanismos:

- **B2C sai pela empresa.** Como todas as consultas já filtravam `CODEMP IN (1, 4, 6)`,
  **o B2C já estava fora** desde o início, sem que soubéssemos que era regra de negócio.
  A medição confirmou de forma inequívoca: a empresa 3 tem **1.376 notas com frete e
  ticket de R$ 19,45**, contra R$ 166 no B2B. É outro negócio.
- **Exportação, bonificação e remessa saem pela TOP.** Filtrar por transportadora seria
  errado: há exportação faturada com JRL e com UPS, e bonificação com Braspress, Rodonaves
  e Smart Envios.

**SUFRAMA fica dentro.** Zona Franca de Manaus é território nacional — 29 notas,
R$ 14.816,53. Vale marcar como caso especial na cotação, porque prazo e cobertura para
Manaus são diferentes de tudo, mas é venda B2B nacional.

---

## 3. O tamanho do recorte

| | Notas | Frete | Ticket |
|---|---:|---:|---:|
| **Escopo B2B nacional, sem bonificação** | **1.823** | **R$ 303.079,69** | R$ 166,25 |
| Exportação (fora) | 63 | R$ 8.917,42 | |
| Bonificação (fora dos relativos) | 13 | R$ 1.479,09 | |
| Remessa industrialização (fora) | 1 | R$ 1.450,00 | |
| *Total antes do recorte* | *1.900* | *R$ 314.926,20* | |

**As exclusões tiram 3,8% do frete e 77 notas.** A soma das partes fecha exatamente com o
total, o que confirma que nenhuma TOP ficou sem classificação.

---

## 4. Bonificação: sai dos indicadores, não some do mapa

**Sai dos indicadores de custo relativo.** Em bonificação o valor da nota é simbólico, então
qualquer razão frete ÷ venda estoura e o Cotado × Realizado compara frete real com receita
que não existe. Fora, sem discussão.

**Não sai do custo absoluto.** O frete da bonificação é dinheiro que saiu do caixa. Se
desaparecer das consultas, o total do ano encolhe e passamos a defender o projeto com um
número menor que a realidade. Deve aparecer como **linha própria, rotulada**, fora dos
percentuais. Mesmo tratamento para a remessa de industrialização.

**Nos indicadores de entrega, fica.** OTD, OCT e Perfect Order Rate medem se a mercadoria
chegou no prazo. Quem recebe bonificação espera a entrega como qualquer outra, e a
transportadora cobra igual. Tirar seria esconder atraso real.
*Ponto em aberto — se preferir tirar daqui também, é uma linha de filtro.*

**A bonificação tem TOP própria**, então o filtro funciona: a consulta que procurou
bonificação escondida em TOP de venda comum (notas com frete acima de 25% do valor) não
encontrou nenhuma. Não precisa de critério por natureza de operação nem CFOP.

---

## 5. Pessoa física dentro do B2B: questão encerrada

A regra dada foi "pessoa física e marketplace, ou seja, tudo faturado na empresa 3", e eu
tinha apontado que os dois critérios não coincidiam — existem clientes pessoa física dentro
da empresa 1.

**Medido: nove notas em toda a base B2B do ano, R$ 908,37 de frete — 0,3%.** E três delas
são a TOP 1017 (bonificação a pessoa física), que já sai pelo filtro de bonificação. Sobram
seis notas no ano inteiro.

**A regra "empresa 3 = B2C" basta.** Nenhuma cláusula sobre tipo de pessoa é necessária.

---

## 6. Consequências além das consultas

1. **A tela de cotação atende B2B nacional.** Sem país, Incoterm, moeda ou despacho
   aduaneiro. Simplifica o formulário e a validação de CEP.
2. **O rastreio também.** Braspress, Rodonaves e Jamef são nacionais. A UPS — que seria a
   exigência internacional — é **100% exportação** (aparece só nas TOPs 1133 e 1145) e sai
   do escopo junto com o tracking internacional.
3. **O OTD fica tratável**, e mais ainda depois que a calibração encontrou a tabela
   `TSIFER` (Feriado) no próprio ERP: o cálculo de dias úteis consome o calendário do
   Sankhya em vez de a plataforma manter o seu.
4. **A bonificação continua sendo cotada.** Ela sai dos *indicadores*, não da *operação*:
   quem manda bonificação escolhe transportadora igual, e a plataforma cota normalmente.
   O que muda é como o número é contado depois.
5. **A empresa 3 pode voltar depois.** A dimensão empresa já existe em todas as tabelas,
   então incluí-la no futuro é mudar um filtro, não remodelar. Só não otimizamos nada para
   ela agora — e a família de campos `BH_` (28 campos de marketplace na `TGFCAB`) é dela,
   **a plataforma não toca**.
6. **Os cinco relatórios passam a ser "B2B nacional"** no título, com a bonificação tratada
   conforme o §4. Todos com o mesmo recorte, para que os números conversem entre si.

---

## 7. Onde o recorte ainda não se aplica

**O CT-e.** A consulta do lado pago devolveu zero linhas e o diagnóstico está pendente
(§8.1 e §9.1 do documento de calibração). Além disso, o CT-e é nota de **compra** — o bloco
de recorte acima, que filtra `TIPMOV='V'` e TOP de venda, não serve para ele. O corte
equivalente do lado da compra só poderá ser escrito depois que soubermos onde os CT-e
moram e com quais TOPs de entrada eles entram.
