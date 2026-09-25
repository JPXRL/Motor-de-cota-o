# Especificação da API — Braspress

> Documento preparado para a equipe de TI da RARE WAY, que está construindo o sistema de força de vendas onde o módulo de cotação/rastreamento de frete vai ficar embutido. Fonte: documentação oficial da Braspress em https://api.braspress.com/home (consultada em 26/08/2026).
>
> **Aviso importante:** a Braspress **não tem ambiente de testes/homologação** — só existe API de produção. A documentação oficial também não mostra exemplos de resposta "preenchidos" (com valores reais), só a lista de campos que cada resposta contém. **Atualização (02/09/2026): a cotação já foi testada com uma chamada real** através do motor de cotação interino (ver seção 4) — os três campos de sucesso documentados (`id`, `prazo`, `totalFrete`) vieram preenchidos e corretos. O rastreamento continua sem confirmação por chamada real.

## 1. Acesso à API

- **URL base:** `https://api.braspress.com/`
- **Autenticação:** HTTP Basic Auth. O usuário e senha são fornecidos pela Braspress **depois de uma análise da negociação de frete feita na filial de atendimento** — ou seja, precisa pedir a credencial diretamente à filial, não é um cadastro self-service no site.
- **Formato do cabeçalho de autenticação:**
  ```
  Authorization: Basic <usuário:senha em Base64>
  ```
  Exemplo (usando o par fictício `cliente:cliente`, só pra mostrar o formato): `Authorization: Basic Y2xpZW50ZTpjbGllbnRl`
- **Ambiente:** só produção. Não existe URL de homologação/sandbox — qualquer teste feito já é uma chamada real ao sistema da Braspress.
- **Pré-requisito:** o CNPJ usado como remetente/pagante (`cnpjRemetente`) precisa estar cadastrado como cliente na Braspress.

## 2. Cotação de Frete

### Endpoint
```
POST https://api.braspress.com/v1/cotacao/calcular/{returnType}
```
- `{returnType}`: `json` ou `xml` — define o formato da resposta.

### Corpo da requisição (request body)

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `cnpjRemetente` | Número | Sim | CNPJ do remetente — precisa estar cadastrado como cliente na Braspress |
| `cnpjDestinatario` | Número | Sim | CNPJ do destinatário — se o CNPJ/CPF não estiver cadastrado na Braspress, a cotação é feita com base só no CEP |
| `modal` | Texto | Sim | `"R"` para rodoviário, `"A"` para aéreo |
| `tipoFrete` | Número | Sim | `1` = CIF (quem paga é o remetente), `2` = FOB (quem paga é o destinatário), `3` = Consignado |
| `cepOrigem` | Número | Sim | CEP de origem do frete |
| `cepDestino` | Número | Sim | CEP de destino do frete |
| `vlrMercadoria` | Decimal | Sim | Valor total da mercadoria |
| `peso` | Decimal | Sim | Peso total de todos os volumes |
| `volumes` | Número | Sim | Quantidade total de volumes |
| `cubagem` | Lista de objetos | Sim | Um objeto por tipo de volume, com `comprimento`, `largura`, `altura` (em metros) e `volumes` (quantidade daquele tipo) |
| `cnpjConsignado` | Número | Só se `tipoFrete = 3` | CNPJ do consignatário — obrigatório apenas no frete tipo Consignado |

### Exemplo de requisição (JSON)
```json
{
  "cnpjRemetente": 60701190000104,
  "cnpjDestinatario": 30539356867,
  "modal": "R",
  "tipoFrete": "1",
  "cepOrigem": 2323000,
  "cepDestino": 7093090,
  "vlrMercadoria": 100.00,
  "peso": 50.55,
  "volumes": 100,
  "cubagem": [
    {
      "altura": 0.46,
      "largura": 0.67,
      "comprimento": 0.67,
      "volumes": 10
    }
  ]
}
```

### Resposta de sucesso — campos documentados

| Campo | Descrição |
|---|---|
| `id` | Identificador único da cotação realizada |
| `prazo` | Quantidade de dias de previsão de entrega |
| `totalFrete` | Valor total do frete |

**Confirmado com chamada real (02/09/2026):** esses três campos vieram preenchidos e corretos numa cotação real feita pelo motor interino (peso e valor de mercadoria reais) — a tela mostrou protocolo, prazo e valor sem precisar de nenhum campo alternativo (`valorFrete`/`total`/`prazoEntrega`, que o motor também aceita como fallback, não foram necessários). Antes dessa chamada, uma tentativa anterior com dados de teste inconsistentes (peso muito alto para um valor de mercadoria muito baixo) havia retornado erro — não chegou a ser um problema de integração, foi engano nos campos digitados.

**Regra de validade:** todas as cotações são válidas até as 23h59min59s do dia em que foram feitas.

### Resposta de erro — campos documentados

| Campo | Descrição |
|---|---|
| `statusCode` | Código do erro |
| `message` | Descrição do erro |
| `dateTime` | Data e hora do erro |
| `errorList` | Se houver mais de um erro, uma lista com detalhes de cada um |

*(a documentação não especifica os códigos HTTP/statusCode possíveis nem mostra um exemplo de erro preenchido; o motor interino (`api/braspress-cotar.js`) agora loga a resposta de erro completa nos logs do Vercel e repassa `errorList` na mensagem mostrada na tela, quando presente, pra facilitar diagnosticar um próximo erro real)*

