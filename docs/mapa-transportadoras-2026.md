# Mapa real das transportadoras — 2026 (jan a 14/set)

Fonte: consulta "Lado A" corrigida para SQL Server, executada em 14/09/2026 pelo usuário 106.
Recorte: `TGFCAB`, `TIPMOV='V'`, `CODEMP IN (1,4,6)`, `DTNEG >= 20260101`,
`VLRFRETETOTAL > 0`, agrupado por empresa, mês e raiz de CNPJ da transportadora.
62 linhas de resultado.

---

> ## ⚠️ Estado deste documento: **B2B, exportação e bonificação ainda incluídas**
>
> O recorte oficial do projeto foi definido depois desta medição
> (`claude/recorte-b2b-nacional.md`): B2B nacional, sem bonificação.
>
> - ✅ **Já é B2B.** O B2C é faturado na empresa 3, e esta consulta filtra `CODEMP IN (1,4,6)`.
>   Nenhuma correção necessária por aí.
> - ⚠️ **Ainda contém exportação**, que sai pela TOP. A UPS sozinha é 2,0% do frete, e há
>   exportação avulsa em outras transportadoras.
> - ⚠️ **Ainda contém bonificação**, em tamanho desconhecido.
>
> **Os valores em reais abaixo são teto, não número final.** A consulta 2.1 do pacote será
> rerodada em três versões assim que a calibração C2 identificar as TOPs. As conclusões
> estruturais — quem são as transportadoras, a exclusividade da Pajuçara na empresa 6, a
> cobertura das APIs — não dependem desses filtros e seguem válidas.

---

## 0. Validação da consulta

O período jan–jul desta consulta devolveu **1.630 notas e R$ 269.039,62** de frete — os
mesmos números, até o centavo, do `levantamento-frete-jan-jul-2026.md`, que foi produzido
por outra consulta, em outra data, com outro recorte de colunas.

Duas consultas independentes chegando ao mesmo total significa que a quebra por
transportadora abaixo pode ser usada para decidir, não só para ilustrar.

---

## 1. O quadro geral

| | Notas com frete | Frete na nota | Ticket médio |
|---|---:|---:|---:|
| **Total 2026 (jan–14/set)** | **1.892** | **R$ 313.408,94** | R$ 165,65 |
| Empresa 1 — Matriz | 1.019 | R$ 191.943,10 | R$ 188,36 |
| Empresa 4 — Anova SP | 778 | R$ 100.649,73 | R$ 129,37 |
| Empresa 6 — Anova RJ | 95 | R$ 20.816,11 | R$ 219,12 |

Base fechada de jan a ago (8 meses completos): R$ 304.829,15 → **R$ 38.103,64/mês →
R$ 457.243,72/ano**. Confirma a ordem de grandeza usada na justificativa de custo
(R$ 38.434/mês, R$ 461 mil/ano), agora com origem rastreável.

Volume de cotação: **230 notas com frete por mês**. É o número de vezes por mês que alguém
hoje escolhe uma transportadora na mão — e o denominador do ganho de tempo.

---

## 2. A quebra por transportadora — onde o mapa mudou

| Transportadora | Raiz CNPJ | Notas | Frete | % do frete | Ticket |
|---|---|---:|---:|---:|---:|
| Braspress | 48740351 | 1.497 | R$ 232.023,47 | **74,0%** | R$ 154,99 |
| Rodonaves | 44914992 | 205 | R$ 40.416,10 | 12,9% | R$ 197,15 |
| **Pajuçara** | 53237962 | 95 | R$ 20.816,11 | **6,6%** | R$ 219,12 |
| *(sem transportadora)* | — | 23 | R$ 8.652,74 | 2,8% | R$ 376,21 |
| **UPS** | 74155052 | 62 | R$ 6.160,42 | 2,0% | R$ 99,36 |
| JRL Transportes | 03104013 | 1 | R$ 2.757,00 | 0,9% | R$ 2.757,00 |
| Alfa Transportes | 82110818 | 1 | R$ 1.450,00 | 0,5% | R$ 1.450,00 |
| **Jamef** | 20147617 | 5 | R$ 1.003,39 | 0,3% | R$ 200,68 |
| Smart Envios | — | 3 | R$ 129,71 | 0,0% | R$ 43,24 |

### 2.1 Três transportadoras que o projeto não tinha no radar

**Pajuçara (6,6% do frete, 95 notas).** É a terceira maior da operação e **não existe em
nenhum documento do projeto**. Não há especificação de API, não foi contatada, não está no
levantamento de webhooks.

**UPS (2,0%, 62 notas).** Idem — e agora sabemos que é majoritariamente **exportação**,
portanto fora do escopo. Ticket médio de R$ 99, o mais baixo da casa.

**Jamef aparece só em setembro** — 5 notas, todas no mês 9. O projeto tem a especificação
da API dela pronta (inclusive o webhook de push, a melhor integração das três mapeadas),
mas ela está entrando na operação **agora**. A especificação foi feita antes do volume
existir.

### 2.2 A cobertura real das APIs que temos

