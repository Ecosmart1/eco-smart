<p align="center">
  <img src="assets/ecosmarlogo.png" alt="EcoSmart Logo" width="180"/>
</p>

# 🌿 EcoSmart - Plataforma de Agricultura Inteligente

## 📌 Descripción

**EcoSmart** es una plataforma web de agricultura inteligente que permite a agricultores y técnicos monitorear cultivos, gestionar sensores, recibir alertas en tiempo real y tomar decisiones basadas en datos simulados o reales.

La plataforma entrega recomendaciones automáticas y visualiza información clave como humedad, temperatura, pH del suelo y nutrientes. Su objetivo es mejorar la eficiencia en el uso de recursos y optimizar el rendimiento de los cultivos.

Entre sus funciones principales se incluyen:

- Visualización del estado de los sensores desde un dashboard central.
- Simulación de sensores agrícolas para pruebas sin hardware real.
- Sistema de alertas y condiciones adversas simuladas.
- Panel de control interactivo para iniciar/detener simulaciones y cambiar condiciones.
- Código modular y fácil de desplegar en cualquier entorno.

---

## 🗂️ Estructura del proyecto


EcoSmart/  
│  
├── backend/  # Servidor y lógica de negocio (Flask)  
│   ├── src/  
│   │   ├── sensores/  # Módulo de sensores  
│   │   │   ├── simulador_sensores.py  # Simulación de sensores  
│   │   │   ├── sensor.py  # Lógica de sensores y red  
│   │   │   ├── __init__.py  # Inicialización del módulo  
│   │   ├── rutas/  # Endpoints de la API  
│   │   ├── modelos/  # Modelos de datos  
│   │   ├── servicios/  # Lógica de negocio y funciones auxiliares  
│   ├── requirements.txt  # Dependencias Python  
│   ├── .gitignore  # Archivos ignorados en Git  
│   ├── config.py  # Configuración general del backend  
│   ├── main.py  # Archivo principal que inicia el backend  
│  
├── frontend/  # Interfaz de usuario (React)  
│   ├── public/  # Archivos estáticos  
│   ├── src/  
│   │   ├── componentes/  # Componentes reusables  
│   │   ├── paginas/  # Vistas principales  
│   │   ├── estilos/  # Archivos CSS  
│   │   ├── App.jsx  # Componente principal  
│   │   ├── main.jsx  # Punto de entrada  
│   ├── package.json  # Dependencias y scripts  
│   ├── vite.config.js  # Configuración de Vite  
│   ├── .gitignore  # Archivos ignorados en Git  
│  
├── simulador/  # Simulador de sensores agrícolas  
│   ├── src/  
│   │   ├── componentes/  # Componentes del simulador  
│   │   ├── paginas/  # Interfaces del simulador  
│   │   ├── servicios/  # Servicios del simulador  
│   │   ├── sensor.py  # Algoritmo principal de simulación de datos  
│   │   ├── config.py  # Configuración de parámetros de simulación  
│   │   ├── logs/  # Registros generados por el simulador  
│  
├── scripts/  # Scripts para ejecutar el proyecto  
│   ├── start-ecosmart.ps1  # Script de inicio para Windows  
│   ├── start-ecosmart.sh  # Script de inicio para Linux/Mac  
│  
├── assets/  # Recursos gráficos y archivos estáticos  
│   ├── ecosmart-logo.png  # Logotipo del proyecto  
│  
└── README.md  # Documentación principal del proyecto  


---

## 🛠️ Tecnologías

- **Frontend:** React.js (Vite)
- **Backend:** Python con Flask
- **Simulación:** Python (simulador de sensores)
- **APIs:** Flask Cors
- **Automatización:** Scripts Bash y PowerShell

---

## ⚙️ Instalación y ejecución rápida

### 📌 Requisitos previos

