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

echo "=== EcoSmart: Instalando y ejecutando Frontend (React) ==="
cd "Ecosmart frontend react"
npm install
gnome-terminal -- bash -c "cd '$(pwd)'; npm run dev; exec bash"
cd ../..