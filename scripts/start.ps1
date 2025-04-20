#!/usr/bin/env pwsh

Write-Host "Iniciando el Backend..."
cd backend

Start-Process -FilePath "flask" -ArgumentList "run --debug"

Write-Host "Iniciando el Frontend..."
cd ../frontend
Start-Process -FilePath "npm" -ArgumentList "start"

Write-Host "¡Entorno local iniciado! Abre el frontend en tu navegador."
