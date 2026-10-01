// Grava na nota do Sankhya a cotação escolhida no motor (os 8 campos AD_ do
// Bloco A, criados pelo Juan em 01/10/2026 — ver docs/desenho-campos-sankhya.md).
//
// Duas etapas, sempre nesta ordem, por decisão do Juan:
//   1. CONFERIR: lê a nota e mostra ao operador cliente, CNPJ, valor e o que
//      vai ser gravado. Nada é escrito.
//   2. GRAVAR: só depois do "é esta" do operador.
//
// O que vai para a nota sai do histórico do motor (Postgres), pelo id da
// cotação — não do navegador. Assim a tela não consegue gravar um valor que
// não foi cotado, e o que foi conferido é exatamente o que é gravado.
//
// Travas, todas conferidas de novo na hora de gravar (a nota pode ter mudado
// entre a conferência e o clique):
//   - só empresa 1: o motor cota a partir da Matriz, em BH. Numa nota da
//     Anova, a cotação seria de outra rota. Até as transportadoras liberarem
//     credencial para a Anova, recusa.
//   - só pedido ou nota de venda (TIPMOV P ou V).
//   - não sobrescreve: nota que já tem cotação fica como está. O Juan perde
//     visibilidade com a sobrescrita; a troca espera o histórico na nota.
//   - CNPJ da nota diferente do destinatário cotado só grava com confirmação
//     explícita — um dígito trocado no NUNOTA gravaria na nota de outro cliente.

const { sql } = require('@vercel/postgres');
const { comSessao } = require('./sankhya');

// Lista de Opções do Sankhya cabe só 10 caracteres, então o AD_MOTIVOCOT usa
// códigos curtos. O motor continua com os longos (gravados desde 18/09).
const MOTIVO_NO_SANKHYA = {
  MENOR_PRECO: 'PRECO',
  MENOR_PRAZO: 'PRAZO',
  EXIG_CLIENTE: 'CLIENTE',
  RESTR_REGIAO: 'REGIAO',
  TRANSP_BLOQ: 'BLOQUEIO',
  OUTRO: 'OUTRO',
};

const MOTIVO_TEXTO = {
  MENOR_PRECO: 'menor preço',
  MENOR_PRAZO: 'menor prazo',
  EXIG_CLIENTE: 'exigência do cliente',
  RESTR_REGIAO: 'restrição de região',
  TRANSP_BLOQ: 'transportadora bloqueada',
  OUTRO: 'outro motivo',
};

// Prefixo do protocolo, para o número da nota dizer de onde veio
// (ex.: BRA-373232792). Nome sugerido pela própria TI.
const PREFIXO = { braspress: 'BRA', jamef: 'JAM', rodonaves: 'ROD' };

// Código do parceiro da transportadora, por empresa. Quem coleta é a filial
// mais próxima da empresa remetente; tabela medida nas vendas de 2026 e
// fechada com o Juan em 01/10/2026. Só a empresa 1 é usada por enquanto —
// as outras já ficam prontas para quando o motor cotar como Anova.
// Braspress aéreo usa o cadastro de Guarulhos aéreo (1648), o único usado
// em venda aérea em 2026.
const PARCEIRO_TRANSPORTADORA = {
  1: { braspress: 1286, braspress_aereo: 1648, jamef: 1263, rodonaves: 15124 },
  4: { braspress: 1976, jamef: 182, rodonaves: 1289 },
  6: { braspress: 26691, jamef: 12653, rodonaves: 31798 },
};

const EMPRESAS_LIBERADAS = [1];

const TIPO_MOVIMENTO = { P: 'Pedido de venda', V: 'Nota de venda' };

function soDigitos(v) {
  return String(v || '').replace(/\D/g, '');
}

function formatarCnpj(v) {
  const d = soDigitos(v);
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return v || '';
}

// O DbExplorer devolve data como "30092026 00:00:00". Vira "30/09/2026".
function dataDoSankhya(v) {
  const m = String(v || '').match(/^(\d{2})(\d{2})(\d{4})/);
  return m ? `${m[1]}/${m[2]}/${m[3]}` : null;
}

