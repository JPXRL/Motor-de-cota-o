# Justificativa do custo da plataforma de frete

> Escrito em 14/09/2026, a pedido do Juan: *"Eu creio que a empresa não vai querer pagar, e esse é o problema. Acho que se fizermos uma apresentação sobre como faz sentido o gasto para segurança."*
>
> Este documento tem três partes: a **conta que decide** (os números), o **conselho sobre como pedir** (que inclui uma recomendação contra fazer apresentação de cara), e as **mensagens prontas** em duas versões. Ao final, o que fazer se a resposta for não — spoiler: o projeto não trava.

---

## 1. Antes de tudo: o enquadramento importa mais que os números

Duas correções de rota antes de pedir qualquer coisa.

**Não peça "para segurança".** Segurança é o pior argumento possível para aprovar R$ 110 por mês. É abstrato, não tem prazo, e concorre com coisas que têm dono e urgência. Todo mundo que já tentou aprovar orçamento de segurança conhece o resultado: "vamos deixar para o próximo trimestre".

O argumento que funciona é **continuidade**: a ferramenta já existe, já está em uso diário e já administra R$ 38 mil de frete por mês. O pedido não é para construir algo — é para **não desligar** o que já está funcionando. Isso muda a pergunta que o aprovador se faz. Em vez de "vale a pena investir nisso?", que convida à dúvida, ele se pergunta "o que acontece se eu não aprovar?", que tem uma resposta concreta e ruim.

**Não chame de gasto novo, chame de regularização.** A história verdadeira é simples e não constrange ninguém: a ferramenta nasceu como projeto pessoal, rodando num plano gratuito que é destinado a projetos pessoais. Ela deu certo, virou ferramenta de operação das três empresas — e ferramenta de operação precisa estar num plano comercial. É a trajetória normal de um projeto interno que funcionou, não um erro a ser corrigido.

---

## 2. A conta que decide

| | |
|---|---|
| **Custo do pedido** | cerca de **R$ 110 por mês** (US$ 20) — R$ 1.320 por ano |
| **Frete administrado pela ferramenta** | **R$ 38.434 por mês** (média de jan-jul/2026, empresas 1, 4 e 6) — R$ 461 mil por ano |
| **Proporção** | **0,29%** do gasto de frete |
| **Frete médio de uma única nota** | R$ 165 |
| **Notas com frete por mês** | 233 (cerca de 11 por dia útil) |

Daí saem as três frases que fazem o trabalho sozinhas:

> **O custo mensal da plataforma é menor que o frete de uma única nota fiscal.**

> **Para se pagar, ela precisa reduzir menos de 0,3% do gasto com frete.** Qualquer concorrência real entre três transportadoras faz mais que isso.

> **Ou, pelo lado do tempo: para se pagar, basta economizar pouco mais de um minuto por cotação.** São 231 cotações por mês; a R$ 25 a hora de expedição, R$ 110 equivalem a 4 horas e 24 minutos mensais — cerca de 1,1 minuto por cotação. A ferramenta consulta três transportadoras de uma vez, contra abrir três portais e digitar os mesmos dados três vezes.

*(O valor-hora de R$ 25 é uma suposição minha para arredondar a conta. Troque pelo número real da RARE WAY antes de apresentar — e veja a seção 5 para os dois números que só você tem.)*

### O outro lado da conta: o que custa não aprovar

Se a conta gratuita for suspensa — que é o risco concreto, já que o plano é destinado a uso não comercial — a expedição volta na mesma hora a cotar portal por portal. Isso significa: o tempo de cotação volta ao que era; as três transportadoras deixam de competir simultaneamente, o que tende a elevar o frete pago; e o histórico de cotações, que é a base dos indicadores de frete, para de ser alimentado.

Não dá para prever *quando* isso aconteceria. Dá para dizer que o custo de evitar é R$ 110 por mês e o custo de acontecer é a operação de expedição parar de funcionar do jeito que funciona hoje, sem aviso prévio.

---

## 3. Como pedir — três caminhos, do mais barato ao mais caro

**Comece pelo menor.** Para R$ 110 por mês, fazer uma apresentação formal pode sair pela culatra: transforma uma decisão pequena em assunto grande, convida escrutínio desproporcional e planta a ideia de que, se precisa de slides, deve ser complicado. O caminho mais curto para o "sim" é quase sempre uma mensagem de cinco linhas para quem aprova.

**Caminho 1 — a mensagem curta.** Texto pronto na seção 4. Manda, e na maioria das vezes resolve. Se resolver, acabou.

**Caminho 2 — a página única.** Se houver processo formal de aprovação, ou se o caminho 1 receber um "me manda mais detalhes", aí vale o documento de uma página — também pronto na seção 4.

**Caminho 3 — a apresentação.** Só se for pedida, ou se a conversa virar sobre o projeto inteiro (aí o assunto deixa de ser R$ 110 e passa a ser a plataforma, o que é uma conversa diferente e bem-vinda). Se chegar nesse ponto, dá para montar.

**E antes de qualquer um dos três, uma pergunta que pode encerrar o assunto:** *a RARE WAY já paga alguma conta de nuvem?* Se a TI já tem conta em algum provedor, pode ser só adicionar um projeto à conta existente — sem aprovação nova, sem processo, sem cartão novo. Vale trinta segundos de pergunta antes de gastar uma conversa.

