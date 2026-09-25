# Cotado × Realizado — a primeira medição, e a correção dela

15/09/2026. Rodadas 3 e 4 da calibração.

> ## ⚠️ Correção importante
>
> A primeira versão deste documento anunciava **+R$ 34.264 (+11,2%)** de frete pago acima
> do lançado nas notas, com três ressalvas. **A primeira ressalva era a certa e derrubou o
> número.**
>
> Com os dois lados recortados, a diferença real é **+R$ 3.702,34 (+1,2%)**. Os outros
> R$ 30,5 mil eram CT-e de notas fora do escopo — exportação, bonificação, remessa, empresa 3.
>
> Estava no documento como "obrigatória antes de qualquer apresentação". Foi, e era mesmo.
> Se aquele número tivesse ido para a diretoria, teria voltado.

---

## 1. Decisão registrada

> **O módulo de cotação nativo do Sankhya está fora de discussão.** Juan já avaliou e
> decidiu: o motor de cotação é da plataforma. Assunto encerrado, não volta.
>
> Os dados confirmam por outro caminho: a estrutura de frete por cidade da `TSICID` tem
> 6.558 cidades e **zero** valores preenchidos.

---

## 2. Por que a consulta do CT-e voltava vazia

| Campo | Eu filtrei | Valor real |
|---|---|---|
| `STATUSCTE` | `'A'` | **`'T'`** |
| `SITUACAOCTE` | `'N'` | **`'('`** |

Valores vindos de documentação, não de medição. `'T'` bate com "CT-e de terceiros" — frete
contratado, que é o nosso caso.

**O recorte do lado da compra é `TIPMOV='C'` e `CODTIPOPER=206`.** A empresa 3 (B2C) usa a
TOP 236, coerente com ser outra operação.

---

## 3. A `TGFNCT` funciona e a cobertura é total

| Empresa | Notas de venda no escopo | CT-e distintos vinculados |
|---|---:|---:|
| 1 | 952 | 964 |
| 4 | 776 | 792 |
| 6 | 95 | 95 |
| **Total** | **1.823** | **1.851** |

As 1.823 batem exatamente com o escopo B2B nacional. A reconciliação nota a nota está
tecnicamente destravada.

**O que a `TGFNCT` não entrega:** `PESOB`, `PESOL`, `CFOP` e `VLRTOTPROD` vêm vazios. Morre
a ideia de comparar o peso declarado pela transportadora com o nosso.

---

## 4. O número real

### 4.1 Agregado, com os dois lados recortados

| Empresa | Frete na nota | Frete pago (CT-e) | Diferença | % |
|---|---:|---:|---:|---:|
| 1 — Matriz | R$ 182.898,05 | R$ 185.531,54 | + R$ 2.633,49 | +1,4% |
| 4 — Anova SP | R$ 101.705,06 | R$ 102.773,91 | + R$ 1.068,85 | +1,1% |
| 6 — Anova RJ | R$ 20.816,11 | R$ 20.816,11 | R$ 0,00 | 0,0% |
| **Total** | **R$ 305.419,22** | **R$ 309.121,56** | **+ R$ 3.702,34** | **+1,2%** |

Anualizado: cerca de **R$ 5.200 por ano**, não R$ 48 mil.

### 4.2 Nota a nota, agosto: 212 de 213 batem ao centavo

A consulta que lista as notas de agosto ordenadas pela maior divergência devolveu 213
linhas. **A maior diferença do mês inteiro é de R$ 8,39.** Todas as outras 212 têm
`FRETE_NA_NOTA` exatamente igual ao `VLR_CTE`, e todas com um único CT-e por nota.

| Nota | Cliente | Na nota | CT-e | Diferença |
|---|---|---:|---:|---:|
| 407021 | CLARA COSMETICOS | R$ 55,37 | R$ 46,98 | −R$ 8,39 |
| *todas as outras 212* | | | | **R$ 0,00** |

**Isso mata a hipótese do ICMS.** Se o valor do CT-e incluísse imposto que a nota não
inclui, apareceria uma diferença percentual constante em toda linha. Não aparece em
nenhuma. O valor lançado na nota **é** o valor do conhecimento.

### 4.3 Onde está a diferença que sobra: as 24 notas com mais de um CT-e

