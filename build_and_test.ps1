param(
    [string]$BackendContainer = "romaneio_rapido_backend"
)

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host " Iniciando Processo de Build e Validacao (Testes)" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# 1. Testar Backend
Write-Host "`n[1/2] Verificando todos os testes do backend..." -ForegroundColor Yellow

# Executa cada arquivo de teste em um processo separado dentro do container.
# O loop fica no PowerShell para evitar problemas de aspas entre Windows, Docker e sh.
$backendTests = Get-ChildItem -Path ".\backend\tests" -Filter "test_*.py" | Sort-Object Name

foreach ($test in $backendTests) {
    $containerTestPath = "backend/tests/$($test.Name)"
    Write-Host "Running $containerTestPath" -ForegroundColor DarkCyan
    docker exec -e TESTING=1 -e PYTHONPATH=/app $BackendContainer python -m pytest $containerTestPath -v

    if ($LASTEXITCODE -ne 0) {
        break
    }
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERRO] Os testes de backend falharam! Verifique os logs acima." -ForegroundColor Red
    Write-Host "Build abortado por questoes de integridade da API." -ForegroundColor Red
    exit 1
} else {
    Write-Host "[OK] Todos os testes de backend aprovados!" -ForegroundColor Green
}

# 2. Buildar o Frontend (React/Vite)
Write-Host "`n[2/2] Gerando build de producao do Frontend (npm run build)..." -ForegroundColor Yellow

try {
    Set-Location .\frontend
    # npm install --silent
    npm run build
}
finally {
    Set-Location ..
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERRO] A compilacao (build) do frontend falhou." -ForegroundColor Red
    exit 1
} else {
    Write-Host "[OK] Frontend buildado com sucesso!" -ForegroundColor Green
}

Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host " PROCESSO CONCLUIDO COM SUCESSO! " -ForegroundColor Green
Write-Host " Sistema validado pelo pytest e frontend buildado." -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan
