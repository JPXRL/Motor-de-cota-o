# Motor de Cotação de Frete — RARE WAY

Leia este arquivo inteiro antes de mexer em qualquer coisa. Ele existe para
que uma sessão nova não repita erro que já custou caro.

---

## O que é

Um motor que consulta **Braspress, Jamef e Rodonaves ao mesmo tempo** para um
mesmo envio e mostra preço e prazo lado a lado. O objetivo não é digitar mais
rápido: é **criar concorrência real** entre transportadoras, que antes não
existia porque a expedição cotava portal por portal e na prática usava sempre
a mesma.

Está **no ar e em uso real** em `https://motor-cotacao-frete.vercel.app`,
atrás de uma senha única compartilhada.

Telas: Cotação, Rastreio, Cadastro de caixas, Cobertura, Histórico.

## Quem mantém

**Juan Pablo** (juan@rarewaycosmeticos.com.br). Ele coordena o projeto, fala
com as transportadoras e decide o negócio — **e não é programador**.

Isso muda como se escreve aqui:

- Todo comentário de código é em **português**, e explica **por que**, não o
  que a linha faz. O "o quê" se lê no código; o "porquê" se perde.
- Nada de jargão sem explicação, nem no código nem na conversa.
- Antes de uma mudança visual, mostrar como vai ficar e esperar o "pode".

## Como isto vira produção

```
git push na branch main  →  GitHub JPXRL/Motor-de-cota-o  →  Vercel publica
```

> ### ⚠️ Push não é deploy
>
> Um `git push` bem-sucedido **não diz nada** sobre o deploy ter dado certo.
> Em 23/09/2026 quatro deploys seguidos falharam em 5 segundos enquanto o site
> servia a versão antiga — por seis horas, sem nenhum erro no terminal.
>
> **A regra: diga "enviei o commit X" e espere o Juan confirmar Ready na aba
> Deployments da Vercel.** Nunca diga "está no ar" por conta própria.

Notificação de falha de deploy por e-mail está ligada (Vercel → Settings →
Notifications) desde 24/09/2026.

---

## Regras duras

### 1. Teto de 12 funções serverless

Plano Hobby da Vercel: **no máximo 12 funções por deploy, e o `middleware.js`
conta**. Medido, não suposto: 11 em `api/` + middleware = 12 → Ready;
12 + middleware = 13 → Error em 5 segundos.

**Hoje: 9 em `api/` + middleware = 10. Duas vagas livres.**

`scripts/checar-funcoes.js` conta e barra o push acima de 12, instalado como
hook `pre-push`. **`.git/hooks/` não é versionado** — em máquina nova,
reinstale: `node scripts/checar-funcoes.js || exit 1` em `.git/hooks/pre-push`.

### 2. `api/` é o orçamento de funções. `lib/` é onde mora o código.

Arquivo fora de `api/` não conta no teto — a Vercel empacota por rastreamento
de dependência. Então `api/` fica só com as **portas de entrada** (método,
trava de CSRF, despacho) e a lógica vai para `lib/`.

Endpoints que recebem os mesmos dados e devolvem o mesmo formato viram **uma
porta com um parâmetro**: é o que `api/cotar.js` e `api/rastrear.js` fazem.
Transportadora nova custa **zero vaga** — um arquivo em `lib/` e uma linha no
mapa de `api/cotar.js`.

Se um dia as duas vagas acabarem: juntar `login` + `logout` + `me` num
`auth.js` leva de 9 para 7. Não foi feito de propósito — quebrar a
autenticação tranca todo mundo para fora, então merece commit separado e
testado sozinho. O plano Pro (~US$ 20/mês, 100 funções) não se justifica
enquanto a reestruturação gratuita resolve.

### 3. Credencial nunca passa por chat

Usuário e senha de transportadora, chaves de API e a senha de acesso ao site
são digitados **direto no painel da Vercel** (Environment Variables). Em
conversa só entram **nomes de variável** e dados não secretos (CNPJ e CEP da
RARE WAY).

Variáveis usadas (nomes apenas):

| Grupo | Variáveis |
|---|---|
| Acesso ao site | `MOTOR_SENHA` |
| Banco | `POSTGRES_URL` (vem da integração Neon) |
| Jamef | `JAMEF_USERNAME`, `JAMEF_PASSWORD`, `JAMEF_AMBIENTE`, `JAMEF_CNPJ_REMETENTE`, `JAMEF_CEP_ORIGEM` |
| Braspress | `BRASPRESS_USERNAME`, `BRASPRESS_PASSWORD`, `BRASPRESS_CNPJ_REMETENTE`, `BRASPRESS_CEP_ORIGEM` |
| Rodonaves | `RODONAVES_USERNAME`, `RODONAVES_PASSWORD`, `RODONAVES_CNPJ_REMETENTE`, `RODONAVES_CEP_ORIGEM`, `RODONAVES_CONTATO_NOME`, `RODONAVES_CONTATO_TELEFONE` |