| | Notas | Frete na nota | Soma dos CT-e | Extra |
|---|---:|---:|---:|---:|
| Empresa 1 | 12 | R$ 1.155,98 | R$ 2.402,46 | R$ 1.246,48 |
| Empresa 4 | 12 | R$ 983,21 | R$ 3.138,64 | R$ 2.155,43 |
| **Total** | **24** | **R$ 2.139,19** | **R$ 5.541,10** | **R$ 3.401,91** |

**R$ 3.401,91 de R$ 3.702,34 — 92% da divergência inteira está em 24 notas.**

Os piores casos:

| Nota | Emp | Data | Na nota | CT-e | Soma | Extra |
|---|---|---|---:|---:|---:|---:|
| 346107 | 4 | 28/04 | R$ 82,52 | 2 | R$ 519,96 | **R$ 437,44** |
| 297242 | 4 | 07/01 | R$ 3,30 | 2 | R$ 328,72 | R$ 325,42 |
| 420138 | 4 | 04/09 | R$ 159,22 | 2 | R$ 477,65 | R$ 318,43 |
| 380312 | 1 | 26/06 | R$ 116,98 | 2 | R$ 361,24 | R$ 244,26 |
| 382641 | 1 | 29/06 | R$ 285,15 | 2 | R$ 524,43 | R$ 239,28 |
| 407791 | 4 | 13/08 | R$ 107,33 | **3** | R$ 321,99 | R$ 214,66 |
| 317921 | 4 | 24/02 | R$ 3,30 | **4** | R$ 99,75 | R$ 96,45 |

Isso é reentrega, redespacho ou recobrança: um segundo conhecimento chegou, foi pago, e
ninguém voltou na nota para somar. Uma nota com **quatro** CT-e é um caso que alguém
deveria ter olhado.

**Vinte e quatro em 1.823 notas — 1,3%.** É pequeno, é real, e é exatamente o que um
controle automático pega sem esforço.

---

## 5. O que essa medição realmente diz

### 5.1 O processo de lançamento está correto

Duzentas e doze notas de agosto batendo ao centavo não é sorte. **O valor do frete é
lançado na nota a partir do conhecimento**, e com precisão. A empresa 6 fecha em zero nos
nove meses. A empresa 4 em 1,1%, a 1 em 1,4%, e quase toda a diferença das duas são as 24
notas do §4.3.

Isso é uma boa notícia que vale mais do que o número que eu tinha anunciado: **os dados de
frete do ERP são confiáveis.** Os cinco relatórios vão ser construídos sobre base sólida.

### 5.2 Mas o "Cotado × Realizado" que dá para fazer hoje é quase uma tautologia

E é aqui que a medição muda o entendimento do projeto.

O `VLRFRETETOTAL` da nota **não é uma cotação**. É o preço que a transportadora cobrou,
registrado. Comparar ele com o CT-e é comparar um número com ele mesmo — por isso dá zero.

**O "cotado" de verdade — quanto as outras transportadoras teriam cobrado naquele
embarque — não existe em lugar nenhum.** Nem no Sankhya, nem em planilha, nem na cabeça de
ninguém depois de uma semana. É um dado que nunca foi criado.

Isso reordena o argumento do projeto inteiro:

- **O dinheiro não está vazando na conferência.** Está, se estiver, na **escolha**.
- A pergunta que importa não é "pagamos o que foi cotado?" (pagamos, com precisão), é
  **"cotamos com quem devia?"** — e essa não tem como ser respondida hoje.
- O que sustenta o projeto são os sinais de escolha sem comparação, que já estão medidos:
  a **empresa 6 usando uma única transportadora em 100% das notas**; as notas com
  **frete de 39% a 45% do valor da mercadoria**; o **ticket médio subindo 40%** de janeiro
  a julho sem ninguém saber dizer por quê.

### 5.3 A reconciliação continua valendo — só não como manchete

Ela deixa de ser "descobrimos R$ 34 mil" e passa a ser:

- **Um controle contínuo** que pega as 24 notas do §4.3 no mês em que acontecem, não nove
  meses depois.
- **A garantia de que o indicador é confiável**, que é pré-requisito de qualquer dashboard.
- **A base do Custo de Transporte real**, porque agora sabemos que o `VLRFRETETOTAL` pode
  ser usado sem ressalva.

