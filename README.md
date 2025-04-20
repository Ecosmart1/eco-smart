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
