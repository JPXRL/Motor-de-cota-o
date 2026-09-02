# Motor de Cotação de Frete — RARE WAY

Ferramenta interina de cotação de frete: consulta Jamef e Braspress em paralelo, compara preço e prazo, e ajuda a decidir qual transportadora usar em cada envio.

- **Site em produção:** https://motor-cotacao-frete.vercel.app
- **Deploy:** automático — todo push na branch `main` publica direto em produção (via integração Vercel + GitHub).

## Estrutura

- `index.html` — frontend (formulário de cotação + cadastro de caixas), sem build step.
- `api/` — funções serverless (Vercel Functions) que guardam as credenciais das transportadoras e falam com as APIs reais:
  - `jamef-cotar.js`, `braspress-cotar.js` — cotação de frete.
  - `consulta-cnpj.js` — busca de dados de empresa pela CNPJá (Receita Federal).
  - `caixas.js` — CRUD do cadastro de caixas padrão (Vercel KV, quando conectado).
  - `login.js`, `logout.js`, `me.js` — código do login antigo, removido do fluxo atual (mantido só como referência; não é chamado por nada hoje).

## Variáveis de ambiente (Vercel → Project Settings → Environment Variables)

Nunca cadastradas em código nem em chat — só direto no painel do Vercel:

- `JAMEF_USERNAME`, `JAMEF_PASSWORD`, `JAMEF_AMBIENTE`, `JAMEF_CNPJ_REMETENTE`, `JAMEF_CEP_ORIGEM`
- `BRASPRESS_USERNAME`, `BRASPRESS_PASSWORD`, `BRASPRESS_CNPJ_REMETENTE`, `BRASPRESS_CEP_ORIGEM`

## Documentação do projeto

As decisões de negócio, a especificação de cada API de transportadora e o histórico de mudanças ficam no projeto Claude "Fretes (cotação/validação)" — não neste repositório.
