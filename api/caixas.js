// Serverless function: lista e cadastro das caixas padrão que aparecem no
// seletor da tela de Cotação. Guardadas no Vercel KV (banco de chave/valor
// simples, tem plano gratuito) — assim o Juan consegue cadastrar/editar
// caixas pela própria tela do motor ("Cadastro de caixas"), sem precisar de
// ajuda técnica pra mexer em código.
//
// Se o KV ainda não estiver conectado a este projeto (variáveis de ambiente
// KV_REST_API_URL / KV_REST_API_TOKEN ausentes — o Vercel cadastra elas
// sozinho quando você cria/conecta um banco na aba "Storage" do projeto), a
// lista cai pro conjunto padrão fixo abaixo (as medidas reais informadas
// pelo Juan em 01/09/2026): a tela de Cotação continua funcionando
// normalmente, só não dá pra cadastrar/editar/remover caixa até o KV ser
// conectado.

const CHAVE_KV = 'rw_caixas';

const CAIXAS_PADRAO_FALLBACK = [
  { id: '280', nome: 'Caixa 280', altura: 29, largura: 40, comprimento: 40 },
  { id: '150', nome: 'Caixa 150', altura: 31, largura: 42, comprimento: 33 },
  { id: '112', nome: 'Caixa 112', altura: 16, largura: 40, comprimento: 40 },
  { id: '66', nome: 'Caixa 66', altura: 15, largura: 29, comprimento: 36 },
  { id: '46', nome: 'Caixa 46', altura: 14, largura: 23, comprimento: 32 },
  { id: '25', nome: 'Caixa 25', altura: 9, largura: 18, comprimento: 28 },
];

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

async function lerCaixas() {
  if (!kvConfigurado()) {
    return { caixas: CAIXAS_PADRAO_FALLBACK, persistente: false };
  }
  const resultado = await kvChamar(`/get/${CHAVE_KV}`);
  if (!resultado || !resultado.result) {
    return { caixas: CAIXAS_PADRAO_FALLBACK, persistente: true };
  }
  try {
    const caixas = JSON.parse(resultado.result);
    return { caixas: Array.isArray(caixas) ? caixas : CAIXAS_PADRAO_FALLBACK, persistente: true };
  } catch {
    return { caixas: CAIXAS_PADRAO_FALLBACK, persistente: true };
  }
}

async function salvarCaixas(caixas) {
  await kvChamar(`/set/${CHAVE_KV}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(caixas),
  });
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const { caixas, persistente } = await lerCaixas();
    res.status(200).json({ caixas, persistente });
    return;
  }

  if (req.headers['x-requested-with'] !== 'motor-rareway') {
    res.status(403).json({ erro: true, mensagem: 'Requisição não autorizada.' });
    return;
  }

  if (!kvConfigurado()) {
    res.status(200).json({
      erro: true,
      mensagem: 'Cadastro de caixas ainda não está conectado a um banco de dados. No painel do Vercel, abra a aba "Storage" do projeto, crie um banco KV (gratuito) e conecte a este projeto — depois disso, cadastrar/editar caixas passa a funcionar.',
    });
    return;
  }

  try {
    const { caixas } = await lerCaixas();

    if (req.method === 'POST') {
      const { id, nome, altura, largura, comprimento } = req.body || {};
      if (!nome || !altura || !largura || !comprimento) {
        res.status(200).json({ erro: true, mensagem: 'Preencha nome, altura, largura e comprimento.' });
        return;
      }
      const idFinal = id || String(Date.now());
      const caixaNova = {
        id: idFinal,
        nome: String(nome),
        altura: Number(altura),
        largura: Number(largura),
        comprimento: Number(comprimento),
      };
      const posicao = caixas.findIndex((c) => c.id === idFinal);
      if (posicao >= 0) {
        caixas[posicao] = caixaNova;
      } else {
        caixas.push(caixaNova);
      }
      await salvarCaixas(caixas);
      res.status(200).json({ ok: true, caixas });
      return;
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      const restantes = caixas.filter((c) => c.id !== id);
      await salvarCaixas(restantes);
      res.status(200).json({ ok: true, caixas: restantes });
      return;
    }

    res.status(405).json({ erro: true, mensagem: 'Método não permitido' });
  } catch (err) {
    res.status(200).json({ erro: true, mensagem: err.message || 'Erro ao acessar o banco de caixas' });
  }
};
