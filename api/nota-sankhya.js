// Função serverless: grava na nota do Sankhya a cotação escolhida no motor.
//
// Porta fina, como as outras: método, trava contra CSRF e despacho. A regra
// (o que conferir, o que recusar, o que gravar) mora em lib/nota-sankhya.js.
//
// Custa 1 vaga no teto de 12 funções do plano Hobby (passa a 10 em api/ +
// middleware = 11). Não entrou na porta do histórico porque esta escreve
// num sistema de fora com credencial própria — misturar as duas faria um
// erro do Sankhya parecer erro do histórico, e vice-versa.
//
// Duas ações, sempre nesta ordem: "conferir" (só lê) e "gravar" (escreve,
// depois da confirmação do operador).

const { credenciaisConfiguradas } = require('../lib/sankhya');
const { conferir, gravar } = require('../lib/nota-sankhya');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: true, mensagem: 'Método não permitido' });
    return;
  }
  if (req.headers['x-requested-with'] !== 'motor-rareway') {
    res.status(403).json({ erro: true, mensagem: 'Requisição não autorizada.' });
    return;
  }
  if (!process.env.POSTGRES_URL) {
    res.status(200).json({ erro: true, mensagem: 'O histórico do motor não está conectado, então não há cotação guardada para gravar.' });
    return;
  }
  if (!credenciaisConfiguradas()) {
    res.status(200).json({ erro: true, mensagem: 'Acesso ao Sankhya não configurado: faltam SANKHYA_CLIENT_ID, SANKHYA_CLIENT_SECRET ou SANKHYA_XTOKEN na Vercel.' });
    return;
  }

  const corpo = req.body || {};
  try {
    if (corpo.acao === 'conferir') {
      res.status(200).json(await conferir(corpo));
    } else if (corpo.acao === 'gravar') {
      res.status(200).json(await gravar(corpo));
    } else {
      res.status(400).json({ erro: true, mensagem: 'Ação desconhecida. Use "conferir" ou "gravar".' });
    }
  } catch (err) {
    // Como nas cotações: erro do Sankhya volta como 200 com { erro: true },
    // para aparecer na tela sem derrubar o resto.
    res.status(200).json({ erro: true, mensagem: `Sankhya: ${err.message}` });
  }
};
