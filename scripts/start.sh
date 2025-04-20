#!/bin/bash

echo "Iniciando el Backend..."
cd backend

python app.py &  #  Ejecuta Flask en segundo plano (&)

echo "Iniciando el Frontend..."
cd ../frontend
npm start &  #  Ejecuta React en segundo plano (&)

echo "¡Entorno local iniciado! Abre el frontend en tu navegador."

#  Espera a que terminen los procesos (opcional)
wait