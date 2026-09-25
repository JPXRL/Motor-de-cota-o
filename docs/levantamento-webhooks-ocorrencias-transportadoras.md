# Levantamento — Webhook de Ocorrências por Transportadora

> Objetivo desta pesquisa: depois de repassar as especificações de cotação e rastreio (Jamef e Braspress) para a equipe de TI, verificar se as transportadoras oferecem **webhook** (ou mecanismo parecido) para **receber automaticamente** as ocorrências de carga — em vez de precisar "ficar perguntando" (consultando a API de tempos em tempos) para saber se algo mudou. A ideia de fundo é centralizar as ocorrências de todas as transportadoras em um só lugar dentro do sistema de força de vendas da TI.
>
> **O que é um webhook, em uma frase:** é o contrário de "ligar perguntando se chegou" — é a transportadora "te ligando" automaticamente assim que algo acontece com a carga. Tecnicamente, a empresa cadastra um endereço (URL) do seu próprio sistema, e a transportadora manda os dados pra lá sozinha, na hora, sempre que houver uma atualização.
>
> Pesquisa feita em 28/08/2026, direto nos portais de desenvolvedores oficiais de cada transportadora. Recomendação de arquitetura e pergunta pronta pra Rodonaves adicionadas em 03/09/2026 (ver seções ao final).

## Resumo — o que cada transportadora oferece

| Transportadora | Tem webhook de ocorrências? | Como funciona hoje |
|---|---|---|
| **Jamef** | **Sim** | Webhook nativo, self-service, configurável direto no Portal Developers. Cobre exatamente o caso de uso pedido: ocorrências de carga em tempo real. |
| **Braspress** | **Não** | A documentação oficial só mostra a API de cotação e a API de tracking (v1/v2/v3) — as duas por consulta manual (a empresa pergunta, a Braspress responde). Não há nenhuma seção de webhook/notificação no portal oficial. |
| **Rodonaves** | **Não é um webhook self-service como o da Jamef** | Existe um mecanismo de troca de arquivo (EDI) chamado **OCOREN**, que carrega justamente as ocorrências de entrega — mas a documentação pública não deixa claro se ele é "empurrado" automaticamente (parecido com webhook) ou se precisa ser buscado/agendado. Precisa perguntar direto pra Rodonaves. |

## 1. Jamef — tem webhook, e é exatamente o que foi pedido

O Portal Developers da Jamef (developers.jamef.com.br) documenta **3 tipos de webhook**, todos configuráveis pela área logada, em **Configurações > Ambientes > Webhook > Nova Aplicação**:

| Webhook | Para que serve | Formato enviado |
|---|---|---|
| **Webhook Eventos de Ocorrências** | Manda automaticamente cada evento/ocorrência de uma carga assim que acontece (ex.: "em rota de entrega", "entrega realizada", "mercadoria retida na fiscalização") — **é este que serve para centralizar as ocorrências**. | JSON |
| Webhook Comprovantes de Entrega | Manda automaticamente o comprovante de entrega assim que ele fica disponível (em 3 formatos possíveis: Base64, arquivo binário, ou link de download válido por 15 minutos). | JSON (com o comprovante em um dos 3 formatos acima) |
| Webhook Envio de XML | Manda automaticamente o XML do CT-e assim que ele é autorizado pela Sefaz. | XML |

**Como funciona o Webhook Eventos de Ocorrências, em detalhe:**
- A RARE WAY cadastra uma URL (do sistema da TI) que vai receber os avisos.
- Toda vez que houver uma ocorrência numa carga, a Jamef manda um **POST automático** pra essa URL, em JSON, com: remetente, destinatário, pagador do frete, número do conhecimento, número da nota fiscal, valor do frete, previsão de entrega, e o evento/ocorrência em si.
- As ocorrências seguem os **códigos Proceda** (um padrão do mercado de transporte) — ou, se a RARE WAY tiver uma tabela própria de códigos (DEXPARA), dá pra cadastrar ela na Jamef para que o webhook já mande as ocorrências traduzidas para os códigos da RARE WAY.
- Configuração é feita pela própria área logada do Portal Developers, sem precisar de suporte: nome da aplicação, descrição, tipo de webhook, endpoint (a URL que vai receber), método de autenticação e quais eventos receber. Dá para editar, desativar ou excluir a qualquer momento.

**Ou seja:** a Jamef já resolve sozinha o problema de "ficar perguntando" — ela avisa sozinha. Isso é uma vantagem a mais da Jamef em relação às outras duas.

## 2. Braspress — não tem webhook, só consulta manual (polling)

