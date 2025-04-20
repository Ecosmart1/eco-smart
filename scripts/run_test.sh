#!/bin/bash

echo "Ejecutando pruebas del Backend (Python)..."
cd backend
#  Ejecuta las pruebas (ejemplo con pytest)
pytest
echo "Pruebas del Backend completadas."

echo "Ejecutando pruebas del Frontend (JavaScript)..."
cd ../frontend
npm test
echo "Pruebas del Frontend completadas."

echo "¡Todas las pruebas completadas!"