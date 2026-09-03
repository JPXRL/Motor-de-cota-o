# Motor de Cotação de Frete — RARE WAY

Ferramenta interina de cotação de frete: consulta Jamef e Braspress em paralelo, compara preço e prazo, e ajuda a decidir qual transportadora usar em cada envio.

- **Site em produção:** https://motor-cotacao-frete.vercel.app
- **Deploy:** automático — todo push na branch `main` publica direto em produção (via integração Vercel + GitHub).

## Estrutura

- `index.html` — frontend (formulário de cotação + cadastro de caixas + histórico + rastreio), sem build step.
- `login.html` — tela de login customizada com a identidade visual da RARE WAY (fundo com padrão de pontos + logo), usada no lugar do popup nativo de Basic Auth do navegador. Página estática autocontida (CSS e imagens embutidos), sem dependências externas.
- `middleware.js` — controle de acesso: exige a senha única compartilhada (`MOTOR_SENHA`, ver abaixo) para abrir qualquer página ou chamar qualquer função deste site. Antes usava o popup nativo de Basic Auth do navegador; agora redireciona para `login.html` e verifica um cookie de sessão assinado (HMAC-SHA256), sem exigir novo login a cada visita dentro da validade da sessão (12h). Continua sendo senha única compartilhada — sem conta por pessoa. (A tentativa anterior de login individual por pessoa foi removida em 01/09/2026 por não funcionar de forma confiável.)
- `api/` — funções serverless (Vercel Functions) que guardam as credenciais das transportadoras e falam com as APIs reais:
  - `jamef-cotar.js`, `braspress-cotar.js` — cotação de frete.
  - `jamef-rastrear.js`, `braspress-rastrear.js` — rastreio de encomendas (consulta ao vivo, sem guardar nada), usadas pela tela "Rastreio" do site.
  - `consulta-cnpj.js` — busca de dados de empresa pela CNPJá (Receita Federal).
  - `caixas.js` — CRUD do cadastro de caixas padrão (banco Postgres, quando conectado).
  - `historico-cotacoes.js` — log de cada cotação feita (banco Postgres, quando conectado).
  - `login.js` — verifica a senha enviada pelo formulário em `login.html` e, se correta, cria o cookie de sessão assinado que o `middleware.js` passa a aceitar.
  - `logout.js` — apaga o cookie de sessão (encerra a sessão atual).
  - `me.js` — código do login individual antigo (baseado em `APP_USERS`/`SESSION_SECRET`), não é chamado por nada hoje; mantido só como referência histórica.

## Variáveis de ambiente (Vercel → Project Settings → Environment Variables)

Nunca cadastradas em código nem em chat — só direto no painel do Vercel:

- `JAMEF_USERNAME`, `JAMEF_PASSWORD`, `JAMEF_AMBIENTE`, `JAMEF_CNPJ_REMETENTE`, `JAMEF_CEP_ORIGEM` — usadas tanto na cotação (`jamef-cotar.js`) quanto no rastreio (`jamef-rastrear.js`).
- `BRASPRESS_USERNAME`, `BRASPRESS_PASSWORD`, `BRASPRESS_CNPJ_REMETENTE`, `BRASPRESS_CEP_ORIGEM` — usadas tanto na cotação (`braspress-cotar.js`) quanto no rastreio (`braspress-rastrear.js`).
- `POSTGRES_URL` (e variáveis irmãs) — cadastradas automaticamente pelo Vercel ao conectar o banco Postgres (Neon) na aba Storage.
- `MOTOR_SENHA` — a senha única que a equipe usa para entrar no site, digitada em `login.html`. Também é usada como chave para assinar o cookie de sessão (não existe variável de sessão separada). Enquanto esta variável não existir, o site fica aberto sem pedir senha, igual está hoje.

## Documentação do projeto

As decisões de negócio, a especificação de cada API de transportadora e o histórico de mudanças ficam no projeto Claude "Fretes (cotação/validação)" — não neste repositório.
