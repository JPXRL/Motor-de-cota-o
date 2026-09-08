// Serverless function: cotação de frete via Rodonaves.
//
// Diferente da Jamef/Braspress (um domínio, um token), a Rodonaves espalha os
// recursos em TRÊS domínios diferentes, cada um com seu próprio login/token
// (ver especificacao-api-rodonaves.md, seção 1). Por isso esta função faz três
// chamadas em sequência/paralelo, cada uma com seu próprio token:
//   1) busca de cidade (resolve o CEP num id interno da Rodonaves)
//   2) cotação de frete propriamente dita
//   3) prazo de entrega (endpoint separado — a cotação não devolve prazo)
//
// Variáveis de ambiente (Vercel → Project Settings → Environment Variables):
//   RODONAVES_USERNAME          usuário do portal de desenvolvedores da Rodonaves
//   RODONAVES_PASSWORD          senha do portal
//   RODONAVES_CNPJ_REMETENTE    CNPJ da RARE WAY usado como remetente/pagante
//   RODONAVES_CEP_ORIGEM        CEP de onde a mercadoria sai
//   RODONAVES_CONTATO_NOME      nome do contato — campo obrigatório da cotação
//   RODONAVES_CONTATO_TELEFONE  telefone do contato — campo obrigatório da cotação
//
// Atenção: especificação ainda não testada com uma chamada real (ver
// especificacao-api-rodonaves.md, seção 6). Dois pontos em aberto tratados
// aqui com uma escolha explícita, registrada nos comentários abaixo:
//   - PayerSelected (quem paga o frete): os valores possíveis não estão
//     documentados, então este campo NÃO é enviado — deixamos a Rodonaves
//     aplicar o padrão dela até sabermos os códigos certos.
//   - UF de origem/destino (exigida só no prazo de entrega, a busca de
//     cidade não devolve UF): derivada aqui a partir dos dois primeiros
//     dígitos do código do IBGE (tabela pública e fixa, não depende de
//     resposta da Rodonaves).
// A primeira cotação real feita por esta função também serve de teste para
// confirmar se os formatos batem com o documentado — por isso ela loga a
// resposta bruta da cotação nos logs do Vercel na primeira chamada.

const DOMINIO_COTACAO = 'https://quotation-apigateway.rte.com.br';
const DOMINIO_CIDADE = 'https://dne-api.rte.com.br';
const DOMINIO_PRAZO = 'https://01wapi.rte.com.br';

// Cada domínio exige seu próprio login — um cache de token por domínio.
const tokenCachePorDominio = new Map();

function soNumeros(v) {
  return String(v || '').replace(/\D/g, '');
}

