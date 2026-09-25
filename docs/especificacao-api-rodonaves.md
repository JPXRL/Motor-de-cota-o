# Especificação da API — Rodonaves

> Documento preparado para a equipe de TI da RARE WAY, que está construindo o sistema de força de vendas onde o módulo de cotação/rastreamento de frete vai ficar embutido. Fonte: acesso liberado ao portal de desenvolvedores da Rodonaves (dev.rodonaves.com.br) em 03/09/2026 — o Juan repassou a documentação oficial (OpenAPI) do endpoint de cotação.
>
> **Status (atualizado em 24/09/2026):** cotação, busca de cidade, prazo e **cadastro de destinatário** confirmados com chamadas reais. A implementação exigiu três correções em relação ao que a especificação oficial (OpenAPI) sugeria — ver seção 1 (valor de `auth_type`) e seção 3 (nomes reais dos campos da resposta). **Novidade de 24/09:** descobriu-se que a Rodonaves **exige o destinatário cadastrado na base dela antes de aceitar uma cotação** — não estava em lugar nenhum da documentação, apareceu como erro recorrente em produção. O endpoint que resolve isso (`savecustomer`) foi implementado e confirmado ao vivo — ver seção 3.1. Rastreamento e comprovante têm três endpoints documentados com schema real (seção 5), com um ponto em aberto (401 no teste do endpoint principal — ver seção 5.1). Resta um único ponto em aberto de negócio: os valores possíveis de `PayerSelected` (ver seção 6).

## 1. Acesso à API — vários domínios, um token para cada um

A Rodonaves **não usa um endereço único nem um token único para tudo**. Cada recurso mora num domínio próprio dentro do ecossistema `rte.com.br`, e a própria Rodonaves confirma (`docs/autenticação.md`): *"Cada API possui seu próprio método de autenticação, por conta disso é necessário realizar uma nova requisição de token da API que deseja comunicar."* Ou seja: **um token pego no domínio da cotação não serve para chamar a busca de cidade ou o prazo de entrega** — é preciso logar de novo em cada domínio antes de usá-lo. Isso é diferente da Jamef e da Braspress, que têm um único domínio e um único token para tudo.

Domínios usados pelo motor interino:

- **Cotação:** `https://quotation-apigateway.rte.com.br`.
- **Busca de cidade:** `https://dne-api.rte.com.br` (título interno da especificação: "Correios" — provavelmente porque o dado de cidade/CEP vem de uma base ligada aos Correios).
- **Prazo de entrega:** `https://01wapi.rte.com.br`.
- **Cadastro de cliente:** `https://customer-apigateway.rte.com.br` — ver seção 3.1. **Confirmado em 24/09/2026 que aceita exatamente as mesmas credenciais dos outros domínios** (nenhuma variável de ambiente nova foi necessária).
- **Rastreio e comprovante de entrega:** `https://tracking-apigateway.rte.com.br` — ver seção 5.

O `https://` foi confirmado na prática em 08/09/2026 (a especificação oficial listava os servidores sem protocolo explícito — dúvida da seção 6 agora resolvida).

**Outros domínios existem** (vistos na doc interativa do portal, testados manualmente pelo Juan com sucesso, mas **ainda não usados no motor** porque cobrem funções que ele ainda não precisa): `pickup-apigateway.rte.com.br` (coleta) e `unittocity-apigateway.rte.com.br` (malha de atendimento). Cada um segue o mesmo padrão de login da seção abaixo.

### Como pegar o token (confirmado, `docs/autenticação.md` + teste real)
```
POST {domínio}/token
Content-Type: application/x-www-form-urlencoded

grant_type=password
username=<usuário>
password=<senha>
companyId=1
auth_type=DEV
```
O token retornado vai no cabeçalho das chamadas seguintes: `Authorization: Bearer <token>`. **{domínio} muda conforme a API** — para chamar a cotação, pegue o token em `https://quotation-apigateway.rte.com.br/token`; para a busca de cidade, em `https://dne-api.rte.com.br/token`; para o prazo, em `https://01wapi.rte.com.br/token`; para o cadastro de cliente, em `https://customer-apigateway.rte.com.br/token`; para rastreio/comprovante, em `https://tracking-apigateway.rte.com.br/token`. Na prática, isso significa manter (pelo menos) cinco caches de token separados no código — um por domínio — em vez de um só como na Jamef.

