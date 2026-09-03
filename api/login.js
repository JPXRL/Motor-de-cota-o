// Verifica a senha de acesso unica e, se correta, gera um cookie de sessao
// assinado (HMAC-SHA256, derivado da propria MOTOR_SENHA). Substitui o antigo
// sistema multiusuario (APP_USERS/SESSION_SECRET), que foi removido.

const { createHmac, timingSafeEqual } = require('crypto');

const DURACAO_SESSAO_MS = 12 * 60 * 60 * 1000; // 12 horas

function comparacaoSegura(a, b) {
  const bufA = Buffer.from(String(a), 'utf-8');
  const bufB = Buffer.from(String(b), 'utf-8');
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

function assinar(valor, segredo) {
  return createHmac('sha256', segredo).update(valor).digest('base64url');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: true, mensagem: 'Metodo nao permitido.' });
    return;
  }

  if (req.headers['x-requested-with'] !== 'motor-rareway') {
    res.status(403).json({ erro: true, mensagem: 'Requisicao nao autorizada.' });
    return;
  }

  const senhaConfigurada = process.env.MOTOR_SENHA;
  if (!senhaConfigurada) {
    res.status(200).json({ erro: true, mensagem: 'Controle de acesso ainda nao esta ativo neste site.' });
    return;
  }

  const { senha } = req.body || {};
  if (!comparacaoSegura(senha || '', senhaConfigurada)) {
    res.status(401).json({ erro: true, mensagem: 'Senha incorreta.' });
    return;
  }

  const exp = Date.now() + DURACAO_SESSAO_MS;
  const payload = Buffer.from(JSON.stringify({ exp }), 'utf-8').toString('base64url');
  const token = `${payload}.${assinar(payload, senhaConfigurada)}`;

  res.setHeader(
    'Set-Cookie',
    `motor_sessao=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(DURACAO_SESSAO_MS / 1000)}`
  );
  res.status(200).json({ ok: true });
};
