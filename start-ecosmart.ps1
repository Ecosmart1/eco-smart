Write-Host "=== EcoSmart: Configurando entorno virtual de Python ==="
Set-Location "ecosmart backend flask"
if (-not (Test-Path "venv")) {
    python -m venv venv
}
. .\venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install pandas
pip install -r requirements.txt

# Abrir una nueva ventana de PowerShell para el backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$(Get-Location)'; .\venv\Scripts\Activate.ps1; python rutas\api_principal.py"

deactivate
Set-Location ..

Write-Host "=== EcoSmart: Verificando Node.js y npm ==="
if (-not (Get-Command node -ErrorAction SilentlyContinue) -or -not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js o npm no están instalados."
    Write-Host "Por favor instala Node.js y npm manualmente desde https://nodejs.org/"
    exit 1
} else {
    Write-Host "Node.js y npm ya están instalados."
}

Write-Host "=== EcoSmart: Instalando y ejecutando Frontend (React) ==="
Set-Location "Ecosmart frontend react"
npm install

# Abrir una nueva ventana de PowerShell para el frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$(Get-Location)'; npm run dev"

Set-Location ../..