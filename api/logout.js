// Encerra a sessao limpando o cookie assinado usado pelo login de senha unica.

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: true, mensagem: 'Metodo nao permitido.' });
    return;
  }

  if (req.headers['x-requested-with'] !== 'motor-rareway') {
    res.status(403).json({ erro: true, mensagem: 'Requisicao nao autorizada.' });
    return;
  }

  res.setHeader('Set-Cookie', 'motor_sessao=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  res.status(200).json({ ok: true });
};
