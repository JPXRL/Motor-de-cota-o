// Diz ao front-end quem esta usando o motor: o nome digitado no login, que
// viaja dentro do cookie de sessao assinado. A barra lateral mostra esse nome
// e cada cotacao gravada no historico leva ele.
//
// Ate 29/09/2026 este arquivo lia o login antigo por conta (APP_USERS,
// SESSION_SECRET, cookie rw_session), removido em 01/09. Como essas variaveis
// nao existiam mais, ele nunca achava ninguem, e a coluna "usuario" do
// historico ficou vazia por quase um mes sem ninguem notar.
//
// O middleware.js ja barra esta rota com 401 se nao houver sessao valida.

const { lerSessao } = require('../lib/sessao');

module.exports = async (req, res) => {
  const senhaConfigurada = process.env.MOTOR_SENHA;
  if (!senhaConfigurada) {
    res.status(200).json({ ok: true, loginConfigurado: false, usuario: null });
    return;
  }

  const sessao = lerSessao(req.headers.cookie, senhaConfigurada);
  if (!sessao) {
    res.status(401).json({ erro: true, mensagem: 'Nao autenticado.' });
    return;
  }

  // usuario vem null numa sessao aberta antes do campo de nome existir. Ela
  // continua valendo ate expirar (12 horas); o proximo login ja traz o nome.
  res.status(200).json({ ok: true, loginConfigurado: true, usuario: sessao.usuario });
};
