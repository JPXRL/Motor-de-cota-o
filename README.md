# Motor de Cotação de Frete — RARE WAY

Ferramenta interina de cotação de frete: consulta Jamef e Braspress em paralelo, compara preço e prazo, e ajuda a decidir qual transportadora usar em cada envio.

- **Site em produção:** https://motor-cotacao-frete.vercel.app
- **Deploy:** automático — todo push na branch `main` publica direto em produção (via integração Vercel + GitHub).

## Estrutura

- `index.html` — frontend (formulário de cotação + cadastro de caixas + histórico), sem build step.
- `middleware.js` — controle de acesso: exige usuário/senha (HTTP Basic Auth do próprio navegador) para abrir qualquer página ou chamar qualquer função deste site, usando uma senha única compartilhada (ver variável `MOTOR_SENHA` abaixo). Substitui a tentativa anterior de login individual por pessoa (removida em 01/09/2026 por não funcionar de forma confiável) por algo bem mais simples.
- `api/` — funções serverless (Vercel Functions) que guardam as credenciais das transportadoras e falam com as APIs reais:
  - `jamef-cotar.js`, `braspress-cotar.js` — cotação de frete.
  - `consulta-cnpj.js` — busca de dados de empresa pela CNPJá (Receita Federal).
  - `caixas.js` — CRUD do cadastro de caixas padrão (banco Postgres, quando conectado).
  - `historico-cotacoes.js` — log de cada cotação feita (banco Postgres, quando conectado).
  - `login.js`, `logout.js`, `me.js` — código do login individual antigo, removido do fluxo atual (mantido só como referência; não é chamado por nada hoje — foi substituído pelo `middleware.js` de senha única).

## Variáveis de ambiente (Vercel → Project Settings → Environment Variables)

Nunca cadastradas em código nem em chat — só direto no painel do Vercel:

- `JAMEF_USERNAME`, `JAMEF_PASSWORD`, `JAMEF_AMBIENTE`, `JAMEF_CNPJ_REMETENTE`, `JAMEF_CEP_ORIGEM`
- `BRASPRESS_USERNAME`, `BRASPRESS_PASSWORD`, `BRASPRESS_CNPJ_REMETENTE`, `BRASPRESS_CEP_ORIGEM`
- `POSTGRES_URL` (e variáveis irmãs) — cadastradas automaticamente pelo Vercel ao conectar o banco Postgres (Neon) na aba Storage.
- `MOTOR_SENHA` — a senha única que a equipe usa para entrar no site (usuário fixo: `rareway`). Enquanto esta variável não existir, o site fica aberto sem pedir senha, igual está hoje.

## Documentação do projeto

As decisões de negócio, a especificação de cada API de transportadora e o histórico de mudanças ficam no projeto Claude "Fretes (cotação/validação)" — não neste repositório.
