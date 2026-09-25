# Especificação da API — Jamef

> Documento preparado para a equipe de TI da RARE WAY, que está construindo o sistema de força de vendas onde o módulo de cotação/rastreamento de frete vai ficar embutido. Fonte: portal de desenvolvedores da Jamef (developers.jamef.com.br) e testes reais feitos em ambiente de homologação (Postman) em 24 e 28/08/2026, mais uso real em produção a partir de 01/09/2026 no motor de cotação interino.
>
> **Status:** autenticação, cotação e rastreamento **testados com sucesso em homologação**, todos com exemplo real de resposta (não só a documentação — chamadas de verdade). **Acesso à produção liberado e em uso real** desde 01/09/2026 — ver seção 2 abaixo para uma divergência importante encontrada entre o comportamento de homologação (documentado) e o de produção (real).

## 1. Acesso à API

- **Autenticação:** login com e-mail e senha (as mesmas credenciais do portal de desenvolvedores), que devolve um token JWT.
- **Ambientes:**
  - Homologação/teste: `https://api-qa.jamef.com.br`
  - Produção: `https://api.jamef.com.br`
- **Acesso à homologação:** já disponível, usando o próprio login do portal de desenvolvedores — não precisa pedir liberação.

### Acesso à produção — liberado
No Portal Developers, em **Produção -> Acesso ambiente de produção**, o processo foi:

1. Clicar em "Configurar conta" para solicitar o acesso (feito em 28/08/2026).
2. O pedido entrou em análise e foi respondido dentro do prazo informado no portal (até 2 dias úteis) — o suporte da Jamef, por e-mail, havia mencionado 24h úteis; o prazo do portal (2 dias úteis) se confirmou como o mais confiável.
3. Depois de aceito, a Jamef enviou o e-mail de boas-vindas pedindo o cadastro das credenciais de produção.
4. **Atenção (recomendação da própria Jamef):** a senha de produção é diferente da usada em homologação — assim foi cadastrado.
5. Com a credencial de produção cadastrada, as URLs passam a ser as de produção (`api.jamef.com.br`) em vez das de homologação (`api-qa.jamef.com.br`).

**Status atual (01/09/2026): acesso à produção liberado e em uso** no motor de cotação interino.

**Importante, segundo a Jamef:** em produção, os dados usados são reais e têm impacto direto nos sistemas (ou seja, uma cotação ou rastreamento em produção não é mais uma simulação). Cotação e rastreamento já haviam sido testados com sucesso em homologação antes da liberação de produção.

### Endpoint de login (gerar token)
```
POST {ambiente}/auth/v1/login
Content-Type: application/json
```
Corpo da requisição:
```json
{
  "username": "e-mail cadastrado no portal",
  "password": "senha do portal"
}
```
Resposta de sucesso (200):
```json
{
  "situacao": 200,
  "mensagem": "Usuário autenticado com sucesso.",
  "dado": [
    { "accessToken": "<token JWT>" }
  ]
}
```

### Regras importantes sobre o token
- O token JWT retornado é válido por **1 hora**.
- Vai no cabeçalho de toda chamada seguinte: `Authorization: Bearer <token>`.
- **Limite: só é permitido pedir 1 token novo por minuto, por IP.** Isso significa que o sistema que consome essa API precisa guardar o token em memória e reutilizá-lo até perto de expirar — nunca pedir um token novo a cada cotação/consulta.
- Em produção, é preciso usar a credencial exclusiva de produção (ver acima) — o login e o token continuam funcionando do mesmo jeito, só a credencial e a URL base mudam.

## 2. Cotação de Frete

### Endpoint
```
POST {ambiente}/calculo-frete/v1/cotacao
Authorization: Bearer <token>
Content-Type: application/json
```

### Corpo da requisição (request body)

| Campo | Descrição | Exemplo testado |
|---|---|---|
| `tipoTransporte` | Tipo de transporte (código) | `"1"` |
| `documentoDevedor` | CNPJ de quem paga o frete (só números) | `"08133243000100"` |
| `cepOrigem` | CEP de origem (só números) | `"31030370"` |
| `cepDestino` | CEP de destino (só números) | `"20040020"` |
| `quantidadeVolume` | Quantidade de volumes | `10` |
| `pesoMercadoria` | Peso total (kg) | `50` |
| `valorNotaFiscal` | Valor da mercadoria | `1500` |
| `metragemCubica` | Cubagem total (m³) | `0.42` |
| `documentoRemetente` | CNPJ de quem envia (só números) | `"08133243000100"` |
| `documentoDestino` | CNPJ de quem recebe (só números) | `"34567890000123"` |
| `filialOrigem` | Código da filial de origem | `"01"` |
| `dataColeta` | Data prevista de coleta (`DD/MM/AAAA`) | `"25/12/2024"` |