### 4. `lib/rodonaves-cadastrar-cliente.js` ESCREVE no sistema da Rodonaves

Não é consulta: cria um cadastro de cliente no TMS deles, com endereço que
vem da Receita Federal e **nem sempre é o endereço real de entrega**. Endereço
errado gravado lá pode virar entrega no lugar errado.

Por isso **nunca dispara sozinho**: a tela mostra cada campo, deixa corrigir,
e só chama depois da confirmação explícita do operador. Ligar isso num fluxo
automático é **decisão de negócio a ser retomada deliberadamente**, não
detalhe de implementação.

### 5. Regra de cobertura é hipótese com validade, não fato

Bloquear uma transportadora numa cidade a impede de ser consultada lá — e, sem
consulta, nenhum dado novo pode desmentir a regra. Ela se confirma sozinha
para sempre.

Por isso a tela mostra procedência e idade de cada regra, avisa depois de 90
dias, e a linha bloqueada da cotação tem **"Cotar mesmo assim"**, que consulta
aquela transportadora uma vez sem apagar a regra.

**A regra é por CIDADE, nunca por estado.** Mombaça e Iguatu são as duas no
Ceará, onde a Rodonaves certamente atende Fortaleza. Em Goiânia a Rodonaves
falhou num dia e ganhou no preço em outro. Regra por estado teria custado
dinheiro. Uma lista por estado só serve para **excluir** ("não atendo o Acre"),
nunca para incluir.

### 6. Não usar o módulo de cotação do Sankhya

Decisão firme do Juan. O motor é próprio. O Sankhya entra como fonte de
cliente e destino da escolha, não como motor.

---

## Estrutura

```
Zuma/
├── CLAUDE.md          ← este arquivo
├── README.md          ← visão geral para humanos
├── index.html         ← o sistema inteiro: HTML + CSS + um <script> (~3.200 linhas)
├── login.html         ← tela de login própria
├── middleware.js      ← exige o cookie de sessão em tudo (CONTA no teto de funções)
├── vercel.json        ← cabeçalhos de segurança (CSP, HSTS, X-Frame-Options)
├── api/               ← PORTAS de entrada (cada arquivo = 1 função serverless)
│   ├── cotar.js           despacha por `transportadora`
│   ├── rastrear.js        despacha por `transportadora`
│   ├── caixas.js          cadastro de caixas padrão
│   ├── cobertura.js       regras de cobertura por cidade
│   ├── consulta-cnpj.js   dados oficiais via CNPJá
│   ├── historico-cotacoes.js
│   ├── login.js  logout.js  me.js
├── lib/               ← LÓGICA (não conta no teto)
│   ├── cotacao-braspress.js  cotacao-jamef.js  cotacao-rodonaves.js
│   ├── rastreio-braspress.js  rastreio-jamef.js
│   └── rodonaves-cadastrar-cliente.js
├── scripts/
│   └── checar-funcoes.js  ← a trava do teto de 12
├── docs/              ← 23 documentos: decisões, especificações, medições
├── fonts/             ← Helvetica Now (arquivos da marca)
└── docs/capturas/     ← telas capturadas nos testes
```

`api/`, `lib/`, `index.html` e `middleware.js` **têm que ficar na raiz** — é
onde a Vercel procura. Isso não é desorganização, é o contrato da hospedagem.

## Banco

Postgres (Neon, plano gratuito, São Paulo), conectado ao projeto na aba
Storage da Vercel. Acesso via `@vercel/postgres`, variável `POSTGRES_URL`.

Tabelas: `caixas_padrao`, `historico_cotacoes`, `cobertura_excecoes`.

As migrações rodam **sozinhas na primeira chamada**, com
`CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` —
não há script manual para rodar.

**Sem banco conectado, nada quebra:** a lista de cobertura volta vazia e
ninguém é bloqueado; as caixas caem nas 6 padrão. Perder uma regra atrasa o
operador; bloquear por engano esconde uma transportadora. O fallback seguro é
sempre "consultar todo mundo".

---

## Como testar sem depender de deploy

O site fica atrás de senha, que nunca passa por aqui. Então o que dá para
verificar de fato, e sempre vale a pena:

1. **Sintaxe do `index.html`**: extrair o bloco `<script>` e rodar
   `node --check`. Pega erro de digitação antes de o Juan abrir a tela.
2. **Despacho e travas das funções**: substituir `global.fetch` por um espião
   e chamar `api/cotar.js` com cada transportadora. Cada handler reclama das
   próprias variáveis de ambiente — isso prova que o código certo rodou, sem
   chamada real. Conferir também 403 sem o cabeçalho `x-requested-with` e 405
   em GET.
3. **Navegador de verdade (Playwright)** com `fetch` simulado, servindo o
   `index.html` num servidor local. É o único jeito de pegar bug de CSS e de
   montagem de HTML — e já pegou três.
   O Chromium vem pré-instalado; use
   `chromium.launch({ executablePath: '/opt/pw-browsers/chromium-<versão>/chrome-linux/chrome' })`.
