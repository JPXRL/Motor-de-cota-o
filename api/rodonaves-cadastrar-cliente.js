// Serverless function: cadastra o destinatário na base da Rodonaves.
//
// Por que existe: em 46 cotações consultando a Rodonaves (08 a 23/09), a maior
// causa isolada de falha foi HTTP 400 "Cliente destinatário não encontrado" —
// 7 ocorrências, a mais recente no próprio dia 23. Não é cobertura nem rota:
// a Rodonaves exige que o destinatário exista na base dela ANTES de cotar.
// A documentação deles tem o endpoint para isso (savecustomer), e é ele que
// esta função chama.
//
// ATENÇÃO — esta função ESCREVE no TMS da Rodonaves. Não é consulta: cria
// registro de cliente no sistema deles, com endereço que normalmente vem da
// Receita Federal e nem sempre é o endereço real de entrega. Por isso ela
// nunca é chamada sozinha: a tela mostra ao operador exatamente o que será
// enviado e só chama depois da confirmação. Se algum dia alguém for ligar
// isso num fluxo automático, essa é a decisão que precisa ser reavaliada,
// não um detalhe de implementação.
//
// O domínio é outro (customer-apigateway), com /token próprio. As mesmas
// credenciais RODONAVES_USERNAME/PASSWORD devem servir: o Juan testou o
// "Try It!" da doc do Cliente manualmente e recebeu 200 (ver comentário sobre
// auth_type em rodonaves-cotar.js).

const DOMINIO_CLIENTE = 'https://customer-apigateway.rte.com.br';

// Mesmo cache/rotina de token de rodonaves-cotar.js. Está duplicado porque
// cada função serverless é um arquivo isolado e o projeto ainda não tem uma
// pasta compartilhada — se um terceiro consumidor aparecer, vale extrair.
const tokenCachePorDominio = new Map();

function soNumeros(v) {
  return String(v || '').replace(/\D/g, '');
}

async function getToken(dominio) {
  const agora = Date.now();
  const cache = tokenCachePorDominio.get(dominio);
  if (cache && agora < cache.expiresAt) return cache.token;

  const params = new URLSearchParams();
  params.set('grant_type', 'password');
  params.set('username', process.env.RODONAVES_USERNAME || '');
  params.set('password', process.env.RODONAVES_PASSWORD || '');
  params.set('companyId', '1');
  params.set('auth_type', 'DEV');

  const resp = await fetch(`${dominio}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const texto = await resp.text();
  let json = null;
  try { json = JSON.parse(texto); } catch { /* resposta não era JSON */ }
  const token = json?.access_token || json?.accessToken;
  if (!resp.ok || !token) {
    console.error('[rodonaves-cadastrar-cliente] falha no login:', JSON.stringify({ dominio, status: resp.status, resposta: texto.slice(0, 500) }));
    throw new Error(`Login na Rodonaves (cliente) falhou: HTTP ${resp.status}`);
  }
  const segundos = Number(json.expires_in || 3600);
  tokenCachePorDominio.set(dominio, { token, expiresAt: agora + (segundos - 60) * 1000 });
  return token;
}

// Campos que a Rodonaves marca como required no savecustomer. Validar aqui
// evita mandar cadastro pela metade e receber um 400 genérico de volta.
const OBRIGATORIOS = [
  ['razaoSocial', 'Razão social'],
  ['cnpj', 'CNPJ'],
  ['email', 'E-mail'],
  ['telefone', 'Telefone'],
  ['cep', 'CEP'],
  ['logradouro', 'Endereço (rua)'],
  ['numero', 'Número'],
  ['bairro', 'Bairro'],
  ['cidade', 'Cidade'],
  ['uf', 'UF'],
];

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: true, mensagem: 'Método não permitido' });
    return;
  }

  // Mesma trava simples contra CSRF usada nas outras funções.
  if (req.headers['x-requested-with'] !== 'motor-rareway') {
    res.status(403).json({ erro: true, mensagem: 'Requisição não autorizada.' });
    return;
  }

  const c = req.body || {};
  const faltando = OBRIGATORIOS.filter(([campo]) => !String(c[campo] || '').trim()).map(([, rotulo]) => rotulo);
  if (faltando.length) {
    res.status(200).json({
      erro: true,
      mensagem: `Faltam dados obrigatórios para o cadastro na Rodonaves: ${faltando.join(', ')}.`,
    });
    return;
  }

  try {
    const token = await getToken(DOMINIO_CLIENTE);
    const corpo = {
      Description: String(c.razaoSocial).trim(),
      TaxIdRegistration: soNumeros(c.cnpj),
      StadualIdRegistration: String(c.inscricaoEstadual || '').trim(),
      Email: String(c.email).trim(),
      Phone: soNumeros(c.telefone),
      ZipCode: soNumeros(c.cep),
      Street: String(c.logradouro).trim(),
      Number: String(c.numero).trim(),
      Supplement: String(c.complemento || '').trim(),
      District: String(c.bairro).trim(),
      City: String(c.cidade).trim(),
      UnitFederation: String(c.uf).trim().toUpperCase().slice(0, 2),
    };

    const resp = await fetch(`${DOMINIO_CLIENTE}/api/v1/customer/savecustomer`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // A doc marca este content-type como o padrão do endpoint.
        'Content-Type': 'application/json-patch+json',
      },
      body: JSON.stringify(corpo),
    });

    const texto = await resp.text();
    let json = null;
    try { json = JSON.parse(texto); } catch { /* resposta não era JSON */ }

    if (!resp.ok) {
      // Loga e devolve o corpo cru: é a resposta deles, sem credencial
      // nenhuma, e é o que permite descobrir qual campo eles recusaram sem
      // precisar abrir o painel do Vercel.
      console.error('[rodonaves-cadastrar-cliente] recusado:', JSON.stringify({ status: resp.status, resposta: texto.slice(0, 1000) }));
      const motivo = json?.Message || json?.message || json?.errors?.[0]?.message || texto.slice(0, 300);
      res.status(200).json({
        erro: true,
        mensagem: `Rodonaves recusou o cadastro (HTTP ${resp.status})${motivo ? `: ${motivo}` : ''}`,
      });
      return;
    }

    res.status(200).json({ ok: true, resposta: json ?? null });
  } catch (err) {
    res.status(200).json({ erro: true, mensagem: err.message || 'Erro ao cadastrar o destinatário na Rodonaves.' });
  }
};
