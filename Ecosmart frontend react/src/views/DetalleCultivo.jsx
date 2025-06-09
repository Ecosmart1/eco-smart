import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './DetalleCultivo.css';

const DetalleCultivo = ({ API_URL }) => {
  const { id } = useParams(); // ID de la parcela desde la URL
  const navigate = useNavigate();
  
  // Estados principales
  const [parcela, setParcela] = useState(null);
  const [cultivo, setCultivo] = useState(null);
  const [actividades, setActividades] = useState([]);
  const [analisisHistorico, setAnalisisHistorico] = useState([]);
  
  // Estados de control
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [guardandoActividad, setGuardandoActividad] = useState(false);
  
  // Estados para formulario de actividades
  const [nuevaActividad, setNuevaActividad] = useState('');
  const [tipoActividad, setTipoActividad] = useState('observacion');
  
  // Estados para alertas del cultivo
  const [alertasCultivo, setAlertasCultivo] = useState([]);
  const [alertasHistorial, setAlertasHistorial] = useState([]);
  const [cargandoAlertas, setCargandoAlertas] = useState(false);

   // =================== CONFIGURACIÓN DE CULTIVOS ===================
  // Base de datos de configuraciones por tipo de cultivo
  const configuracionCultivos = {
    // Variantes de Maíz
    'Maiz': { dias: 120, rendimiento: '8-12 ton/ha', densidad: '5-7 plantas/m²', ph: '6.0-7.0', temp: '20-30°C' },
    'maiz': { dias: 120, rendimiento: '8-12 ton/ha', densidad: '5-7 plantas/m²', ph: '6.0-7.0', temp: '20-30°C' },
    'MAIZ': { dias: 120, rendimiento: '8-12 ton/ha', densidad: '5-7 plantas/m²', ph: '6.0-7.0', temp: '20-30°C' },
    'Maíz': { dias: 120, rendimiento: '8-12 ton/ha', densidad: '5-7 plantas/m²', ph: '6.0-7.0', temp: '20-30°C' },
    
    // Otros cultivos
    'Trigo': { dias: 150, rendimiento: '3-6 ton/ha', densidad: '400-500 plantas/m²', ph: '6.0-7.5', temp: '15-25°C' },
    'Soja': { dias: 130, rendimiento: '2-4 ton/ha', densidad: '30-40 plantas/m²', ph: '6.0-7.0', temp: '20-30°C' },
    'Tomate': { dias: 120, rendimiento: '8-12 ton/ha', densidad: '2.5 plantas/m²', ph: '6.0-6.8', temp: '18-24°C' },
    'Lechuga': { dias: 60, rendimiento: '4-6 ton/ha', densidad: '4 plantas/m²', ph: '6.0-7.0', temp: '15-20°C' },
    'Cebolla': { dias: 90, rendimiento: '6-8 ton/ha', densidad: '25-30 plantas/m²', ph: '6.0-7.0', temp: '15-25°C' },
    
    // Configuración por defecto
    'default': { dias: 90, rendimiento: '5-10 ton/ha', densidad: '10-20 plantas/m²', ph: '6.0-7.0', temp: '18-25°C' }
  };
  
   // =================== FUNCIONES AUXILIARES ===================
  
  /**
   * Obtiene la configuración específica para un cultivo
   * @param {string} nombreCultivo - Nombre del cultivo
   * @returns {object} Configuración del cultivo (días, rendimiento, etc.)
   */
  const obtenerConfigCultivo = (nombreCultivo) => {
    if (!nombreCultivo) return configuracionCultivos['default'];
    
    const nombre = nombreCultivo.toString().trim();
    
    // Búsqueda por coincidencia exacta
    if (configuracionCultivos[nombre]) {
      console.log(`✅ Configuración encontrada para: ${nombre}`);
      return configuracionCultivos[nombre];
    }
    
    // Búsqueda sin distinción de mayúsculas/minúsculas
    const nombreLower = nombre.toLowerCase();
    const configKey = Object.keys(configuracionCultivos).find(key => 
      key.toLowerCase() === nombreLower
    );
    
    if (configKey) {
      console.log(`✅ Configuración encontrada (case-insensitive) para: ${nombre} -> ${configKey}`);
      return configuracionCultivos[configKey];
    }
    
    // Búsqueda por palabras clave
    if (nombreLower.includes('maiz') || nombreLower.includes('maíz')) {
      console.log(`✅ Configuración de Maíz aplicada para: ${nombre}`);
      return configuracionCultivos['Maiz'];
    }
    if (nombreLower.includes('cebolla')) {
      return configuracionCultivos['Cebolla'];
    }
    
    // Configuración por defecto
    console.log(`⚠️ Usando configuración default para: ${nombre}`);
    return configuracionCultivos['default'];
  };

  /**
   * Funciones para obtener parámetros específicos del cultivo
   */
  const obtenerRendimientoEsperado = (nombreCultivo) => {
    const config = obtenerConfigCultivo(nombreCultivo);
    return config.rendimiento;
  };

  const obtenerDensidadPlantacion = (nombreCultivo) => {
    const config = obtenerConfigCultivo(nombreCultivo);
    return config.densidad;
  };

  const obtenerPhOptimo = (nombreCultivo) => {
    const config = obtenerConfigCultivo(nombreCultivo);
    return config.ph;
  };

  const obtenerTemperaturaOptima = (nombreCultivo) => {
    const config = obtenerConfigCultivo(nombreCultivo);
    return config.temp;
  };

  /**
   * Calcula la fase actual del cultivo basado en días transcurridos
   * @param {string} fechaSiembra - Fecha de siembra del cultivo
   * @returns {string} Fase actual del cultivo
   */
  const calcularFaseActual = (fechaSiembra) => {
    if (!fechaSiembra) return 'No determinada';
    
    const dias = Math.floor((new Date() - new Date(fechaSiembra)) / (1000 * 60 * 60 * 24));
    
    if (dias < 15) return 'Germinación';
    if (dias < 30) return 'Plántula';
    if (dias < 60) return 'Crecimiento vegetativo';
    if (dias < 90) return 'Floración';
    if (dias < 120) return 'Fructificación';
    return 'Maduración';
  };

  /**
   * Calcula la fecha estimada de cosecha
   * @param {string} fechaSiembra - Fecha de siembra
   * @param {string} tipoCultivo - Tipo de cultivo
   * @returns {string} Fecha estimada de cosecha
   */
  const calcularFechaCosecha = (fechaSiembra, tipoCultivo) => {
    if (!fechaSiembra) return 'No determinada';
    
    const fechaBase = new Date(fechaSiembra);
    const config = obtenerConfigCultivo(tipoCultivo);
    const diasCiclo = config.dias;
    
    const fechaCosecha = new Date(fechaBase.getTime() + diasCiclo * 24 * 60 * 60 * 1000);
    return fechaCosecha.toLocaleDateString();
  };

  /**
   * Funciones de cálculo avanzado para análisis del cultivo
   */
  const calcularProgresoInteligente = (cultivo) => {
    const config = obtenerConfigCultivo(cultivo.nombre);
    const diasEstimados = config.dias;
    const progreso = Math.round((cultivo.dias_transcurridos / diasEstimados) * 100);
    return Math.min(progreso, 100); // No superar 100%
  };

  const calcularDiasRestantes = (cultivo) => {
    const config = obtenerConfigCultivo(cultivo.nombre);
    const totalDias = config.dias;
    const restantes = totalDias - cultivo.dias_transcurridos;
    return restantes > 0 ? restantes : 0;
  };

  const calcularEficiencia = (cultivo) => {
    const config = obtenerConfigCultivo(cultivo.nombre);
    const progresoEsperado = (cultivo.dias_transcurridos / config.dias) * 100;
    const progresoReal = cultivo.progreso_real || calcularProgresoInteligente(cultivo);
    
    if (progresoReal >= progresoEsperado) {
      return Math.min(100, Math.round((progresoReal / progresoEsperado) * 100));
    }
    return Math.round((progresoReal / progresoEsperado) * 100);
  };

  const calcularVelocidadCrecimiento = (cultivo) => {
    const velocidad = (cultivo.progreso_real || calcularProgresoInteligente(cultivo)) / cultivo.dias_transcurridos;
    if (velocidad > 0.8) return 'Muy rápida';
    if (velocidad > 0.6) return 'Rápida';
    if (velocidad > 0.4) return 'Normal';
    if (velocidad > 0.2) return 'Lenta';
    return 'Muy lenta';
  };

  const calcularFechaCosechaReal = (cultivo) => {
    const diasRestantes = calcularDiasRestantes(cultivo);
    const fechaCosecha = new Date();
    fechaCosecha.setDate(fechaCosecha.getDate() + diasRestantes);
    return fechaCosecha.toLocaleDateString();
  };

  const calcularRendimientoProyectado = (cultivo) => {
    const eficiencia = calcularEficiencia(cultivo);
    const config = obtenerConfigCultivo(cultivo.nombre);
    
    // Extraer número promedio del rango (ej: "8-12 ton/ha" -> 10)
    const rendimientoBase = config.rendimiento.match(/(\d+)-(\d+)/);
    let promedioBase = 10; // Por defecto
    
    if (rendimientoBase) {
      const min = parseInt(rendimientoBase[1]);
      const max = parseInt(rendimientoBase[2]);
      promedioBase = (min + max) / 2;
    }
    
    const proyectado = (promedioBase * eficiencia / 100).toFixed(1);
    return `${proyectado} ton/ha`;
  };

  // =================== FUNCIONES DE INTERFAZ ===================
  
  /**
   * Obtiene el ícono CSS para cada tipo de actividad
   */
  const getIconoActividad = (tipo) => {
    const iconos = {
      'riego': 'fa-tint',
      'fertilizacion': 'fa-leaf',
      'analisis': 'fa-search',
      'poda': 'fa-cut',
      'cosecha': 'fa-hand-paper',
      'observacion': 'fa-eye',
      'tratamiento': 'fa-flask'
    };
    return iconos[tipo] || 'fa-circle';
  };

  /**
   * Obtiene el color CSS para cada estado de salud
   */
  const getColorEstado = (estado) => {
    const colores = {
      'óptimo': '#28a745',
      'alerta': '#ffc107',
      'crítico': '#dc3545'
    };
    return colores[estado] || '#6c757d';
  };

 // =================== FUNCIONES DE DATOS ===================
  
  /**
   * Carga las alertas específicas del cultivo actual
   * @param {string} parcelaId - ID de la parcela
   */
  // ...existing code...
// ...existing code...
// ...existing code...
const cargarAlertasCultivo = async (parcelaId, dataParcela = null) => {
  try {
    setCargandoAlertas(true);
    const token = localStorage.getItem('ecosmart_token');
    
    console.log(`🚨 Cargando alertas para parcela: ${parcelaId}`);
    console.log(`🆔 PARÁMETRO RECIBIDO: "${parcelaId}"`);
    console.log(`🆔 ID de la URL: "${id}"`);
    console.log(`🌱 Datos de parcela recibidos:`, dataParcela?.nombre || 'No disponible');
    
    const response = await fetch(`${API_URL}/alertas`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const alertas = await response.json();
      console.log(`✅ TODAS las alertas del backend:`, alertas);
      
      // FILTRO MEJORADO - Usar datos de parcela directos O state
      const alertasParcela = alertas.filter(alertaWrapper => {
        const alerta = alertaWrapper.alerta || alertaWrapper;
        
        // Usar dataParcela si está disponible, sino usar el state
        const parcelaData = dataParcela || parcela;
        
        // Buscar por nombre real de la parcela (desde BD)
        const coincidePorNombre = parcelaData && parcelaData.nombre && 
                                  alerta.parcela === parcelaData.nombre;
        
        // Fallback: buscar por formato "Parcela + ID" 
        const coincidePorId = alerta.parcela === `Parcela ${parcelaId}`;
        
        const coincide = coincidePorNombre || coincidePorId;
        
        console.log(`🎯 Comparando: "${alerta.parcela}" con "${parcelaData?.nombre}" o "Parcela ${parcelaId}" = ${coincide}`);
        
        return coincide;
      });
      
      console.log(`🎯 Alertas filtradas para Parcela ${parcelaId}:`, alertasParcela);
      
      // Separar alertas activas e historial
      const alertasActivas = alertasParcela
        .map(wrapper => {
          const alerta = wrapper.alerta || wrapper;
          return {
            ...alerta,
            activa: alerta.activa !== undefined ? alerta.activa : true
          };
        })
        .filter(alerta => alerta.activa);

      const alertasHistorial = alertasParcela
        .map(wrapper => {
          const alerta = wrapper.alerta || wrapper;
          return {
            ...alerta,
            activa: alerta.activa !== undefined ? alerta.activa : true
          };
        })
        .filter(alerta => !alerta.activa);
      
      setAlertasCultivo(alertasActivas);
      setAlertasHistorial(alertasHistorial);
      
      console.log(`📊 RESULTADO FINAL - Activas: ${alertasActivas.length}, Historial: ${alertasHistorial.length}`);
      
    } else {
      console.log(`❌ Error del servidor: ${response.status}`);
      setAlertasCultivo([]);
      setAlertasHistorial([]);
    }
    
  } catch (error) {
    console.error('Error al cargar alertas:', error);
    setAlertasCultivo([]);
    setAlertasHistorial([]);
  } finally {
    setCargandoAlertas(false);
  }
};

// =================== EFFECT PRINCIPAL ===================
useEffect(() => {
  const cargarDatosCultivo = async () => {
    try {
      setCargando(true);
      const token = localStorage.getItem('ecosmart_token');

      // 1. Cargar información de la parcela
      const responseParcela = await fetch(`${API_URL}/parcelas/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (responseParcela.ok) {
        const dataParcela = await responseParcela.json();
        setParcela(dataParcela);

        // Debug de datos recibidos
        console.log("🌱 Datos de parcela:", dataParcela);
        console.log("🌾 Datos de cultivo:", dataParcela.cultivo);
        console.log("🔍 Cultivo actual:", dataParcela.cultivo_actual);

        // 2. Cargar datos adicionales del cultivo desde la BD
        let datosCultivo = null;
        try {
          // Intentar endpoint específico para cultivo de parcela
          const responseCultivoParcela = await fetch(`${API_URL}/parcelas/${id}/cultivo`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (responseCultivoParcela.ok) {
            datosCultivo = await responseCultivoParcela.json();
            console.log("🌿 Cultivo específico encontrado:", datosCultivo);
          } else {
            // Fallback: buscar en lista de todos los cultivos
            const responseCultivo = await fetch(`${API_URL}/cultivos`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (responseCultivo.ok) {
              const listaCultivos = await responseCultivo.json();
              datosCultivo = listaCultivos.find(c => c.parcela_id == id && c.activo);
              console.log("🌿 Cultivo encontrado en lista:", datosCultivo);
            }
          }
        } catch (errorCultivo) {
          console.log("⚠️ Error al cargar cultivo:", errorCultivo);
        }

        // 3. Crear objeto cultivo con datos reales de BD
        setCultivo({
          // Datos básicos del cultivo
          nombre: datosCultivo ? datosCultivo.nombre : (dataParcela.cultivo_actual || 'Sin cultivo'),
          variedad: datosCultivo ? datosCultivo.variedad : 'No especificada',
          fecha_siembra: datosCultivo ? datosCultivo.fecha_siembra : dataParcela.fecha_siembra,
          dias_transcurridos: datosCultivo ? datosCultivo.edad_dias : 
            (dataParcela.fecha_siembra 
              ? Math.floor((new Date() - new Date(dataParcela.fecha_siembra)) / (1000 * 60 * 60 * 24))
              : 0),
          fase_actual: datosCultivo ? datosCultivo.etapa_desarrollo : calcularFaseActual(dataParcela.fecha_siembra),
          estado_salud: 'óptimo',
          
          // Progreso calculado dinámicamente
          progreso_real: (() => {
            const nombreCultivo = datosCultivo ? datosCultivo.nombre : dataParcela.cultivo_actual;
            const diasReales = datosCultivo ? datosCultivo.edad_dias : 
              (dataParcela.fecha_siembra 
                ? Math.floor((new Date() - new Date(dataParcela.fecha_siembra)) / (1000 * 60 * 60 * 24))
                : 0);
            
            const config = obtenerConfigCultivo(nombreCultivo);
            const progresoCalculado = Math.round((diasReales / config.dias) * 100);
            
            console.log(`📊 PROGRESO DINÁMICO para ${nombreCultivo}:`, {
              diasReales,
              diasCiclo: config.dias,
              progresoCalculado: Math.min(progresoCalculado, 100),
              progresoBD: datosCultivo ? datosCultivo.progreso_cosecha : 'N/A',
              configUsada: config
            });
            
            return Math.min(progresoCalculado, 100);
          })(),
          
          // Datos técnicos dinámicos según configuración
          rendimiento_esperado: obtenerRendimientoEsperado(datosCultivo ? datosCultivo.nombre : dataParcela.cultivo_actual),
          densidad_plantacion: obtenerDensidadPlantacion(datosCultivo ? datosCultivo.nombre : dataParcela.cultivo_actual),
          ph_optimo: obtenerPhOptimo(datosCultivo ? datosCultivo.nombre : dataParcela.cultivo_actual),
          temperatura_optima: obtenerTemperaturaOptima(datosCultivo ? datosCultivo.nombre : dataParcela.cultivo_actual),
          
          // Fechas calculadas
          fecha_cosecha_estimada: calcularFechaCosecha(
            datosCultivo ? datosCultivo.fecha_siembra : dataParcela.fecha_siembra, 
            datosCultivo ? datosCultivo.nombre : dataParcela.cultivo_actual
          ),
          sistema_riego: 'Goteo automatizado'
        });

        console.log("✅ Cultivo creado con datos reales de BD");
        console.log("🔍 Datos usados:", {
          nombre: datosCultivo ? datosCultivo.nombre : dataParcela.cultivo_actual,
          variedad: datosCultivo ? datosCultivo.variedad : 'No especificada',
          edad_dias: datosCultivo ? datosCultivo.edad_dias : 'Calculado',
          progreso: datosCultivo ? datosCultivo.progreso_cosecha : 'Calculado'
        });

        // 4. Cargar actividades (con fallback a datos simulados)
        try {
          const responseActividades = await fetch(`${API_URL}/parcelas/${id}/actividades`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (responseActividades.ok) {
            const dataActividades = await responseActividades.json();
            setActividades(dataActividades);
          } else {
            throw new Error('Endpoint no disponible');
          }
        } catch (errorActividades) {
          console.log('Usando datos simulados para actividades');
          setActividades([
            {
              id: 1,
              fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              tipo: 'riego',
              descripcion: 'Riego automático programado - 15L/m²',
              realizada_por: 'Sistema automático'
            },
            {
              id: 2,
              fecha: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              tipo: 'fertilizacion',
              descripcion: 'Aplicación de fertilizante NPK 20-20-20',
              realizada_por: 'Juan Pérez'
            },
            {
              id: 3,
              fecha: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              tipo: 'analisis',
              descripcion: 'Análisis de imagen - Estado saludable detectado',
              realizada_por: 'Sistema IA'
            },
            {
              id: 4,
              fecha: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
              tipo: 'poda',
              descripcion: 'Poda de hojas secas y brotes laterales',
              realizada_por: 'María García'
            },
            {
              id: 5,
              fecha: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
              tipo: 'tratamiento',
              descripcion: 'Aplicación preventiva de fungicida',
              realizada_por: 'Carlos López'
            }
          ]);
        }

        // 5. Cargar análisis históricos (con fallback a datos simulados)
        try {
          const responseAnalisis = await fetch(`${API_URL}/parcelas/${id}/analisis`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (responseAnalisis.ok) {
            const dataAnalisis = await responseAnalisis.json();
            setAnalisisHistorico(dataAnalisis);
          } else {
            throw new Error('Endpoint no disponible');
          }
        } catch (errorAnalisis) {
          console.log('Usando datos simulados para análisis');
          setAnalisisHistorico([
            {
              id: 1,
              fecha: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              resultado: 'Saludable',
              confianza: 95,
              problemas_detectados: [],
              recomendaciones: ['Mantener régimen de riego actual', 'Continuar monitoreo regular']
            },
            {
              id: 2,
              fecha: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
              resultado: 'Estrés leve',
              confianza: 87,
              problemas_detectados: ['Posible deficiencia de nitrógeno'],
              recomendaciones: ['Aumentar fertilización nitrogenada', 'Revisar sistema de riego']
            },
            {
              id: 3,
              fecha: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString(),
              resultado: 'Saludable',
              confianza: 92,
              problemas_detectados: [],
              recomendaciones: ['Excelente estado general', 'Mantener cuidados actuales']
            },
            {
              id: 4,
              fecha: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000).toISOString(),
              resultado: 'Alerta',
              confianza: 78,
              problemas_detectados: ['Manchas en hojas', 'Posible inicio de enfermedad fúngica'],
              recomendaciones: ['Aplicar fungicida preventivo', 'Mejorar ventilación', 'Reducir humedad']
            }
          ]);
        }

        // ✅ 6. CARGAR ALERTAS AL FINAL CON DATOS DE PARCELA DISPONIBLES
        console.log("🚨 Cargando alertas con parcela disponible:", dataParcela.nombre);
        await cargarAlertasCultivo(id, dataParcela);

      } // ✅ CIERRE DEL IF - Las alertas se cargan DENTRO donde dataParcela está disponible
      
    } catch (error) {
      console.error('Error al cargar datos del cultivo:', error);
      setError(error.message);
    } finally {
      setCargando(false);
    }
  };

  cargarDatosCultivo();
}, [API_URL, id]);



  





  if (cargando) {
    return <div className="cargando">Cargando información del cultivo...</div>;
  }

  if (error || !parcela || !cultivo) {
    return (
      <div className="error-container">
        <h2>Error al cargar el cultivo</h2>
        <p>{error || 'Cultivo no encontrado'}</p>
        <Link to="/dashboard/agronomo/estado-cultivos">
          <button>Volver a cultivos</button>
        </Link>
      </div>
    );
  }

  return (
    <div className="detalle-cultivo-container">
      {/* Header */}
      <div className="header-cultivo">
        <Link to="/dashboard/agronomo/cultivos" className="btn-volver">
          <i className="fas fa-arrow-left"></i> Volver a cultivos
        </Link>
        <div className="titulo-cultivo">
          <h1>{cultivo.nombre}</h1>
          <span className="variedad-badge">{cultivo.variedad}</span>
          <span 
            className="estado-badge" 
            style={{ backgroundColor: getColorEstado(cultivo.estado_salud) }}
          >
            {cultivo.estado_salud}
          </span>
        </div>
        <div className="acciones-cultivo">
          <Link to={`/dashboard/agronomo/parcelas/${id}`}>
            <button className="btn-ver-parcela">
              <i className="fas fa-map"></i> Ver parcela
            </button>
          </Link>
        </div>
      </div>

      {/* Grid principal */}
      <div className="cultivo-grid">
        {/* Información del cultivo */}
        <div className="card info-cultivo">
          <h3><i className="fas fa-seedling"></i> Información del Cultivo</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Nombre científico:</label>
              <span>{cultivo.nombre}</span>
            </div>
            <div className="info-item">
              <label>Variedad:</label>
              <span>{cultivo.variedad}</span>
            </div>
            <div className="info-item">
              <label>Fecha de siembra:</label>
              <span>{cultivo.fecha_siembra ? new Date(cultivo.fecha_siembra).toLocaleDateString() : 'No registrada'}</span>
            </div>
            <div className="info-item">
              <label>Días transcurridos:</label>
              <span>{cultivo.dias_transcurridos} días</span>
            </div>
            <div className="info-item">
              <label>Fase actual:</label>
              <span className="fase-badge">{cultivo.fase_actual}</span>
            </div>
            <div className="info-item">
              <label>Cosecha estimada:</label>
              <span>{cultivo.fecha_cosecha_estimada}</span>
            </div>
          </div>
        </div>

        {/* Estado de desarrollo */}
        {/* Estado de desarrollo */}
{/* Estado de desarrollo */}
<div className="card desarrollo-cultivo">
  <h3><i className="fas fa-chart-line"></i> Estado de Desarrollo</h3>
  <div className="fases-timeline">
    {(() => {
      // DEFINIR FASES SEGÚN EL CULTIVO
      const fasesCultivo = cultivo.nombre === 'Lechuga' 
        ? ['Siembra', 'Germinación', 'Crecimiento', 'Desarrollo', 'Maduración', 'Cosecha']
        : ['Siembra', 'Germinación', 'Crecimiento', 'Floración', 'Fructificación', 'Cosecha'];
      
      // DETERMINAR FASE ACTUAL DESDE BD CON MATCHING MEJORADO
      const faseActualBD = cultivo.fase_actual || 'Crecimiento';
      console.log("🎯 Fase actual desde BD:", faseActualBD);
      
      // ALGORITMO DE MATCHING MEJORADO
      let faseActualIndex = -1;
      
      // Buscar coincidencia exacta primero
      faseActualIndex = fasesCultivo.findIndex(fase => 
        fase.toLowerCase() === faseActualBD.toLowerCase()
      );
      
      // Si no hay coincidencia exacta, buscar por palabras clave
      if (faseActualIndex === -1) {
        if (faseActualBD.toLowerCase().includes('floracion') || faseActualBD.toLowerCase().includes('floración')) {
          faseActualIndex = fasesCultivo.findIndex(fase => fase.toLowerCase().includes('floración'));
        } else if (faseActualBD.toLowerCase().includes('crecimiento')) {
          faseActualIndex = fasesCultivo.findIndex(fase => fase.toLowerCase().includes('crecimiento'));
        } else if (faseActualBD.toLowerCase().includes('siembra')) {
          faseActualIndex = 0;
        } else if (faseActualBD.toLowerCase().includes('germinacion') || faseActualBD.toLowerCase().includes('germinación')) {
          faseActualIndex = 1;
        } else if (faseActualBD.toLowerCase().includes('fructificacion') || faseActualBD.toLowerCase().includes('fructificación')) {
          faseActualIndex = fasesCultivo.findIndex(fase => fase.toLowerCase().includes('fructificación'));
        } else if (faseActualBD.toLowerCase().includes('cosecha')) {
          faseActualIndex = fasesCultivo.length - 1;
        }
      }
      
      // Si aún no hay coincidencia, usar posición por defecto según días
      if (faseActualIndex === -1) {
        const dias = cultivo.dias_transcurridos || 0;
        if (dias < 15) faseActualIndex = 0; // Siembra
        else if (dias < 30) faseActualIndex = 1; // Germinación
        else if (dias < 60) faseActualIndex = 2; // Crecimiento
        else if (dias < 120) faseActualIndex = 3; // Floración/Desarrollo
        else if (dias < 180) faseActualIndex = 4; // Fructificación/Maduración
        else faseActualIndex = 5; // Cosecha
      }
      
      console.log("📍 Índice de fase calculado:", faseActualIndex);
      console.log("🎯 Fase que debería estar activa:", fasesCultivo[faseActualIndex]);
      
      return fasesCultivo.map((fase, index) => {
        let claseEstado = '';
        
        if (index < faseActualIndex) {
          claseEstado = 'completada';
        } else if (index === faseActualIndex) {
          claseEstado = 'activa';
        } else {
          claseEstado = '';
        }
        
        return (
          <div key={index} className={`fase-item ${claseEstado}`}>
            <div className="fase-punto"></div>
            <span>{fase}</span>
          </div>
        );
      });
    })()}
  </div>
  
  {/* INFORMACIÓN ADICIONAL DE LA FASE ACTUAL */}
{/* INFORMACIÓN ADICIONAL DE LA FASE ACTUAL */}
<div className="fase-actual-info">
  <div className="fase-actual-badge">
    <i className="fas fa-leaf"></i>
    <span>Fase actual: <strong>{cultivo.fase_actual}</strong></span>
  </div>
  <div className="fase-detalles">
    <span>Días transcurridos: {cultivo.dias_transcurridos} días</span>
    <span>Progreso general: {cultivo.progreso_real || Math.round((cultivo.dias_transcurridos / 120) * 100)}%</span>
    
    {/* ALERTAS GENÉRICAS BASADAS EN PROGRESO */}
    {cultivo.progreso_real >= 100 && (
      <span className="alerta">✅ Cultivo listo para cosecha</span>
    )}
    {cultivo.progreso_real >= 80 && cultivo.progreso_real < 100 && (
      <span className="alerta">🟡 Cultivo próximo a cosecha - monitorear de cerca</span>
    )}
    {cultivo.dias_transcurridos > 200 && cultivo.progreso_real < 80 && (
      <span className="alerta">⚠️ Desarrollo más lento de lo esperado</span>
    )}
    {cultivo.dias_transcurridos < 30 && (
      <span className="info">🌱 Cultivo en fase inicial - requiere cuidados especiales</span>
    )}
  </div>
</div>
</div>
        

        {/* Parámetros técnicos */}
        <div className="card parametros-tecnicos">
          <h3><i className="fas fa-cogs"></i> Parámetros Técnicos</h3>
          <div className="parametros-grid">
            <div className="parametro-item">
              <i className="fas fa-tint"></i>
              <div>
                <label>Sistema de riego:</label>
                <span>{cultivo.sistema_riego}</span>
              </div>
            </div>
            <div className="parametro-item">
              <i className="fas fa-seedling"></i>
              <div>
                <label>Densidad:</label>
                <span>{cultivo.densidad_plantacion}</span>
              </div>
            </div>
            <div className="parametro-item">
              <i className="fas fa-flask"></i>
              <div>
                <label>pH óptimo:</label>
                <span>{cultivo.ph_optimo}</span>
              </div>
            </div>
            <div className="parametro-item">
              <i className="fas fa-thermometer-half"></i>
              <div>
                <label>Temperatura:</label>
                <span>{cultivo.temperatura_optima}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rendimiento */}
        <div className="card rendimiento">
          <h3><i className="fas fa-chart-bar"></i> Rendimiento</h3>
          <div className="rendimiento-info">
            <div className="rendimiento-esperado">
              <span className="valor">{cultivo.rendimiento_esperado}</span>
              <span className="label">Rendimiento esperado</span>
            </div>
            <div className="progreso-cosecha">
              <label>Progreso hacia cosecha:</label>
              <div className="barra-progreso">
                <div className="progreso" style={{
             width: `${cultivo.progreso_real || Math.round((cultivo.dias_transcurridos / 120) * 100)}%`
            }}></div>
              </div>
              <span>{cultivo.progreso_real || Math.round((cultivo.dias_transcurridos / 120) * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Análisis histórico */}
        <div className="card analisis-historico">
          <h3><i className="fas fa-history"></i> Análisis Histórico</h3>
          <div className="lista-analisis">
            {analisisHistorico.map((analisis, index) => (
              <div key={index} className="analisis-item">
                <div className="analisis-fecha">
                  {new Date(analisis.fecha).toLocaleDateString()}
                </div>
                <div className="analisis-resultado">
                  <span className={`resultado-badge ${analisis.resultado.toLowerCase()}`}>
                    {analisis.resultado}
                  </span>
                  <span className="confianza">{analisis.confianza}% confianza</span>
                </div>
                {analisis.problemas_detectados.length > 0 && (
                  <div className="problemas-detectados">
                    <small>Problemas: {analisis.problemas_detectados.join(', ')}</small>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
            {/*Alertas del cultivo */}
            <div className="card alertas-cultivo">
          <h3><i className="fas fa-exclamation-triangle"></i> Alertas del Cultivo</h3>
          
          {cargandoAlertas ? (
            <div className="cargando-alertas">
              <i className="fas fa-spinner fa-spin"></i>
              <span>Cargando alertas...</span>
            </div>
          ) : (
            <>
              {/* Alertas activas */}
              {alertasCultivo.length > 0 ? (
                <div className="alertas-activas-seccion">
                  <h4>🚨 Alertas Activas ({alertasCultivo.length})</h4>
                  <div className="lista-alertas-cultivo">
                    {alertasCultivo.map(alerta => (
                      <div key={alerta.id} className={`alerta-cultivo-item ${alerta.severidad}`}>
                        <div className="alerta-header">
                          <span className={`severidad-badge ${alerta.severidad}`}>
                            {alerta.severidad.toUpperCase()}
                          </span>
                          <span className="alerta-tipo">{alerta.tipo}</span>
                          <span className="alerta-fecha">
                            {alerta.timestamp}
                          </span>
                        </div>
                        <div className="alerta-mensaje">
                          {alerta.mensaje}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="sin-alertas-activas">
                  <i className="fas fa-check-circle"></i>
                  <span>No hay alertas activas para este cultivo</span>
                </div>
              )}
            </>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default DetalleCultivo;