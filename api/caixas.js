// Serverless function: lista e cadastro das caixas padrão que aparecem no
// seletor da tela de Cotação. Guardadas num banco Postgres de verdade
// (Vercel Postgres, via integração Neon) — assim o Juan consegue cadastrar/
// editar caixas pela própria tela do motor ("Cadastro de caixas"), sem
// precisar de ajuda técnica pra mexer em código, E dá pra consultar os dados
// depois com SQL normal se precisar (relatórios, auditoria, etc.).
//
// Se o banco ainda não estiver conectado a este projeto (variável de
// ambiente POSTGRES_URL ausente — o Vercel cadastra ela sozinha quando você
// cria/conecta um banco Postgres na aba "Storage" do projeto), a lista cai
// pro conjunto padrão fixo abaixo (as medidas reais informadas pelo Juan em
// 01/09/2026): a tela de Cotação continua funcionando normalmente, só não dá
// pra cadastrar/editar/remover caixa até o banco ser conectado.
//
// Comportamento intencional: se a tabela estiver vazia (banco recém-
// conectado, ou todas as caixas apagadas), a leitura repopula sozinha com o
// padrão de fábrica — assim o seletor da tela de Cotação nunca fica sem
// nenhuma opção pra escolher.

const { sql } = require('@vercel/postgres');

const CAIXAS_PADRAO_FALLBACK = [
  { id: '280', nome: 'Caixa 280', altura: 29, largura: 40, comprimento: 40 },
  { id: '150', nome: 'Caixa 150', altura: 31, largura: 42, comprimento: 33 },
  { id: '112', nome: 'Caixa 112', altura: 16, largura: 40, comprimento: 40 },
  { id: '66', nome: 'Caixa 66', altura: 15, largura: 29, comprimento: 36 },
  { id: '46', nome: 'Caixa 46', altura: 14, largura: 23, comprimento: 32 },
  { id: '25', nome: 'Caixa 25', altura: 9, largura: 18, comprimento: 28 },
];

function bancoConfigurado() {
  return Boolean(process.env.POSTGRES_URL);
}

async function garantirTabela() {
  await sql`
    CREATE TABLE IF NOT EXISTS caixas_padrao (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      altura NUMERIC NOT NULL,
      largura NUMERIC NOT NULL,
      comprimento NUMERIC NOT NULL
    )
  `;
}

async function lerCaixas() {
  if (!bancoConfigurado()) {
    return { caixas: CAIXAS_PADRAO_FALLBACK, persistente: false };
  }
  await garantirTabela();
  const { rows } = await sql`SELECT id, nome, altura, largura, comprimento FROM caixas_padrao ORDER BY nome`;

  if (!rows.length) {
    // Tabela conectada mas vazia — popula com o padrão de fábrica pra não
    // deixar o seletor da tela de Cotação sem nenhuma opção.
    for (const c of CAIXAS_PADRAO_FALLBACK) {
      await sql`
        INSERT INTO caixas_padrao (id, nome, altura, largura, comprimento)
        VALUES (${c.id}, ${c.nome}, ${c.altura}, ${c.largura}, ${c.comprimento})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    return { caixas: CAIXAS_PADRAO_FALLBACK, persistente: true };
  }

  return {
    caixas: rows.map((r) => ({
      id: r.id,
      nome: r.nome,
      altura: Number(r.altura),
      largura: Number(r.largura),
      comprimento: Number(r.comprimento),
    })),
    persistente: true,
  };
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      const { caixas, persistente } = await lerCaixas();
      res.status(200).json({ caixas, persistente });
    } catch (err) {
      res.status(200).json({ caixas: CAIXAS_PADRAO_FALLBACK, persistente: false, erro: true, mensagem: err.message });
    }
    return;
  }

  // Mesma trava simples contra CSRF usada nas outras funções.
  if (req.headers['x-requested-with'] !== 'motor-rareway') {
    res.status(403).json({ erro: true, mensagem: 'Requisição não autorizada.' });
    return;
  }

  if (!bancoConfigurado()) {
    res.status(200).json({
      erro: true,
      mensagem: 'Cadastro de caixas ainda não está conectado a um banco de dados. No painel do Vercel, abra a aba "Storage" do projeto, crie/conecte um banco Postgres e conecte a este projeto — depois disso, cadastrar/editar caixas passa a funcionar.',
    });
    return;
  }

  try {
    await garantirTabela();

    if (req.method === 'POST') {
      const { id, nome, altura, largura, comprimento } = req.body || {};
      if (!nome || !altura || !largura || !comprimento) {
        res.status(200).json({ erro: true, mensagem: 'Preencha nome, altura, largura e comprimento.' });
        return;
      }
      const idFinal = id || String(Date.now());
      await sql`
        INSERT INTO caixas_padrao (id, nome, altura, largura, comprimento)
        VALUES (${idFinal}, ${String(nome)}, ${Number(altura)}, ${Number(largura)}, ${Number(comprimento)})
        ON CONFLICT (id) DO UPDATE SET
          nome = EXCLUDED.nome,
          altura = EXCLUDED.altura,
          largura = EXCLUDED.largura,
          comprimento = EXCLUDED.comprimento
      `;
      const { caixas } = await lerCaixas();
      res.status(200).json({ ok: true, caixas });
      return;
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      await sql`DELETE FROM caixas_padrao WHERE id = ${id}`;
      const { caixas } = await lerCaixas();
      res.status(200).json({ ok: true, caixas });
      return;
    }

    res.status(405).json({ erro: true, mensagem: 'Método não permitido' });
  } catch (err) {
    res.status(200).json({ erro: true, mensagem: err.message || 'Erro ao acessar o banco de caixas' });
  }
};