A documentação oficial (api.braspress.com/home) só lista duas coisas: a API de Cotação e a API de Tracking (3 versões). Não existe nenhuma seção de webhook, notificação push, callback ou equivalente — tudo é por consulta: o sistema da RARE WAY precisa perguntar "tem novidade nessa nota fiscal?" de tempos em tempos.

**Na prática, para a Braspress entrar na centralização de ocorrências**, o jeito vai ser o sistema da TI perguntar periodicamente (por exemplo, a cada alguns minutos) usando a API de tracking já documentada em `especificacao-api-braspress.md` — não existe alternativa de "aviso automático" documentada.

*(Vale confirmar diretamente com a Braspress, quando a credencial de produção for liberada, se existe algum recurso de webhook não documentado publicamente — mas a documentação oficial não menciona nada disso.)*

**Atualização (03/09/2026):** o motor de cotação interino ganhou uma tela de "Rastreio" que já consulta a API de tracking v3 da Braspress sob demanda (o operador digita nota fiscal ou pedido e vê o resultado na hora — ver `motor-cotacao-frete-arquitetura.md`). Essa tela não é um polling automático (é o operador quem dispara cada consulta), mas a primeira vez que alguém usá-la de verdade já serve para confirmar, com uma resposta real, o formato exato do JSON de tracking da Braspress — informação que falta pra fechar o desenho do polling automático descrito na seção "Recomendação de arquitetura" abaixo.

## 3. Rodonaves — não tem webhook documentado; tem um mecanismo de arquivo (EDI) que pode servir, mas precisa confirmar como ele é entregue

O Portal Developers da Rodonaves (dev.rodonaves.com.br) tem uma API de rastreio por consulta manual (igual à Braspress) **e**, separadamente, uma seção chamada **EDI (Electronic Data Interchange)** — uma forma mais antiga de troca de dados entre empresas, só que também usada pela Rodonaves para ocorrências.

Dentro do EDI, existe um item chamado **OCOREN — Ocorrências de entrega**, descrito assim: *"Arquivo com todas as atualizações de rastreamento das notas fiscais embarcadas"*, incluindo eventos como "em processo de expedição", "em trânsito", "em rota de entrega" e "entrega realizada" — ou seja, é o mesmo tipo de informação que a Jamef manda pelo webhook de ocorrências.

**O que não ficou claro na documentação pública, e por isso precisa ser perguntado direto pra Rodonaves:**
- A página de EDI diz que a troca de dados acontece "por meio de arquivos em formato texto (TXT) ou integrações via API (geralmente em JSON)" — mas não explica se esse arquivo/API **é enviado automaticamente pra RARE WAY assim que muda algo** (o que seria equivalente a um webhook) ou se **precisa ser buscado/baixado periodicamente** (o que seria só uma outra forma de consulta manual, como a Braspress).
- Não há, na documentação, um passo de "cadastre aqui a URL que vai receber os arquivos" como existe no Portal Developers da Jamef — o que sugere que o processo de habilitar o EDI provavelmente passa por um contato comercial/técnico direto com a Rodonaves, não por um cadastro self-service.

## Conclusão e próximos passos

1. **Jamef já resolve o caso de uso pedido** — o Webhook Eventos de Ocorrências é exatamente o que centraliza as ocorrências automaticamente, sem precisar ficar consultando. A especificação técnica completa deste webhook (endpoint de cadastro, campos do JSON enviado, exemplo de payload) ainda precisa ser levantada com uma chamada/teste real — hoje só temos a descrição funcional do portal, sem o "de-para" de campos igual ao que já foi feito para a cotação e o rastreio da Jamef.
2. **Braspress não tem webhook** — para esta transportadora, a centralização de ocorrências vai depender de consulta periódica (polling) pela API de tracking já documentada. Não é preciso levantar mais nada aqui — é só usar a API que já está especificada.
3. **Rodonaves precisa de uma pergunta direta** — perguntar ao contato comercial/técnico da Rodonaves (o mesmo que está processando a liberação de acesso) se o EDI OCOREN pode ser configurado para *enviar* os arquivos automaticamente para um endereço da RARE WAY (modelo push/webhook) ou se é a RARE WAY que precisa buscar os arquivos periodicamente (modelo pull), e qual o formato/protocolo exato de entrega (SFTP, e-mail, endpoint HTTP, etc.). **Pergunta pronta para enviar: ver seção "Pergunta pronta para a Rodonaves" abaixo.**
4. Depois dessas confirmações, dá para levar para a TI uma segunda leva de documentação — desta vez sobre como cada transportadora entrega as ocorrências automaticamente (ou não) — complementando as especificações de cotação/rastreio já entregues, para que a TI possa desenhar a centralização de ocorrências dentro do sistema de força de vendas.

