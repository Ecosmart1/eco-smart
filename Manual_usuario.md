# 📖 Manual de Usuario - EcoSmart

Bienvenido a la plataforma **EcoSmart**, una solución de agricultura inteligente que te permite gestionar cultivos, monitorear sensores en tiempo real y recibir recomendaciones con IA.

---

## 🔐 Primeros Pasos

### 1. Registro de Usuario
1. Ir a `http://localhost:5173`
2. Clic en **"Registrarse"**
3. Completar el formulario:
   - ✅ Nombre completo  
   - ✅ Email válido  
   - ✅ Contraseña segura (mínimo 8 caracteres)  
   - ✅ Seleccionar rol: `Agricultor`, `Técnico` o `Agrónomo`  
4. Confirmar registro

### 2. Inicio de Sesión
1. Clic en **"Iniciar Sesión"**
2. Ingresar email y contraseña
3. Redirección automática según rol:
   - 👨‍🌾 Agricultor: `/dashboard/agricultor`
   - 👷 Técnico: `/dashboard/tecnico`
   - 👨‍🔬 Agrónomo: `/dashboard/agronomo`

---

## 🗺️ Gestión de Parcelas

### ➕ Crear Nueva Parcela
1. Ir a sección **"Mis Parcelas"**
2. Clic en **"Nueva Parcela"**
3. Completar los siguientes campos:
   - 📍 Nombre: Ej. `Parcela Norte A`
   - 📍 Ubicación: Dirección o descripción
   - 📍 Área: En hectáreas (Ej. 2.5)
   - 📍 Coordenadas: Latitud y Longitud (click en mapa)
   - 📍 Tipo de suelo: `Franco`, `Arcilloso`, `Arenoso`
   - 📍 Cultivo actual: Ej. `Tomate`, `Maíz`, `Trigo`, etc.
   - 📍 Fecha de siembra: Formato `DD/MM/AAAA`
4. Guardar parcela

### ✏️ Editar o Eliminar Parcela
- **Editar:** clic en el ícono 📝 → modificar campos → guardar  
- **Eliminar:** clic en 🗑️ → confirmar acción (⚠️ irreversible)

### 🔍 Ver Detalles de Parcela
Cada parcela muestra:
- 📊 Métricas actuales (temperatura, humedad en tiempo real)
- 🌦️ Clima actual
- 📍 Ubicación en mapa (georreferenciada)
- 🌱 Estado del cultivo
- 📈 Historial de datos y tendencias

---

## 📊 Monitoreo de Sensores

### 📈 Dashboard Principal
1. Seleccionar una parcela desde el menú desplegable
2. Visualizar métricas en tiempo real:
   - 🌡️ **Temperatura** (valor + gráfico)
   - 💧 **Humedad** (% + tendencia)
   - ⚗️ **pH** (nivel + recomendaciones)
   - 🧪 **NPK** (nutrientes del suelo)
3. Revisar alertas y análisis de tendencias

---

## ⚠️ Sistema de Alertas

### Tipos de Alertas
- 🟡 **Advertencia:** valores cercanos al límite
- 🔴 **Crítica:** acción inmediata requerida

### Umbrales Automáticos
- 🌡️ Temperatura: `< 5°C` o `> 40°C`
- 💧 Humedad: `< 20%` o `> 90%`
- ⚗️ pH: `< 5.5` o `> 8.0`
- 🧪 NPK: Déficit nutricional detectado

---

## 🤖 Asistente IA Conversacional

### 💬 Usar Chat Inteligente
1. Clic en el ícono **🤖 Asistente IA**
2. Escribir consulta en lenguaje natural
3. Recibir respuestas personalizadas
4. Continuar conversación contextual

### 📝 Ejemplos de Consultas

#### Consultas sobre cultivos:
- "¿Cuándo debo regar mis tomates?"
- "Mi cultivo de maíz tiene hojas amarillas, ¿qué puede ser?"
- "¿Cuál es el mejor momento para aplicar fertilizante NPK?"
- "Los niveles de pH están altos, ¿qué recomendaciones tienes?"

#### Consultas sobre sensores:
- "¿Por qué la humedad está tan baja en la parcela norte?"
- "Explícame las tendencias de temperatura de esta semana"
- "¿Los niveles de NPK son normales para esta época?"

#### Consultas sobre clima:
- "¿Va a llover esta semana?"
- "¿Debo proteger mis cultivos del clima previsto?"
- "¿Cuál es la previsión para los próximos 7 días?"

### 🎯 Recomendaciones Personalizadas
El asistente IA proporciona:
- 📊 Análisis basado en datos históricos
- 🌱 Recomendaciones específicas por tipo de cultivo
- ⏰ Planificación de actividades agrícolas
- 🔬 Interpretación de datos de sensores
- 📈 Predicciones y tendencias

---

## 📊 Reportes y Análisis

### 📈 Generar Reportes
1. Ir a sección **"Reportes"**
2. Seleccionar tipo de reporte:
   - 📊 **Reporte Semanal:** Resumen de 7 días
   - 📈 **Reporte Mensual:** Análisis detallado
   - 🌱 **Reporte de Cultivo:** Específico por parcela
3. Configurar parámetros:
   - 📅 Rango de fechas
   - 🗺️ Parcelas incluidas
   - 📊 Métricas a analizar
4. Generar y descargar (PDF/Excel)

### 📋 Tipos de Análisis Disponibles
- 📊 **Evolución temporal** de métricas
- 📈 **Comparativas** entre parcelas
- 🎯 **Eficiencia** de riego y fertilización
- ⚠️ **Historial de alertas** y resoluciones
- 🌦️ **Correlación clima-rendimiento**

---

## ⚙️ Configuración de Sistema

### 👤 Perfil de Usuario
1. Clic en **avatar** (esquina superior derecha)
2. Seleccionar **"Mi Perfil"**
3. Editar información:
   - 📝 Nombre y apellidos
   - 📧 Email de contacto
 


### 🔔 Preferencias de Notificaciones
1. Ir a **"Configuración"** → **"Notificaciones"**
2. Configurar alertas:
   - ✅ Email para alertas críticas
   - ✅ SMS para emergencias
   - ✅ Notificaciones push
   - ✅ Frecuencia de reportes automáticos

### 🎨 Personalización de Dashboard
- 🎯 Reordenar widgets mediante drag & drop
- 👁️ Mostrar/ocultar métricas específicas
- 🌈 Cambiar tema visual (claro/oscuro)
- 📊 Configurar gráficos predeterminados

---

## 🔧 Solución de Problemas

### ❌ Problemas Comunes

#### 🔌 Sensores sin datos
**Síntomas:** Métricas muestran "--" o valores antiguos
**Soluciones:**
1. Verificar conexión WiFi del dispositivo
2. Revisar estado de batería
3. Comprobar posicionamiento de sensores
4. Contactar soporte técnico si persiste

#### 📡 Conectividad de Red
**Síntomas:** "Error de conexión" en dashboard
**Soluciones:**
1. Verificar conexión a internet
2. Refrescar página (F5)
3. Limpiar caché del navegador
4. Probar en navegador diferente

#### 🔐 Problemas de Acceso
**Síntomas:** No puede iniciar sesión
**Soluciones:**
1. Verificar email y contraseña
2. Usar "Recuperar contraseña"
3. Comprobar mayúsculas/minúsculas
4. Contactar administrador

