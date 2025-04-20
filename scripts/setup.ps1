#!/usr/bin/env pwsh

Write-Host "Instalando dependencias del Backend (Python)..."
cd backend
pip install --upgrade pip
pip install -r requirements.txt
Write-Host "Dependencias del Backend instaladas."

Write-Host "Instalando dependencias del Frontend (JavaScript)..."
cd ../frontend
npm install
Write-Host "Dependencias del Frontend instaladas."

Write-Host "¡Todas las dependencias instaladas!"