<p align="center">
  <img src="assets/ecosmarlogo.png" alt="EcoSmart Logo" width="180"/>
</p>

# 🌿 EcoSmart - Plataforma de Agricultura Inteligente


## 📌 Descripción

**EcoSmart** es una plataforma web de agricultura inteligente que permite a agricultores y técnicos monitorear cultivos, gestionar parcelas, recibir alertas en tiempo real y tomar decisiones basadas en datos.

La plataforma entrega recomendaciones automáticas generadas por inteligencia artificial y visualiza información clave como humedad, temperatura, pH del suelo y pronóstico climático. Su objetivo es mejorar la eficiencia en el uso de recursos y optimizar el rendimiento de los cultivos.

Entre sus funciones principales se incluyen:

- Visualización del estado de los cultivos desde un dashboard central.
- Gestión de múltiples parcelas por usuario.
- Sistema de alertas críticas personalizadas según condiciones del terreno o el clima.
- Asistente inteligente que sugiere acciones específicas como riego o aplicación de fertilizantes.
- Registro de actividades agrícolas.
- Simulación de sensores para pruebas en entorno local.

EcoSmart está pensado como una herramienta simple, modular y útil para distintos tipos de usuarios en el mundo agrícola.

---

## 🗂️ Estructura del proyecto