4. **A trava de funções nos dois sentidos**: criar arquivos falsos em `api/`,
   confirmar que barra, apagar, confirmar que passa.

**Olhe a captura de tela, não só as asserções de texto.** O bug das barras a
0px passou em todos os testes de texto.

### Depois do deploy

`scripts/conferir-no-ar.ps1` confere o que o site está **realmente servindo**:

```powershell
.\scripts\conferir-no-ar.ps1 -Procurar "btn-cotar-assim"
```

Passe um trecho que só existe na versão nova. Se ele não aparecer, o deploy
falhou mesmo com o commit no GitHub. É a outra metade da regra "push não é
deploy": a trava impede a causa conhecida, este script confere o resultado.

---

## Erros que já cometemos — não repita

**1. Afirmar "está no ar" baseado no push.** Seis horas de site velho.
Hoje: "enviei o commit X" e o Juan confirma.

**2. Escrever o lado de gravação sem o lado de leitura.** A escolha da
transportadora era gravada no banco e o Histórico nunca a lia — mostrava só a
mais barata. Ao criar campo novo, percorra o caminho inteiro: grava, lê,
mostra.

**3. `<span>` dentro de `<span>` com `width`.** Elemento inline ignora largura
e altura. As barras do resumo mediam 0px enquanto o HTML dizia `width:57%`.
Só apareceu olhando a imagem.

**4. Montar `class="..."` com interpolação no meio das aspas.** Uma variável
que fechava a aspa transformou `best` e `fade-in` em atributos soltos; a linha
mais barata perdeu o fundo dourado e o texto ao lado continuou dizendo "Mais
barato". **Monte a lista de classes num array.**

**5. Caçar fantasma.** Passei tempo investigando "Rodonaves retornou HTTP 200
na cotação" — mensagem que só existia numa versão antiga do arquivo. Hoje cada
mensagem agrupada mostra **a data da última ocorrência**, justamente para
distinguir problema vivo de código morto.

**6. Guardar formatado e comparar limpo.** A consulta de CNPJ guardava
`45.171.655/0001-60` e o painel comparava com `45171655000160`. Nunca batia,
então o cadastro abria vazio e o operador redigitava tudo. Passou nos testes
porque eu digitava o CNPJ sem máscara. **Normalize na hora de guardar.**

**7. Afirmar análise antes de medir.** Disse "é a Rodonaves, não a Jamef"
(as duas estavam quebradas), "é intermitente" (estava simplesmente quebrado) e
"a maioria das falhas é cobertura" (cobertura eram 14 de 45; a maior causa era
cadastro de destinatário). **Meça primeiro. Traga o número.**

---

## O que está em aberto

**Esperando teste do Juan**

- **Sonda da malha da Rodonaves** (tela Cobertura): comparar `31030370`
  (Belo Horizonte, atendida) com o CEP de Mombaça ou Iguatu. Se a resposta
  disser com clareza que nenhuma unidade atende, dá para saber antes de cotar
  e a regra guardada vira desnecessária para a Rodonaves.
- **A CNPJá devolve e-mail e telefone no plano gratuito?** Desconhecido — o
  bug do CNPJ apagava a resposta antes de aparecer na tela.
- **Aceitar as regras de cobertura medidas**: Mombaça/CE, Iguatu/CE,
  Catolé do Rocha/PB.

**Esperando a Rodonaves**

- Valores possíveis de `PayerSelected` (tomador do frete) — não estão
  documentados em lugar nenhum do portal.
- O destinatário **precisa** estar sempre pré-cadastrado para cotar, ou isso
  depende de configuração da conta?
- Lista de cidades/estados atendidos.

**Esperando Braspress e Jamef**

- Lista de cidades/estados atendidos. Sem API de malha, é o único caminho.

**Técnico**

- Rastreio da Rodonaves devolveu **401** no teste — token velho ou combinação
  de parâmetros inválida, não diagnosticado.
- Rastreio da Braspress **nunca foi testado com chamada real**; o mapeamento
  de campos segue só a documentação.
- A busca de cliente no **Sankhya ainda é simulada**. Quando virar real, ela
  **precisa devolver o endereço em partes** (rua, número, bairro) — senão o
  cadastro de destinatário da Rodonaves abre vazio.

---

## Convenções

- Commits e comentários em português. Mensagem de commit explica o **motivo** e
  o que foi verificado, não só o que mudou.
- Atribuição ao final do commit:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
- Toda função em `api/` exige o cabeçalho `x-requested-with: motor-rareway`
  (trava simples contra CSRF) e recusa método diferente de POST com 405.
- Erro de transportadora volta como `200` com `{ erro: true, mensagem }`, não
  como status HTTP de erro — assim uma transportadora com problema aparece na
  tela sem derrubar as outras.
- Timeout de 20 segundos por cotação (`TIMEOUT_COTACAO_MS`). Quem não responde
  sai daquela rodada; ninguém trava a tela.
- Texto que vem de fora (protocolo, mensagem de transportadora) passa por
  `escapeHtml` antes de ir para a tela.
