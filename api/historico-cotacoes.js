// Serverless function: guarda um registro de cada cotação feita no motor
// (data/hora, cliente, peso/valor informados, transportadora vencedora, o
// percentual que o frete representa sobre o valor do pedido, e o resultado
// bruto de cada transportadora consultada) — pra dar visibilidade de uso
// (quantas cotações por dia, quem ganha mais, se os valores/percentuais
// estão subindo) e permitir consulta com SQL de verdade (relatórios, médias,
// filtros por período/transportadora, etc.). NÃO substitui o Sankhya como
// fonte da verdade (ver motor-cotacao-frete-arquitetura.md, seção
// "Arquitetura de dados") — é só um log de apoio da versão interina, sem
// nenhuma decisão de negócio em cima dele.
//
// Guardado no mesmo banco Postgres usado pelo cadastro de caixas (api/
// caixas.js). Se o banco ainda não estiver conectado a este projeto, o
// registro é simplesmente descartado (a cotação em si continua funcionando
// normalmente) — conectar um banco Postgres na aba "Storage" do projeto no
// Vercel resolve isso pro cadastro de caixas E pro histórico ao mesmo tempo.

const { sql } = require('@vercel/postgres');

function bancoConfigurado() {
  return Boolean(process.env.POSTGRES_URL);
}

async function garantirTabela() {
  await sql`
    CREATE TABLE IF NOT EXISTS historico_cotacoes (
      id SERIAL PRIMARY KEY,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
      cliente TEXT,
      cnpj_dest TEXT,
      cidade_dest TEXT,
      peso_total NUMERIC,
      valor_merc NUMERIC,
      tipo_frete TEXT,
      melhor_transportadora TEXT,
      melhor_valor NUMERIC,
      melhor_percentual NUMERIC,
      resultados JSONB,
      erros JSONB
    )
  `;
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    if (!bancoConfigurado()) {
      res.status(200).json({ historico: [], persistente: false });
      return;
    }
    try {
      await garantirTabela();
      // Mais recente primeiro, limitado a 200 pra manter a resposta leve.
      const { rows } = await sql`
        SELECT id, criado_em, cliente, cnpj_dest, cidade_dest, peso_total, valor_merc,
               tipo_frete, melhor_transportadora, melhor_valor, melhor_percentual,
               resultados, erros
        FROM historico_cotacoes
        ORDER BY criado_em DESC
        LIMIT 200
      `;
      const historico = rows.map((r) => ({
        id: r.id,
        dataHora: r.criado_em,
        cliente: r.cliente,
        cnpjDest: r.cnpj_dest,
        cidadeDest: r.cidade_dest,
        pesoTotal: r.peso_total !== null ? Number(r.peso_total) : null,
        valorMerc: r.valor_merc !== null ? Number(r.valor_merc) : null,
        tipoFrete: r.tipo_frete,
        melhor: r.melhor_transportadora
          ? {
              transportadora: r.melhor_transportadora,
              valor: r.melhor_valor !== null ? Number(r.melhor_valor) : null,
              percentual: r.melhor_percentual !== null ? Number(r.melhor_percentual) : null,
            }
          : null,
        resultados: r.resultados || [],
        erros: r.erros || [],
      }));
      res.status(200).json({ historico, persistente: true });
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

  // Se o banco não estiver conectado, não é erro — só não guarda nada. A
  // cotação em si já aconteceu e já foi mostrada na tela; perder o registro
  // de histórico não pode travar o fluxo principal.
  if (!bancoConfigurado()) {
    res.status(200).json({ ok: true, guardado: false });
    return;
  }

  try {
    await garantirTabela();
    const registro = req.body || {};
    const melhor = registro.melhor || null;
    const percentual = melhor && registro.valorMerc ? (Number(melhor.valor) / Number(registro.valorMerc)) * 100 : null;

    await sql`
      INSERT INTO historico_cotacoes
        (cliente, cnpj_dest, cidade_dest, peso_total, valor_merc, tipo_frete,
         melhor_transportadora, melhor_valor, melhor_percentual, resultados, erros)
      VALUES (
        ${registro.cliente || null},
        ${registro.cnpjDest || null},
        ${registro.cidadeDest || null},
        ${registro.pesoTotal || null},
        ${registro.valorMerc || null},
        ${registro.tipoFrete || null},
        ${melhor ? melhor.transportadora : null},
        ${melhor ? melhor.valor : null},
        ${percentual},
        ${JSON.stringify(registro.resultados || [])},
        ${JSON.stringify(registro.erros || [])}
      )
    `;
    res.status(200).json({ ok: true, guardado: true });
  } catch (err) {
    // Falha ao guardar o histórico não deve incomodar o operador — a
    // cotação em si já foi concluída antes desta chamada.
    res.status(200).json({ ok: true, guardado: false, mensagem: err.message });
  }
};