### Exemplo de requisição (JSON) — testado com sucesso
```json
{
  "tipoTransporte": "1",
  "documentoDevedor": "08133243000100",
  "cepOrigem": "31030370",
  "cepDestino": "20040020",
  "quantidadeVolume": 10,
  "pesoMercadoria": 50,
  "valorNotaFiscal": 1500,
  "metragemCubica": 0.42,
  "documentoRemetente": "08133243000100",
  "documentoDestino": "34567890000123",
  "filialOrigem": "01",
  "dataColeta": "25/12/2024"
}
```

### Resposta de sucesso — exemplo real obtido em teste (28/08/2026, em homologação)
```json
{
  "situacao": 200,
  "mensagem": "Operação realizada com sucesso",
  "dado": [
    {
      "numeroCotacao": "AHMVT5",
      "modalidadeTransporte": "1",
      "previsaoEntrega": "30/12/2024",
      "frete": 372.93,
      "imposto": 50.86,
      "total": 423.79
    }
  ],
  "idCorrelacao": "a4c6e1a4-e1bb-452c-aab3-c79389c54ee1",
  "dataHora": "2026-08-28T17:00:57.060045181Z"
}
```

Campos da resposta:

| Campo | Descrição |
|---|---|
| `situacao` | Código de status da operação (200 = sucesso) |
| `mensagem` | Descrição do resultado |
| `dado` | Lista com o resultado da cotação (observado com 1 item no teste) |
| `dado[].numeroCotacao` | Identificador da cotação gerada — **em homologação**, este era o "protocolo" a gravar no Sankhya. **Em produção real, esse campo não veio na resposta** (ver divergência abaixo) — usar `idCorrelacao` como alternativa. |
| `dado[].modalidadeTransporte` | Modal usado (espelha o `tipoTransporte` enviado) |
| `dado[].previsaoEntrega` | Data prevista de entrega |
| `dado[].frete` | Valor do frete |
| `dado[].imposto` | Valor de imposto |
| `dado[].total` | Valor total (frete + imposto) — este é o "valor da cotação" a considerar para o percentual sobre o pedido |
| `idCorrelacao` | ID único da chamada (útil para abrir chamado de suporte, caso necessário) — **sempre presente**, inclusive em produção. |
| `dataHora` | Data/hora da resposta, em UTC |

### ⚠️ Divergência entre homologação e produção — `numeroCotacao` ausente (encontrada em 01/09/2026)
O exemplo documentado acima (e testado em homologação, 28/08/2026) traz `dado[0].numeroCotacao` preenchido (ex.: `"AHMVT5"`). **Em uso real de produção, a partir de 01/09/2026, as respostas de cotação não trouxeram esse campo** — o objeto `dado[0]` retornado continha apenas `modalidadeTransporte`, `previsaoEntrega`, `frete`, `imposto` e `total`, sem `numeroCotacao`.

Isso foi confirmado com logging de depuração temporário no motor de cotação interino, testado contra a API de produção real — não é uma suposição.

**Recomendação para a TI, ao integrar esta API na versão definitiva:** não depender de `dado[].numeroCotacao` estar presente. Usar como protocolo de referência, em ordem de preferência:
1. `dado[0].numeroCotacao`, se vier preenchido (comportamento documentado/de homologação);
2. `idCorrelacao` (nível raiz da resposta), que está **sempre presente**, como alternativa — é também o identificador que a própria Jamef pede para abrir chamado de suporte sobre uma chamada específica.

O motor de cotação interino (`api/jamef-cotar.js`) já implementa esse fallback: `protocolo: d.numeroCotacao || json.idCorrelacao || null`.

**Hipóteses não confirmadas para a causa da diferença** (não investigadas a fundo, pois o fallback resolve o problema prático): pode ser uma diferença de comportamento entre os dois ambientes da Jamef, uma condição específica do tipo de frete/rota testado, ou uma mudança recente do lado da Jamef não refletida na documentação. Vale reconfirmar com a própria Jamef se o campo `numeroCotacao` deveria estar presente em produção, caso a TI queira usá-lo como identificador principal no lugar do `idCorrelacao`.

