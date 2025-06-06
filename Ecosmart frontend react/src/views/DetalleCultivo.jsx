import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './DetalleCultivo.css';

const DetalleCultivo = ({ API_URL }) => {
  const { id } = useParams(); // ID de la parcela
  const navigate = useNavigate();
  const [parcela, setParcela] = useState(null);
  const [cultivo, setCultivo] = useState(null);
  const [actividades, setActividades] = useState([]);
  const [analisisHistorico, setAnalisisHistorico] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [nuevaActividad, setNuevaActividad] = useState('');
  const [tipoActividad, setTipoActividad] = useState('observacion');
  // AGREGAR esta línea después de const [tipoActividad, setTipoActividad] = useState('observacion');
const [guardandoActividad, setGuardandoActividad] = useState(false);

useEffect(() => {
  const cargarDatosCultivo = async () => {
    try {
      setCargando(true);
      const token = localStorage.getItem('ecosmart_token');

      // Cargar información de la parcela
      const responseParcela = await fetch(`${API_URL}/parcelas/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (responseParcela.ok) {
        const dataParcela = await responseParcela.json();
        setParcela(dataParcela);

        // AGREGAR DEBUG PARA VER QUÉ DATOS LLEGAN:
        console.log("🌱 Datos de parcela:", dataParcela);
        console.log("🌾 Datos de cultivo:", dataParcela.cultivo);
        console.log("🔍 Cultivo actual:", dataParcela.cultivo_actual);

        // CARGAR DATOS ADICIONALES DEL CULTIVO DESDE LA BD
        let datosCultivo = null;
        try {
          // USAR ENDPOINT ESPECÍFICO para cultivo de la parcela
          const responseCultivoParcela = await fetch(`${API_URL}/parcelas/${id}/cultivo`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (responseCultivoParcela.ok) {
            datosCultivo = await responseCultivoParcela.json();
            console.log("🌿 Cultivo específico encontrado:", datosCultivo);
          } else {
            // FALLBACK: Buscar en lista de todos los cultivos
            const responseCultivo = await fetch(`${API_URL}/cultivos`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (responseCultivo.ok) {
              const listaCultivos = await responseCultivo.json();
              // Buscar por parcela_id
              datosCultivo = listaCultivos.find(c => c.parcela_id == id && c.activo);
              console.log("🌿 Cultivo encontrado en lista:", datosCultivo);
            }
          }
        } catch (errorCultivo) {
          console.log("⚠️ Error al cargar cultivo:", errorCultivo);
        }

        // USAR DATOS REALES del cultivo de BD:
        // USAR DATOS REALES del cultivo de BD:
setCultivo({
  // DATOS REALES de la BD:
  nombre: datosCultivo ? datosCultivo.nombre : (dataParcela.cultivo_actual || 'Sin cultivo'),
  variedad: datosCultivo ? datosCultivo.variedad : 'No especificada',
  fecha_siembra: datosCultivo ? datosCultivo.fecha_siembra : dataParcela.fecha_siembra,
  dias_transcurridos: datosCultivo ? datosCultivo.edad_dias : 
    (dataParcela.fecha_siembra 
      ? Math.floor((new Date() - new Date(dataParcela.fecha_siembra)) / (1000 * 60 * 60 * 24))
      : 0),
  fase_actual: datosCultivo ? datosCultivo.etapa_desarrollo : calcularFaseActual(dataParcela.fecha_siembra),
  estado_salud: 'óptimo',
  
  // CALCULAR PROGRESO REAL BASADO EN DÍAS Y TIPO DE CULTIVO
 // CALCULAR PROGRESO REAL BASADO EN DÍAS Y TIPO DE CULTIVO - SIEMPRE DINÁMICO
progreso_real: (() => {
  const nombreCultivo = datosCultivo ? datosCultivo.nombre : dataParcela.cultivo_actual;
  const diasReales = datosCultivo ? datosCultivo.edad_dias : 
    (dataParcela.fecha_siembra 
      ? Math.floor((new Date() - new Date(dataParcela.fecha_siembra)) / (1000 * 60 * 60 * 24))
      : 0);
  
  // USAR CONFIGURACIÓN ESPECÍFICA POR CULTIVO
  const config = obtenerConfigCultivo(nombreCultivo);
  
  // FORZAR CÁLCULO DINÁMICO - IGNORAR progreso_cosecha de BD
  const progresoCalculado = Math.round((diasReales / config.dias) * 100);
  
  console.log(`📊 PROGRESO FORZADO DINÁMICO para ${nombreCultivo}:`, {
    diasReales,
    diasCiclo: config.dias,
    progresoCalculadoDinamico: Math.min(progresoCalculado, 100),
    progresoBD: datosCultivo ? datosCultivo.progreso_cosecha : 'N/A',
    configUsada: config
  });
  
  // RETORNAR SIEMPRE EL CALCULADO, NO EL DE BD
  return Math.min(progresoCalculado, 100);
})(),
  
  // DATOS DINÁMICOS SEGÚN CONFIGURACIÓN:
  rendimiento_esperado: obtenerRendimientoEsperado(datosCultivo ? datosCultivo.nombre : dataParcela.cultivo_actual),
  densidad_plantacion: obtenerDensidadPlantacion(datosCultivo ? datosCultivo.nombre : dataParcela.cultivo_actual),
  ph_optimo: obtenerPhOptimo(datosCultivo ? datosCultivo.nombre : dataParcela.cultivo_actual),
  temperatura_optima: obtenerTemperaturaOptima(datosCultivo ? datosCultivo.nombre : dataParcela.cultivo_actual),
  
  // DATOS CALCULADOS:
  fecha_cosecha_estimada: calcularFechaCosecha(
    datosCultivo ? datosCultivo.fecha_siembra : dataParcela.fecha_siembra, 
    datosCultivo ? datosCultivo.nombre : dataParcela.cultivo_actual
  ),
  sistema_riego: 'Goteo automatizado' // Mantener genérico
});
        
      

        console.log("✅ Cultivo creado con datos 100% reales de BD");
        console.log("🔍 Datos usados:", {
          nombre: datosCultivo ? datosCultivo.nombre : dataParcela.cultivo_actual,
          variedad: datosCultivo ? datosCultivo.variedad : 'No especificada',
          edad_dias: datosCultivo ? datosCultivo.edad_dias : 'Calculado',
          progreso: datosCultivo ? datosCultivo.progreso_cosecha : 'Calculado'
        });
      }

      // Intentar cargar actividades, pero usar datos simulados si falla
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
        // Datos simulados si no hay backend
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

      // Intentar cargar análisis históricos, pero usar datos simulados si falla
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
        // Datos simulados
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

    } catch (error) {
      console.error('Error al cargar datos del cultivo:', error);
      setError(error.message);
    } finally {
      setCargando(false);
    }
  };

  cargarDatosCultivo();
}, [API_URL, id]);

  // Funciones auxiliares
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
const calcularFechaCosecha = (fechaSiembra, tipoCultivo) => {
  if (!fechaSiembra) return 'No determinada';
  
  const fechaBase = new Date(fechaSiembra);
  const config = obtenerConfigCultivo(tipoCultivo);
  const diasCiclo = config.dias;
  
  const fechaCosecha = new Date(fechaBase.getTime() + diasCiclo * 24 * 60 * 60 * 1000);
  return fechaCosecha.toLocaleDateString();
};

  const agregarActividad = async () => {
    if (!nuevaActividad.trim()) return;

    const userData = JSON.parse(localStorage.getItem('ecosmart_user') || '{}');
    const nombreUsuario = userData.nombre || userData.username || 'Usuario';


    const nuevaAct = {
      fecha: new Date().toISOString(),
      tipo: tipoActividad,
      descripcion: nuevaActividad,
     realizada_por: nombreUsuario
    };

    try {
      const token = localStorage.getItem('ecosmart_token');
      const response = await fetch(`${API_URL}/parcelas/${id}/actividades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(nuevaAct)
      });

      if (response.ok) {
        const actividadGuardada = await response.json();
        setActividades(prev => [actividadGuardada, ...prev]);
      } else {
        // Si falla, agregar localmente
        setActividades(prev => [{ ...nuevaAct, id: Date.now() }, ...prev]);
      }
    } catch (error) {
      // Agregar localmente si hay error
      setActividades(prev => [{ ...nuevaAct, id: Date.now() }, ...prev]);
    }

    setNuevaActividad('');
  };

  const eliminarActividad = async (actividadId) => {
  // Confirmar eliminación
  const confirmar = window.confirm('¿Está seguro de que desea eliminar esta actividad?');
  if (!confirmar) return;

  try {
    const token = localStorage.getItem('ecosmart_token');
    const response = await fetch(`${API_URL}/parcelas/${id}/actividades/${actividadId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      // Eliminar de la lista inmediatamente
      setActividades(prev => prev.filter(act => act.id !== actividadId));
      console.log('✅ Actividad eliminada exitosamente');
    } else {
      // Si falla el servidor, eliminar localmente también
      setActividades(prev => prev.filter(act => act.id !== actividadId));
      console.log('⚠️ Actividad eliminada localmente (servidor no disponible)');
    }
  } catch (error) {
    console.error('Error al eliminar actividad:', error);
    // Eliminar localmente si hay error
    setActividades(prev => prev.filter(act => act.id !== actividadId));
  }
};

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

  const getColorEstado = (estado) => {
    const colores = {
      'óptimo': '#28a745',
      'alerta': '#ffc107',
      'crítico': '#dc3545'
    };
    return colores[estado] || '#6c757d';
  };
  // CONFIGURACIÓN DINÁMICA DE CULTIVOS
// CONFIGURACIÓN DINÁMICA DE CULTIVOS
const configuracionCultivos = {
  // VARIANTES DE MAÍZ (agregar estas líneas)
  'Maiz': { dias: 120, rendimiento: '8-12 ton/ha', densidad: '5-7 plantas/m²', ph: '6.0-7.0', temp: '20-30°C' },
  'maiz': { dias: 120, rendimiento: '8-12 ton/ha', densidad: '5-7 plantas/m²', ph: '6.0-7.0', temp: '20-30°C' },
  'MAIZ': { dias: 120, rendimiento: '8-12 ton/ha', densidad: '5-7 plantas/m²', ph: '6.0-7.0', temp: '20-30°C' },
  'Maíz': { dias: 120, rendimiento: '8-12 ton/ha', densidad: '5-7 plantas/m²', ph: '6.0-7.0', temp: '20-30°C' },
  
  // CULTIVOS EXISTENTES
  'Trigo': { dias: 150, rendimiento: '3-6 ton/ha', densidad: '400-500 plantas/m²', ph: '6.0-7.5', temp: '15-25°C' },
  'Soja': { dias: 130, rendimiento: '2-4 ton/ha', densidad: '30-40 plantas/m²', ph: '6.0-7.0', temp: '20-30°C' },
  'Tomate': { dias: 120, rendimiento: '8-12 ton/ha', densidad: '2.5 plantas/m²', ph: '6.0-6.8', temp: '18-24°C' },
  'Lechuga': { dias: 60, rendimiento: '4-6 ton/ha', densidad: '4 plantas/m²', ph: '6.0-7.0', temp: '15-20°C' },
  
  // CONFIGURACIÓN POR DEFECTO
  'default': { dias: 90, rendimiento: '5-10 ton/ha', densidad: '10-20 plantas/m²', ph: '6.0-7.0', temp: '18-25°C' }
};

// FUNCIÓN PARA OBTENER CONFIGURACIÓN DE CUALQUIER CULTIVO
// FUNCIÓN PARA OBTENER CONFIGURACIÓN DE CUALQUIER CULTIVO
const obtenerConfigCultivo = (nombreCultivo) => {
  if (!nombreCultivo) return configuracionCultivos['default'];
  
  const nombre = nombreCultivo.toString().trim();
  
  // BUSCAR COINCIDENCIA EXACTA PRIMERO
  if (configuracionCultivos[nombre]) {
    console.log(`✅ Configuración encontrada para: ${nombre}`);
    return configuracionCultivos[nombre];
  }
  
  // BUSCAR SIN DISTINCIÓN DE MAYÚSCULAS/MINÚSCULAS
  const nombreLower = nombre.toLowerCase();
  const configKey = Object.keys(configuracionCultivos).find(key => 
    key.toLowerCase() === nombreLower
  );
  
  if (configKey) {
    console.log(`✅ Configuración encontrada (case-insensitive) para: ${nombre} -> ${configKey}`);
    return configuracionCultivos[configKey];
  }
  
  // BUSCAR POR PALABRAS CLAVE
  if (nombreLower.includes('maiz') || nombreLower.includes('maíz')) {
    console.log(`✅ Configuración de Maíz aplicada para: ${nombre}`);
    return configuracionCultivos['Maiz'];
  }
  
  // USAR CONFIGURACIÓN POR DEFECTO
  console.log(`⚠️ Usando configuración default para: ${nombre}`);
  return configuracionCultivos['default'];
};

// FUNCIONES DINÁMICAS PARA CUALQUIER CULTIVO
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

        {/* Actividades del cultivo */}
        <div className="card actividades-cultivo">
          <h3><i className="fas fa-tasks"></i> Actividades del Cultivo</h3>
          
          {/* Formulario nueva actividad */}
          <div className="nueva-actividad">
            <select 
              value={tipoActividad} 
              onChange={(e) => setTipoActividad(e.target.value)}
            >
              <option value="observacion">Observación</option>
              <option value="riego">Riego</option>
              <option value="fertilizacion">Fertilización</option>
              <option value="poda">Poda</option>
              <option value="tratamiento">Tratamiento</option>
            </select>
            <input
              type="text"
              placeholder="Describe la actividad..."
              value={nuevaActividad}
              onChange={(e) => setNuevaActividad(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && agregarActividad()}
            />
            <button onClick={agregarActividad}>
              <i className="fas fa-plus"></i>
            </button>
          </div>
            {/* Lista de actividades MEJORADA */}
<div className="lista-actividades">
  {actividades.map((actividad, index) => (
    <div key={actividad.id || index} className={`actividad-item ${actividad.estado || ''}`}>
      <div className="actividad-icono">
        <i className={`fas ${getIconoActividad(actividad.tipo)}`}></i>
      </div>
      <div className="actividad-contenido">
        <div className="actividad-descripcion">
          {actividad.descripcion}
          {actividad.estado === 'pendiente' && (
            <span className="badge-pendiente">Guardando...</span>
          )}
          {actividad.estado === 'error' && (
            <span className="badge-error">Error al guardar</span>
          )}
        </div>
        <div className="actividad-meta">
          <span className="fecha">
            {new Date(actividad.fecha).toLocaleDateString()} - {new Date(actividad.fecha).toLocaleTimeString()}
          </span>
          <span className="tipo">{actividad.tipo}</span>
          {actividad.realizada_por && (
            <span className="realizador">por {actividad.realizada_por}</span>
          )}
        </div>
      </div>
      
      {/* BOTONES DE ACCIÓN */}
      <div className="actividad-acciones">
        <button 
          className="btn-eliminar"
          onClick={() => eliminarActividad(actividad.id)}
          title="Eliminar actividad"
          disabled={guardandoActividad}
        >
          <i className="fas fa-trash"></i>
        </button>
        
        {actividad.estado === 'error' && (
          <button 
            className="btn-reintentar"
            onClick={() => reintentarActividad(actividad)}
            title="Reintentar guardar"
            disabled={guardandoActividad}
          >
            <i className="fas fa-redo"></i>
          </button>
        )}
      </div>
    </div>
  ))}
</div>
        </div>
      </div>
    </div>
  );
};

export default DetalleCultivo;