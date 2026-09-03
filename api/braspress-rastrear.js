// Serverless function: rastreio de encomendas via Braspress (consulta ao
// vivo, sem guardar nada). Usa a v3 do tracking (a mais completa, com linha
// do tempo) — busca por nota fiscal ou por número de pedido.
//   BRASPRESS_USERNAME / BRASPRESS_PASSWORD — mesmas credenciais da cotação
//   BRASPRESS_CNPJ_REMETENTE — usado aqui como CNPJ do tomador do frete na busca
//
// Atenção: ao contrário da cotação (já confirmada com chamada real em
// 02/09/2026), o rastreio da Braspress ainda não foi testado com uma chamada
// de verdade — ver especificacao-api-braspress.md, seção 4. Este código segue
// só a documentação oficial (que não mostra um JSON de resposta preenchido).
// Se o formato real vier diferente, é só ajustar o mapeamento de campos no
// final desta função — o `console.error` abaixo ajuda a ver a resposta crua
// nos logs do Vercel na primeira tentativa.

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
    const { tipoBusca, numero } = req.body || {};
    const cnpjRemetente = process.env.BRASPRESS_CNPJ_REMETENTE;
    const usuario = process.env.BRASPRESS_USERNAME;
    const senha = process.env.BRASPRESS_PASSWORD;

    if (!cnpjRemetente || !usuario || !senha) {
      res.status(200).json({
        erro: true,
        mensagem: 'Backend sem configuração: faltam variáveis BRASPRESS_* no Vercel.',
      });
      return;
    }
    if (!numero) {
      res.status(200).json({ erro: true, mensagem: 'Informe um número para buscar.' });
      return;
    }

    const auth = Buffer.from(`${usuario}:${senha}`).toString('base64');
    const cnpj = soNumeros(cnpjRemetente);
    const numeroLimpo = encodeURIComponent(String(numero).trim());
    const caminho = tipoBusca === 'pedido'
      ? `byNumPedido/${cnpj}/${numeroLimpo}`
      : `byNf/${cnpj}/${numeroLimpo}`;

    const resp = await fetch(`https://api.braspress.com/v3/tracking/${caminho}/json`, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (resp.status === 404) {
      res.status(200).json({ registros: [] });
      return;
    }

    const json = await resp.json();

    if (!resp.ok || json?.statusCode || json?.erro) {
      console.error('[braspress-rastrear] resposta de erro da Braspress:', JSON.stringify({ status: resp.status, caminho, resposta: json }));
      const detalhes = Array.isArray(json?.errorList) && json.errorList.length
        ? ' — ' + json.errorList.map((e) => e?.message || e?.detalhes || JSON.stringify(e)).join('; ')
        : '';
      res.status(200).json({
        erro: true,
        mensagem: (json?.message || json?.mensagem || `Braspress retornou HTTP ${resp.status}`) + detalhes,
      });
      return;
    }

    // Formato documentado: uma lista `conhecimentos` — ver
    // especificacao-api-braspress.md, seção 3. Como isso nunca foi validado
    // com uma resposta real, aceitamos também a raiz já vir como lista, e
    // logamos a resposta crua pra ajustar rápido se o formato for diferente.
    console.error('[braspress-rastrear] resposta bruta (primeira consulta real ajuda a confirmar o formato):', JSON.stringify(json).slice(0, 4000));

    const conhecimentos = Array.isArray(json?.conhecimentos) ? json.conhecimentos : (Array.isArray(json) ? json : []);
    const registros = conhecimentos.map((c) => ({
      conhecimento: c.numero || null,
      notaFiscal: (Array.isArray(c.notasFiscais) && c.notasFiscais[0]?.numero) || null,
      remetente: c.remetente || null,
      destinatario: c.destinatario || null,
      statusAtual: c.ultimaOcorrencia || c.status || null,
      previsaoEntrega: c.previsaoEntrega || null,
      comprovanteUrl: null,
      eventos: (c.timeline || c.ocorrencias || []).map((e) => ({
        data: e.data || null,
        status: e.descricao || null,
        local: null,
      })),
    }));

    res.status(200).json({ registros });
  } catch (err) {
    res.status(200).json({ erro: true, mensagem: err.message || 'Erro ao consultar o rastreio da Braspress' });
  }
};