### Resposta de erro
Formato observado num erro interno real (500) durante os testes, antes de a Jamef corrigir o problema do lado deles:
```json
{
  "situacao": 500,
  "mensagem": "Um erro interno do servidor ocorreu. Consulte a mensagem de erro correspondente para mais detalhes.",
  "erros": [
    {
      "detalhes": null,
      "componenteFalho": "post-cotacao-subflow/processors/0 @ mule-exp-api-cotacao-qa:implementation/prc-post-cotacao.xml:119 (Efetua Cotacao)"
    }
  ],
  "idCorrelacao": "<id único da chamada>",
  "dataHora": "<data/hora>"
}
```
*(A documentação oficial não especifica todos os códigos de erro possíveis nem os erros de validação — por exemplo o formato de resposta para um CEP inválido ou um CNPJ mal formatado ainda não foi observado em teste. A API de rastreamento, abaixo, documenta o padrão de erro de forma mais completa — provavelmente o mesmo padrão vale para a cotação.)*

## 3. Rastreamento de Encomendas (Tracking)

**Testado com sucesso em homologação (28/08/2026)** — chamada real feita no Postman com um CT-e já despachado pela RARE WAY.

### Endpoint
```
GET {ambiente}/consulta/v1/rastreamento
Authorization: Bearer <token>
```
- Homologação: `https://api-qa.jamef.com.br/consulta/v1`
- Produção: `https://api.jamef.com.br/consulta/v1`

### Autenticação
Mesmo login/token JWT usado na cotação (ver seção 1).

### Regra de uso (requisitos da consulta)
É preciso informar **ao menos um** dos documentos:
- `documentoPagadorFrete` (CNPJ/CPF do pagador do frete)
- `documentoRemetente` (CNPJ/CPF do remetente)
- `documentoDestinatario` (CNPJ/CPF do destinatário)

**E** ao menos um dos números:
- Número da Nota Fiscal (`numeroNotaFiscal`, opcionalmente com `serieNotaFiscal`)
- Número do Conhecimento de Transporte Eletrônico — CT-e (`numeroConhecimento`, opcionalmente com `serieConhecimento`)

### Parâmetros da requisição (query string)

| Parâmetro | Descrição | Formato |
|---|---|---|
| `documentoPagadorFrete` | CNPJ/CPF de quem paga o frete | `^[a-zA-Z0-9]{1,14}$` |
| `documentoRemetente` | CNPJ/CPF de quem emitiu a nota fiscal | `^[a-zA-Z0-9]{1,14}$` |
| `documentoDestinatario` | CNPJ/CPF de quem recebe a mercadoria | `^[a-zA-Z0-9]{1,14}$` |
| `numeroNotaFiscal` | Número da nota fiscal eletrônica (NF-e) | texto |
| `serieNotaFiscal` | Série da nota fiscal eletrônica | texto |
| `numeroConhecimento` | Número do CT-e | texto |
| `serieConhecimento` | Série do CT-e | texto |

### Limite de requisições (rate limit)
- Máximo de **1 requisição a cada 2 segundos**.
- Se exceder, a API retorna erro **429 (Too Many Requests)**.

### Exemplo de requisição testada com sucesso
```
GET https://api-qa.jamef.com.br/consulta/v1/rastreamento?numeroConhecimento=1178557&documentoRemetente=08133243000100
Authorization: Bearer <token>
```

### Resposta de sucesso — exemplo real obtido em teste (28/08/2026, em homologação)
```json
{
  "situacao": 200,
  "mensagem": "Foram retornados 1 registros",
  "dado": [
    {
      "rastreamento": [
        {
          "tipo": "CTE",
          "remetente": {
            "nome": "NP INDUSTRIA E COMERCIO DE COSMETICOS",
            "cidade": "BELO HORIZONTE",
            "uf": "MG"
          },
          "destinatario": {
            "nome": "BRCOMEX COMERCIO E IMPORTACAO LTDA",
            "cidade": "FORTALEZA",
            "uf": "CE"
          },
          "conhecimento": {
            "numero": "001178557",
            "serie": "1",
            "chave": "31220320147617000141570010011785571998821446"
          },
          "notaFiscal": {
            "numero": "5423",
            "serie": "1",
            "chave": "31220308133243000100550010000054231015222804",
            "pedido": "24"
          },
          "frete": {
            "valorFrete": "622.55",
            "previsaoEntrega": "2022-03-21",
            "urlComprovanteEntrega": "https://jamef-ms-prod-s3uploadfiles.s3.amazonaws.com/020011785571/DIGITALIZACAO/020011785571.pdf?<parâmetros de assinatura temporária AWS>"
          },
          "eventosRastreio": [
            {
              "data": "2022-03-22T13:57:00",
              "status": "DOCUMENTO ASSINADO",
              "codigoOcorrencia": "01",
              "localOrigem": { "cidade": "FORTALEZA", "uf": "CE" },
              "localDestino": { "cidade": "FORTALEZA", "uf": "CE" }
            },
            {
              "data": "2022-03-22T13:57:00",
              "status": "ENTREGA REALIZADA NORMALMENTE",
              "codigoOcorrencia": "01",
              "localOrigem": { "cidade": "FORTALEZA", "uf": "CE" },
              "localDestino": { "cidade": "FORTALEZA", "uf": "CE" }
            },
            {
              "data": "2022-03-21T11:53:00",
              "status": "ENCERRAMENTO DE PENDENCIA - ENTREGA",
              "codigoOcorrencia": "099",
              "localOrigem": { "cidade": "FORTALEZA", "uf": "CE" },
              "localDestino": { "cidade": "", "uf": "" }
            },
            {
              "data": "2022-03-18T17:05:00",
              "status": "MERCADORIA RETIDA NA FISCALIZAÇÃO",
              "codigoOcorrencia": "26",
              "localOrigem": { "cidade": "FORTALEZA", "uf": "CE" },
              "localDestino": { "cidade": "", "uf": "" }
            }
          ]
        }
      ]
    }
  ],
  "idCorrelacao": "cbd49b1a-3ce9-4b5f-91f6-c84532f40740",
  "dataHora": "2026-08-28T18:29:31.111770492Z"
}
```