> ⚠️ **Pegadinha confirmada em 08/09/2026:** o texto da documentação de autenticação mostra `auth_type=dev` em minúsculo, mas o formulário interativo "Try It!" da própria doc (testado pelo Juan em várias APIs diferentes) usa **`DEV` em maiúsculo** como valor padrão, e é esse o valor que a API realmente aceita — mandar `dev` minúsculo faz o login falhar com **HTTP 400**, mesmo com usuário e senha corretos. Foi exatamente essa a causa da primeira falha de login no motor interino.

## 2. Busca de cidade pelo CEP (pré-requisito da cotação)

A cotação exige o **id interno da cidade** (`OriginCityId`/`DestinationCityId`), não o CEP puro. Esse endpoint resolve um pelo outro — é o método que a documentação da cotação chama de "busca-cidade".

### Endpoint
```
GET https://dne-api.rte.com.br/api/cities/byzipcode?zipCode={CEP}
Authorization: Bearer <token>
```

| Parâmetro | Tipo | Onde | Obrigatório | Descrição |
|---|---|---|---|---|
| `zipCode` | Texto | Query string | Sim | CEP da cidade a buscar. |

### Resposta de sucesso (`AddressResponse`)

| Campo | Tipo | Descrição |
|---|---|---|
| `Id` | Número inteiro | **Identificador da cidade** — é este valor que vai em `OriginCityId`/`DestinationCityId` na cotação. |
| `Description` | Texto | Descrição da cidade (nome). |
| `IbgeCityCode` | Número inteiro | Código do IBGE da cidade. |

### Resposta de erro
| Código | Situação |
|---|---|
| 400 | Bad Request |
| 500 | Internal Server Error |

**Fluxo completo para cotar:** buscar `OriginCityId` com o CEP de origem, buscar `DestinationCityId` com o CEP de destino (duas chamadas a este endpoint, ou uma reaproveitada quando os CEPs coincidirem com uma consulta anterior), e só então chamar a cotação (seção 3) com os dois ids. **Confirmado funcionando** na primeira chamada real (08/09/2026).

## 3. Cotação de Frete

### Endpoint
```
POST https://quotation-apigateway.rte.com.br/api/v1/gera-cotacao
Authorization: Bearer <token>
Content-Type: application/json
```

### Corpo da requisição (request body)

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `OriginZipCode` | Texto | Sim | CEP de origem. Ex.: `"14010000"`. |
| `OriginCityId` | Número inteiro | Sim | Id da cidade de origem — vem do campo `Id` da resposta da busca de cidade (seção 2). |
| `DestinationZipCode` | Texto | Sim | CEP de destino. |
| `DestinationCityId` | Número inteiro | Sim | Id da cidade de destino — mesma origem do `OriginCityId`, buscado com o CEP de destino. |
| `TotalWeight` | Decimal | Sim | Peso total da mercadoria, em kg. |
| `EletronicInvoiceValue` | Decimal | Sim | Valor da nota fiscal eletrônica (o valor da mercadoria). |
| `CustomerTaxIdRegistration` | Texto (11 a 14 dígitos) | Sim | CPF/CNPJ de quem está cotando — no caso da RARE WAY, o CNPJ da empresa (`08133243000100`), já usado como remetente nas outras transportadoras. |
| `ReceiverCpfcnp` | Texto (11 a 14 dígitos) | Sim | CPF/CNPJ do destinatário. **Precisa existir na base de clientes da Rodonaves** — ver seção 3.1. |
| `ContactName` | Texto | Sim | Nome do contato (a documentação não deixa claro se é o contato do remetente ou do destinatário — presumivelmente o solicitante da cotação). |
| `ContactPhoneNumber` | Texto | Sim | Telefone do contato. |
| `EmissionUser` | Número inteiro (64 bits) | Não | Usuário que fez a emissão do frete (id interno do sistema da Rodonaves). |
| `PayerSelected` | Número inteiro | Não | Tomador da cotação. A doc oficial (checada por Juan em 08/09/2026 na página de referência interativa) só diz o tipo (`int32`) e a descrição genérica "Tomador da cotação" — **sem listar os valores/enum aceitos** (nas outras transportadoras isso corresponde a CIF/FOB — remetente paga ou destinatário paga). Ver seção 6. Não enviado no motor interino — a Rodonaves aplica o padrão dela. |
| `CustomerEmail` | Texto | Não | E-mail do cliente. |
| `TotalPackages` | Número inteiro | Não | Quantidade total de volumes. |
| `Packs` | Lista de objetos | Não | Um item por tipo de volume — ver `DocumentPackRequest` abaixo. Pode vir vazia (`[]`) quando as dimensões não são informadas. |
| `PickupAddress` | Objeto | Não | Endereço completo de coleta — ver `AddressRequest` abaixo. |
| `DestinationAddress` | Objeto | Não | Endereço completo de entrega — ver `AddressRequest` abaixo. |