Braspress + Rodonaves + Jamef somam **90,2% das notas e 87,2% do frete**. Tirando a UPS,
que é exportação e sai do escopo, a cobertura efetiva sobe.

O rastreio unificado, com as três integrações mapeadas, nasce cobrindo nove de cada dez
remessas. O que sobra está em Pajuçara (6,6%), notas sem transportadora (2,8%) e a cauda de
três transportadoras com uma ou três notas cada.

Isso confirma a regra de cobertura já definida: a plataforma precisa tratar "transportadora
sem integração" como estado de primeira classe, não como erro.

---

## 3. Cada empresa tem uma malha diferente. Isso muda o produto.

| Empresa | Transportadoras usadas |
|---|---|
| 1 — Matriz | Braspress (912), UPS (62), Rodonaves (16), Jamef (5), Smart (3), Alfa (1), JRL (1) |
| 4 — Anova SP | Braspress (585), Rodonaves (189) |
| 6 — Anova RJ | **Pajuçara (95) — e mais nada** |

**A empresa 6 usa uma única transportadora, em 100% das notas, nos nove meses.** Não existe
comparação de preço acontecendo lá. Nenhuma. É o caso mais forte de "a cotação vai gerar
economia" no conjunto inteiro — e é a empresa com o maior ticket de frete (R$ 219) e o
maior percentual de frete sobre venda (3,92%, pelo levantamento anterior).

**A empresa 4 tem uma disputa real**: Braspress a R$ 109,60 de ticket contra Rodonaves a
R$ 186,60, com 585 × 189 notas. Aqui a cotação tem com o que comparar desde o primeiro dia.

**A empresa 1 é a mais dispersa**: sete transportadoras, mas 89% das notas na Braspress —
e é onde a exportação está concentrada, já que a 4 e a 6 só usam transportadoras nacionais.

> Consequência de produto: a tela de cotação não pode oferecer o mesmo conjunto de
> transportadoras para as três empresas. A empresa 6 precisa de Pajuçara cadastrada para
> que a cotação faça sentido lá — sem isso, o motor vai propor Braspress e Rodonaves para
> uma operação que nunca usou nenhuma das duas.

---

## 4. Evolução mensal

| Mês | Notas | Frete | Ticket |
|---|---:|---:|---:|
| Jan | 224 | R$ 29.260,23 | R$ 130,63 |
| Fev | 190 | R$ 29.991,72 | R$ 157,85 |
| Mar | 228 | R$ 32.294,99 | R$ 141,64 |
| Abr | 246 | R$ 41.664,33 | R$ 169,37 |
| Mai | 219 | R$ 43.209,62 | R$ 197,30 |
| Jun | 259 | R$ 44.326,59 | R$ 171,15 |
| Jul | 264 | R$ 48.292,14 | R$ 182,92 |
| Ago | 210 | R$ 35.789,53 | R$ 170,43 |
| Set (até dia 14) | 52 | R$ 8.579,79 | R$ 165,00 |

O volume de notas é estável (190–264). **O ticket médio subiu 40% de janeiro a julho**
(R$ 130 → R$ 183) sem que o volume aumentasse na mesma proporção. Pode ser mix de destino,
reajuste de tabela, mais bonificação ou perda de eficiência na escolha — e hoje **não há
como distinguir**, porque não existe registro do que foi cotado.

É o argumento mais direto para a captura da cotação: a pergunta "por que o frete por nota
subiu 40%?" não tem resposta possível com os dados atuais.

---

## 5. As 23 notas com frete e sem transportadora

R$ 8.652,74, ticket médio de R$ 376 — o dobro da média da casa. Dezenove na empresa 1,
quatro na empresa 4. São notas em que o valor do frete foi lançado sem vincular quem
transportou: impossível reconciliar com CT-e, medir prazo ou atribuir a uma transportadora
em qualquer relatório.

`CODPARCTRANSP` obrigatório quando `VLRFRETETOTAL > 0` é uma crítica de uma linha que
elimina a categoria inteira daqui para a frente.

---

## 6. O que isso muda nas pendências do projeto

1. **Entra uma pergunta nova para as transportadoras:** Pajuçara tem API de cotação e
   rastreio? É 6,6% do frete e 100% da empresa 6 — não dá para tratá-la como cauda.
   (A UPS sai da lista: é exportação, fora do escopo.)
2. **A prioridade da Jamef muda.** A especificação está pronta e o volume está começando:
   dá para integrar no momento em que a operação cresce, em vez de correr atrás depois.
   É a única das três com webhook de push.
3. **O piloto deveria ser a empresa 6.** Uma transportadora só, 95 notas em nove meses
   (~10/mês), ticket alto, nenhuma comparação acontecendo, e nenhuma exportação para
   atrapalhar o recorte. Risco baixo, ganho visível, volume pequeno o bastante para
   acompanhar nota a nota.
4. **As 91 notas com rastreio representam 4,8% das 1.892** — e todas na empresa 1.
   Na empresa 6, com a maior exposição, o acompanhamento é zero.
5. **A justificativa de custo ganha números próprios:** R$ 110/mês contra R$ 38.104/mês de
   frete = 0,29%. E 230 decisões de transportadora por mês feitas sem registro.
