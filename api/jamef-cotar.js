// Serverless function: cotação de frete via Jamef (login + cotação num só request).
// Credenciais e dados fixos da RARE WAY ficam em variáveis de ambiente do
// projeto Vercel — nunca chegam ao navegador:
//   JAMEF_USERNAME          e-mail de login no portal de desenvolvedores da Jamef
//   JAMEF_PASSWORD          senha do portal
//   JAMEF_AMBIENTE          "homologacao" (padrão) ou "producao"
//   JAMEF_CNPJ_REMETENTE    CNPJ da RARE WAY usado como remetente/pagante padrão
//   JAMEF_CEP_ORIGEM        CEP de onde a mercadoria sai
//   JAMEF_FILIAL_ORIGEM     código da filial de origem (opcional, padrão "01")

// Cache do token em memória do processo — a Jamef só permite pedir 1 token
// novo por minuto por IP, então reaproveitamos até perto da expiração (1h).
let tokenCache = { token: null, expiresAt: 0 };

function baseUrl() {
  return process.env.JAMEF_AMBIENTE === 'producao'
    ? 'https://api.jamef.com.br'
    : 'https://api-qa.jamef.com.br';
}

function soNumeros(v) {
  return String(v || '').replace(/\D/g, '');
}

function proximaDataColeta() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const dia = d.getDay(); // 0 = domingo, 6 = sábado — pula pro próximo dia útil
  if (dia === 0) d.setDate(d.getDate() + 1);
  if (dia === 6) d.setDate(d.getDate() + 2);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function metragemCubica(volumes) {
  return volumes.reduce((soma, v) => {
    const m3 = (v.comprimento / 100) * (v.largura / 100) * (v.altura / 100);
    return soma + m3 * (v.qtd || 1);
  }, 0);
}

function quantidadeVolumes(volumes) {
  return volumes.reduce((soma, v) => soma + (v.qtd || 1), 0);
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

  // Trava simples contra CSRF: só aceita chamadas que mandem esse header
  // customizado. Um <form> ou <img> disparado por outro site não consegue
  // adicionar headers customizados, e uma chamada fetch() de outra origem
  // cairia num preflight CORS que esta função não libera — então só o
  // próprio front-end (mesma origem) consegue completar a chamada.
  if (req.headers['x-requested-with'] !== 'motor-rareway') {
    res.status(403).json({ erro: true, mensagem: 'Requisição não autorizada.' });
    return;
  }

  try {
    const { cnpjDest, cepDest, valorMerc, pesoTotal, tipoFrete, volumes } = req.body || {};

    const cnpjRemetente = process.env.JAMEF_CNPJ_REMETENTE;
    const cepOrigem = process.env.JAMEF_CEP_ORIGEM;
    const filialOrigem = process.env.JAMEF_FILIAL_ORIGEM || '01';

    if (!cnpjRemetente || !cepOrigem) {
      res.status(200).json({
        erro: true,
        mensagem: 'Backend sem configuração: faltam JAMEF_CNPJ_REMETENTE / JAMEF_CEP_ORIGEM nas variáveis de ambiente do Vercel.',
      });
      return;
    }

    const documentoDevedor = tipoFrete === 'FOB' ? soNumeros(cnpjDest) : soNumeros(cnpjRemetente);
    const dataColeta = proximaDataColeta();

    const token = await getToken();
    const resp = await fetch(`${baseUrl()}/calculo-frete/v1/cotacao`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        tipoTransporte: '1',
        documentoDevedor,
        cepOrigem: soNumeros(cepOrigem),
        cepDestino: soNumeros(cepDest),
        quantidadeVolume: quantidadeVolumes(volumes || []),
        pesoMercadoria: pesoTotal,
        valorNotaFiscal: valorMerc,
        metragemCubica: +metragemCubica(volumes || []).toFixed(3),
        documentoRemetente: soNumeros(cnpjRemetente),
        documentoDestino: soNumeros(cnpjDest),
        filialOrigem,
        dataColeta,
      }),
    });

    const json = await resp.json();
    if (!resp.ok || json.situacao !== 200 || !json.dado?.[0]) {
      res.status(200).json({ erro: true, mensagem: json?.mensagem || `Jamef retornou HTTP ${resp.status}` });
      return;
    }

    const d = json.dado[0];
    let prazoDias = '—';
    if (d.previsaoEntrega) {
      const [dd, mm, yyyy] = d.previsaoEntrega.split('/').map(Number);
      const entrega = new Date(yyyy, mm - 1, dd);
      const [cd, cm, cy] = dataColeta.split('/').map(Number);
      const coleta = new Date(cy, cm - 1, cd);
      prazoDias = Math.max(1, Math.round((entrega - coleta) / 86400000));
    }

    // Observado em produção (01/09/2026): a resposta real NÃO trouxe
    // `numeroCotacao` (diferente do exemplo testado em homologação) — nesse
    // caso usamos o `idCorrelacao` (sempre presente) como protocolo de
    // referência, já que é o identificador que a própria Jamef pede pra
    // abrir chamado de suporte sobre uma chamada específica.
    res.status(200).json({
      valor: d.total,
      prazoDias,
      protocolo: d.numeroCotacao || json.idCorrelacao || null,
      numeroCotacao: d.numeroCotacao || null,
      idCorrelacao: json.idCorrelacao || null,
    });
  } catch (err) {
    res.status(200).json({ erro: true, mensagem: err.message || 'Erro ao consultar a Jamef' });
  }
};