---

## 6. O mapa de cobertura funcionou — e revelou o desenho da operação

1.823 notas, R$ 303.079,69, nenhuma linha sem UF. Bate com o escopo ao centavo.

| Empresa | UFs atendidas |
|---|---|
| 1 — Matriz | **27** — o Brasil inteiro |
| 4 — Anova SP | **1** — só SP |
| 6 — Anova RJ | **1** — só RJ |

**Isso muda o produto.** A Matriz é a operação nacional; Anova SP e Anova RJ são
distribuidoras locais que atendem apenas o próprio estado. A cotação para a 4 e a 6 é
intraestadual, com poucas transportadoras e regras simples. A da Matriz é nacional, com 27
destinos e cobertura variável por transportadora.

### 6.1 Concentração e ticket por destino

| UF | Notas | Frete | Ticket |
|---|---:|---:|---:|
| SP | 809 | R$ 129.072,00 | R$ 159,55 |
| RJ | 111 | R$ 26.439,74 | R$ 238,20 |
| MA | 72 | R$ 17.566,90 | R$ 243,98 |
| MG | 165 | R$ 14.247,25 | R$ 86,35 |
| PA | 52 | R$ 13.967,75 | R$ 268,61 |
| PR | 124 | R$ 12.934,23 | R$ 104,31 |
| **AM** | **13** | **R$ 10.814,74** | **R$ 831,90** |
| GO | 63 | R$ 9.089,21 | R$ 144,27 |

SP é 43% do frete. E o Norte é outro mundo: **Amazonas com ticket de R$ 831,90**, cinco
vezes a média da casa — 13 notas que custam mais frete que os 165 embarques de Minas.
Roraima R$ 355, Amapá R$ 401, Rondônia R$ 311, Acre R$ 245.

**As treze notas do Amazonas são o melhor alvo isolado de cotação comparativa do conjunto.**
São as que mais têm a ganhar com uma segunda proposta, e hoje vão todas pela Braspress.

### 6.2 Onde existe concorrência de verdade

Treze UFs da Matriz têm mais de uma transportadora atendendo — e o Paraná tem três. Nas
demais, transportadora única. Somado à empresa 6, que só usa Pajuçara, o retrato é de uma
operação com pouquíssima comparação acontecendo.

### 6.3 As 22 notas sem transportadora

R$ 8.280,16 espalhados por doze pares empresa/UF. Uma nota de Minas sozinha carrega
R$ 2.538,17. São impossíveis de reconciliar e de medir prazo.

---

## 7. O que muda no projeto

1. **A manchete "R$ 34 mil" está cancelada.** O número é R$ 3.702 em nove meses, e 92%
   dele são 24 notas com conhecimento extra.
2. **Os dados de frete do ERP são confiáveis** — 212 de 213 batem ao centavo. Isso libera
   os cinco relatórios para serem construídos com segurança.
3. **O argumento do projeto se desloca da conferência para a escolha.** O valor não está em
   descobrir cobrança errada; está em criar um dado que hoje não existe — quanto as outras
   transportadoras cobrariam.
4. **A reconciliação vira controle contínuo**, não descoberta pontual.
5. **A cotação é intraestadual na 4 e na 6, nacional na 1.** Regras e conjuntos de
   transportadoras diferentes por empresa.
6. **O Norte é a fronteira de economia mais visível**, com o Amazonas na frente.
7. **Continua aberto:** a cubagem (§8 da rodada 2), o calendário de feriados (a `TSIFER`
   tem 14 registros), e o adendo à T.I.

---

## 8. Próximo passo sugerido

Não é mais consulta. São duas coisas curtas:

**Olhar as 24 notas.** Elas cabem numa tela e cada uma tem um motivo — reentrega, endereço
errado, recusa, redespacho. Saber quais motivos aparecem define as regras de ocorrência da
plataforma melhor do que qualquer especificação escrita no vazio.

**Levantar o Amazonas.** Treze notas, R$ 10.814,74, ticket de R$ 831,90, todas pela mesma
transportadora. Uma cotação comparativa manual nessas treze — pedindo preço a Rodonaves e
Jamef para os mesmos embarques — produz em uma tarde a primeira evidência real de que a
cotação comparativa economiza. É o experimento mais barato e mais persuasivo disponível
agora.