**`DocumentPackRequest`** (cada item da lista `Packs`):

| Campo | Tipo | Descrição |
|---|---|---|
| `AmountPackages` | Número inteiro | Quantidade de pacotes deste tipo. |
| `Weight` | Decimal | Peso deste tipo de pacote. |
| `Length` | Decimal | Comprimento em centímetros. |
| `Height` | Decimal | Altura em centímetros. |
| `Width` | Decimal | Largura em centímetros. |

**`AddressRequest`** (usado em `PickupAddress` e `DestinationAddress`, quando informados):

| Campo | Descrição |
|---|---|
| `ZipCode` | CEP |
| `TypeAddress` | Tipo de endereço (não detalhado na doc) |
| `Address` | Logradouro |
| `Number` | Número |
| `Supplement` | Complemento |
| `District` | Bairro |
| `City` | Cidade |
| `UnitFederation` | UF |
| `TaxIdRegistration` | CPF/CNPJ do cliente |
| `LocSit` | Não detalhado na documentação oficial |

### Exemplo de requisição (confirmado com chamada real em 08/09/2026)
```json
{
  "OriginZipCode": "31030370",
  "OriginCityId": 12345,
  "DestinationZipCode": "20040020",
  "DestinationCityId": 67890,
  "TotalWeight": 50,
  "EletronicInvoiceValue": 1500,
  "CustomerTaxIdRegistration": "08133243000100",
  "ReceiverCpfcnp": "34567890000123",
  "ContactName": "Nome do contato",
  "ContactPhoneNumber": "31999999999",
  "TotalPackages": 1,
  "Packs": [
    { "AmountPackages": 1, "Weight": 50, "Length": 40, "Height": 40, "Width": 40 }
  ]
}
```
*(`OriginCityId`/`DestinationCityId` acima são valores de exemplo — na prática vêm do campo `Id` retornado pela busca de cidade da seção 2, chamada antes com o CEP de origem e o CEP de destino.)*

### ⚠️ Resposta de sucesso real — nomes de campo diferentes da especificação OpenAPI

A primeira cotação real (08/09/2026) devolveu uma cotação de verdade (`Value: 147.95`, `DeliveryTime: 11`, `ProtocolNumber: "222154121"`), mas com nomes de campo **diferentes** dos documentados na especificação OpenAPI original — o motor interino esperava `ProtocolId`/`FreightValue` (nomes do schema `MyQuotationResponse` da doc oficial) e por isso tratou essa primeira cotação bem-sucedida como erro, até a correção abaixo. Campos confirmados na resposta real:

| Campo (real) | Campo que a doc OpenAPI sugeria | Tipo | Descrição |
|---|---|---|---|
| `ProtocolNumber` | ~~`ProtocolId`~~ | Texto | **Protocolo da cotação** — este é o campo a usar (equivalente ao `id` da Braspress e ao `numeroCotacao`/`idCorrelacao` da Jamef). |
| `Value` | ~~`FreightValue`~~ | Número (decimal) | Valor do frete — ao contrário do que a doc OpenAPI sugeria, vem como **número**, não como texto. |
| `DeliveryTime` | *(a doc OpenAPI não listava esse campo na cotação)* | Número inteiro | **Prazo em dias — já vem direto na resposta da cotação.** Isso elimina, na prática, a necessidade de chamar o endpoint separado de prazo (seção 4) na maioria dos casos; o motor interino só cai pro endpoint separado se este campo vier vazio. |
| `Message` | — | Texto ou `null` | Mensagem adicional (veio `null` na primeira cotação). |
| `ExpirationDay` | — | Data/hora | Validade da cotação. |
| `Cubed` | — | Booleano | Não detalhado — indica se o cálculo usou peso cubado. |
| `ContactName`, `ContactPhoneNumber`, `CustomerEmail`, `AmountPacks`, `UnitOriginDescription`, `UnitDestinyDescription` | — | — | Ecoam/complementam dados da requisição; não detalhados a fundo ainda. |

