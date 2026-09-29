# Confere qual versão o site está REALMENTE servindo agora.
#
# Por que isto existe: `git push` bem-sucedido não diz nada sobre o deploy.
# Em 23/09/2026 quatro deploys seguidos falharam em 5 segundos e o site
# continuou servindo a versão antiga por seis horas, sem erro nenhum no
# terminal. A trava em scripts/checar-funcoes.js impede a causa conhecida
# (estourar o teto de 12 funções); este script confere o resultado.
#
# Uso (depois do push, quando o deploy tiver tido tempo de terminar):
#   .\scripts\conferir-no-ar.ps1
#   .\scripts\conferir-no-ar.ps1 -Commit a1b2c3d   (conferir um commit específico)
#
# Como funciona: o middleware.js responde em /versao qual commit está no ar
# (a Vercel informa isso em cada deploy). O script compara com o último
# commit deste computador. Diferente, ou sem resposta, é falha.
#
# Histórico: até 29/09/2026 o script procurava um trecho de texto na página
# (-Procurar). Só que a página fica atrás do login: sem sessão, ela responde
# com um redirecionamento, e o script pulava a busca e terminava "sem erro".
# Nunca teria avisado de um deploy que falhou. A regra agora é: se não der
# para confirmar, o script FALHA em voz alta, nunca passa calado.
#
# As mensagens impressas não têm acento de propósito: no PowerShell 5.1 elas
# podem sair embaralhadas. O arquivo é gravado com BOM pelo mesmo motivo.

param(
  [string]$Site = "https://motor-cotacao-frete.vercel.app",
  [string]$Commit = ""
)

$semCache = "?nocache=" + (Get-Random)

# Commit esperado: o último deste computador, salvo se passarem outro.
if ($Commit -eq "") {
  $Commit = git -C $PSScriptRoot rev-parse HEAD 2>$null
  if (-not $Commit) {
    Write-Output "Nao consegui ler o ultimo commit local (git rev-parse HEAD)."
    exit 1
  }
}
$Commit = $Commit.Trim().ToLower()

# 1. A tela de login é pública e sempre deve responder 200. Se ela cair, o
#    site quebrou de um jeito mais grave do que "versão antiga".
try {
  $login = Invoke-WebRequest -Uri ($Site + "/login.html" + $semCache) -UseBasicParsing -ErrorAction Stop
  Write-Output ("login.html = " + $login.StatusCode + " (" + $login.Content.Length + " caracteres)")
} catch {
  Write-Output "login.html = FALHOU - o site nao esta respondendo direito."
  exit 1
}

# 2. Qual commit o site está servindo. Qualquer coisa diferente de um 200
#    com o commit preenchido conta como "não confirmado". Em especial, um
#    redirecionamento para o login quer dizer que o deploy no ar ainda é
#    anterior à criação do /versao.
$noAr = $null
try {
  $resp = Invoke-WebRequest -Uri ($Site + "/versao" + $semCache) -UseBasicParsing -MaximumRedirection 0 -ErrorAction Stop
  if ([int]$resp.StatusCode -eq 200) {
    $texto = $resp.Content
    if ($texto -is [byte[]]) { $texto = [Text.Encoding]::UTF8.GetString($texto) }
    $noAr = ($texto | ConvertFrom-Json).commit
  }
} catch {
  $noAr = $null
}

if (-not $noAr) {
  Write-Output ""
  Write-Output "NAO CONFIRMADO: o site nao informou qual commit esta no ar."
  Write-Output "  Causas possiveis: o deploy ainda esta rodando, o deploy falhou,"
  Write-Output "  ou o que esta no ar e anterior ao endereco /versao."
  Write-Output "  Abra a aba Deployments da Vercel."
  exit 1
}

$noAr = $noAr.Trim().ToLower()

# O assunto do commit ajuda a reconhecer a versão sem decorar hash. Pode não
# existir localmente (commit feito em outra máquina); aí fica só o hash.
$assuntoNoAr = git -C $PSScriptRoot log -1 --format=%s $noAr 2>$null
$assuntoLocal = git -C $PSScriptRoot log -1 --format=%s $Commit 2>$null

Write-Output ("No ar      = " + $noAr.Substring(0, 7) + "  " + $assuntoNoAr)
Write-Output ("Esperado   = " + $Commit.Substring(0, [Math]::Min(7, $Commit.Length)) + "  " + $assuntoLocal)

# StartsWith permite passar o hash curto em -Commit.
if (-not $noAr.StartsWith($Commit)) {
  Write-Output ""
  Write-Output "ATENCAO: o site NAO esta servindo o commit esperado."
  Write-Output "  Se o push foi agora, espere um ou dois minutos e rode de novo."
  Write-Output "  Se continuar assim, o deploy falhou: abra a aba Deployments da Vercel."
  exit 1
}

Write-Output ""
Write-Output "OK: o site esta servindo o commit esperado."
