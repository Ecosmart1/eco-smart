<p align="center">
  <img src="ecosmarlogo.png" alt="EcoSmart Logo" width="180"/>
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

### `frontend/` - Interfaz de usuario
- `public/` - Archivos estáticos
- `src/` - Código fuente
  - `componentes/` - Componentes reusables
  - `paginas/` - Vistas principales
  - `servicios/` - Servicios y APIs
- `App.js` - Componente principal
- `index.js` - Punto de entrada
- `package.json` - Dependencias

### `backend/` - Servidor y lógica de negocio
- `app/` - Aplicación principal
  - `__init__.py` - Inicialización
  - `rutas/` - Endpoints de la API
  - `modulos/` - Módulos funcionales
  - `servicios/` - Servicios externos
- `configuracion.py` - Configuración
- `requerimientos.txt` - Dependencias

### `simulador/` - Simulador de sensores agrícolas
- `src/` - Código fuente
  - `componentes/` - Componentes del simulador
  - `paginas/` - Interfaces del simulador
  - `servicios/` - Servicios del simulador
- `package.json` - Dependencias

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

- **pip**  
  Gestor de paquetes para Python (incluido con Python).

- **[Git](https://git-scm.com/)**  
  Para clonar el repositorio desde GitHub y gestionar versiones.

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





