// Serverless function: cotação de frete via Braspress.
// Credenciais e dados fixos da RARE WAY ficam em variáveis de ambiente do
// projeto Vercel — nunca chegam ao navegador:
//   BRASPRESS_USERNAME          usuário de API liberado pela filial da Braspress
//   BRASPRESS_PASSWORD          senha de API
//   BRASPRESS_CNPJ_REMETENTE    CNPJ da RARE WAY cadastrado como cliente na Braspress
//   BRASPRESS_CEP_ORIGEM        CEP de onde a mercadoria sai
//
// Atenção: a Braspress não tem ambiente de testes — toda chamada aqui é real.

function soNumeros(v) {
  return String(v || '').replace(/\D/g, '');
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
    const { cnpjDest, cepDest, valorMerc, pesoTotal, tipoFrete, volumes, modal } = req.body || {};

    const cnpjRemetente = process.env.BRASPRESS_CNPJ_REMETENTE;
    const cepOrigem = process.env.BRASPRESS_CEP_ORIGEM;
    const usuario = process.env.BRASPRESS_USERNAME;
    const senha = process.env.BRASPRESS_PASSWORD;

    if (!cnpjRemetente || !cepOrigem || !usuario || !senha) {
      res.status(200).json({
        erro: true,
        mensagem: 'Backend sem configuração: faltam variáveis BRASPRESS_* no Vercel.',
      });
      return;
    }

    const auth = Buffer.from(`${usuario}:${senha}`).toString('base64');

    const listaVolumes = volumes || [];
    const cubagem = listaVolumes.map((v) => ({
      altura: (v.altura || 0) / 100,
      largura: (v.largura || 0) / 100,
      comprimento: (v.comprimento || 0) / 100,
      volumes: v.qtd || 1,
    }));
    const totalVolumes = listaVolumes.reduce((s, v) => s + (v.qtd || 1), 0);

    const body = {
      cnpjRemetente: Number(soNumeros(cnpjRemetente)),
      cnpjDestinatario: Number(soNumeros(cnpjDest)),
      modal: modal === 'aereo' ? 'A' : 'R',
      tipoFrete: tipoFrete === 'FOB' ? '2' : '1',
      cepOrigem: Number(soNumeros(cepOrigem)),
      cepDestino: Number(soNumeros(cepDest)),
      vlrMercadoria: valorMerc,
      peso: pesoTotal,
      volumes: totalVolumes,
      cubagem,
    };

    const resp = await fetch('https://api.braspress.com/v1/cotacao/calcular/json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(body),
    });

    const json = await resp.json();
    if (!resp.ok || json?.statusCode || json?.erro) {
      // Loga a resposta completa da Braspress nos logs do Vercel (não aparece
      // pro usuário) — a doc oficial da Braspress não mostra um exemplo de
      // erro preenchido, então isso ajuda a entender o formato real na
      // primeira vez que acontecer (ver especificacao-api-braspress.md).
      console.error('[braspress-cotar] resposta de erro da Braspress:', JSON.stringify({ status: resp.status, corpoEnviado: body, respostaBraspress: json }));

      const detalhes = Array.isArray(json?.errorList) && json.errorList.length
        ? ' — ' + json.errorList.map((e) => e?.message || e?.detalhes || JSON.stringify(e)).join('; ')
        : '';
      res.status(200).json({
        erro: true,
        mensagem: (json?.message || json?.mensagem || `Braspress retornou HTTP ${resp.status}`) + detalhes,
      });
      return;
    }

    res.status(200).json({
      valor: json.totalFrete ?? json.valorFrete ?? json.total,
      prazoDias: json.prazo ?? json.prazoEntrega ?? '—',
      protocolo: json.id,
      id: json.id,
    });
  } catch (err) {
    res.status(200).json({ erro: true, mensagem: err.message || 'Erro ao consultar a Braspress' });
  }
};
