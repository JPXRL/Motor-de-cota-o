#!/usr/bin/env node
// Conta as funções serverless do projeto e recusa o push se passar do teto.
//
// Por que isto existe: em 23/09/2026 o projeto passou de 11 para 12 arquivos
// em api/. O git push funcionou, o commit apareceu no GitHub, e o deploy
// falhou em 5 segundos — quatro vezes seguidas, durante seis horas, enquanto
// o site continuava servindo a versão antiga. Nada no terminal avisou: push
// e deploy são coisas diferentes, e só a aba Deployments da Vercel sabia.
//
// O plano Hobby da Vercel aceita no máximo 12 funções serverless por deploy,
// e o middleware.js conta. Medido, não suposto: 11 em api/ + middleware = 12
// deu Ready; 12 + middleware = 13 deu Error.
//
// Arquivos fora de api/ (a pasta lib/) NÃO contam — a Vercel os empacota por
// rastreamento de dependência, junto com a função que os importa. Por isso a
// regra do projeto: api/ é o orçamento de funções, lib/ é onde mora o código.

const fs = require('fs');
const path = require('path');

const TETO = 12;          // limite duro do plano Hobby
const RAIZ = path.resolve(__dirname, '..');

function listarFuncoes(dir, prefixo = 'api') {
  let achados = [];
  let entradas;
  try {
    entradas = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return achados;
  }
  for (const e of entradas) {
    const rel = `${prefixo}/${e.name}`;
    if (e.isDirectory()) {
      achados = achados.concat(listarFuncoes(path.join(dir, e.name), rel));
    } else if (/\.(js|mjs|cjs|ts)$/.test(e.name)) {
      achados.push(rel);
    }
  }
  return achados;
}

const funcoes = listarFuncoes(path.join(RAIZ, 'api'));
if (fs.existsSync(path.join(RAIZ, 'middleware.js'))) funcoes.push('middleware.js');

const total = funcoes.length;

if (total > TETO) {
  console.error('');
  console.error(`  PUSH BARRADO: ${total} funções serverless, e o plano Hobby aceita ${TETO}.`);
  console.error('');
  funcoes.forEach((f) => console.error(`    - ${f}`));
  console.error('');
  console.error('  Se isto subisse, o deploy falharia em segundos e o site continuaria');
  console.error('  servindo a versão antiga — sem nenhum erro no terminal.');
  console.error('');
  console.error('  Saída: mova a lógica para lib/ e deixe em api/ só a porta de entrada,');
  console.error('  ou junte endpoints parecidos num só com despacho por parâmetro');
  console.error('  (é o que api/cotar.js e api/rastrear.js fazem).');
  console.error('');
  process.exit(1);
}

const sobra = TETO - total;
console.log(`  ${total}/${TETO} funções serverless (${sobra} ${sobra === 1 ? 'vaga livre' : 'vagas livres'}).`);
if (sobra <= 1) {
  console.log('  Atenção: a próxima função nova estoura o limite do plano Hobby.');
}
