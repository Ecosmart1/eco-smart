# start-ecosmart.ps1
Write-Host "=== EcoSmart: Instalando y ejecutando Backend (Flask) ==="
cd "ecosmart backend flask"
if (!(Test-Path "venv")) {
    python -m venv venv
}
.\venv\Scripts\activate
pip install -r requirements.txt
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$(Get-Location)'; .\venv\Scripts\activate; python Sensores\Config.py"
deactivate
cd ../..

Write-Host "=== EcoSmart: Instalando y ejecutando Frontend (React) ==="
cd "Ecosmart frontend react"
npm install
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$(Get-Location)'; npm run dev"
cd ../..