# A próxima mensagem para a T.I. — estratégia e rascunho

16/09/2026.

## Situação

1. A T.I. mandou um artefato com medições reais (ocupação dos campos `AD_`, o alerta sobre
   o `AD_DTENTREGA` e o componente 614, três recomendações de desenho). Foi trabalho de
   verdade.
2. Juan respondeu em 15/09 com o artefato "Campos de Frete no Sankhya": doze campos, três
   tabelas, dois domínios, índices, quatro perguntas.
3. Hoje, 16/09, ainda sem resposta.

## Diagnóstico

**Um dia não é silêncio.** É um dia útil. Mandar complemento agora lê como ansiedade e
desvaloriza o que já foi enviado — quem manda adendo no dia seguinte está dizendo que o
primeiro documento estava incompleto.

**Mas há um problema real no pedido, independente do prazo.** Doze campos e três tabelas
não é um favor, é um projeto: precisa de fila e talvez de aprovação. Documento desse tamanho
não se responde em dois dias — entra numa pilha.

**E quase nada ali bloqueia o trabalho de hoje.** A plataforma guarda tudo no banco próprio;
subir para o Sankhya é passo posterior. O que bloqueia de verdade é **um item só**: o teste
do `DatasetSP.save` contra a `TGFCAB`. Se escrever lá não funcionar, o desenho dos campos
muda — e os doze que eles estão avaliando podem ser os campos errados.

## Estratégia

**Não mandar nada esta semana.** Preparar agora, enviar quando houver o que eles não têm.

Depois do experimento do Norte e da conferência das 24 notas, a volta é com **medição**, não
com cobrança. Eles ensinaram a medir antes de afirmar; voltar com contagens próprias é falar
a língua deles.

Três princípios para a mensagem:

1. **Reduzir o pedido a um item.** Pedir o teste do `DatasetSP.save` e dizer explicitamente
   que o resto pode esperar. Um pedido pequeno com prazo é respondido; um grande sem prazo
   fica na pilha.
2. **Dar antes de pedir.** A calibração encontrou coisas úteis para eles, não só para o
   projeto: a `TSIFER` quase vazia (afeta qualquer rotina do ERP que use dia útil), o
   `AD_ORIGEMVENDA`/`AD_ORIGEMVENDAB2C` duplicados, os campos nativos de frete zerados.
3. **Devolver a lição deles.** O episódio do `CALCULADO='S'` é um caso em que o alerta deles
   ("meça antes de assumir") se provou de novo. Reconhecer isso custa nada e vale muito.

## Quando enviar

Depois do experimento do Norte — provavelmente três a quatro dias úteis. O gatilho é ter
resultado, não o calendário.

Se passarem dez dias úteis sem qualquer retorno, aí sim vale um toque curto de duas linhas,
sem conteúdo novo, só perguntando se faz sentido conversar por chamada.

---

## Rascunho

> Pessoal, voltando com o que consegui medir depois da conversa de vocês.
>
> Segui o conselho de contar antes de assumir e rodou bem: em duas semanas saíram vinte e
> poucas consultas e caiu quase toda premissa que a gente tinha. Três coisas que acho que
> interessam a vocês, independente do módulo de frete:
>
> **1. A `TSIFER` está praticamente vazia.** Catorze registros — nove feriados nacionais
> (o Brasil tem doze), dois municipais e um estadual. A estrutura é ótima, tem nacional,
> estadual e municipal com recorrência, mas sem conteúdo ela não serve para nenhuma rotina
> que precise de dia útil. Não é só o frete que depende disso.
>
> **2. Existem dois campos com a mesma descrição** na `TGFCAB`: `AD_ORIGEMVENDA` e
> `AD_ORIGEMVENDAB2C`, ambos "Origem da Venda B2C". Parece criação duplicada de alguma
> integração.
>
> **3. Os campos nativos de frete estão todos zerados** em 2.936 notas de 2026:
> `VLRFRETECALC`, `NUCFR`, `NUPEDFRETE`, `NUMCF`, `CODPARCTRANSPFINAL` e
> `CODRASTREAMENTOECT`. O bloco inteiro está livre.
>
> E uma lição que é de vocês: levei dois erros de "nome de coluna inválido" até perceber que
> campo com `CALCULADO='S'` na `TDDCAM` não existe fisicamente — o `DbExplorerSP` não
> enxerga. Vale para `M3AENTREGAR`, `PESOBRUTOITENS` e `TIPOCTE`, entre outros. Era
> exatamente o tipo de coisa que vocês avisaram para não assumir.
>
> ---
>
> **Sobre o desenho que mandei:** sei que é grande e não tem pressa. O que eu preciso agora
> é bem menor, e prefiro pedir uma coisa só.
>
> **O teste do `DatasetSP.save` gravando num campo de teste da `TGFCAB`.** É o único ponto
> da arquitetura que nunca foi exercitado, e ele decide o resto: se a escrita por lá não
> funcionar do jeito que eu suponho, os doze campos que mandei podem ser os campos errados,
> e vocês teriam criado algo que eu ia pedir para mudar depois. Prefiro evitar isso.
>
> Enquanto isso não fecha, **o módulo roda inteiro no banco dele mesmo** — não preciso de
> nada criado no Sankhya para continuar. O desenho pode ficar parado o tempo que for
> necessário.
>
> Duas perguntas curtas quando der, sem urgência:
>
> - Os campos nativos de frete correm risco de serem escritos por rotina do Sankhya, como
>   vocês alertaram sobre o `NUMCOTACAO`?
> - Como obter cubagem, já que o `M3AENTREGAR` é calculado? Somo pela `TGFITE` com o cadastro
>   de produto, ou tem caminho melhor?
>
> Qualquer coisa, me chama que eu explico por chamada — pode ser mais rápido que documento.

---

## O que mudou no adendo que eu tinha escrito antes

O rascunho anterior (no `plano-de-execucao.md`) listava cinco itens: três ajustes ao desenho
e duas perguntas. **Está grande demais para o momento.**

Os ajustes — tabelas encolhem, três campos de rastreio, `CALCULADO='S'` — são correções ao
pedido que **ainda não começou a ser executado**. Mandar correção de algo que ninguém está
construindo só aumenta a pilha. Eles entram depois, quando a T.I. sinalizar que vai começar.

O que sobrevive agora: as três descobertas úteis a eles, o pedido único, e as duas perguntas.
