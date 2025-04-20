#!/usr/bin/env pwsh

Write-Host "Ejecutando pruebas del Backend (Python)..."
#  Ejecuta las pruebas (ejemplo con pytest)
pytest
Write-Host "Pruebas del Backend completadas."

Write-Host "Ejecutando pruebas del Frontend (JavaScript)..."
cd ../frontend
npm test
Write-Host "Pruebas del Frontend completadas."

Write-Host "¡Todas las pruebas completadas!"