async function getToken(dominio) {
  const agora = Date.now();
  const cache = tokenCachePorDominio.get(dominio);
  if (cache && agora < cache.expiresAt) {
    return cache.token;
  }

  const params = new URLSearchParams();
  params.set('grant_type', 'password');
  params.set('username', process.env.RODONAVES_USERNAME || '');
  params.set('password', process.env.RODONAVES_PASSWORD || '');
  params.set('companyId', '1');
  // A Rodonaves documenta esse valor como "dev" minúsculo no texto da doc de
  // autenticação, mas o formulário "Try It!" da própria doc interativa (que o
  // Juan testou manualmente em várias APIs — Correios, Coleta, Cliente, etc.
  // — e todas deram 200) usa "DEV" maiúsculo como valor padrão. Foi esse teste
  // manual que apontou a causa provável do HTTP 400 que a gente via aqui: a
  // API parece ser sensível a maiúscula/minúscula nesse campo.
  params.set('auth_type', 'DEV');

  const resp = await fetch(`${dominio}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const textoResposta = await resp.text();
  let json = null;
  try { json = JSON.parse(textoResposta); } catch { /* resposta não era JSON */ }
  const token = json?.access_token || json?.accessToken;
  if (!resp.ok || !token) {
    // Loga o corpo da resposta de erro da Rodonaves (não contém a senha —
    // essa vai só na nossa requisição, nunca na resposta deles) para dar
    // pra descobrir a causa real (usuário/senha errados, companyId errado,
    // conta não liberada pra esse domínio específico, etc.) em vez de só
    // "HTTP 400". Ver nos Logs do projeto no Vercel (aba Logs/Functions).
    console.error(`[rodonaves-cotar] falha no login em ${dominio}:`, JSON.stringify({ status: resp.status, resposta: textoResposta.slice(0, 1000) }));
    const motivo = json?.error_description || json?.error || json?.message || textoResposta.slice(0, 200);
    throw new Error(`Falha no login da Rodonaves em ${dominio} (HTTP ${resp.status})${motivo ? `: ${motivo}` : ''}`);
  }

  // A doc de autenticação não documenta a validade do token para este fluxo
  // — usa expires_in quando vier, senão renova a cada 10 minutos por
  // segurança (bem menos que a 1h da Jamef, já que isso aqui é uma suposição).
  const expiresInMs = json?.expires_in ? json.expires_in * 1000 : 10 * 60 * 1000;
  tokenCachePorDominio.set(dominio, { token, expiresAt: agora + expiresInMs - 30000 });
  return token;
}

// Remove acentos e deixa maiúsculo — formato exigido pelo endpoint de prazo
// de entrega (ex.: "RIBEIRAO PRETO").
// Feito com comparação numérica de código de caractere (em vez de uma classe
// de regex com acentos) para não depender de nenhum caractere especial no
// arquivo-fonte — os acentos (a til, c cedilha, etc.) viram "marcas
// combinantes" separadas depois do normalize('NFD'), na faixa Unicode
// 0x0300 a 0x036F.
function normalizarNomeCidade(nome) {
  const semAcento = Array.from(String(nome || '').normalize('NFD'))
    .filter((ch) => {
      const codigo = ch.codePointAt(0);
      return codigo < 0x0300 || codigo > 0x036f;
    })
    .join('');
  return semAcento.toUpperCase();
}

// Os dois primeiros dígitos do código do IBGE identificam o estado — tabela
// pública e fixa (não depende de nenhuma resposta da Rodonaves).
const UF_POR_PREFIXO_IBGE = {
  11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO',
  21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA',
  31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP',
  41: 'PR', 42: 'SC', 43: 'RS',
  50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF',
};

function ufPorCodigoIbge(ibgeCityCode) {
  const prefixo = Number(String(ibgeCityCode || '').slice(0, 2));
  return UF_POR_PREFIXO_IBGE[prefixo] || null;
}

async function buscarCidade(cep) {
  const token = await getToken(DOMINIO_CIDADE);
  const resp = await fetch(`${DOMINIO_CIDADE}/api/cities/byzipcode?zipCode=${encodeURIComponent(soNumeros(cep))}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await resp.json().catch(() => null);
  if (!resp.ok || !json?.Id) {
    throw new Error(`Rodonaves não encontrou a cidade do CEP ${cep} (HTTP ${resp.status})`);
  }
  return { id: json.Id, descricao: json.Description, ibge: json.IbgeCityCode };
}

async function calcularPrazo(origem, destino) {
  const ufOrigem = ufPorCodigoIbge(origem.ibge);
  const ufDestino = ufPorCodigoIbge(destino.ibge);
  if (!ufOrigem || !ufDestino) {
    throw new Error('Não foi possível determinar a UF de origem/destino a partir do código do IBGE.');
  }

  const token = await getToken(DOMINIO_PRAZO);
  const resp = await fetch(`${DOMINIO_PRAZO}/api/v1/prazo-entrega`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      OriginCityDescription: normalizarNomeCidade(origem.descricao),
      OriginUFDescription: ufOrigem,
      DestinationCityDescription: normalizarNomeCidade(destino.descricao),
      DestinationUFDescription: ufDestino,
    }),
  });
  const json = await resp.json().catch(() => null);
  if (!resp.ok || typeof json?.DeliveryTime !== 'number') {
    throw new Error(`Rodonaves não devolveu o prazo de entrega (HTTP ${resp.status})`);
  }
  return json.DeliveryTime;
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
    const { cnpjDest, cepDest, valorMerc, pesoTotal, volumes } = req.body || {};

    const cnpjRemetente = process.env.RODONAVES_CNPJ_REMETENTE;
    const cepOrigem = process.env.RODONAVES_CEP_ORIGEM;
    const contatoNome = process.env.RODONAVES_CONTATO_NOME;
    const contatoTelefone = process.env.RODONAVES_CONTATO_TELEFONE;

    if (!cnpjRemetente || !cepOrigem || !contatoNome || !contatoTelefone) {
      res.status(200).json({
        erro: true,
        mensagem: 'Backend sem configuração: faltam variáveis RODONAVES_* no Vercel (CNPJ_REMETENTE, CEP_ORIGEM, CONTATO_NOME, CONTATO_TELEFONE).',
      });
      return;
    }

    // 1. Busca de cidade — resolve o id interno da Rodonaves a partir do CEP,
    //    pra origem e destino (endpoint separado, domínio e token próprios).
    const [origem, destino] = await Promise.all([
      buscarCidade(cepOrigem),
      buscarCidade(cepDest),
    ]);

    // 2. Cotação de frete propriamente dita.
    const listaVolumes = volumes || [];
    const totalPackages = listaVolumes.reduce((s, v) => s + (v.qtd || 1), 0);
    // A doc não deixa claro se "Weight" em cada item de Packs é o peso da
    // unidade ou do lote — assumimos peso total distribuído proporcionalmente
    // pela quantidade de cada tipo de volume. A primeira chamada real (log
    // abaixo) ajuda a confirmar se isso bate com o que a Rodonaves espera.
    const packs = listaVolumes.map((v) => ({
      AmountPackages: v.qtd || 1,
      Weight: totalPackages > 0 ? +((pesoTotal * (v.qtd || 1)) / totalPackages).toFixed(3) : pesoTotal,
      Length: v.comprimento || 0,
      Height: v.altura || 0,
      Width: v.largura || 0,
    }));

    const tokenCotacao = await getToken(DOMINIO_COTACAO);
    const respCotacao = await fetch(`${DOMINIO_COTACAO}/api/v1/gera-cotacao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCotacao}` },
      body: JSON.stringify({
        OriginZipCode: soNumeros(cepOrigem),
        OriginCityId: origem.id,
        DestinationZipCode: soNumeros(cepDest),
        DestinationCityId: destino.id,
        TotalWeight: pesoTotal,
        EletronicInvoiceValue: valorMerc,
        CustomerTaxIdRegistration: soNumeros(cnpjRemetente),
        ReceiverCpfcnp: soNumeros(cnpjDest),
        ContactName: contatoNome,
        ContactPhoneNumber: soNumeros(contatoTelefone),
        TotalPackages: totalPackages,
        Packs: packs,
        // PayerSelected: não enviado de propósito — ver comentário no topo do arquivo.
      }),
    });

    const textoCotacao = await respCotacao.text();
    let jsonCotacao = null;
    try { jsonCotacao = JSON.parse(textoCotacao); } catch { /* resposta não era JSON */ }
    // A primeira cotação real (08/09/2026) mostrou que a resposta de verdade
    // da Rodonaves usa nomes de campo diferentes do que a especificação da
    // documentação sugeria: é "ProtocolNumber" (não "ProtocolId") e "Value"
    // (não "FreightValue"). Ajustado aqui com base na resposta real, não mais
    // um palpite.
    if (!respCotacao.ok || !jsonCotacao?.ProtocolNumber) {
      // Mostra um pedaço da resposta bruta da Rodonaves na própria mensagem de
      // erro (não só no log do Vercel) — assim dá pra ver o motivo direto na
      // tela, sem precisar abrir o painel do Vercel. Response da Rodonaves,
      // não tem credencial nenhuma aqui.
      console.error('[rodonaves-cotar] resposta de erro da Rodonaves:', JSON.stringify({ status: respCotacao.status, resposta: textoCotacao.slice(0, 1000) }));
      const motivo = jsonCotacao?.message || jsonCotacao?.mensagem || jsonCotacao?.errors?.[0]?.message || textoCotacao.slice(0, 300);
      res.status(200).json({
        erro: true,
        mensagem: `Rodonaves retornou HTTP ${respCotacao.status} na cotação${motivo ? `: ${motivo}` : ' (resposta sem ProtocolNumber)'}`,
      });
      return;
    }

    // 3. Prazo de entrega: a própria cotação já devolve "DeliveryTime" (visto
    //    na primeira chamada real) — só cai pro endpoint separado de prazo se
    //    por acaso vier vazio nessa resposta específica.
    let prazoDias = jsonCotacao.DeliveryTime;
    if (prazoDias === null || prazoDias === undefined) {
      try {
        prazoDias = await calcularPrazo(origem, destino);
      } catch (errPrazo) {
        console.error('[rodonaves-cotar] falha ao buscar prazo de entrega:', errPrazo.message);
        prazoDias = '—';
      }
    }

    res.status(200).json({
      valor: parseFloat(jsonCotacao.Value),
      prazoDias,
      protocolo: jsonCotacao.ProtocolNumber,
    });
  } catch (err) {
    res.status(200).json({ erro: true, mensagem: err.message || 'Erro ao consultar a Rodonaves' });
  }
};
