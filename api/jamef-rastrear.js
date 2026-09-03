// Serverless function: rastreio de encomendas via Jamef (consulta ao vivo,
// sem guardar nada). Reaproveita as mesmas credenciais e o mesmo mecanismo de
// login/token da cotação (ver jamef-cotar.js) — cada função serverless tem
// seu próprio cache de token em memória, então esta função renova o token de
// forma independente da de cotação.
//   JAMEF_USERNAME / JAMEF_PASSWORD / JAMEF_AMBIENTE — mesmas variáveis da cotação
//   JAMEF_CNPJ_REMETENTE — usado aqui como documentoRemetente na busca
//     (a RARE WAY é sempre quem emitiu a nota/CT-e, então isso já basta pra
//     satisfazer a exigência da Jamef de informar "ao menos um documento")

let tokenCache = { token: null, expiresAt: 0 };

function baseUrl() {
  return process.env.JAMEF_AMBIENTE === 'producao'
    ? 'https://api.jamef.com.br'
    : 'https://api-qa.jamef.com.br';
}

function soNumeros(v) {
  return String(v || '').replace(/\D/g, '');
}

async function getToken() {
  const agora = Date.now();
  if (tokenCache.token && agora < tokenCache.expiresAt) {
    return tokenCache.token;
  }
  const resp = await fetch(`${baseUrl()}/auth/v1/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.JAMEF_USERNAME,
      password: process.env.JAMEF_PASSWORD,
    }),
  });
  const json = await resp.json();
  if (!resp.ok || !json?.dado?.[0]?.accessToken) {
    throw new Error(json?.mensagem || `Falha no login da Jamef (HTTP ${resp.status})`);
  }
  tokenCache = {
    token: json.dado[0].accessToken,
    expiresAt: agora + 55 * 60 * 1000, // token vale 1h; renova com folga
  };
  return tokenCache.token;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: true, mensagem: 'Método não permitido' });
    return;
  }

  // Trava simples contra CSRF — ver comentário equivalente em jamef-cotar.js.
  if (req.headers['x-requested-with'] !== 'motor-rareway') {
    res.status(403).json({ erro: true, mensagem: 'Requisição não autorizada.' });
    return;
  }

  try {
    const { tipoBusca, numero, serie } = req.body || {};
    const cnpjRemetente = process.env.JAMEF_CNPJ_REMETENTE;

    if (!cnpjRemetente) {
      res.status(200).json({
        erro: true,
        mensagem: 'Backend sem configuração: falta JAMEF_CNPJ_REMETENTE nas variáveis de ambiente do Vercel.',
      });
      return;
    }
    if (!numero) {
      res.status(200).json({ erro: true, mensagem: 'Informe um número para buscar.' });
      return;
    }

    const params = new URLSearchParams();
    params.set('documentoRemetente', soNumeros(cnpjRemetente));
    if (tipoBusca === 'notaFiscal') {
      params.set('numeroNotaFiscal', String(numero).trim());
      if (serie) params.set('serieNotaFiscal', String(serie).trim());
    } else {
      params.set('numeroConhecimento', String(numero).trim());
      if (serie) params.set('serieConhecimento', String(serie).trim());
    }

    const token = await getToken();
    const resp = await fetch(`${baseUrl()}/consulta/v1/rastreamento?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await resp.json();

    if (resp.status === 429) {
      res.status(200).json({ erro: true, mensagem: 'Limite de consultas da Jamef atingido (1 a cada 2 segundos) — aguarde um instante e tente de novo.' });
      return;
    }
    if (resp.status === 404 || json?.situacao === 404) {
      res.status(200).json({ registros: [] });
      return;
    }
    if (!resp.ok || (json?.situacao && json.situacao !== 200)) {
      res.status(200).json({ erro: true, mensagem: json?.mensagem || `Jamef retornou HTTP ${resp.status}` });
      return;
    }

    // Formato documentado: dado[].rastreamento[] — ver especificacao-api-jamef.md, seção 3.
    const registros = (json.dado || []).flatMap((d) => d.rastreamento || []).map((r) => ({
      conhecimento: r.conhecimento?.numero || null,
      notaFiscal: r.notaFiscal?.numero || null,
      remetente: r.remetente?.nome || null,
      destinatario: r.destinatario?.nome || null,
      // A Jamef devolve os eventos do mais recente pro mais antigo (confirmado
      // no teste real de 28/08/2026) — o primeiro item já é o status atual.
      statusAtual: r.eventosRastreio?.[0]?.status || null,
      previsaoEntrega: r.frete?.previsaoEntrega || null,
      comprovanteUrl: r.frete?.urlComprovanteEntrega || null,
      eventos: (r.eventosRastreio || []).map((e) => ({
        data: e.data ? new Date(e.data).toLocaleString('pt-BR') : null,
        status: e.status || null,
        local: [e.localOrigem?.cidade, e.localOrigem?.uf].filter(Boolean).join(' - ') || null,
      })),
    }));

    res.status(200).json({ registros });
  } catch (err) {
    res.status(200).json({ erro: true, mensagem: err.message || 'Erro ao consultar o rastreio da Jamef' });
  }
};
