// Função serverless: cotação, para qualquer transportadora.
//
// Mesmo desenho de api/rastrear.js, e pelo mesmo motivo: o plano Hobby da
// Vercel aceita no máximo 12 funções serverless por deploy, contando o
// middleware. Uma função por transportadora fazia cada transportadora nova
// custar uma vaga — e em 23/09/2026 a vaga acabou: quatro deploys seguidos
// falharam em 5 segundos enquanto o site servia a versão antiga.
//
// Com esta porta única, transportadora nova custa ZERO vaga: é um arquivo em
// lib/ e uma linha no mapa abaixo. Não é gambiarra para caber no limite — as
// três cotações já recebiam os mesmos dados e devolviam o mesmo formato
// ({ valor, prazoDias, protocolo }), então sempre foram a mesma porta com um
// parâmetro diferente.
//
// Os handlers continuam funções (req, res) completas, iguais a quando moravam
// em api/ — só deixaram de ser endpoints próprios.

const cotarBraspress = require('../lib/cotacao-braspress');
const cotarJamef = require('../lib/cotacao-jamef');
const cotarRodonaves = require('../lib/cotacao-rodonaves');

const POR_TRANSPORTADORA = {
  braspress: cotarBraspress,
  jamef: cotarJamef,
  rodonaves: cotarRodonaves,
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
      mensagem: `Transportadora "${nome || '(não informada)'}" não tem cotação integrada. Disponíveis: ${Object.keys(POR_TRANSPORTADORA).join(', ')}.`,
    });
    return;
  }

  return handler(req, res);
};
