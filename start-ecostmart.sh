#!/bin/bash

echo "=== EcoSmart: Verificando Python 3.10+ ==="
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    if [[ $(echo "$PYTHON_VERSION >= 3.10" | bc) -eq 1 ]]; then
        echo "Python $PYTHON_VERSION encontrado."
    else
        echo "Se requiere Python 3.10 o superior. Instalado: $PYTHON_VERSION"
        exit 1
    fi
else
    echo "Python 3 no está instalado. Por favor instálalo antes de continuar."
    exit 1
fi

echo "=== EcoSmart: Configurando entorno virtual de Python ==="
cd "ecosmart backend flask"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
gnome-terminal -- bash -c "cd '$(pwd)'; source venv/bin/activate; python3 Sensores/Config.py; exec bash"
deactivate
cd ../..

echo "=== EcoSmart: Verificando Node.js y npm ==="
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
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