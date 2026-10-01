// Conversa com o Sankhya pelo API Gateway (o mesmo caminho do script
// sankhya.mjs que o Juan usa no terminal, com as mesmas credenciais).
//
// Por que um arquivo só para isso: autenticar, chamar um serviço e sair são
// sempre os mesmos três passos, e errar qualquer um deles tem custo real —
// cada /authenticate abre uma sessão no ERP, e sessão sem logout fica
// pendurada ~15 minutos. Muitas autenticações seguidas fazem o Gateway
// recusar com HTTP 400 "Erro ao se autenticar com o serviço externo" (visto
// em 30/09/2026). Por isso toda chamada passa por comSessao(), que garante o
// logout mesmo quando algo dá errado no meio.
//
// Credenciais só por variável de ambiente, digitadas pelo Juan direto no
// painel da Vercel: SANKHYA_CLIENT_ID, SANKHYA_CLIENT_SECRET, SANKHYA_XTOKEN.

const BASE = process.env.SANKHYA_BASE_URL || 'https://api.sankhya.com.br';
const TIMEOUT_MS = 15000;

function credenciaisConfiguradas() {
  return Boolean(process.env.SANKHYA_CLIENT_ID && process.env.SANKHYA_CLIENT_SECRET && process.env.SANKHYA_XTOKEN);
}

// O Gateway devolve UTF-8 sem declarar o charset; sem decodificar à mão,
// "BONIFICAÇÕES" chega como "BONIFICAÃ‡Ã•ES".
async function lerTexto(resp) {
  const buf = await resp.arrayBuffer();
  return new TextDecoder('utf-8').decode(buf);
}

async function comTimeout(url, opcoes) {
  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...opcoes, signal: controlador.signal });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`O Sankhya não respondeu em ${TIMEOUT_MS / 1000}s.`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function autenticar() {
  const resp = await comTimeout(`${BASE}/authenticate`, {
    method: 'POST',
    headers: { 'X-Token': process.env.SANKHYA_XTOKEN, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.SANKHYA_CLIENT_ID,
      client_secret: process.env.SANKHYA_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });
  const texto = await lerTexto(resp);
  let dados = {};
  try { dados = JSON.parse(texto); } catch { /* resposta não-JSON cai no erro abaixo */ }
  if (!resp.ok || !dados.access_token) {
    // Não devolve o corpo inteiro: pode conter eco das credenciais.
    throw new Error(`Não foi possível entrar no Sankhya (HTTP ${resp.status}).`);
  }
  return dados.access_token;
}

async function chamar(token, serviceName, requestBody) {
  const url = `${BASE}/gateway/v1/mge/service.sbr?serviceName=${encodeURIComponent(serviceName)}&outputType=json`;
  const resp = await comTimeout(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify({ serviceName, requestBody }),
  });
  const texto = await lerTexto(resp);
  let json;
  try { json = JSON.parse(texto); } catch {
    throw new Error(`O Sankhya respondeu algo inesperado (HTTP ${resp.status}).`);
  }
  // status "1" é sucesso; qualquer outro vem com statusMessage explicando.
  if (String(json.status) !== '1') {
    throw new Error(json.statusMessage || `O Sankhya recusou ${serviceName}.`);
  }
  return json.responseBody || {};
}

async function sair(token) {
  try { await chamar(token, 'MobileLoginSP.logout', {}); } catch { /* expira sozinha */ }
}

// Abre uma sessão, roda o que for preciso e sai — uma autenticação por
// pedido do operador, nunca uma por consulta.
async function comSessao(trabalho) {
  const token = await autenticar();
  try {
    return await trabalho({
      consultar: (sqlTexto) => consultar(token, sqlTexto),
      salvar: (corpo) => chamar(token, 'DatasetSP.save', corpo),
    });
  } finally {
    await sair(token);
  }
}

// SELECT pelo DbExplorerSP. Devolve uma lista de objetos { COLUNA: valor }.
// Quem chama monta o SQL só com números já validados — nunca texto vindo do
// navegador — porque este serviço não tem parâmetros.
async function consultar(token, sqlTexto) {
  const corpo = await chamar(token, 'DbExplorerSP.executeQuery', { sql: sqlTexto, maxRows: 50 });
  const colunas = (corpo.fieldsMetadata || []).map((f) => f.name);
  return (corpo.rows || []).map((linha) => Object.fromEntries(colunas.map((c, i) => [c, linha[i]])));
}

module.exports = { credenciaisConfiguradas, comSessao };
