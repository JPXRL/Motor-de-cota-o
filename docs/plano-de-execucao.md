# Plano de execução — onde estamos e o que vem agora

15/09/2026. Consolida as pendências que estavam espalhadas por oito documentos.
Este é o documento para consultar quando a pergunta for "o que eu faço agora".

---

## 1. Onde estamos

A fase de descoberta acabou. Em dois dias, dezessete consultas transformaram premissa em
medição e o projeto saiu do escuro:

- **Recorte fechado:** B2B nacional, empresas 1/4/6, sem exportação e sem bonificação.
  **1.823 notas, R$ 303.079,69** de frete em 2026.
- **Os dados do ERP são confiáveis:** 212 de 213 notas de agosto batem ao centavo com o
  CT-e. Os cinco relatórios podem ser construídos sem ressalva.
- **A reconciliação está destravada** pela `TGFNCT`, com 1.851 CT-e para 1.823 notas.
- **O argumento do projeto se deslocou:** o dinheiro não está vazando na conferência — o
  processo de lançamento está correto. Está na **escolha**, que hoje não é registrada.

### 1.1 A consequência que reordena tudo

O `VLRFRETETOTAL` da nota não é uma cotação: é o preço que a transportadora cobrou.
**Quanto as outras cobrariam não existe em lugar nenhum.** É um dado que nunca foi criado.

Isso torna **a captura da cotação o item mais urgente do projeto** — não porque é difícil,
mas porque é o único onde **esperar custa dado**. Cada semana sem capturar é uma semana de
cotações perdidas para sempre. Tudo o mais pode ser feito depois sem perda.

---

## 2. Esta semana — três coisas

### 2.1 🔴 Capturar a cotação no motor que já existe

**Por que primeiro:** é o único item em que o atraso destrói informação. E é pequeno.

O que muda no motor atual:

| Campo | Origem |
|---|---|
| `NUNOTA` | campo novo no formulário — **é o que hoje deixa toda cotação órfã** |
| `CODEMP` | seleção de empresa (1, 4 ou 6) |
| `usuário` | sessão de login |
| `motivo da escolha` | lista fechada, seis opções |
| `data/hora` | automático |

E a mudança estrutural: **gravar uma linha por transportadora consultada**, não só a
vencedora. Incluindo as que erraram, deram timeout ou não têm cobertura. É dessa tabela que
saem taxa de vitória, distância até o vencedor e disponibilidade por transportadora — e
nada disso é recuperável depois.

Enquanto a T.I. não criar nada, isso vive no banco da plataforma. Subir para o Sankhya é
passo posterior e não bloqueia.

### 2.2 🔴 O experimento do Amazonas

**Não depende de código, de T.I. nem de orçamento.** É a evidência mais barata e mais
persuasiva disponível hoje.

Treze notas para o Amazonas em 2026, R$ 10.814,74, **ticket de R$ 831,90** — cinco vezes a
média da casa. Treze embarques custando mais frete que os 165 de Minas Gerais inteiros. E
todos vão pela Braspress, sem comparação.

O experimento: pegar esses treze embarques (peso, CEP de destino, valor da mercadoria) e
pedir cotação à Rodonaves e à Jamef para os mesmos dados. Uma tarde de trabalho.

- Se a diferença for relevante, **esse é o número que sustenta o projeto** — e é real,
  medido, com nome e sobrenome, não uma projeção.
- Se não houver diferença, aprendemos que a Braspress é competitiva no Norte e o argumento
  migra para outra frente. Também é resposta.

O mesmo vale, em segunda prioridade, para Rondônia (R$ 311), Amapá (R$ 401) e Roraima
(R$ 355).

### 2.3 Olhar as 24 notas com mais de um CT-e

Cabem numa tela. R$ 3.401,91 — 92% de toda a divergência do ano. Cada uma tem um motivo:
reentrega, endereço errado, recusa, redespacho.

**Saber quais motivos aparecem de verdade define as regras de ocorrência da plataforma**
melhor do que qualquer especificação escrita no vazio. É meia hora e vale por uma semana de
design.

Casos para começar: nota 346107 (R$ 82,52 na nota, R$ 519,96 em dois CT-e), 297242
(R$ 3,30 × R$ 328,72) e 317921 (**quatro** conhecimentos).

---

## 3. Em espera — quem deve o quê

| Pendência | Com quem | Bloqueia |
|---|---|---|
| Campos e tabelas no Sankhya | T.I. | subir a cotação para o ERP |
| Teste do `DatasetSP.save` contra `TGFCAB` | T.I. | **único ponto da arquitetura não exercitado** |
| Sandbox do Sankhya | Sankhya | qualquer escrita em produção |
| Licença de BI | administrador do contrato | os dashboards |
| Pajuçara tem API? | transportadora | rastreio da empresa 6 |
| Contrato por CNPJ ou por raiz? | transportadoras | modelo de credenciais |
| Retestar o 401 da Rodonaves | Juan | rastreio Rodonaves |

### 3.1 O adendo à T.I. — curto e necessário

A calibração encontrou coisas que mudam o pedido. **Não retirar o que foi enviado**, mandar
um complemento:

