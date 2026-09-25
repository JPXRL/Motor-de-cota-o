# Confere o que o site está REALMENTE servindo agora.
#
# Por que isto existe: `git push` bem-sucedido não diz nada sobre o deploy.
# Em 23/09/2026 quatro deploys seguidos falharam em 5 segundos e o site
# continuou servindo a versão antiga por seis horas, sem erro nenhum no
# terminal. A trava em scripts/checar-funcoes.js impede a causa conhecida
# (estourar o teto de 12 funções); este script confere o resultado.
#
# Uso:
#   .\scripts\conferir-no-ar.ps1
#   .\scripts\conferir-no-ar.ps1 -Procurar "btn-cotar-assim"
#
# O parâmetro -Procurar recebe um trecho que SÓ existe na versão nova. Se ele
# não aparecer, o site está servindo uma versão anterior — mesmo que o commit
# esteja no GitHub.

param(
  [string]$Procurar = "",
  [string]$Site = "https://motor-cotacao-frete.vercel.app"
)

$semCache = "?nocache=" + (Get-Random)

try {
  $resp = Invoke-WebRequest -Uri ($Site + "/" + $semCache) -UseBasicParsing -MaximumRedirection 0 -ErrorAction Stop
} catch {
  # O site exige login: sem sessão, a página responde com redirecionamento
  # para /login.html. Isso é sinal de saúde, não de erro.
  $resp = $_.Exception.Response
  if ($null -ne $resp) {
    Write-Output ("Status  = " + [int]$resp.StatusCode + " (redireciona para o login — esperado sem sessão)")
    Write-Output ("Destino = " + $resp.Headers["Location"])
  } else {
    Write-Output "Nao foi possivel alcancar o site."
    exit 1
  }
  $resp = $null
}

if ($null -ne $resp) {
  Write-Output ("Status       = " + $resp.StatusCode)
  Write-Output ("CacheVercel  = " + $resp.Headers["x-vercel-cache"])
  Write-Output ("Tamanho      = " + $resp.Content.Length + " caracteres")

  if ($Procurar -ne "") {
    $achou = $resp.Content -match [regex]::Escape($Procurar)
    Write-Output ("Achou '$Procurar' = " + $achou)
    if (-not $achou) {
      Write-Output ""
      Write-Output "  ATENCAO: o trecho procurado NAO esta no que o site serve."
      Write-Output "  O deploy provavelmente falhou. Abra a aba Deployments da Vercel."
      exit 1
    }
  }
}

# A tela de login é pública e sempre deve responder 200 — se ela cair, o
# deploy quebrou de um jeito que o redirecionamento acima não revelaria.
try {
  $login = Invoke-WebRequest -Uri ($Site + "/login.html" + $semCache) -UseBasicParsing -ErrorAction Stop
  Write-Output ("login.html   = " + $login.StatusCode + " (" + $login.Content.Length + " caracteres)")
} catch {
  Write-Output "login.html   = FALHOU"
  exit 1
}

Write-Output ""
Write-Output "Lembrete: isto confere o que esta no ar AGORA. Se voce acabou de"
Write-Output "dar push, espere o deploy terminar e rode de novo."