---

## 4. Mensagens prontas

### Versão curta (tente esta primeiro)

> Oi [nome], preciso de uma aprovação pequena.
>
> A ferramenta de cotação de frete que montei está em uso diário pela expedição das três empresas e hoje administra cerca de R$ 38 mil de frete por mês. Ela roda numa hospedagem em plano gratuito, que é destinado a projetos pessoais — como virou ferramenta de operação, precisa migrar para o plano comercial.
>
> O custo é de **US$ 20 por mês (cerca de R$ 110)** — menos que o frete de uma única nota fiscal, e 0,3% do que ela administra. Se ficar no plano gratuito, a conta pode ser suspensa a qualquer momento e a expedição volta a cotar portal por portal.
>
> Posso seguir? Se já tivermos alguma conta de nuvem na empresa, dá para incluir lá e nem precisa de contratação nova.

### Versão de uma página (se pedirem detalhes)

> **Plataforma de cotação e rastreio de frete — regularização da hospedagem**
>
> **O que é.** Uma ferramenta interna que consulta Jamef, Braspress e Rodonaves ao mesmo tempo e devolve preço e prazo lado a lado, em vez de a expedição abrir três portais e digitar os mesmos dados três vezes. Está em produção e em uso diário nas empresas 1, 4 e 6.
>
> **O que ela administra.** Cerca de 233 notas com frete por mês e R$ 38.434 de frete mensal (média de janeiro a julho de 2026, R$ 269 mil no período).
>
> **O pedido.** Migrar a hospedagem do plano gratuito para o plano comercial: **US$ 20 por mês, cerca de R$ 110** (R$ 1.320 por ano). O plano gratuito atual é destinado a projetos pessoais e não cobre uso comercial.
>
> **Por que agora.** Enquanto a ferramenta era um teste, o plano gratuito bastava. Hoje ela é parte do processo de expedição — e uma suspensão da conta, que pode ocorrer sem aviso, interromperia a cotação das três empresas de uma vez.
>
> **A relação de custo.** R$ 110 por mês equivalem a 0,29% do frete administrado, e a menos que o frete médio de uma única nota fiscal (R$ 165). Para se pagar, a ferramenta precisa reduzir menos de 0,3% do gasto com frete — ou economizar pouco mais de um minuto por cotação, em 231 cotações mensais.
>
> **O que mais vem junto.** O plano comercial também habilita as rotinas automáticas que estão no roteiro do projeto: acompanhamento de todas as entregas em um só painel, indicadores de prazo e de custo por transportadora, e o envio desses dados para o Sankhya.
>
> **Alternativa sem custo.** Existe caminho técnico para rodar em outro provedor com custo zero, mas exige um trabalho de migração e não traz benefício adicional. Se a preferência for não ter o custo, sigo por lá.

---

## 5. Os dois números que só você tem

A conta acima usa suposições em dois pontos. Se conseguir os números reais, o argumento fica bem mais forte — e você consegue em uma conversa de cinco minutos com a expedição:

**Quanto tempo levava cotar as três transportadoras à mão, portal por portal?** Pergunte a quem fazia antes. Se a resposta for "uns 10 minutos", a economia é de cerca de 9 minutos por cotação × 231 por mês = **34 horas por mês**. A R$ 25 a hora, são R$ 866 mensais — a ferramenta pagaria a própria hospedagem quase oito vezes.

**Qual o custo-hora da expedição?** Salário mais encargos, dividido pelas horas do mês. Substitua o R$ 25 do exemplo.

E um terceiro, se quiser fechar o caso de vez: **desde que as três transportadoras passaram a competir, o percentual de frete sobre a venda caiu?** O levantamento de jan-jul serve de linha de base (3,21% ponderado em 2026, 3,23% em 2025). Se cair meio ponto percentual, são cerca de R$ 190 mil por ano — e aí a conversa deixa de ser sobre R$ 110.

---

## 6. Se a resposta for não

**Você não fica bloqueado, e vale dizer isso a si mesmo antes da conversa** — negociar sem depender do sim é o que permite pedir com tranquilidade.

O caminho de custo zero existe e está descrito em `plataforma-frete-definicoes.md`, seção 17: migrar a hospedagem para um provedor cuja camada gratuita permita uso comercial (o Cloudflare Workers é o candidato mais forte), mantendo banco, agendamento, backup, monitoramento e rastreamento de erro nas camadas gratuitas. Custo em dinheiro: zero. Custo em trabalho: uma migração real, porque o ambiente de execução é diferente.

Duas observações honestas sobre esse caminho. A primeira é que ele **não é um prêmio de consolação**: é infraestrutura séria, usada por empresas grandes, e tem valor de aprendizado alto — que é um dos seus objetivos declarados com este projeto. A segunda é que ele **não muda nada do roadmap**: os cinco indicadores, o rastreio unificado e a API para a TI cabem inteiros nas camadas gratuitas. O que o dinheiro compraria é conforto e conformidade, não capacidade.

Em outras palavras: peça, porque é barato e é o certo. Mas se não vier, siga — o projeto não depende disso.