## Recomendação de arquitetura para a TI (03/09/2026)

Com as três transportadoras mapeadas, dá pra propor um desenho concreto pra TI usar como ponto de partida — cada transportadora entra na centralização de ocorrências pelo mecanismo que ela realmente oferece, sem forçar as três a se comportarem do mesmo jeito:

1. **Um formato comum de "ocorrência"** no meio, igual ao que já existe para a cotação (`motor-cotacao-frete-arquitetura.md`, seção "Arquitetura pensada para expansão") — algo como `{ transportadora, conhecimento, notaFiscal, pedido, status, data, local, origemDoDado }`. A tela de ocorrências dentro do sistema de força de vendas só conhece esse formato comum; nunca fala diretamente com a Jamef, a Braspress ou a Rodonaves.
2. **Jamef entra por push (webhook)**: a TI cadastra uma URL própria no Portal Developers da Jamef (Webhook Eventos de Ocorrências) e implementa um endpoint que recebe o POST automático, traduz pro formato comum acima e grava. Esse é o caminho mais barato dos três — a Jamef avisa sozinha, sem nenhum job programado.
3. **Braspress entra por pull (polling programado)**: como não existe webhook, a TI precisa de uma rotina agendada (ex.: a cada 15–30 minutos) que percorre os pedidos com frete Braspress ainda não marcados como "entregue" e consulta a API de tracking v3 (`byNf` ou `byNumPedido`, conforme o dado disponível) de cada um. Assim que um pedido chega em "entregue", ele sai da lista de consulta — não faz sentido continuar perguntando por um envio já concluído. **Antes de programar isso**, vale confirmar o formato real da resposta da v3 (ver nota da seção 2 acima — a tela de Rastreio do motor interino já ajuda a levantar isso na prática).
4. **Rodonaves entra por push ou pull, a depender da resposta da pergunta pendente**: se a Rodonaves confirmar que o EDI OCOREN é "empurrado" automaticamente (por SFTP, e-mail ou endpoint HTTP), o desenho fica parecido com o da Jamef (um recebedor passivo); se for "puxado" (a RARE WAY busca o arquivo periodicamente), fica parecido com o da Braspress (uma rotina agendada, só que lendo um arquivo em vez de chamar uma API JSON). Só dá pra fechar esse desenho depois da resposta da Rodonaves.
5. **Alertas usando o mesmo mecanismo do Plano B** (já decidido em `plano-projeto-cotacao-frete.md`): se o webhook da Jamef parar de chegar por muito tempo, ou se o polling da Braspress começar a falhar repetidamente, isso deveria disparar o mesmo tipo de alerta já pensado pro Plano B Nível 3 ("essa transportadora está falhando demais, olhar isso") — é o mesmo princípio, só que aplicado a ocorrências em vez de cotação.

**Importante:** este desenho é uma sugestão para a TI avaliar dentro da arquitetura do sistema de força de vendas — não foi implementado em nenhum lugar ainda. O motor de cotação interino (Vercel) tem hoje só uma versão manual/sob-demanda disso (a tela de Rastreio, seção 2 acima), sem webhook nem polling automático — é uma ferramenta de consulta pontual pro operador, não a centralização de ocorrências descrita aqui.

## Pergunta pronta para a Rodonaves (03/09/2026)

Texto sugerido para enviar ao mesmo contato comercial/técnico da Rodonaves que está processando a liberação de acesso à API (Juan pode ajustar o tom antes de enviar):

> Sobre o EDI OCOREN (ocorrências de entrega): gostaríamos de confirmar como funciona a entrega dos dados na prática, para decidir como integrar isso ao nosso sistema.
>
> 1. O arquivo/dado do OCOREN é enviado automaticamente pela Rodonaves para um endereço nosso assim que uma ocorrência acontece (por exemplo, um endpoint HTTP, um servidor SFTP ou um e-mail cadastrado por nós) — ou é a RARE WAY quem precisa buscar/baixar esse arquivo periodicamente?
> 2. Se for a Rodonaves quem envia automaticamente: qual é o protocolo exato (SFTP, HTTP/webhook, e-mail, outro), e como cadastramos o endereço de destino?
> 3. Se for a RARE WAY quem busca: com que frequência o arquivo é atualizado, e onde ele fica disponível para download?
> 4. O formato do arquivo é sempre TXT, ou também existe a opção em JSON via API, como a documentação de EDI de vocês menciona?
>
> Essas respostas vão definir se a integração de ocorrências da Rodonaves fica parecida com um webhook (recebemos os avisos sozinhos) ou com uma consulta periódica (nós perguntamos de tempos em tempos) — as duas são viáveis do nosso lado, só precisamos saber qual desenhar.