1. **As tabelas encolhem.** `AD_FRETECOT` ia guardar peso, volumes, cidade e UF de destino.
   Peso já está em 100% das notas (`PESOBRUTO`). Guardar de novo cria duas versões da mesma
   verdade. Ficam só para a cotação que ainda não virou nota.
2. **Existem três campos de rastreio** — `AD_RASTREIO`, `CODRASTREAMENTOECT` (Correios) e
   `BH_RASTREIO` (marketplace). A plataforma escreve só no primeiro.
3. **Pergunta nova:** os campos nativos de frete (`VLRFRETECALC`, `NUCFR`, `NUPEDFRETE`,
   `NUMCF`, `CODPARCTRANSPFINAL`) estão **zerados em 2.936 notas**. Correm risco de serem
   escritos por rotina do ERP, como aconteceu com o `NUMCOTACAO`?
4. **Pergunta de arquitetura:** campos com `CALCULADO='S'` não existem fisicamente e o
   `DbExplorerSP.executeQuery` não os enxerga. **Como a plataforma obtém cubagem?**
   O `M3AENTREGAR` é calculado. Somar da `TGFITE` com o cadastro de produto, ou ler pela
   camada do ERP?
5. **Pedido:** popular a `TSIFER` (feriados). Hoje tem **14 registros** — nove nacionais
   quando o Brasil tem doze, dois municipais. A estrutura é perfeita e serve a qualquer
   rotina do ERP que use dia útil, não só ao frete.

---

## 4. Depois — em ondas

### Onda 1 — fundação (semanas 1 a 3)

- Captura da cotação *(§2.1)*
- **Backup diário** via GitHub Actions — hoje não existe nenhum
- **Login individual** e dimensão empresa — hoje não há identidade de usuário
- Limpeza pendente: `api/me.js`, `APP_USERS`/`SESSION_SECRET`, arquivos `.ps1` soltos,
  persistência de tema

### Onda 2 — o que o dado permite (semanas 3 a 6)

- **Cubagem resolvida** — sem ela a cotação é imprecisa para carga leve, que é o nosso caso
  (peso médio de 9 a 23 kg)
- **Calendário de feriados** — próprio enquanto a `TSIFER` não vier
- **Reconciliação como controle contínuo** — roda mensal e aponta as notas com CT-e extra
  no mês em que acontecem, não nove meses depois
- **Frontend:** design system, duas colunas, resultados progressivos

### Onda 3 — rastreio (semanas 6 a 10)

- Jamef primeiro — é a única com webhook de push e o volume está começando agora
- Braspress e Rodonaves por polling
- Persistência dos eventos, que é o que viabiliza OTD, OCT e Perfect Order Rate

### Onda 4 — os relatórios

Só depois que houver cotação capturada e entrega rastreada. Antes disso, três dos cinco
indicadores não têm insumo.

---

## 5. O que mudou de prioridade, e por quê

| Item | Antes | Agora | Motivo |
|---|---|---|---|
| Captura da cotação | onda 1 | **urgência máxima** | é o único dado que se perde com o tempo |
| Reconciliação CT-e | "a descoberta que muda a prioridade" | controle contínuo | o processo já está correto, não há tesouro escondido |
| Consolidação por CNPJ | problema grande | detalhe | Braspress tem 2 cadastros, não 12+ |
| Calendário de feriados | resolvido pelo ERP | de volta para nós | `TSIFER` tem 14 registros |
| Cubagem | não estava na lista | **problema aberto relevante** | carga leve cobra por m³, e o campo é calculado |
| Cobertura por UF | suposição | medido | Matriz 27 UFs, Anova SP só SP, Anova RJ só RJ |
| Módulo nativo do Sankhya | — | **fora, por decisão** | decidido por Juan; confirmado pela `TSICID` vazia |

---

## 6. Um ajuste na justificativa de custo

O documento `justificativa-custo-plataforma.md` foi escrito antes da calibração. O
argumento central dele continua de pé — continuidade e regularização, não segurança — mas
os números melhoraram e o eixo mudou.

**O que usar agora:**

- R$ 303.079,69 de frete B2B nacional em nove meses → **R$ 33.675/mês**
- **1.823 decisões de transportadora por ano feitas sem registro** — cerca de 200 por mês
- O custo de hospedagem cabe **306 vezes** dentro do frete de um mês
- **A empresa 6 não compara preço em nenhuma nota.** Uma transportadora, 95 embarques,
  ticket de R$ 219 — o maior das três empresas
- **O Amazonas custa R$ 831,90 por embarque**, cinco vezes a média

**O que não usar:** a diferença entre cotado e pago. São R$ 3.702 em nove meses e 92% deles
são 24 notas com conhecimento extra. É um bom controle, não é um argumento de venda.

---

## 7. A recomendação em uma linha

**Começar a captura da cotação esta semana e rodar o experimento do Amazonas em paralelo** —
um é código, o outro é telefone, não competem por tempo. Juntos, em uma semana, produzem a
primeira evidência real de economia e param a perda diária de dado.