Os campos abaixo, listados na especificação OpenAPI original, **não foram confirmados** na resposta real (podem não existir mais, ou não aparecerem em todo cenário) — manter aqui só como referência histórica caso apareçam em outro tipo de cotação: `Date`, `RecipientCustomer`, `SenderCustomer`, `Requester`, `Type`, `Discount`, `Status`, `Competence`, `Freight` (nº do CT-e), `CustomLogKey`, `ClassName`, `Revision`.

### Resposta de erro — formato confirmado (24/09/2026)

Códigos possíveis: 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 500 (Internal Server Error).

O corpo de um erro 400 real, capturado em produção:

```json
{"PropertyName":"","Message":"Cliente destinatário não encontrado."}
```

Ou seja: objeto com `PropertyName` (o campo culpado, que pode vir vazio) e `Message` (o texto legível). É esse `Message` que vale mostrar ao operador.

## 3.1 Cadastro do destinatário na base da Rodonaves (pré-requisito NÃO documentado da cotação)

**A descoberta mais importante desde a integração.** A Rodonaves recusa a cotação com HTTP 400 e `"Cliente destinatário não encontrado."` quando o CNPJ informado em `ReceiverCpfcnp` não existe na base de clientes dela. Isso **não está escrito em lugar nenhum da documentação de cotação** — apareceu só medindo produção: em 46 cotações consultando a Rodonaves entre 08 e 23/09/2026, essa foi a **maior causa isolada de falha, 7 ocorrências**.

Não é cobertura nem rota. É cadastro. E o efeito de negócio é caro: a Rodonaves simplesmente não participava da concorrência nesses casos, e a cotação era decidida sem ela.

### Endpoint
```
POST https://customer-apigateway.rte.com.br/api/v1/customer/savecustomer
Authorization: Bearer <token do domínio customer-apigateway>
Content-Type: application/json-patch+json
```

O `Content-Type` é o que a doc marca como padrão do endpoint — `application/json-patch+json`, não `application/json`.

### Corpo da requisição

| Campo | Obrigatório | Descrição |
|---|---|---|
| `Description` | Sim | Razão social. |
| `TaxIdRegistration` | Sim | CNPJ, só dígitos. |
| `StadualIdRegistration` | Não | Inscrição estadual. |
| `Email` | Sim | E-mail do cliente. |
| `Phone` | Sim | Telefone, só dígitos. |
| `ZipCode` | Sim | CEP, só dígitos. |
| `Street` | Sim | Logradouro. |
| `Number` | Sim | Número. |
| `Supplement` | Não | Complemento. |
| `District` | Sim | Bairro. |
| `City` | Sim | Cidade. |
| `UnitFederation` | Sim | UF (2 letras). |

### Confirmado ao vivo (24/09/2026)

Primeiro cadastro real: **JESSICA MALINGRE SOBRANCELHAS LTDA**, CNPJ 45.171.655/0001-60, Formosa/GO. A Rodonaves aceitou e, na recotação imediata, respondeu:

**R$ 73,23 · 3 dias úteis · protocolo 223151416 · 3,0% do pedido.**

Para comparar, na mesma cotação: Braspress rodoviário R$ 175,34 (3 dias úteis, 7,3%), Jamef R$ 217,57 (10 dias úteis, 9,0%), Braspress aéreo R$ 794,56. **A Rodonaves ficou R$ 102,11 mais barata que a melhor alternativa, com o mesmo prazo** — e estava fora da concorrência apenas por cadastro faltando.

Também ficou confirmado que o domínio `customer-apigateway` **aceita as mesmas credenciais** dos outros (mesmo `RODONAVES_USERNAME`/`RODONAVES_PASSWORD`, mesmo `auth_type=DEV`).

### ⚠️ Cuidado de negócio — este endpoint ESCREVE no TMS da transportadora

Não é consulta: cria um registro de cliente no sistema da Rodonaves, com endereço que normalmente vem da Receita Federal e **nem sempre é o endereço real de entrega**. Endereço errado gravado lá pode virar entrega no lugar errado.

Por isso, no motor interino, ele **nunca dispara sozinho**: a tela mostra ao operador cada campo que será enviado, deixa corrigir, e só chama depois da confirmação explícita. Se algum dia alguém for ligar isso num fluxo automático, **essa é uma decisão de negócio a ser reavaliada deliberadamente, não um detalhe de implementação.** Recomendação para a TI: manter a mesma regra.

### Pergunta em aberto para a Rodonaves

