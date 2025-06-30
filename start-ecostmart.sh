#!/bin/bash
# Script para iniciar el proyecto EcoSmart

echo "=== EcoSmart: Configurando entorno virtual de Python ==="
cd "ecosmart backend flask"

if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

chmod +x venv/bin/activate
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Open a new terminal for the backend server in the background
x-terminal-emulator -e bash -c "cd '$(pwd)'; source venv/bin/activate; python3 rutas/api_principal.py; exec bash" &

deactivate
cd ..

echo "=== EcoSmart: Verificando Node.js y npm ==="
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo "Node.js o npm no están instalados."
    if sudo -n true 2>/dev/null; then
        echo "Instalando Node.js y npm con sudo..."
        sudo apt update
        sudo apt install -y nodejs npm
        if command -v node &> /dev/null && command -v npm &> /dev/null; then
            echo "Node.js y npm instalados correctamente."
        else
            echo "Error al instalar Node.js y npm. Por favor instálalos manualmente."
            exit 1
        fi
    fi
else
    echo "Node.js y npm ya están instalados."
fi

echo "=== EcoSmart: Instalando y ejecutando Frontend (React) ==="
cd "Ecosmart frontend react"

npm install


# Open a new terminal for the frontend server in the background
x-terminal-emulator -e bash -c "cd '$(pwd)'; npm run dev; exec bash" &

cd ../..