- **[Node.js](https://nodejs.org/)** (v18 o superior)
- **[Python](https://www.python.org/downloads/)** (v3.10 o superior)
- **[Git](https://git-scm.com/)**
- **Permisos para ejecutar scripts** (`.sh` en Linux/Mac, `.ps1` en Windows)

---

### 🚀 Instalación automática (recomendado)

### **Windows**

.\start-ecosmart.ps1

### **Linux/Mac**

chmod +x start-ecostmart.sh
./start-ecostmart.sh

Estos scripts:

- **Crean y activan el entorno virtual de Python.**
- **Instalan dependencias del backend y frontend.**
- **Verifican Node.js y npm (e instalan si es posible en Linux).**
- **Inician el backend Flask y el frontend React en terminales separadas.**


### 📝** Instalación manual (alternativa)**

**1. Clona el repositorio**

git clone https://github.com/Ecosmart1/eco-smart.git
cd eco-smart

**2. Backend (Flask)**

cd "ecosmart backend flask"
python -m venv venv
# Activa el entorno virtual:
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
python Sensores/simulador_sensores.py

**3. Frontend (React)**

cd "../Ecosmart frontend react"
npm install
npm run dev

🟢 Uso de la plataforma
- Accede a http://localhost:5173 para la interfaz web.
- El backend responde en http://localhost:5000 y muestra un mensaje de estado.
- Usa el panel de control para iniciar/detener la simulación y cambiar condiciones.

❗ Problemas comunes
Node.js o npm no instalados:
Instálalos manualmente desde https://nodejs.org/.

Permisos en scripts Linux/Mac:
Usa chmod +x start-ecostmart.sh antes de ejecutarlo.

El backend no responde:
Asegúrate de que el archivo simulador_sensores.py esté corriendo y que el entorno virtual esté activado.


### 👥 **Equipo de trabajo**
- Víctor Quezada — UX/UI
- Mauricio Oyarce — Backend
- Juan Vásquez — Frontend
- Vicente Zapata — IA

Claro, aquí tienes un ejemplo de README.md adaptado a tu estructura real, scripts y enfoque, siguiendo el estilo del que ya tienes en el repositorio:

```md
<p align="center">
  <img src="assets/ecosmarlogo.png" alt="EcoSmart Logo" width="180"/>
</p>

# 🌿 EcoSmart - Plataforma de Agricultura Inteligente

## 📌 Descripción

**EcoSmart** es una plataforma web de agricultura inteligente que permite a agricultores y técnicos monitorear cultivos, gestionar sensores, recibir alertas en tiempo real y tomar decisiones basadas en datos simulados o reales.

La plataforma entrega recomendaciones automáticas y visualiza información clave como humedad, temperatura, pH del suelo y nutrientes. Su objetivo es mejorar la eficiencia en el uso de recursos y optimizar el rendimiento de los cultivos.

Entre sus funciones principales se incluyen:

- Visualización del estado de los sensores desde un dashboard central.
- Simulación de sensores agrícolas para pruebas sin hardware real.
- Sistema de alertas y condiciones adversas simuladas.
- Panel de control interactivo para iniciar/detener simulaciones y cambiar condiciones.
- Código modular y fácil de desplegar en cualquier entorno.

---

## 🗂️ Estructura del proyecto

```
EcoSmart/
│
├── ecosmart backend flask/
│   ├── Sensores/
│   │   ├── simulador_sensores.py   # Backend principal Flask
│   │   ├── Sensor.py               # Lógica de sensores y red
│   │   └── __init__.py
│   ├── requirements.txt            # Dependencias Python
│   └── .gitignore
│
├── Ecosmart frontend react/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── App.css
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   └── .gitignore
│
├── start-ecosmart.ps1              # Script de inicio para Windows
├── start-ecostmart.sh              # Script de inicio para Linux/Mac
├── README.md
└── assets/
    └── ecosmarlogo.png
```

---

## 🛠️ Tecnologías

- **Frontend:** React.js (Vite)
- **Backend:** Python con Flask
- **Simulación:** Python (simulador de sensores)
- **APIs:** Flask RESTful
- **Automatización:** Scripts Bash y PowerShell

---

## ⚙️ Instalación y ejecución rápida

### 📌 Requisitos previos

- **[Node.js](https://nodejs.org/)** (v18 o superior)
- **[Python](https://www.python.org/downloads/)** (v3.10 o superior)
- **[Git](https://git-scm.com/)**
- **Permisos para ejecutar scripts** (`.sh` en Linux/Mac, `.ps1` en Windows)

---

### 🚀 Instalación automática (recomendado)

#### **Windows**

```powershell
# Desde la raíz del proyecto
start-ecosmart.ps1
```

#### **Linux/Mac**

```bash
# Desde la raíz del proyecto
chmod +x start-ecostmart.sh
start-ecostmart.sh
```

Estos scripts:
- Crean y activan el entorno virtual de Python.
- Instalan dependencias del backend y frontend.
- Verifican Node.js y npm (e instalan si es posible en Linux).
- Inician el backend Flask y el frontend React en terminales separadas.

---

### 📝 Instalación manual (alternativa)

#### 1. Clona el repositorio

```bash
git clone https://github.com/Ecosmart1/eco-smart.git
cd eco-smart
```

#### 2. Backend (Flask)

```bash
cd "ecosmart backend flask"
python -m venv venv
# Activa el entorno virtual:
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
python simulador_sensores.py
```

#### 3. Frontend (React)

```bash
cd "../../Ecosmart frontend react"
npm install
npm run dev
```

---

## 🟢 Uso de la plataforma

- Accede a [http://localhost:5173](http://localhost:5173) para la interfaz web.
- El backend responde en [http://localhost:5000](http://localhost:5000) y muestra un mensaje de estado.
- Usa el panel de control para iniciar/detener la simulación y cambiar condiciones.

---

## ❗ Problemas comunes

- **Node.js o npm no instalados:**  
  Instálalos manualmente desde [nodejs.org](https://nodejs.org/).

- **Permisos en scripts Linux/Mac:**  
  Usa `chmod +x start-ecostmart.sh` antes de ejecutarlo.

- **El backend no responde:**  
  Asegúrate de que el archivo `simulador_sensores.py` esté corriendo y que el entorno virtual esté activado.

---

## 👥 Equipo de trabajo

- **Víctor Quezada** — UX/UI  
- **Mauricio Oyarce** — Backend  
- **Juan Vásquez** — Frontend  
- **Vicente Zapata** — IA

---

> Proyecto académico — Universidad de Talca, 2025.
```
