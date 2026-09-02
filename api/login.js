// Serverless function: login por usuário/senha (uma conta por pessoa),
// criando um cookie de sessão assinado. Ver o comentário completo em
// middleware.js sobre como a sessão funciona e as variáveis de ambiente
// necessárias (APP_USERS, SESSION_SECRET).

const { createHmac, timingSafeEqual } = require('crypto');

const DURACAO_SESSAO_MS = 12 * 60 * 60 * 1000; // 12 horas — depois disso pede login de novo

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

// Formato recomendado do APP_USERS, pra evitar erro de digitação/colagem
// numa caixinha de texto do Vercel: "usuario:senha,usuario:senha,...".
// Também aceita o formato antigo em JSON ([{"usuario":"...","senha":"..."}])
// caso já esteja configurado assim.
function interpretarUsuarios(texto) {
  const t = String(texto).trim();
  if (t.startsWith('[')) {
    try {
      const lista = JSON.parse(t);
      if (Array.isArray(lista)) {
        const validos = lista.filter((u) => u && u.usuario && u.senha);
        if (validos.length) return validos;
      }
    } catch {
      // não era um JSON válido — cai pro formato simples abaixo
    }
  }
  return t.split(',').map((par) => par.trim()).filter(Boolean).map((par) => {
    const i = par.indexOf(':');
    if (i < 0) return null;
    return { usuario: par.slice(0, i).trim(), senha: par.slice(i + 1).trim() };
  }).filter(Boolean);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: true, mensagem: 'Método não permitido' });
    return;
  }
  if (req.headers['x-requested-with'] !== 'motor-rareway') {
    res.status(403).json({ erro: true, mensagem: 'Requisição não autorizada.' });
    return;
  }

  const segredo = process.env.SESSION_SECRET;
  const listaUsuarios = process.env.APP_USERS;

  if (!segredo || !listaUsuarios) {
    res.status(200).json({ erro: true, mensagem: 'Login ainda não configurado no backend (faltam as variáveis APP_USERS / SESSION_SECRET no Vercel).' });
    return;
  }

  const usuarios = interpretarUsuarios(listaUsuarios);
  if (!usuarios.length) {
    res.status(200).json({ erro: true, mensagem: 'A variável APP_USERS não tem nenhuma conta válida. Use o formato usuario:senha, separando várias contas por vírgula — ex.: admin:123789456,maria:outrasenha' });
    return;
  }

  const { usuario, senha } = req.body || {};
  const encontrado = usuarios.find((u) => u && u.usuario === usuario);
  const senhaCorreta = encontrado ? comparacaoSegura(senha || '', encontrado.senha || '') : false;

  if (!encontrado || !senhaCorreta) {
    res.status(401).json({ erro: true, mensagem: 'Usuário ou senha inválidos.' });
    return;
  }

  const exp = Date.now() + DURACAO_SESSAO_MS;
  const payload = Buffer.from(JSON.stringify({ usuario: encontrado.usuario, exp }), 'utf-8').toString('base64url');
  const token = `${payload}.${assinar(payload, segredo)}`;

  res.setHeader('Set-Cookie', `rw_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(DURACAO_SESSAO_MS / 1000)}`);
  res.status(200).json({ ok: true, usuario: encontrado.usuario });
};