A documentação não diz se o destinatário **precisa** estar pré-cadastrado para cotar, ou se isso é comportamento de alguma configuração da conta. Vale confirmar com eles — se for regra geral, a TI precisa prever esse passo no fluxo do sistema definitivo, e não só tratar como erro.

## 4. Prazo de entrega

Endpoint separado da cotação — domínio e token próprios (ver seção 1). Recebe **nome da cidade + UF**, não o id usado na cotação/busca de cidade. **Na prática, esse endpoint deixou de ser necessário na maioria das cotações** desde que se confirmou (seção 3) que a própria resposta da cotação já traz `DeliveryTime` — o motor interino só chama este endpoint como reserva, se por acaso a cotação vier sem esse campo.

### Endpoint
```
POST https://01wapi.rte.com.br/api/v1/prazo-entrega
Authorization: Bearer <token>
Content-Type: application/json
```

### Corpo da requisição (`DeliveryTimeRequest`, todos obrigatórios)

| Campo | Tipo | Descrição |
|---|---|---|
| `OriginCityDescription` | Texto | Nome da cidade de origem, **sem acentuação e em maiúscula**. Ex.: `"RIBEIRAO PRETO"`. |
| `OriginUFDescription` | Texto | UF de origem. Ex.: `"SP"`. |
| `DestinationCityDescription` | Texto | Nome da cidade de destino, sem acentuação e em maiúscula. Ex.: `"UBERABA"`. |
| `DestinationUFDescription` | Texto | UF de destino. Ex.: `"MG"`. |

### Resposta de sucesso (`DeliveryTimeResponse`)

| Campo | Tipo | Descrição |
|---|---|---|
| `DeliveryTime` | Número inteiro | Prazo em dias. |

### Resposta de erro
| Código | Situação |
|---|---|
| 400 | Bad Request |
| 500 | Internal Server Error |

### UF de origem/destino — resolvido

A busca de cidade (seção 2) não devolve a UF. O motor interino resolve isso derivando a UF a partir dos dois primeiros dígitos do `IbgeCityCode` (tabela pública e fixa, embutida no código, sem depender de resposta da Rodonaves) — funcionando desde a implementação de 08/09/2026. Como este endpoint passou a ser só reserva (ver acima), esse cálculo só entra em ação se a cotação não trouxer `DeliveryTime`.

## 5. Rastreamento e comprovante de entrega

Domínio: `https://tracking-apigateway.rte.com.br` — mesmo formato de login da seção 1 (`POST /token`, `auth_type=DEV` maiúsculo, mesmo usuário/senha das outras APIs). Levantados em 08/09/2026, direto na doc interativa ("Try It!") do portal, três endpoints com schema completo:

### 5.1 Consulta de rastreio (principal)
```
GET https://tracking-apigateway.rte.com.br/api/v1/tracking
Authorization: Bearer <token>
```

| Parâmetro (query string) | Tipo | Descrição |
|---|---|---|
| `TaxIdRegistration` | Texto | CPF/CNPJ (remetente ou destinatário — não confirmado qual). |
| `InvoiceNumber` | Texto | Número da nota fiscal. |
| `InvoiceKey` | Texto | Chave de acesso da nota fiscal. |
| `ProtocolNumber` | Texto | Número do protocolo (o mesmo campo devolvido pela cotação — seção 3). |
| `CTeNumber` | Número inteiro (32 bits) | Número do CT-e. |

Não está claro na doc se os parâmetros são alternativos (basta um) ou se alguma combinação é obrigatória — ver teste abaixo.

**Resposta de sucesso** (`Rastreio`): protocolo, CT-e, dados de remetente/destinatário, mais um array `Events`, cada item com `Date`, `Description`, `EventCode`, `ProcedaCode`, `HistoricId`, `IsDeliveryReceiptBlocked`.

**Resposta de erro:** 400, 401, 403, 500.

⚠️ **Teste real (08/09/2026) deu 401 Unauthorized** — Juan testou com dados reais (`TaxIdRegistration=08133243000100`, `InvoiceNumber=1650`, `InvoiceKey` completa, `CTeNumber=16679033`, todos os quatro parâmetros juntos) e a API recusou o token. Causa ainda não diagnosticada — hipóteses: (a) o token usado já estava velho de tanto testar outras páginas da doc em sequência, valendo a pena gerar um token novo e testar de novo; (b) mandar os quatro parâmetros juntos não é uma combinação válida — vale tentar só um por vez (por exemplo, só `ProtocolNumber`, que é o dado que o motor interino já tem guardado de toda cotação feita). Fica como próximo teste antes de fechar esse endpoint.

