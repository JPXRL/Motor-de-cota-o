// Serverless function: guarda um registro simples de cada cotação feita no
// motor (data/hora, cliente, peso/valor informados, e o resultado de cada
// transportadora consultada) — só pra dar visibilidade de uso (quantas
// cotações por dia, quem ganhou mais, se os valores estão subindo). NÃO
// substitui o Sankhya como fonte da verdade (ver motor-cotacao-frete-
// arquitetura.md, seção "Arquitetura de dados") — é só um log de apoio da
// versão interina, sem nenhuma decisão de negócio em cima dele.
//
// Guardado no mesmo banco Vercel KV usado pelo cadastro de caixas (api/
// caixas.js). Se o KV ainda não estiver conectado a este projeto, o registro
// é simplesmente descartado (a cotação em si continua funcionando
// normalmente) — conectar um banco KV na aba "Storage" do projeto no Vercel
// resolve isso pro cadastro de caixas E pro histórico ao mesmo tempo.

const CHAVE_KV = 'rw_historico_cotacoes';
const MAXIMO_REGISTROS = 500; // trava o tamanho pra não estourar limite do KV

function kvConfigurado() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function kvChamar(caminho, opcoes) {
  const resp = await fetch(`${process.env.KV_REST_API_URL}${caminho}`, {
    ...opcoes,
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      ...(opcoes && opcoes.headers),
    },
  });
  return resp.json();
}

async function lerHistorico() {
  const resultado = await kvChamar(`/get/${CHAVE_KV}`);
  if (!resultado || !resultado.result) return [];
  try {
    const lista = JSON.parse(resultado.result);
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

async function salvarHistorico(lista) {
  await kvChamar(`/set/${CHAVE_KV}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(lista),
  });
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    if (!kvConfigurado()) {
      res.status(200).json({ historico: [], persistente: false });
      return;
    }
    try {
      const lista = await lerHistorico();
      // Mais recente primeiro, limitado a 200 pra manter a resposta leve.
      res.status(200).json({ historico: lista.slice(-200).reverse(), persistente: true });
    } catch (err) {
      res.status(200).json({ historico: [], persistente: true, erro: true, mensagem: err.message });
    }
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ erro: true, mensagem: 'Método não permitido' });
    return;
  }

  // Mesma trava simples contra CSRF usada nas outras funções.
  if (req.headers['x-requested-with'] !== 'motor-rareway') {
    res.status(403).json({ erro: true, mensagem: 'Requisição não autorizada.' });
    return;
  }

  // Se o KV não estiver conectado, não é erro — só não guarda nada. A
  // cotação em si já aconteceu e já foi mostrada na tela; perder o registro
  // de histórico não pode travar o fluxo principal.
  if (!kvConfigurado()) {
    res.status(200).json({ ok: true, guardado: false });
    return;
  }

  try {
    const registro = req.body || {};
    const lista = await lerHistorico();
    lista.push({
      ...registro,
      id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8),
      dataHora: new Date().toISOString(),
    });
    const listaLimitada = lista.slice(-MAXIMO_REGISTROS);
    await salvarHistorico(listaLimitada);
    res.status(200).json({ ok: true, guardado: true });
  } catch (err) {
    // Falha ao guardar o histórico não deve incomodar o operador — a
    // cotação em si já foi concluída antes desta chamada.
    res.status(200).json({ ok: true, guardado: false, mensagem: err.message });
  }
};
