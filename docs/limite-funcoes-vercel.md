# Limite de funções serverless da Vercel — o incidente e a regra que ficou

## O que aconteceu (23/09/2026)

O projeto `motor-cotacao-frete` passou de 11 para 12 arquivos em `api/` (a nova função `api/cobertura.js`). A partir dali:

- `git push` funcionou normalmente, sem erro nenhum no terminal.
- Os commits apareceram no GitHub.
- **Quatro deploys seguidos falharam na Vercel, cada um em 5 ou 6 segundos**, e o site continuou servindo a versão de antes por cerca de seis horas.

O Juan só percebeu porque o site não mudava: *"Eu fechei a aba e entrei no site pelo vercel e não mudou nada"*. A aba Deployments confirmou: `2ae89db` Ready, e depois `7070a05`, `b42f646`, `f8c7426` e `6ab82ae` todos em Error.

**Causa:** o plano Hobby da Vercel aceita no máximo **12 funções serverless por deploy**, e o `middleware.js` conta nessa soma. Medido, não suposto: 11 em `api/` + middleware = 12 → Ready; 12 + middleware = 13 → Error.

**Lição de processo, além da técnica:** *push não é deploy*. Um `git push` bem-sucedido não diz absolutamente nada sobre o deploy ter dado certo. Eu afirmei "está no ar" seis vezes baseado só no push. Regra combinada desde então: eu digo **"enviei o commit X"**, e só o Juan, olhando a aba Deployments, confirma que está no ar.

## A regra de estrutura

**`api/` é o orçamento de funções. `lib/` é onde mora o código.**

Arquivos fora de `api/` não contam no limite — a Vercel os empacota por rastreamento de dependência, junto com a função que os importa. Então:

- `api/` fica só com as **portas de entrada** (checagem de método, trava de CSRF, despacho).
- `lib/` recebe a lógica de verdade.
- Endpoints que recebem os mesmos dados e devolvem o mesmo formato viram **uma porta com um parâmetro**, não uma função cada.

Isso não é gambiarra para caber no limite: rastreio de Braspress e Jamef, e cotação das três transportadoras, sempre foram a mesma porta com um parâmetro diferente. O limite só obrigou a enxergar isso.

## Estrutura atual (24/09/2026, commit `ac26a3c` — **Ready confirmado na aba Deployments**)

9 funções em `api/` + `middleware.js` = **10 de 12**, com 2 vagas livres.

| `api/` (porta de entrada) | `lib/` (lógica) |
|---|---|
| `cotar.js` — despacha por `transportadora` | `cotacao-braspress.js`, `cotacao-jamef.js`, `cotacao-rodonaves.js`, `rodonaves-cadastrar-cliente.js` |
| `rastrear.js` — despacha por `transportadora` | `rastreio-braspress.js`, `rastreio-jamef.js` |
| `caixas.js`, `cobertura.js`, `consulta-cnpj.js`, `historico-cotacoes.js`, `login.js`, `logout.js`, `me.js` | — |

**Transportadora nova passa a custar zero vaga:** é um arquivo em `lib/` e uma linha no mapa de `api/cotar.js`.

No frontend, `cotarViaBackend(transportadora, dados, modal)` posta para `/api/cotar` com o nome da transportadora no corpo. O cadastro de destinatário da Rodonaves entra pela mesma porta, com `acao: 'cadastrar-cliente'`.

## As duas travas

**1. Antes do push (na máquina do Juan).** `scripts/checar-funcoes.js` conta `api/**/*.js` mais o `middleware.js` e sai com erro acima de 12. Está instalado como hook `pre-push` (`.git/hooks/pre-push`), então um push que estouraria o limite é barrado antes de sair da máquina, com a explicação e a saída sugerida.

Testado nos dois sentidos: 13 funções barram com exit 1, 10 passam. Para pular numa emergência: `git push --no-verify`.

**Atenção:** `.git/hooks/` não é versionado. O script está no repositório, mas o hook precisa ser reinstalado à mão em qualquer outra máquina (copiar `node scripts/checar-funcoes.js || exit 1` para `.git/hooks/pre-push`).

**2. Depois do push (do lado da Vercel).** Notificação de falha de deploy **ligada pelo Juan em 24/09/2026** (Settings → Notifications). A trava 1 pega só a causa já conhecida; esta pega as falhas de deploy que ninguém previu — que era exatamente o buraco de seis horas do incidente.

## Caminho livre, se um dia as 2 vagas acabarem

Juntar `login.js` + `logout.js` + `me.js` num `auth.js` levaria de 9 para 7 em `api/`. Não foi feito de propósito: quebrar a autenticação tranca todo mundo para fora, então merece ser um commit separado e testado sozinho. O plano Pro da Vercel (~US$ 20/mês, 100 funções) não é recomendado enquanto a reestruturação gratuita resolve.
