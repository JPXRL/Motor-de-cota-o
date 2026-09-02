$resp = Invoke-WebRequest -Uri ('https://motor-cotacao-frete.vercel.app/?nocache=' + (Get-Random)) -UseBasicParsing
Write-Output ('CacheHeader=' + $resp.Headers['x-vercel-cache'])
Write-Output ('HasHistoricoNav=' + ($resp.Content -match 'data-view="historico"'))
Write-Output ('HasCarregarHistorico=' + ($resp.Content -match 'carregarHistorico'))

$api = Invoke-WebRequest -Uri ('https://motor-cotacao-frete.vercel.app/api/historico-cotacoes?nocache=' + (Get-Random)) -UseBasicParsing
Write-Output ('ApiStatus=' + $api.StatusCode)
Write-Output ('ApiBody=' + $api.Content)
