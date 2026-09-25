# Motor de Cotação de Frete — RARE WAY

Consulta **Braspress, Jamef e Rodonaves ao mesmo tempo** para um mesmo envio e
mostra preço e prazo lado a lado, para que a expedição escolha com comparação
na mão em vez de cotar portal por portal.

**No ar:** https://motor-cotacao-frete.vercel.app (atrás de senha única da equipe)

> Está trabalhando neste projeto com o Claude? Leia **[CLAUDE.md](CLAUDE.md)**
> primeiro — lá estão as regras que não podem ser quebradas, o que está em
> aberto e os erros que já custaram tempo.

## O que o sistema faz

| Tela | Para quê |
|---|---|
| **Cotação** | Consulta as três transportadoras em paralelo. Cada uma aparece assim que responde. Mostra valor, prazo, protocolo e **quanto o frete representa do valor do pedido**. Registra qual foi escolhida, o motivo e a diferença para a mais barata. |
| **Rastreio** | Consulta pontual de uma encomenda na Braspress ou na Jamef. Não guarda nada. |
| **Cadastro de caixas** | As caixas padrão da RARE WAY, para o operador escolher em vez de digitar medidas toda vez. |
| **Cobertura** | Destinos que uma transportadora já recusou. Nesses casos o motor deixa de consultá-la, em vez de gastar 20 segundos para receber a mesma recusa. |
| **Histórico** | Cotações anteriores, com a taxa de resposta de cada transportadora e as mensagens de erro agrupadas. |

## Como é feito

Sem framework e sem build: `index.html` é o sistema inteiro — HTML, CSS e um
único bloco `<script>`. O que precisa de segredo (as credenciais das
transportadoras) roda no backend, em funções serverless.

```
index.html  ─►  api/ (portas de entrada)  ─►  lib/ (a lógica)  ─►  APIs das transportadoras
                        │
                        └─►  Postgres (Neon) — caixas, histórico, cobertura
```

- **`api/`** — uma função serverless por arquivo. Só faz porta: confere o
  método, a trava de CSRF, e despacha.
- **`lib/`** — onde mora a lógica de verdade. Não conta no limite de funções
  da hospedagem.
- **`middleware.js`** — exige o cookie de sessão antes de servir qualquer
  página ou função.
- **`docs/`** — as decisões do projeto, a especificação de cada API de
  transportadora e as medições feitas até aqui.

> **Por que `api/`, `lib/`, `index.html` e `middleware.js` ficam na raiz:** é
> onde a Vercel procura. Mudar isso de lugar derruba o site. Ver CLAUDE.md.

## Rodando e publicando

Não há passo de build. Para publicar:

```bash
git push        # a Vercel detecta e publica sozinha
```

O push é barrado automaticamente se o projeto passar de 12 funções serverless
(limite do plano Hobby) — ver `scripts/checar-funcoes.js`.

**Publicar não é estar no ar.** Confirme na aba *Deployments* da Vercel que o
commit ficou **Ready**. Já aconteceu de quatro deploys falharem em silêncio
enquanto o site servia a versão antiga.

## Configuração

As credenciais **nunca** ficam no código nem passam por conversa — são
digitadas direto em *Vercel → Project Settings → Environment Variables*:

| Grupo | Variáveis |
|---|---|
| Acesso ao site | `MOTOR_SENHA` |
| Banco | `POSTGRES_URL` (criada pela integração Neon, aba Storage) |
| Jamef | `JAMEF_USERNAME`, `JAMEF_PASSWORD`, `JAMEF_AMBIENTE`, `JAMEF_CNPJ_REMETENTE`, `JAMEF_CEP_ORIGEM` |
| Braspress | `BRASPRESS_USERNAME`, `BRASPRESS_PASSWORD`, `BRASPRESS_CNPJ_REMETENTE`, `BRASPRESS_CEP_ORIGEM` |
| Rodonaves | `RODONAVES_USERNAME`, `RODONAVES_PASSWORD`, `RODONAVES_CNPJ_REMETENTE`, `RODONAVES_CEP_ORIGEM`, `RODONAVES_CONTATO_NOME`, `RODONAVES_CONTATO_TELEFONE` |

As tabelas do banco se criam sozinhas na primeira chamada. **Sem banco
conectado nada quebra:** as caixas caem nas 6 padrão e nenhuma regra de
cobertura é aplicada.

## Documentação

Tudo em [`docs/`](docs/). Os pontos de partida:

- [`docs/motor-cotacao-frete-arquitetura.md`](docs/motor-cotacao-frete-arquitetura.md) — a história completa das decisões
- [`docs/especificacao-api-braspress.md`](docs/especificacao-api-braspress.md) · [`jamef`](docs/especificacao-api-jamef.md) · [`rodonaves`](docs/especificacao-api-rodonaves.md) — as três APIs, com o que foi confirmado em chamada real e o que ainda é só documentação
- [`docs/limite-funcoes-vercel.md`](docs/limite-funcoes-vercel.md) — o incidente dos deploys silenciosos e a regra que ficou
- [`docs/plano-de-execucao.md`](docs/plano-de-execucao.md) — onde o projeto está e o que vem a seguir

## Situação das transportadoras

| | Cotação | Rastreio |
|---|---|---|
| **Braspress** | confirmada em chamada real | implementado, **nunca testado de verdade** |
| **Jamef** | confirmada em chamada real (produção) | confirmado em chamada real |
| **Rodonaves** | confirmada em chamada real | **401 no teste**, não diagnosticado |

A Rodonaves exige que o destinatário **já exista na base dela** antes de
cotar — não está documentado em lugar nenhum, foi descoberto medindo produção.
Por isso existe o botão "Cadastrar destinatário" na tela de cotação.
