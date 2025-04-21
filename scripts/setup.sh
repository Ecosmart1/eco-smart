#!/bin/bash

echo "Instalando dependencias del Backend (Python)..."
cd backend
pip install --upgrade pip
pip install -r requerimientos.txt
echo "Dependencias del Backend instaladas."

echo "Instalando dependencias del Frontend (JavaScript)..."
cd ../frontend
npm install
echo "Dependencias del Frontend instaladas."

echo "¡Todas las dependencias instaladas!"
