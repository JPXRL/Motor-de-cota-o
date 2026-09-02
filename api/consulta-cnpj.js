// Serverless function: busca dados de uma empresa só pelo CNPJ, usando a API
// pública e gratuita da CNPJá (https://cnpja.com/en/api/open) — não precisa de
// chave/token. Uso: quando o destinatário ainda não está cadastrado no Sankhya
// (ou a busca por lá ainda não existe nesta versão interina), o operador pode
// digitar só o CNPJ aqui e o formulário se preenche sozinho com os dados
// oficiais da Receita Federal.
//
// Limite da CNPJá: 5 consultas por minuto por IP (serviço gratuito, sem login).
// Se bater no limite, devolvemos um erro claro pra tentar de novo em instantes.

function soNumeros(v) {
  return String(v || '').replace(/\D/g, '');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ erro: true, mensagem: 'Método não permitido' });
    return;
  }

  // Trava simples contra CSRF — ver comentário equivalente em jamef-cotar.js.
  if (req.headers['x-requested-with'] !== 'motor-rareway') {
    res.status(403).json({ erro: true, mensagem: 'Requisição não autorizada.' });
    return;
  }

  try {
    const cnpj = soNumeros(req.method === 'GET' ? req.query.cnpj : req.body?.cnpj);
    if (cnpj.length !== 14) {
      res.status(200).json({ erro: true, mensagem: 'CNPJ inválido — precisa ter 14 dígitos.' });
      return;
    }

    const resp = await fetch(`https://open.cnpja.com/office/${cnpj}`);

    if (resp.status === 429) {
      res.status(200).json({ erro: true, mensagem: 'Limite de consultas por CNPJ atingido (a API gratuita permite só 5 por minuto). Aguarde um minuto e tente de novo.' });
      return;
    }
    if (resp.status === 404) {
      res.status(200).json({ erro: true, mensagem: 'CNPJ não encontrado na base da Receita Federal.' });
      return;
    }
    if (!resp.ok) {
      res.status(200).json({ erro: true, mensagem: `Consulta de CNPJ retornou HTTP ${resp.status}.` });
      return;
    }

    const json = await resp.json();
    const endereco = json.address || {};
    const enderecoTexto = [
      endereco.street,
      endereco.number,
      endereco.district,
    ].filter(Boolean).join(', ');

    res.status(200).json({
      razaoSocial: json.company?.name || '',
      nomeFantasia: json.alias || '',
      cep: endereco.zip || '',
      endereco: enderecoTexto,
      cidadeUf: endereco.city ? `${endereco.city} - ${endereco.state || ''}`.trim() : '',
      situacao: json.status?.text || '',
    });
  } catch (err) {
    res.status(200).json({ erro: true, mensagem: err.message || 'Erro ao consultar o CNPJ' });
  }
};