// O DatasetSP.save recebe data como texto "dd/MM/yyyy HH:mm:ss", no horário
// de Brasília — o servidor da Vercel roda em UTC, e sem isso a cotação das
// 22h apareceria na nota com a data do dia seguinte.
function dataParaSankhya(data) {
  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date(data));
  const p = Object.fromEntries(partes.map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}:${p.second}`;
}

function chaveTransportadora(nome, modal) {
  const base = String(nome || '').toLowerCase();
  return modal === 'aereo' && base === 'braspress' ? 'braspress_aereo' : base;
}

async function garantirColunas() {
  await sql`ALTER TABLE historico_cotacoes ADD COLUMN IF NOT EXISTS escolhida_protocolo TEXT`;
  await sql`ALTER TABLE historico_cotacoes ADD COLUMN IF NOT EXISTS nota_gravada_em TIMESTAMPTZ`;
  await sql`ALTER TABLE historico_cotacoes ADD COLUMN IF NOT EXISTS nota_gravada_nunota INTEGER`;
}

async function lerCotacao(id) {
  await garantirColunas();
  const { rows } = await sql`
    SELECT id, criado_em, cnpj_dest, valor_merc, usuario,
           escolhida_transportadora, escolhida_modal, escolhida_valor,
           escolhida_prazo_dias, escolhida_protocolo, motivo_escolha,
           nota_gravada_em, nota_gravada_nunota
    FROM historico_cotacoes WHERE id = ${id}
  `;
  return rows[0] || null;
}

// Monta, a partir da cotação guardada, exatamente o que vai para a nota.
// Usado na conferência (para mostrar) e na gravação (para gravar) — a mesma
// função nos dois lados impede que o mostrado e o gravado se desencontrem.
function montarCampos(cotacao, codemp) {
  const chave = chaveTransportadora(cotacao.escolhida_transportadora, cotacao.escolhida_modal);
  const nomeBase = String(cotacao.escolhida_transportadora || '').toLowerCase();
  const valor = cotacao.escolhida_valor !== null ? Number(cotacao.escolhida_valor) : null;
  const valorMerc = cotacao.valor_merc !== null ? Number(cotacao.valor_merc) : null;
  const percentual = valor !== null && valorMerc > 0 ? Math.round((valor / valorMerc) * 100 * 10000) / 10000 : null;
  const protocolo = cotacao.escolhida_protocolo
    ? `${PREFIXO[nomeBase] || nomeBase.slice(0, 3).toUpperCase()}-${cotacao.escolhida_protocolo}`
    : null;
  return {
    AD_NUMCOTFRETE: protocolo,
    AD_VLRCOTFRETE: valor,
    AD_PRZCOTFRETE: cotacao.escolhida_prazo_dias !== null ? Math.round(Number(cotacao.escolhida_prazo_dias)) : null,
    AD_PERCFRETE: percentual,
    AD_TRANSPCOT: (PARCEIRO_TRANSPORTADORA[codemp] || {})[chave] || null,
    AD_MOTIVOCOT: MOTIVO_NO_SANKHYA[cotacao.motivo_escolha] || null,
    AD_DTCOTFRETE: cotacao.criado_em ? dataParaSankhya(cotacao.criado_em) : null,
    AD_USUCOTFRETE: cotacao.usuario || null,
  };
}

// Texto curto do que vai ser gravado, para a tela de conferência.
function resumoParaTela(cotacao, campos) {
  return {
    protocolo: campos.AD_NUMCOTFRETE,
    transportadora: cotacao.escolhida_transportadora,
    modal: cotacao.escolhida_modal,
    valor: campos.AD_VLRCOTFRETE,
    prazoDias: campos.AD_PRZCOTFRETE,
    percentual: campos.AD_PERCFRETE,
    codparcTransportadora: campos.AD_TRANSPCOT,
    motivo: MOTIVO_TEXTO[cotacao.motivo_escolha] || cotacao.motivo_escolha,
    motivoCodigo: campos.AD_MOTIVOCOT,
    cotadoPor: cotacao.usuario,
    cotadoEm: campos.AD_DTCOTFRETE,
  };
}

async function lerNota(consultar, nunota) {
  // nunota já é inteiro validado — único valor que entra no SQL.
  const linhas = await consultar(`
    SELECT CAB.NUNOTA, CAB.CODEMP, RTRIM(EMP.NOMEFANTASIA) AS NOMEEMP, CAB.TIPMOV,
           CAB.DTNEG, CAB.VLRNOTA, CAB.CODPARC, RTRIM(PAR.NOMEPARC) AS NOMEPARC,
           PAR.CGC_CPF, CAB.AD_NUMCOTFRETE, CAB.AD_VLRCOTFRETE, CAB.AD_PRZCOTFRETE,
           CAB.AD_PERCFRETE, CAB.AD_TRANSPCOT, CAB.AD_MOTIVOCOT, CAB.AD_DTCOTFRETE,
           CAB.AD_USUCOTFRETE
    FROM TGFCAB CAB
    LEFT JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC
    LEFT JOIN TSIEMP EMP ON EMP.CODEMP = CAB.CODEMP
    WHERE CAB.NUNOTA = ${nunota}
  `);
  return linhas[0] || null;
}

// Tudo o que impede gravar, na ordem em que o operador precisa saber.
function avaliar(nota, cotacao) {
  const codemp = Number(nota.CODEMP);
  const jaTem = Boolean(nota.AD_NUMCOTFRETE) || (nota.AD_VLRCOTFRETE !== null && nota.AD_VLRCOTFRETE !== undefined);
  const bloqueios = [];
  if (!EMPRESAS_LIBERADAS.includes(codemp)) {
    bloqueios.push({
      tipo: 'empresa',
      titulo: `A nota ${nota.NUNOTA} é da empresa ${codemp} (${nota.NOMEEMP || 'sem nome'})`,
      texto: 'O motor ainda cota só a partir da Matriz, em BH. Gravar aqui registraria o frete de outra rota.',
    });
  }
  if (!TIPO_MOVIMENTO[nota.TIPMOV]) {
    bloqueios.push({
      tipo: 'movimento',
      titulo: `A nota ${nota.NUNOTA} não é pedido nem nota de venda`,
      texto: `O tipo de movimento dela é "${nota.TIPMOV}". A cotação de frete só vai em pedido ou nota de venda.`,
    });
  }
  if (jaTem) {
    const partes = [
      nota.AD_NUMCOTFRETE ? `Protocolo ${nota.AD_NUMCOTFRETE}` : null,
      nota.AD_VLRCOTFRETE !== null && nota.AD_VLRCOTFRETE !== undefined ? `R$ ${Number(nota.AD_VLRCOTFRETE).toFixed(2).replace('.', ',')}` : null,
      nota.AD_USUCOTFRETE ? `gravada por ${nota.AD_USUCOTFRETE}` : null,
      dataDoSankhya(nota.AD_DTCOTFRETE) ? `cotada em ${dataDoSankhya(nota.AD_DTCOTFRETE)}` : null,
    ].filter(Boolean);
    bloqueios.push({
      tipo: 'ja_tem',
      titulo: `A nota ${nota.NUNOTA} já tem uma cotação gravada`,
      texto: `${partes.join(' · ')}. A troca da cotação fica disponível quando o histórico de cotações na nota estiver pronto.`,
    });
  }
  const cnpjNota = soDigitos(nota.CGC_CPF);
  const cnpjCotado = soDigitos(cotacao.cnpj_dest);
  return {
    bloqueios,
    cnpjConfere: Boolean(cnpjNota) && cnpjNota === cnpjCotado,
    cnpjCotado: formatarCnpj(cnpjCotado),
  };
}

function notaParaTela(nota) {
  return {
    nunota: Number(nota.NUNOTA),
    tipo: TIPO_MOVIMENTO[nota.TIPMOV] || `Movimento ${nota.TIPMOV}`,
    data: dataDoSankhya(nota.DTNEG),
    codemp: Number(nota.CODEMP),
    empresa: nota.NOMEEMP,
    cliente: nota.NOMEPARC,
    cnpj: formatarCnpj(nota.CGC_CPF),
    valor: nota.VLRNOTA !== null ? Number(nota.VLRNOTA) : null,
  };
}

// Valida o pedido do navegador e carrega a cotação. Devolve { erro } ou
// { nunota, cotacao }.
async function prepararPedido(corpo) {
  const nunota = Number(corpo.nunota);
  const id = Number(corpo.id);
  if (!Number.isInteger(nunota) || nunota <= 0 || nunota > 2147483647) {
    return { erro: 'Digite o número da nota (NUNOTA) só com números.' };
  }
  if (!Number.isInteger(id) || id <= 0) {
    return { erro: 'Esta cotação não ficou guardada no histórico, então não há o que gravar na nota.' };
  }
  const cotacao = await lerCotacao(id);
  if (!cotacao) return { erro: 'Cotação não encontrada no histórico.' };
  if (!cotacao.escolhida_transportadora) {
    return { erro: 'Registre a transportadora escolhida antes de gravar na nota.' };
  }
  if (cotacao.nota_gravada_em) {
    return { erro: `Esta cotação já foi gravada na nota ${cotacao.nota_gravada_nunota}.` };
  }
  return { nunota, cotacao };
}

async function conferir(corpo) {
  const preparo = await prepararPedido(corpo);
  if (preparo.erro) return { erro: true, mensagem: preparo.erro };
  const { nunota, cotacao } = preparo;

  return comSessao(async ({ consultar }) => {
    const nota = await lerNota(consultar, nunota);
    if (!nota) return { erro: true, mensagem: `A nota ${nunota} não existe no Sankhya. Confira o número.` };
    const avaliacao = avaliar(nota, cotacao);
    const campos = montarCampos(cotacao, Number(nota.CODEMP));
    return {
      ok: true,
      nota: notaParaTela(nota),
      ...avaliacao,
      vaiGravar: resumoParaTela(cotacao, campos),
    };
  });
}

async function gravar(corpo) {
  const preparo = await prepararPedido(corpo);
  if (preparo.erro) return { erro: true, mensagem: preparo.erro };
  const { nunota, cotacao } = preparo;

  const resultado = await comSessao(async ({ consultar, salvar }) => {
    // Lê de novo: a conferência pode ter sido há minutos, e outra pessoa pode
    // ter gravado uma cotação nessa nota nesse meio-tempo.
    const nota = await lerNota(consultar, nunota);
    if (!nota) return { erro: true, mensagem: `A nota ${nunota} não existe no Sankhya.` };
    const avaliacao = avaliar(nota, cotacao);
    if (avaliacao.bloqueios.length) {
      return { erro: true, bloqueado: true, bloqueios: avaliacao.bloqueios, mensagem: avaliacao.bloqueios[0].titulo };
    }
    if (!avaliacao.cnpjConfere && corpo.confirmarCnpjDiferente !== true) {
      return { erro: true, mensagem: 'O cliente da nota não é o destinatário cotado. Confirme antes de gravar.' };
    }

    const campos = montarCampos(cotacao, Number(nota.CODEMP));
    // Formato do DatasetSP.save: a chave vai em pk, e os valores são indexados
    // pela posição do campo na lista "fields", começando em 1 (a posição 0 é
    // a própria chave). Campo sem valor fica de fora em vez de ir vazio.
    const nomes = Object.keys(campos);
    const values = {};
    nomes.forEach((nome, i) => {
      const v = campos[nome];
      if (v !== null && v !== undefined) values[String(i + 1)] = String(v);
    });
    await salvar({
      entityName: 'CabecalhoNota',
      standAlone: false,
      fields: ['NUNOTA', ...nomes],
      records: [{ pk: { NUNOTA: String(nunota) }, values }],
    });

    // Confere lendo de volta: "o serviço respondeu OK" não prova que o valor
    // certo está na nota (formato de data e de número são os suspeitos).
    const depois = await lerNota(consultar, nunota);
    const divergencias = [];
    if (campos.AD_NUMCOTFRETE && depois.AD_NUMCOTFRETE !== campos.AD_NUMCOTFRETE) divergencias.push('protocolo');
    if (campos.AD_VLRCOTFRETE !== null && Math.abs(Number(depois.AD_VLRCOTFRETE) - campos.AD_VLRCOTFRETE) > 0.005) divergencias.push('valor');
    if (campos.AD_PRZCOTFRETE !== null && Number(depois.AD_PRZCOTFRETE) !== campos.AD_PRZCOTFRETE) divergencias.push('prazo');
    if (campos.AD_TRANSPCOT !== null && Number(depois.AD_TRANSPCOT) !== campos.AD_TRANSPCOT) divergencias.push('transportadora');
    if (campos.AD_MOTIVOCOT && depois.AD_MOTIVOCOT !== campos.AD_MOTIVOCOT) divergencias.push('motivo');

    return { ok: true, nunota, vaiGravar: resumoParaTela(cotacao, campos), divergencias };
  });

  if (resultado.ok) {
    // Grava, lê, mostra (erro 2 do CLAUDE.md): o histórico passa a saber que
    // esta cotação está na nota, e o NUNOTA fica ligado a ela.
    try {
      await sql`
        UPDATE historico_cotacoes SET
          nota_gravada_em = now(),
          nota_gravada_nunota = ${nunota},
          nunota = ${nunota}
        WHERE id = ${cotacao.id}
      `;
    } catch (err) {
      resultado.avisoHistorico = 'Gravado na nota, mas o histórico do motor não registrou a gravação.';
    }
  }
  return resultado;
}

module.exports = { conferir, gravar, montarCampos, MOTIVO_NO_SANKHYA, PARCEIRO_TRANSPORTADORA };
