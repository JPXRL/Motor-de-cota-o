// Serverless function: exceções de cobertura por transportadora.
//
// Motivo de existir, medido e não suposto: em 53 cotações (03/09 a 23/09),
// 14 falhas foram a própria transportadora dizendo que não atende o destino —
// "Não localizada uma unidade que atenda a cidade: 1516 - MOMBACA!" na
// Rodonaves, "Região não atendida para este serviço" na Jamef. Cada uma
// dessas é uma chamada que nasce condenada: gasta os 20s de timeout do
// operador para devolver uma recusa que já era previsível.
//
// A regra é por CIDADE, não por estado. Mombaça e Iguatu são as duas no
// Ceará, e Fortaleza certamente é atendida; bloquear o CE inteiro jogaria
// fora o que funciona. Goiânia é a prova disso no histórico: a Rodonaves
// respondeu e ganhou no preço numa cotação (23/09, R$ 123,56) e falhou em
// outra (21/09) — por motivo que NÃO era cobertura. Regra por estado teria
// custado dinheiro naquela primeira.
//
// Guardado no mesmo banco Postgres do cadastro de caixas. Sem banco
// conectado, a lista volta vazia e nada é bloqueado — o comportamento antigo
// (cotar todo mundo) é o fallback seguro: perder uma regra atrasa o operador,
// enquanto bloquear por engano esconde uma transportadora que atenderia.

const { sql } = require('@vercel/postgres');

function bancoConfigurado() {
  return Boolean(process.env.POSTGRES_URL);
}

// "Vitória da Conquista" e "VITORIA DA CONQUISTA" têm que bater. Sem acento,
// maiúsculas, espaços colapsados. A mesma normalização existe na tela — se
// uma mudar sem a outra, a regra para de casar silenciosamente.
function normalizarCidade(txt) {
  return String(txt || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function normalizarUf(txt) {
  return String(txt || '').trim().toUpperCase().slice(0, 2);
}

async function garantirTabela() {
  await sql`
    CREATE TABLE IF NOT EXISTS cobertura_excecoes (
      id SERIAL PRIMARY KEY,
      transportadora TEXT NOT NULL,
      cidade TEXT NOT NULL,
      uf TEXT NOT NULL,
      cidade_exibicao TEXT,
      motivo TEXT,
      origem TEXT,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  // Índice único evita a mesma exceção entrar duas vezes quando o operador
  // aceita a mesma sugestão de novo depois de recarregar a tela.
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS cobertura_excecoes_chave
    ON cobertura_excecoes (transportadora, cidade, uf)
  `;
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    if (!bancoConfigurado()) {
      res.status(200).json({ regras: [], persistente: false });
      return;
    }
    try {
      await garantirTabela();
      const { rows } = await sql`
        SELECT id, transportadora, cidade, uf, cidade_exibicao, motivo, origem, criado_em
        FROM cobertura_excecoes
        ORDER BY transportadora, uf, cidade
      `;
      res.status(200).json({
        regras: rows.map((r) => ({
          id: r.id,
          transportadora: r.transportadora,
          cidade: r.cidade,
          uf: r.uf,
          cidadeExibicao: r.cidade_exibicao || r.cidade,
          motivo: r.motivo,
          origem: r.origem,
          criadoEm: r.criado_em,
        })),
        persistente: true,
      });
    } catch (err) {
      res.status(200).json({ regras: [], persistente: false, erro: true, mensagem: err.message });
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

  if (!bancoConfigurado()) {
    res.status(200).json({
      erro: true,
      mensagem: 'As regras de cobertura precisam de um banco Postgres conectado ao projeto (aba "Storage" no Vercel). Sem ele, a cotação continua consultando todas as transportadoras.',
    });
    return;
  }

  try {
    await garantirTabela();
    const corpo = req.body || {};

    if (corpo.acao === 'remover') {
      const id = Number(corpo.id);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(200).json({ erro: true, mensagem: 'id da regra inválido.' });
        return;
      }
      await sql`DELETE FROM cobertura_excecoes WHERE id = ${id}`;
      res.status(200).json({ ok: true });
      return;
    }

    const transportadora = String(corpo.transportadora || '').trim();
    const cidade = normalizarCidade(corpo.cidade);
    const uf = normalizarUf(corpo.uf);

    if (!transportadora || !cidade || uf.length !== 2) {
      res.status(200).json({ erro: true, mensagem: 'Informe transportadora, cidade e UF (2 letras).' });
      return;
    }

    // ON CONFLICT DO NOTHING em vez de erro: aceitar a mesma sugestão duas
    // vezes é gesto inofensivo do operador, não merece mensagem de erro.
    await sql`
      INSERT INTO cobertura_excecoes (transportadora, cidade, uf, cidade_exibicao, motivo, origem)
      VALUES (
        ${transportadora},
        ${cidade},
        ${uf},
        ${String(corpo.cidadeExibicao || corpo.cidade || '').trim() || null},
        ${String(corpo.motivo || '').trim().slice(0, 500) || null},
        ${corpo.origem === 'medida' ? 'medida' : 'manual'}
      )
      ON CONFLICT (transportadora, cidade, uf) DO NOTHING
    `;
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(200).json({ erro: true, mensagem: err.message });
  }
};