### 5.2 Linha do tempo do rastreio (steps)
```
GET https://tracking-apigateway.rte.com.br/api/v1/tracking/trackingsteps
Authorization: Bearer <token>
```
Mesmos parâmetros de query da seção 5.1. Testado vazio (sem parâmetros) em 08/09/2026, devolveu **200** com exemplo de schema: `[{"DateStep": "...", "HistoricId": 0, "TypeUnity": "string", "Description": "string", "StepCode": 0}]` — um array com uma etapa por item, mais simples que o `Events` do endpoint principal. Documentação mais antiga ("Updated over 1 year ago"), então mais estável.

### 5.3 Comprovante de entrega
```
GET https://tracking-apigateway.rte.com.br/api/v1/deliveryreceipt
Authorization: Bearer <token>
```
Mesmos parâmetros de query da seção 5.1. Testado vazio em 08/09/2026, devolveu **200** com exemplo `{"Image": "string"}` — a imagem do comprovante, presumivelmente em base64 (não confirmado). Erros: 400, 401, 403, 500.

### Ainda não explorados

A barra lateral da doc mostra mais endpoints de rastreio que ainda não foram abertos — não são bloqueio para o motor interino (cobrem consulta em lote, não usada por enquanto), mas ficam mapeados para o futuro:

- Pesquisa de rastreio de mercadorias em lotes.
- ...em lotes com paginação.
- ...em lotes por data de ocorrência.
- Pesquisa informações do destino da mercadoria (dentro de Comprovante de Entrega).
- Pesquisa em lote o comprovante de entrega (POST).

Também existe o mecanismo EDI OCOREN (`docs/ocoren-ocorrências-de-entrega.md`, já mapeado em `levantamento-webhooks-ocorrencias-transportadoras.md`) — separado dos endpoints REST acima, ainda sem saber se é push ou pull.

## 6. Pontos em aberto — precisam de confirmação

Já foram resolvidos: como descobrir `OriginCityId`/`DestinationCityId` (seção 2), onde vem o prazo de entrega (seção 4 — via `DeliveryTime` já dentro da própria cotação), em qual domínio fica cada login (seção 1), o protocolo `https://` dos domínios, a pegadinha do `auth_type=DEV` maiúsculo (seção 1), o schema dos três principais endpoints de rastreio/comprovante (seção 5), **o formato do corpo de erro da cotação** (seção 3, confirmado em 24/09) e **o cadastro de destinatário como pré-requisito da cotação** (seção 3.1, confirmado ao vivo em 24/09). Resta:

1. **Quais os valores possíveis de `PayerSelected`?** Confirmado em 08/09/2026: Juan checou a página de referência interativa da Cotação diretamente (não só o texto da doc) e ela só mostra o tipo do campo (`int32`) e a descrição genérica "Tomador da cotação" — **sem listar as opções/enum**. Ou seja, não é um lapso de leitura: a doc realmente não expõe esses valores em lugar nenhum do portal (nas outras transportadoras isso corresponde a CIF/FOB — remetente paga ou destinatário paga). Esgotadas as fontes na própria documentação — o único caminho que resta é perguntar direto ao suporte da Rodonaves. Enquanto isso, o motor interino simplesmente não envia esse campo.
2. **O destinatário precisa estar sempre pré-cadastrado para cotar, ou isso depende de alguma configuração da conta?** Ver seção 3.1 — o comportamento foi medido em produção, mas a regra não está documentada.
3. **Diagnosticar o 401 Unauthorized** no teste real do endpoint principal de rastreio (seção 5.1) — token velho ou combinação de parâmetros inválida, ainda não confirmado qual.

## 7. Próximos passos

1. **Perguntar ao suporte da Rodonaves** duas coisas na mesma mensagem: quais valores `PayerSelected` aceita (item 1 da seção 6) e se o destinatário precisa sempre estar pré-cadastrado para cotar (item 2).
2. Retestar o endpoint principal de rastreio (seção 5.1) com um token novo e/ou só um parâmetro por vez (`ProtocolNumber` sozinho é o mais prático, já que o motor interino guarda esse dado de toda cotação feita).
3. Repassar esta especificação (já com a cotação confirmada, os nomes de campo reais, o cadastro de destinatário e o rastreio documentado) à equipe de TI, junto com as já entregues da Jamef e da Braspress.
