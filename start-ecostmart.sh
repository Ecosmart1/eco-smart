#!/bin/bash

echo "=== EcoSmart: Instalando y ejecutando Backend (Flask) ==="
cd "ecosmart backend flask"
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt
gnome-terminal -- bash -c "cd '$(pwd)'; source venv/bin/activate; python3 Sensores/Config.py; exec bash"
deactivate
cd ../..

echo "=== EcoSmart: Verificando Node.js y npm ==="
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null
then
    echo "Node.js o npm no están instalados."
    if sudo -n true 2>/dev/null; then
        echo "Instalando Node.js y npm con sudo..."
        sudo apt update
        sudo apt install -y nodejs npm
    else
        echo "No tienes permisos sudo sin contraseña. Por favor instala Node.js y npm manualmente."
        exit 1
    fi
else
    echo "Node.js y npm ya están instalados."
fi

echo "=== EcoSmart: Instalando y ejecutando Frontend (React) ==="
cd "Ecosmart frontend react"
npm install
gnome-terminal -- bash -c "cd '$(pwd)'; npm run dev; exec bash"
cd ../..