// Vercel Edge Middleware — protege TODO o site (a página e as funções em
// api/*) atrás de uma senha única compartilhada, usando o mecanismo nativo
// do navegador (HTTP Basic Auth): sem tela de login própria, sem cookie de
// sessão, sem conta por pessoa.
//
// Por quê essa versão e não a anterior: em 01/09/2026 foi feita uma versão
// com tela de login própria + sessão por cookie + múltiplas contas, que não
// funcionou de forma confiável ("nem por reza") e foi removida a pedido do
// Juan. Em 02/09/2026, ele pediu pra reintroduzir algum controle de acesso,
// mas explicitamente optando pela opção mais simples: uma senha única
// compartilhada pra toda a equipe de expedição, sem repetir a complexidade
// da versão anterior. Esta versão tem o menor número possível de partes
// móveis — nenhum código escreve nem lê cookie, cada requisição só confere o
// cabeçalho Authorization que o próprio navegador manda.
//
// Efeito colateral conhecido (avisado ao Juan): o navegador mostra a
// caixinha nativa dele pedindo usuário/senha (não uma tela bonita da RARE
// WAY) — é a troca consciente por confiabilidade máxima.
//
// Configuração (Vercel → Project Settings → Environment Variables):
//   MOTOR_SENHA = a senha que a equipe vai usar (defina o valor só lá,
//                 nunca em código nem em chat).
// Usuário fixo (não precisa cadastrar em lugar nenhum): rareway
//
// Enquanto MOTOR_SENHA não estiver cadastrada, o site funciona igual a hoje
// (sem pedir senha) — assim publicar este arquivo não trava nada até o Juan
// decidir ativar.

export const config = {
  matcher: ['/:path*'],
};

const USUARIO = 'rareway';

function pedirSenha() {
  return new Response('Autenticação necessária.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Motor de Cotacao RARE WAY"' },
  });
}

export default function middleware(request) {
  const senhaConfigurada = process.env.MOTOR_SENHA;

  // Sem senha cadastrada ainda no Vercel: não bloqueia nada (mesma lógica de
  // "recurso novo não trava o que já funciona" usada em todo o projeto).
  if (!senhaConfigurada) {
    return;
  }

  const cabecalho = request.headers.get('authorization');
  if (cabecalho && cabecalho.startsWith('Basic ')) {
    try {
      const decodificado = atob(cabecalho.slice(6));
      const separador = decodificado.indexOf(':');
      const usuario = decodificado.slice(0, separador);
      const senha = decodificado.slice(separador + 1);
      if (usuario === USUARIO && senha === senhaConfigurada) {
        return;
      }
    } catch {
      // Cabeçalho corrompido/ilegível — cai para pedir a senha de novo.
    }
  }

  return pedirSenha();
}