### Exemplo de uso completo (curl)
```bash
curl -v -H "Authorization: Basic Y2xpZW50ZTpjbGllbnRl" \
  -H "Content-Type: application/json" \
  -d '{"cnpjRemetente":60701190000104,"cnpjDestinatario":30539356867,"modal":"R","tipoFrete":"1","cepOrigem":2323000,"cepDestino":7093090,"vlrMercadoria":100.00,"peso":50.55,"volumes":100,"cubagem":[{"altura":0.46,"largura":0.67,"comprimento":0.67,"volumes":10}]}' \
  -X POST https://api.braspress.com/v1/cotacao/calcular/json
```

### Exemplo de uso completo (JavaScript / jQuery, conforme a documentação oficial)
```javascript
var authorizationBasic = 'Y2xpZW50ZTpjbGllbnRl';

$.ajax({
    type: 'POST',
    url: 'https://api.braspress.com/v1/cotacao/calcular/json',
    data: '{"cnpjRemetente":60701190000104,"cnpjDestinatario":30539356867,"modal":"R","tipoFrete":"1","cepOrigem":2323000,"cepDestino":7093090,"vlrMercadoria":100.00,"peso":50.55,"volumes":10,"cubagem":[{"altura":0.46,"largura":0.67,"comprimento":0.67,"volumes":10}]}',
    dataType: "json",
    contentType: 'application/json; charset=utf-8',
    xhrFields: { withCredentials: true },
    crossDomain: true,
    headers: { 'Authorization': 'Basic ' + authorizationBasic },
    success: function (result) { console.log(result); },
    error: function (req, status, error) { console.log(error); }
});
```

## 3. Rastreamento de Encomendas (Tracking)

A Braspress documenta 3 versões do endpoint de rastreamento. A v3 é a mais completa (traz linha do tempo/ocorrências detalhadas) e aceita busca por número de pedido, não só por nota fiscal.

### Endpoints

| Versão | Método | URL | Busca por |
|---|---|---|---|
| v1 | GET | `https://api.braspress.com/v1/tracking/{cnpj}/{notaFiscal}/{returnType}` | Nota fiscal |
| v2 | GET | `https://api.braspress.com/v2/tracking/{cnpj}/{notaFiscal}/{returnType}` | Nota fiscal (aceita grupos econômicos) |
| v3 | GET | `https://api.braspress.com/v3/tracking/byNf/{cnpj}/{notaFiscal}/{returnType}` | Nota fiscal (aceita grupos econômicos) |
| v3 | GET | `https://api.braspress.com/v3/tracking/byNumPedido/{cnpj}/{numPedido}/{returnType}` | Número do pedido (aceita grupos econômicos) |

### Parâmetros de URL (path parameters)

| Parâmetro | Descrição |
|---|---|
| `{cnpj}` | CNPJ do tomador do frete |
| `{notaFiscal}` | Número da nota fiscal (v1, v2, v3-byNf) |
| `{numPedido}` | Número do pedido (v3-byNumPedido) |
| `{returnType}` | `json` ou `xml` |

**Janela de busca:** os últimos 90 dias, contados a partir da data de emissão do conhecimento de frete.

### Resposta de sucesso — campos documentados

A resposta traz uma lista `conhecimentos` (um item por conhecimento de frete encontrado), com estes campos por item:

**Dados principais:** `numero`, `origem`, `emissao`, `remetente`, `destinatario`, `tipoFrete`, `volumes`, `valorMercantil`, `peso`, `totalFrete`, `previsaoEntrega`, `dataEntrega`, `status`, `cidade`, `uf`, `cidadeColeta`, `ufColeta`, `dataOcorrencia`, `ultimaOcorrencia`

**Objetos aninhados:**
- `notasFiscais`: `serie`, `numero`, `emissao`
- `timeline` (só na v3): `descricao`, `data`
- `ocorrencias` (só na v3): `descricao`, `data`

*(a documentação oficial não mostra um JSON de resposta preenchido — só a lista de campos acima)*

### Resposta de erro — campos documentados

Mesmo formato do erro de cotação: `statusCode`, `message`, `dateTime`, `errorList` (sem exemplo preenchido nem lista de códigos HTTP possíveis).

### Exemplo de uso completo (curl)
```bash
curl -v -H "Authorization: Basic Y2xpZW50ZTpjbGllbnRl" \
  -X GET https://api.braspress.com/v1/tracking/12345678912345/12345/json
```

### Exemplo de uso completo (JavaScript / jQuery, conforme a documentação oficial)
```javascript
var authorizationBasic = 'Y2xpZW50ZTpjbGllbnRl';

$.ajax({
    type: 'GET',
    url: 'https://api.braspress.com/v1/tracking/12345678912345/12345/json',
    contentType: 'application/json; charset=utf-8',
    xhrFields: { withCredentials: true },
    crossDomain: true,
    headers: { 'Authorization': 'Basic ' + authorizationBasic },
    success: function (result) { console.log(result); },
    error: function (req, status, error) { console.log(error); }
});
```

## 4. O que ainda falta para testar de verdade

- ✅ **Cotação: testada com sucesso, com dados reais (02/09/2026)** — feita através do motor de cotação interino (`https://motor-cotacao-frete.vercel.app`). Confirmou os três campos de resposta documentados (`id`, `prazo`, `totalFrete`). Antes desse sucesso, uma tentativa com dados de teste inconsistentes (peso muito alto para um valor de mercadoria muito baixo) retornou erro — não era um problema de integração, foi engano no preenchimento dos campos de teste.
- **Rastreamento: ainda não testado com uma chamada real** — próximo passo, quando fizer sentido testar (não tem risco, ao contrário da cotação, que já vale como frete real).
1. Repassar esta confirmação para a equipe de TI, pra fechar a especificação com 100% de certeza nos campos de cotação.