### **EcoSmart/** - Proyecto principal  
- **frontend/** - Interfaz de usuario  
  - **public/** - Archivos estáticos  
  - **src/** - Código fuente  
    - **assets/** - Archivos estáticos como imágenes y estilos  
    - **componentes/** - Componentes reusables  
    - **paginas/** - Vistas principales  
    - **App.js** - Componente principal  
    - **index.js** - Punto de entrada  
  - **package.json** - Dependencias y scripts del frontend  
  - **.gitignore** - Archivos ignorados por Git en el frontend  

- **backend/** - Servidor y lógica de negocio  
  - **src/** - Código fuente  
    - **base de datos/** - Gestión de la base de datos  
    - **rutas/** - Endpoints de la API  
    - **modelos/** - Modelos de datos y estructuras clave  
    - **servicios/** - Servicios externos y funciones auxiliares  
    - **main.py** - Aplicación principal que inicializa el servidor  
    - **config.py** - Configuración general del backend  
  - **requerimientos.txt** - Dependencias del backend  
  - **.env** - Variables de entorno para claves y configuraciones  
  - **.gitignore** - Archivos ignorados por Git en el backend  

- **simulador/** - Simulador de sensores agrícolas  
  - **src/** - Código fuente del simulador  
    - **__init__.py** - Inicialización del módulo  
    - **sensor.py** - Algoritmo principal de simulación de datos  
    - **config.py** - Configuración inicial del simulador (parámetros)  
    - **logs/** - Registros generados por el simulador  

### `Scripts/` Scripts automatización del proyecto
Esta carpeta contiene scripts que permiten ejecutar y configurar rápidamente todo el entorno de desarrollo de **EcoSmart**, tanto en sistemas Windows como Mac/Linux.

| Script                    | Descripción                                                                 |
|---------------------------|------------------------------------------------------------------------------|
| `start.sh` / `start.ps1`         | Inicia simultáneamente el backend y el frontend en entorno local.        |
| `setup.sh` / `setup.ps1`         | Instala todas las dependencias necesarias del proyecto (Python y Node.js).|
| `init_db.py`                     | Inicializa la base de datos PostgreSQL creando automáticamente las tablas.|
| `simulate_data.py`              | Simula datos falsos de sensores (humedad, pH, temperatura) para pruebas.  |
| `run_test.sh` / `run_test.ps1`  | Ejecuta pruebas básicas o de integración para validar que todo funcione.  |

---

## 🛠️ Tecnologías

- **Frontend**: React.js
- **Backend**: Python con Flask
- **Base de Datos**: PostgreSQL
- **IA**: Deepseek
- **Simulación**: JavaScript
- **APIs externas**: OpenWeatherMap

---

## ⚙️ Instalación

### 📌 Requisitos previos

Antes de ejecutar **EcoSmart** en tu equipo local, asegúrate de tener instaladas las siguientes herramientas:

- **[Node.js](https://nodejs.org/)** (v18 o superior)  
  Necesario para ejecutar el frontend (React) y el simulador.

- **[Python](https://www.python.org/downloads/)** (v3.10 o superior)  
  Requerido para levantar el backend (Flask).

- **[Git](https://git-scm.com/)**  
  Para clonar el repositorio desde GitHub y gestionar versiones.

- **Tener conexión a internet**  
  Para poder realizar las consultas a la IA.

---

### ✅ Instalación paso a paso

Sigue los siguientes pasos para tener EcoSmart funcionando en tu equipo local (Windows):

#### 1. Clonar el repositorio
```bash
git clone https://github.com/Ecosmart1/eco-smart.git
cd eco-smart
```
### 2. Instalar dependencias del backend

Esto instalará todos los paquetes necesarios para ejecutar el backend con Flask:

```bash
cd backend
pip install -r requerimientos.txt
```

### 3. Ejecutar el servidor del backend
Este comando inicia el backend en http://localhost:5000, donde responde a las solicitudes de la plataforma.
Aunque el usuario nunca entra directamente a este enlace, este servidor procesa las peticiones que llegan desde el frontend (como iniciar sesión, mostrar sensores, enviar alertas, consultar la IA, etc.).
```bash
python configuracion.py
```

### 4. Instalar dependencias del frontend
Esto descargará todas las dependencias necesarias para React en el frontend:
```bash
cd ../frontend
npm install
```

### 5. Iniciar el servidor del frontend
Abre automáticamente la aplicación web en http://localhost:3000:
```bash
npm start
```

### 6. Ejecutar el simulador de sensores
Este módulo simula sensores agrícolas generando datos como humedad, temperatura y pH del suelo.
Si está corriendo, el backend recibirá estos datos automáticamente, lo que permite activar alertas y alimentar el dashboard.
```bash
cd ../simulador
npm install
npm start
```

---

### 💡 Nota para usuarios de MacOS / Linux

Los comandos de instalación son prácticamente iguales. Solo asegúrate de:

- Usar `/` en lugar de `\` para rutas si estás usando terminal.
- Tener permisos de ejecución para scripts (puedes usar `chmod +x archivo.py` si lo necesitas).
- Usar `python3` y `pip3` en vez de `python` y `pip` si tu sistema lo requiere.

## 🟢 Uso de la plataforma

Una vez que el frontend está corriendo en `http://localhost:3000`, puedes:

- Iniciar sesión con tus credenciales
- Crear y gestionar parcelas y cultivos agrícolas
- Ver el estado de humedad, temperatura y pH del suelo
- Recibir alertas críticas si alguna variable supera umbrales
- Consultar recomendaciones generadas por IA
- Registrar actividades agrícolas desde el panel

## ❗ Problemas comunes

- **Error: 'npm' no se reconoce como un comando interno**  
  → Asegúrate de tener Node.js instalado y agregado a las variables de entorno.

- **Error de permisos en Mac/Linux**  
  → Intenta con `chmod +x archivo.py` antes de ejecutarlo.

- **El backend no responde**  
  → Asegúrate de que el archivo `configuracion.py` esté corriendo antes de abrir el frontend.

## 👥 Equipo de trabajo

El desarrollo de **EcoSmart** ha sido realizado por el equipo **Los NN**, compuesto por cuatro integrantes que desempeñan roles complementarios para cubrir todas las áreas del proyecto:

- **Víctor Quezada** — Diseño UX/UI  
- **Mauricio Oyarce** — Backend  
- **Juan Vásquez** — Frontend  
- **Vicente Zapata** — Integración de IA

## 📬 Contacto

Para consultas sobre el proyecto **EcoSmart**, puedes escribir directamente a los integrantes del equipo **Los NN** mediante GitHub o correo institucional.

> Proyecto académico — Universidad de Talca, 2025.


