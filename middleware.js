// Vercel Edge Middleware — protege TODO o site (a pagina e as funcoes em
// api/*) atras de uma senha unica compartilhada.
//
// Historico: o sistema original de login individual (varias contas,
// cookie de sessao) foi removido em 01/09/2026 a pedido do Juan porque
// "nao funcionou de forma confiavel (nem por reza)". Foi substituido por
// HTTP Basic Auth nativo do navegador (simples, sem tela propria).
//
// Agora a Basic Auth do navegador foi trocada por uma tela de login
// customizada (login.html) com a identidade visual da RARE WAY, mantendo
// o mesmo modelo de senha unica compartilhada — sem conta por pessoa.
// A sessao e guardada num cookie assinado (HMAC-SHA256, chave derivada
// da propria MOTOR_SENHA, sem variavel de ambiente nova), verificado aqui
// com Web Crypto (o runtime de Edge nao tem o modulo "crypto" do Node).

export const config = {
  matcher: ['/:path*'],
};

const COOKIE_NAME = 'motor_sessao';

function base64urlDecode(input) {
  let b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacKey(segredo) {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

async function verificarSessao(cabecalhoCookie, senhaConfigurada) {
  if (!cabecalhoCookie) return false;
  const match = cabecalhoCookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return false;

  const token = decodeURIComponent(match[1]);
  const ponto = token.lastIndexOf('.');
  if (ponto < 0) return false;

  const payloadB64 = token.slice(0, ponto);
  const assinaturaB64 = token.slice(ponto + 1);

  try {
    const chave = await hmacKey(senhaConfigurada);
    const assinaturaBytes = base64urlDecode(assinaturaB64);
    const payloadBytes = new TextEncoder().encode(payloadB64);
    const valido = await crypto.subtle.verify('HMAC', chave, assinaturaBytes, payloadBytes);
    if (!valido) return false;

    const jsonStr = new TextDecoder().decode(base64urlDecode(payloadB64));
    const dados = JSON.parse(jsonStr);
    if (!dados.exp || Date.now() > dados.exp) return false;

    return true;
  } catch {
    return false;
  }
}

export default async function middleware(request) {
  const senhaConfigurada = process.env.MOTOR_SENHA;
  if (!senhaConfigurada) {
    return;
  }

  const url = new URL(request.url);
  const path = url.pathname;

  // A propria pagina de login e o endpoint que a valida ficam sempre livres.
  if (path === '/login.html' || path === '/api/login') {
    return;
  }

  const autenticado = await verificarSessao(request.headers.get('cookie'), senhaConfigurada);
  if (autenticado) {
    return;
  }

  if (path.startsWith('/api/')) {
    return new Response(JSON.stringify({ erro: true, mensagem: 'Nao autenticado.' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const destino = new URL('/login.html', request.url);
  destino.searchParams.set('next', path + url.search);
  return Response.redirect(destino, 307);
}