*(O CT-e usado no teste é de um envio antigo, de março de 2022 — por isso os eventos de rastreio são de anos atrás; o importante aqui é confirmar que o formato da resposta bate com a documentação. Nota: esse teste real confirma que a `mensagem` reflete corretamente o resultado da consulta — "Foram retornados 1 registros" — diferente do exemplo da documentação oficial da Jamef, que mostrava `situacao: 200` junto de uma `mensagem` de erro; aquilo era mesmo um exemplo de documentação inconsistente, não o comportamento real da API.)*

Campos de cada item em `dado[].rastreamento[]`:

| Campo | Descrição |
|---|---|
| `tipo` | Tipo de rastreamento (ex.: "CTE", "Normal") |
| `remetente.nome/cidade/uf` | Dados de quem enviou |
| `destinatario.nome/cidade/uf` | Dados de quem recebe |
| `conhecimento.numero/serie/chave` | Dados do CT-e |
| `notaFiscal.numero/serie/chave/pedido` | Dados da nota fiscal, incluindo o número do pedido |
| `frete.valorFrete` | Valor do frete |
| `frete.previsaoEntrega` | Data prevista de entrega |
| `frete.urlComprovanteEntrega` | Link do comprovante de entrega (PDF, URL assinada/temporária) |
| `eventosRastreio[]` | Lista de eventos/status ao longo do trajeto: `data`, `status`, `codigoOcorrencia`, `localOrigem`, `localDestino` |

### Respostas de erro (documentadas oficialmente)

Formato padrão para os códigos 400, 401, 403, 404, 500, 502 e 504:
```json
{
  "situacao": 0,
  "mensagem": "Mensagem detalhada descrevendo o erro",
  "erros": [
    {
      "detalhes": "Detalhes do erro ocorrido durante a execução.",
      "componenteFalho": "Componente específico que falhou."
    }
  ],
  "idCorrelacao": "6a2dc000-b812-11ef-9cb7-0c37964d58xA",
  "dataHora": "2024-12-11T19:51:29.1304942-03:00"
}
```

| Código | Situação |
|---|---|
| 400 | Requisição inválida |
| 401 | Não autorizado (token ausente/inválido) |
| 403 | Acesso recusado |
| 404 | Recurso não encontrado |
| 429 | Limite de requisições excedido — resposta diferente: `{"error": "Quota has been exceeded"}` |
| 500 | Erro interno do servidor |
| 502 | Bad Gateway (problema num serviço interno da Jamef) |
| 504 | Timeout num serviço interno da Jamef |

## 4. Próximos passos

1. **Concluído:** acesso à produção liberado (01/09/2026) — credencial de produção cadastrada e em uso no motor de cotação interino (`JAMEF_AMBIENTE=producao`).
2. **Atenção ao integrar na versão definitiva:** não depender de `dado[].numeroCotacao` na cotação — usar `idCorrelacao` como protocolo de referência quando `numeroCotacao` não vier (ver seção 2, "Divergência entre homologação e produção").
3. Repassar esta especificação, junto com a da Braspress, para a equipe de TI que está construindo o sistema de força de vendas.
4. Acompanhar as primeiras cotações reais em produção de perto (dados reais têm impacto direto, conforme aviso da própria Jamef).
