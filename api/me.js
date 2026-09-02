// Serverless function: diz ao front-end se o navegador já tem uma sessão
// válida (e de quem), ou se o login nem foi configurado ainda no Vercel.
// O middleware.js já barra esta rota com 401 se não houver sessão válida
// (quando o login está configurado) — aqui só extraímos o nome do usuário
// pra devolver pro front-end mostrar na barra lateral.

const { createHmac, timingSafeEqual } = require('crypto');

function comparacaoSegura(a, b) {
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

function assinar(valor, segredo) {
  return createHmac('sha256', segredo).update(valor).digest('base64url');
}

function usuarioDaSessao(cookieHeader, segredo) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)rw_session=([^;]+)/);
  if (!match) return null;
  const token = decodeURIComponent(match[1]);
  const i = token.lastIndexOf('.');
  if (i < 0) return null;
  const payload = token.slice(0, i);
  const assinatura = token.slice(i + 1);
  if (!comparacaoSegura(assinatura, assinar(payload, segredo))) return null;
  try {
    const dados = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (!dados.usuario || !dados.exp || Date.now() > dados.exp) return null;
    return dados.usuario;
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  const segredo = process.env.SESSION_SECRET;
  const usuariosConfigurados = process.env.APP_USERS;

  if (!segredo || !usuariosConfigurados) {
    res.status(200).json({ ok: true, loginConfigurado: false });
    return;
  }

  const usuario = usuarioDaSessao(req.headers.cookie, segredo);
  if (!usuario) {
    res.status(401).json({ erro: true, mensagem: 'Não autenticado.' });
    return;
  }
  res.status(200).json({ ok: true, loginConfigurado: true, usuario });
};
