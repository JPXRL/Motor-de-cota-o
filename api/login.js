// Verifica a senha de acesso unica e, se correta, gera um cookie de sessao
// assinado (HMAC-SHA256, derivado da propria MOTOR_SENHA). Substitui o antigo
// sistema multiusuario (APP_USERS/SESSION_SECRET), que foi removido.
//
// Desde 29/09/2026 o login tambem pede o nome de quem esta entrando. A senha
// continua sendo uma so para a equipe; o nome serve para o historico dizer
// quem fez cada cotacao. A criacao do cookie mora em lib/sessao.js, junto com
// a leitura, para os dois lados nunca mais se desencontrarem.

const { criarCookie, normalizarNome, comparacaoSegura } = require('../lib/sessao');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: true, mensagem: 'Método não permitido.' });
    return;
  }

  if (req.headers['x-requested-with'] !== 'motor-rareway') {
    res.status(403).json({ erro: true, mensagem: 'Requisição não autorizada.' });
    return;
  }

  const senhaConfigurada = process.env.MOTOR_SENHA;
  if (!senhaConfigurada) {
    res.status(200).json({ erro: true, mensagem: 'Controle de acesso ainda não está ativo neste site.' });
    return;
  }

  const { senha, nome } = req.body || {};

  // O nome e conferido antes da senha para a mensagem de erro ser util: quem
  // esqueceu o nome nao precisa ouvir "senha incorreta".
  const usuario = normalizarNome(nome);
  if (!usuario) {
    res.status(400).json({ erro: true, mensagem: 'Digite o seu nome.' });
    return;
  }

  if (!comparacaoSegura(senha || '', senhaConfigurada)) {
    res.status(401).json({ erro: true, mensagem: 'Senha incorreta.' });
    return;
  }

  res.setHeader('Set-Cookie', criarCookie(usuario, senhaConfigurada));
  res.status(200).json({ ok: true });
};
