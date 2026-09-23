// Serverless function: rastreio, para qualquer transportadora.
//
// Por que um só arquivo em vez de um por transportadora: o plano Hobby da
// Vercel aceita no máximo 12 funções serverless por deploy, e o middleware
// entra nessa conta. Em 23/09/2026 o projeto passou de 11 para 12 arquivos em
// api/ e TODOS os deploys seguintes falharam em 5 segundos — o site ficou
// servindo uma versão antiga enquanto os commits continuavam subindo.
//
// A regra que ficou: a pasta api/ é o orçamento de funções, não o mapa do
// código. Lógica de verdade mora em lib/, que a Vercel empacota junto sem
// contar como função; api/ fica só com as portas de entrada. Rastreio de
// Braspress e Jamef pedem os mesmos dados e devolvem o mesmo formato, então
// virar uma porta com um parâmetro é o agrupamento natural — não uma gambiarra
// para caber no limite.

const rastrearBraspress = require('../lib/rastreio-braspress');
const rastrearJamef = require('../lib/rastreio-jamef');

const POR_TRANSPORTADORA = {
  braspress: rastrearBraspress,
  jamef: rastrearJamef,
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: true, mensagem: 'Método não permitido' });
    return;
  }

  // Mesma trava simples contra CSRF usada nas outras funções. Fica aqui
  // também, e não só nos handlers, para a porta nunca ficar mais aberta que
  // o que ela protege.
  if (req.headers['x-requested-with'] !== 'motor-rareway') {
    res.status(403).json({ erro: true, mensagem: 'Requisição não autorizada.' });
    return;
  }

  const nome = String((req.body || {}).transportadora || '').toLowerCase();
  const handler = POR_TRANSPORTADORA[nome];
  if (!handler) {
    res.status(200).json({
      erro: true,
      mensagem: `Transportadora "${nome || '(não informada)'}" não tem rastreio integrado. Disponíveis: ${Object.keys(POR_TRANSPORTADORA).join(', ')}.`,
    });
    return;
  }

  // Os handlers já eram funções (req, res) completas quando moravam em api/ —
  // continuam iguais, só deixaram de ser endpoints próprios.
  return handler(req, res);
};
