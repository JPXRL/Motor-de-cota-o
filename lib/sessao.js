// Cria e le o cookie de sessao (motor_sessao) do login de senha unica.
//
// Por que existe: ate 29/09/2026 o login.js criava o cookie de um jeito e o
// me.js tentava ler outro (rw_session, do antigo login por conta, removido
// em 01/09). O me.js nunca achava ninguem, e a coluna "usuario" do historico
// ficou vazia desde entao. Criar e ler no mesmo arquivo impede que os dois
// lados se desencontrem de novo.
//
// O cookie leva a validade e o nome que o operador digitou no login. O nome
// e declarado, nao comprovado (a senha e a mesma para todos), mas nao pode
// ser trocado depois: o conteudo e assinado com a propria MOTOR_SENHA, e
// qualquer alteracao invalida a assinatura.
//
// O middleware.js confere a mesma assinatura por conta propria, com Web
// Crypto, porque roda no Edge da Vercel, onde o modulo "crypto" do Node nao
// existe. Se o formato mudar aqui, precisa mudar la tambem.

const { createHmac, timingSafeEqual } = require('crypto');

const NOME_COOKIE = 'motor_sessao';
const DURACAO_SESSAO_MS = 12 * 60 * 60 * 1000; // 12 horas
const TAMANHO_MAXIMO_NOME = 40;

function assinar(valor, segredo) {
  return createHmac('sha256', segredo).update(valor).digest('base64url');
}

// Comparacao em tempo constante: uma comparacao comum termina mais cedo no
// primeiro caractere diferente, e essa diferenca de tempo ajuda quem tenta
// adivinhar a assinatura.
function comparacaoSegura(a, b) {
  const bufA = Buffer.from(String(a), 'utf-8');
  const bufB = Buffer.from(String(b), 'utf-8');
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

// Limpa o nome na hora de guardar (erro 6 do CLAUDE.md: guardar de um jeito
// e comparar de outro). Espacos sobrando viravam "Ana" e "Ana " como duas
// pessoas diferentes no historico.
function normalizarNome(nome) {
  return String(nome || '').replace(/\s+/g, ' ').trim().slice(0, TAMANHO_MAXIMO_NOME);
}

function criarCookie(usuario, senha) {
  const exp = Date.now() + DURACAO_SESSAO_MS;
  const payload = Buffer.from(JSON.stringify({ exp, usuario }), 'utf-8').toString('base64url');
  const token = `${payload}.${assinar(payload, senha)}`;
  return `${NOME_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(DURACAO_SESSAO_MS / 1000)}`;
}

// Devolve { exp, usuario } se o cookie for valido e estiver no prazo, ou
// null. Sessao criada antes do campo de nome e valida, mas vem sem usuario.
function lerSessao(cabecalhoCookie, senha) {
  if (!cabecalhoCookie || !senha) return null;
  const achado = cabecalhoCookie.match(new RegExp(`(?:^|;\\s*)${NOME_COOKIE}=([^;]+)`));
  if (!achado) return null;

  const token = decodeURIComponent(achado[1]);
  const ponto = token.lastIndexOf('.');
  if (ponto < 0) return null;

  const payload = token.slice(0, ponto);
  if (!comparacaoSegura(token.slice(ponto + 1), assinar(payload, senha))) return null;

  try {
    const dados = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (!dados.exp || Date.now() > dados.exp) return null;
    return { exp: dados.exp, usuario: normalizarNome(dados.usuario) || null };
  } catch {
    return null;
  }
}

module.exports = { criarCookie, lerSessao, normalizarNome, comparacaoSegura, NOME_COOKIE };
