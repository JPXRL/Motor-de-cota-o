// Serverless function: guarda um registro de cada cotação feita no motor
// (data/hora, cliente/CNPJ, valor do pedido, transportadora vencedora, valor
// e prazo do frete vencedor, o percentual que o frete representa sobre o
// valor do pedido, e o resultado bruto de cada transportadora consultada) —
// pra dar visibilidade de uso
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
      melhor_prazo_dias NUMERIC,
      resultados JSONB,
      erros JSONB
    )
  `;
  // Coluna adicionada depois da tabela já existir em produção (pedido do
  // Juan, 02/09/2026: guardar o prazo junto com valor/percentual pra dar
  // pra comparar tudo direto por SQL, sem precisar abrir o JSON de
  // "resultados"). IF NOT EXISTS deixa isso seguro de rodar sempre.
  await sql`ALTER TABLE historico_cotacoes ADD COLUMN IF NOT EXISTS melhor_prazo_dias NUMERIC`;

  // ===== Escolha do operador (18/09/2026) =====
  // Até aqui o histórico guardava a cotação MAIS BARATA ("melhor"), que não é
  // a mesma coisa que a ESCOLHIDA. Sem essa distinção não dá pra responder a
  // pergunta que o projeto inteiro existe pra responder: cotamos com quem
  // devia? Quando o operador escolhe a mais barata, o motivo é preenchido
  // sozinho; quando escolhe outra, ele diz por quê — e a diferença em reais
  // para a mais barata fica registrada ao lado.
  //
  // E o vínculo com a nota: sem NUNOTA toda cotação nasce órfã e nunca dá
  // pra cruzar com o Sankhya depois.
  await sql`ALTER TABLE historico_cotacoes ADD COLUMN IF NOT EXISTS nunota INTEGER`;
  await sql`ALTER TABLE historico_cotacoes ADD COLUMN IF NOT EXISTS codemp INTEGER`;
  await sql`ALTER TABLE historico_cotacoes ADD COLUMN IF NOT EXISTS usuario TEXT`;
  await sql`ALTER TABLE historico_cotacoes ADD COLUMN IF NOT EXISTS escolhida_transportadora TEXT`;
  await sql`ALTER TABLE historico_cotacoes ADD COLUMN IF NOT EXISTS escolhida_modal TEXT`;
  await sql`ALTER TABLE historico_cotacoes ADD COLUMN IF NOT EXISTS escolhida_valor NUMERIC`;
  await sql`ALTER TABLE historico_cotacoes ADD COLUMN IF NOT EXISTS escolhida_prazo_dias NUMERIC`;
  await sql`ALTER TABLE historico_cotacoes ADD COLUMN IF NOT EXISTS motivo_escolha TEXT`;
  await sql`ALTER TABLE historico_cotacoes ADD COLUMN IF NOT EXISTS diferenca_para_menor NUMERIC`;
  await sql`ALTER TABLE historico_cotacoes ADD COLUMN IF NOT EXISTS escolhido_em TIMESTAMPTZ`;
}

// Lista fechada de motivos. Fica no servidor também (não só na tela) pra que
// um valor fora da lista nunca entre no banco — relatório com categoria
// digitada à mão vira categoria inútil em três meses.
const MOTIVOS_VALIDOS = [
  'MENOR_PRECO',
  'MENOR_PRAZO',
  'EXIG_CLIENTE',
  'RESTR_REGIAO',
  'TRANSP_BLOQ',
  'OUTRO',
];

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
               melhor_prazo_dias, resultados, erros
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
              prazoDias: r.melhor_prazo_dias !== null ? Number(r.melhor_prazo_dias) : null,
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

  if (req.method !== 'POST' && req.method !== 'PATCH') {
    res.status(405).json({ erro: true, mensagem: 'Método não permitido' });
    return;
  }

  // Mesma trava simples contra CSRF usada nas outras funções.
  if (req.headers['x-requested-with'] !== 'motor-rareway') {
    res.status(403).json({ erro: true, mensagem: 'Requisição não autorizada.' });
    return;
  }

  // ===== PATCH: registrar a escolha do operador numa cotação já gravada =====
  // Separado do POST de propósito: a cotação é gravada assim que as respostas
  // chegam, e a escolha acontece depois — às vezes um minuto depois, às vezes
  // nunca (o operador desiste). Uma cotação sem escolha também é informação:
  // diz que consultamos e não usamos.
  if (req.method === 'PATCH') {
    if (!bancoConfigurado()) {
      res.status(200).json({ ok: true, guardado: false });
      return;
    }
    const e = req.body || {};
    const id = Number(e.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ erro: true, mensagem: 'id da cotação inválido.' });
      return;
    }
    if (!MOTIVOS_VALIDOS.includes(e.motivo)) {
      res.status(400).json({ erro: true, mensagem: 'Motivo da escolha fora da lista.' });
      return;
    }
    try {
      await garantirTabela();
      await sql`
        UPDATE historico_cotacoes SET
          escolhida_transportadora = ${e.transportadora || null},
          escolhida_modal          = ${e.modal || null},
          escolhida_valor          = ${e.valor != null ? Number(e.valor) : null},
          escolhida_prazo_dias     = ${e.prazoDias != null ? Number(e.prazoDias) : null},
          motivo_escolha           = ${e.motivo},
          diferenca_para_menor     = ${e.diferencaParaMenor != null ? Number(e.diferencaParaMenor) : null},
          escolhido_em             = now()
        WHERE id = ${id}
      `;
      res.status(200).json({ ok: true, guardado: true });
    } catch (err) {
      res.status(200).json({ ok: true, guardado: false, mensagem: err.message });
    }
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

    const nunota = Number(registro.nunota);
    const codemp = Number(registro.codemp);

    const { rows } = await sql`
      INSERT INTO historico_cotacoes
        (cliente, cnpj_dest, cidade_dest, peso_total, valor_merc, tipo_frete,
         melhor_transportadora, melhor_valor, melhor_percentual, melhor_prazo_dias,
         nunota, codemp, usuario, resultados, erros)
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
        ${melhor ? melhor.prazoDias : null},
        ${Number.isInteger(nunota) && nunota > 0 ? nunota : null},
        ${Number.isInteger(codemp) && codemp > 0 ? codemp : null},
        ${registro.usuario || null},
        ${JSON.stringify(registro.resultados || [])},
        ${JSON.stringify(registro.erros || [])}
      )
      RETURNING id
    `;
    // Devolve o id para a tela poder registrar a escolha depois (PATCH).
    res.status(200).json({ ok: true, guardado: true, id: rows[0]?.id ?? null });
  } catch (err) {
    // Falha ao guardar o histórico não deve incomodar o operador — a
    // cotação em si já foi concluída antes desta chamada.
    res.status(200).json({ ok: true, guardado: false, mensagem: err.message });
  }
};
