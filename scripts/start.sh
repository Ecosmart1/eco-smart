#!/bin/bash

echo "Iniciando el Backend..."
cd backend/app  # Navega al directorio 'app'

python __init__.py &  # Ejecuta el archivo __init__.py

echo "Iniciando el Frontend..."
cd ../frontend
npm start &  # Ejecuta React en segundo plano (&)

echo "¡Entorno local iniciado!"

wait
