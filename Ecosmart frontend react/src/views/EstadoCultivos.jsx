import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './EstadoCultivos.css';

const EstadoCultivos = ({ API_URL }) => {
  // Estados del componente
  const [parcelas, setParcelas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroActivo, setFiltroActivo] = useState('todos');
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);
  const [analisisPlanta, setAnalisisPlanta] = useState(null);
  const [analizando, setAnalizando] = useState(false);
  const [parcelaSeleccionada, setParcelaSeleccionada] = useState(null);
  const [error, setError] = useState(null);
  
  // Activar modo simulación para desarrollo
  const MODO_SIMULACION = false;
  
  // API key de Plant.ID 
  const PLANT_ID_API_KEY = '5dgLQhjpnEdHqFtrorCQ2EXRfRkAaSFmXKXvuVaAp7T0kgNxBo';
  



// Función para formatear la edad en días a formato legible
const formatearEdad = (diasTotal) => {
  if (!diasTotal || diasTotal < 0) return 'No calculada';
  
  if (diasTotal === 0) return 'Recién sembrado';
  if (diasTotal === 1) return '1 día';
  if (diasTotal < 7) return `${diasTotal} días`;
  
  const semanas = Math.floor(diasTotal / 7);
  const diasExtra = diasTotal % 7;
  
  if (diasTotal < 30) {
    return diasExtra === 0 
      ? `${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`
      : `${semanas}s ${diasExtra}d`;
  }
  
  const meses = Math.floor(diasTotal / 30);
  const diasExtraMes = diasTotal % 30;
  
  if (diasTotal < 365) {
    return diasExtraMes === 0
      ? `${meses} ${meses === 1 ? 'mes' : 'meses'}`
      : `${meses}m ${Math.floor(diasExtraMes / 7)}s`;
  }
  
  const años = Math.floor(diasTotal / 365);
  const mesesExtra = Math.floor((diasTotal % 365) / 30);
  
  return mesesExtra === 0
    ? `${años} ${años === 1 ? 'año' : 'años'}`
    : `${años}a ${mesesExtra}m`;
};

// Función para obtener el color del progreso
const obtenerColorProgreso = (progreso) => {
  if (progreso < 25) return '#e74c3c'; // Rojo - Inicial
  if (progreso < 50) return '#f39c12'; // Naranja - Desarrollo
  if (progreso < 75) return '#f1c40f'; // Amarillo - Crecimiento
  if (progreso < 90) return '#27ae60'; // Verde - Madurando
  return '#2ecc71'; // Verde claro - Listo para cosecha
};

// Función para determinar el estado basado en progreso real
const determinarEstado = (cultivo) => {
  if (!cultivo) return 'sin-cultivo';
  
  const progreso = cultivo.progreso_cosecha || 0;
  const edad = cultivo.edad_dias || 0;
  
  // Lógica para determinar estado basado en datos reales
  if (progreso >= 90) return 'listo-cosecha';
  if (progreso >= 75) return 'óptimo';
  if (progreso >= 50) return 'bueno';
  if (progreso >= 25) return 'desarrollo';
  if (edad === 0) return 'recien-sembrado';
  return 'crecimiento';
};


// REEMPLAZAR desde línea 24 hasta línea 52:

useEffect(() => {
  const cargarParcelas = async () => {
    try {
      setCargando(true);
      
      // CAMBIO: Usar endpoint correcto sin token por ahora
      const response = await fetch(`${API_URL}/parcelas`, {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': '1' // Agregar user ID para logs
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Parcelas cargadas desde API:", data);
        
        // PROCESAR DATOS REALES: Agregar estado calculado a cada parcela
        const parcelasConEstado = data.map(parcela => {
          console.log("Procesando parcela:", parcela.nombre, "con cultivo:", parcela.cultivo);
          
          return {
            ...parcela,
            estado: determinarEstado(parcela.cultivo),
            // Asegurar que existe información del cultivo procesada
            cultivo_procesado: parcela.cultivo ? {
              ...parcela.cultivo,
              edad_formateada: formatearEdad(parcela.cultivo.edad_dias),
              fecha_siembra_formateada: parcela.cultivo.fecha_siembra ? 
                new Date(parcela.cultivo.fecha_siembra).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: '2-digit', 
                  year: 'numeric'
                }) : 'No especificada'
            } : null
          };
        });
        
        console.log("Parcelas procesadas:", parcelasConEstado);
        setParcelas(parcelasConEstado);
        setError(null);
      } else {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error al cargar parcelas:', error);
      setError(`Error al cargar las parcelas: ${error.message}`);
      
      // En caso de error, usar datos vacíos para evitar crashes
      setParcelas([]);
    } finally {
      setCargando(false);
    }
  };
  
  cargarParcelas();
}, [API_URL]);







  // Función para convertir imagen a base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  // Función para analizar imagen (modo simulación o real)
  const analizarImagen = async (event, parcela) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      
      setImagenSeleccionada(URL.createObjectURL(file));
      setParcelaSeleccionada(parcela);
      setAnalizando(true);
      setAnalisisPlanta(null);
      
      if (MODO_SIMULACION) {
        // Simular tiempo de procesamiento
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Estado aleatorio (saludable o enfermo)
        const estadoAleatorio = Math.random() > 0.5 ? 'saludable' : 'enfermo';
        
        // Datos simulados según el estado
        const problemas = estadoAleatorio === 'enfermo' ? 
          ['Posible deficiencia de nitrógeno', 'Signos tempranos de estrés hídrico'] : [];
          
        // Generar recomendaciones simuladas
        let recomendaciones;
        
        try {
          // Intentar obtener recomendaciones del backend
          const respuestaRec = await axios.post(`${API_URL}/recomendaciones/cultivo`, {
            cultivo: parcela.cultivo_actual || "Desconocido",
            estado: estadoAleatorio,
            detalles: { parcela_id: parcela.id }
          });
          
          recomendaciones = respuestaRec.data.recomendaciones;
        } catch (error) {
          console.warn("Error al obtener recomendaciones del backend:", error);
          // Si falla, usar recomendaciones locales de respaldo
          recomendaciones = estadoAleatorio === 'saludable' ?
            [
              `Mantener régimen de riego para ${parcela.cultivo_actual || "cultivo"}: 4-5L/m² cada 2-3 días`,
              `Fertilizar con NPK balanceado según cronograma regular`,
              `Continuar monitoreo semanal del desarrollo del cultivo`
            ] :
            [
              `Aumentar frecuencia de inspección para ${parcela.cultivo_actual || "cultivo"}: revisar diariamente`,
              `Aplicar fertilización foliar con micronutrientes (5ml/L) para corregir deficiencia`,
              `Ajustar parámetros de riego: reducir frecuencia y aumentar volumen`
            ];
        }
          
        // Simular resultado del análisis
        const analisisFormateado = {
          nombre_identificado: parcela.cultivo_actual || "Solanum lycopersicum",
          nombre_comun: parcela.cultivo_actual || "Tomate",
          probabilidad: 0.92,
          salud: estadoAleatorio === 'saludable' ? 'Buena' : 'Requiere atención',
          posibles_problemas: problemas,
          recomendaciones: recomendaciones,
          descripcion: `El cultivo de ${parcela.cultivo_actual || "tomate"} es uno de los más importantes en agricultura. Requiere atención regular para maximizar su rendimiento.`
        };
        
        setAnalisisPlanta(analisisFormateado);
        setAnalizando(false);
        return;
      }
      
      // ======== MODO REAL (API EXTERNA) ========
      // Solo se ejecuta si MODO_SIMULACION = false
      const base64Image = await fileToBase64(file);
      
      // Llamada a Plant.ID API
      const response = await axios.post(
        'https://api.plant.id/v2/identify',
        {
          images: [base64Image],
          modifiers: ["crops_fast", "similar_images"],
          plant_language: "es",
          plant_details: ["common_names", "url", "wiki_description", "taxonomy"]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Api-Key': PLANT_ID_API_KEY
          }
        }
      );
      
      console.log("Plant.ID respuesta:", response.data);
      
      // Procesar respuesta de la API
      const resultado = response.data;
      const mejorCoincidencia = resultado.suggestions[0];
      
      // Determinar si hay enfermedades
      const tieneEnfermedad = resultado.is_plant_probability < 0.8 || 
                            (resultado.health_assessment && 
                             resultado.health_assessment.is_healthy_probability < 0.7);
      
      // Generar recomendaciones con la API de EcoSmart basadas en el análisis
      const recomendacionesResponse = await axios.post(
        `${API_URL}/recomendaciones/cultivo`, 
        {
          cultivo: mejorCoincidencia.plant_name || parcela.cultivo_actual,
          estado: tieneEnfermedad ? 'enfermo' : 'saludable',
          detalles: {
            identificacion: mejorCoincidencia,
            analisis_salud: resultado.health_assessment,
            parcela_id: parcela.id
          }
        }
      );
      
      // Procesar la información para mostrarla
      const analisisFormateado = {
        nombre_identificado: mejorCoincidencia.plant_name,
        nombre_comun: mejorCoincidencia.plant_details?.common_names?.[0] || mejorCoincidencia.plant_name,
        probabilidad: mejorCoincidencia.probability,
        salud: tieneEnfermedad ? 'Requiere atención' : 'Buena',
        posibles_problemas: tieneEnfermedad 
          ? resultado.health_assessment?.diseases?.map(d => d.name) || ['Posible deficiencia nutricional', 'Estrés hídrico']
          : [],
        recomendaciones: recomendacionesResponse.data?.recomendaciones || [
          "Mantener el régimen de riego actual",
          "Monitorear el desarrollo del cultivo regularmente",
          "Aplicar fertilización según calendario establecido"
        ],
        imagen_similar: mejorCoincidencia.similar_images?.[0]?.url,
        descripcion: mejorCoincidencia.plant_details?.wiki_description?.value
      };
      
      setAnalisisPlanta(analisisFormateado);
      
    } catch (error) {
      console.error('Error en análisis:', error);
      setError('Error al analizar la imagen: ' + (error.response?.data?.message || error.message));
      setAnalisisPlanta({
        error: true,
        mensaje: 'No se pudo completar el análisis. Intente de nuevo con otra imagen.'
      });
    } finally {
      setAnalizando(false);
    }
  };

  // Función para guardar el análisis
  const guardarAnalisis = async () => {
    if (!analisisPlanta || !parcelaSeleccionada) return;
    
    try {
      if (MODO_SIMULACION) {
        // Simular guardado exitoso
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("Análisis guardado en modo simulación:", {
          parcela: parcelaSeleccionada.id,
          analisis: analisisPlanta
        });
        
        alert('Análisis guardado correctamente');
        setImagenSeleccionada(null);
        setAnalisisPlanta(null);
        setParcelaSeleccionada(null);
        return;
      }
      
      // Guardar en el backend real
      await axios.post(
        `${API_URL}/parcelas/${parcelaSeleccionada.id}/analisis`, 
        {
          tipo: 'analisis_imagen',
          resultado: JSON.stringify(analisisPlanta),
          analisis_formateado: analisisPlanta,
          fecha: new Date().toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('ecosmart_token')}`
          }
        }
      );
      
      alert('Análisis guardado correctamente');
      setImagenSeleccionada(null);
      setAnalisisPlanta(null);
      setParcelaSeleccionada(null);
      
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar el análisis: ' + error.message);
    }
  };

  if (cargando) {
    return <div className="cargando">Cargando datos de cultivos...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error al cargar los datos</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="estado-cultivos-container">
      <div className="cabecera-estado">
        <h1>Estado de Cultivos</h1>
        <p className="descripcion-seccion">
          Visualiza el estado actual de tus cultivos, analiza su desarrollo y recibe recomendaciones personalizadas.
        </p>
        
       <div className="filtros-estado">
          <button 
            className={`filtro-btn ${filtroActivo === 'todos' ? 'activo' : ''}`}
            onClick={() => setFiltroActivo('todos')}
          >
            Todos
          </button>
          <button 
            className={`filtro-btn ${filtroActivo === 'óptimo' ? 'activo' : ''}`}
            onClick={() => setFiltroActivo('óptimo')}
          >
            Óptimo
          </button>
          <button 
            className={`filtro-btn ${filtroActivo === 'alerta' ? 'activo' : ''}`}
            onClick={() => setFiltroActivo('alerta')}
          >
            Alerta
          </button>
          <button 
            className={`filtro-btn ${filtroActivo === 'crítico' ? 'activo' : ''}`}
            onClick={() => setFiltroActivo('crítico')}
          >
            Crítico
          </button>
        </div>
      </div>
      
      <div className="resumen-estado">
        <div className="stat-card">
          <i className="fas fa-seedling"></i>
          <div className="stat-info">
            <span className="stat-value">{parcelas.length}</span>
            <span className="stat-label">Cultivos monitoreados</span>
          </div>
        </div>
        
        <div className="stat-card">
          <i className="fas fa-chart-line"></i>
          <div className="stat-info">
            <span className="stat-value">
              {parcelas.length > 0 ? Math.round((parcelas.filter(p => p.estado === 'óptimo').length / parcelas.length) * 100) : 0}%
            </span>
            <span className="stat-label">Salud promedio</span>
          </div>
        </div>
        
        <div className="stat-card">
          <i className="fas fa-thermometer-half"></i>
          <div className="stat-info">
            <span className="stat-value">22°C</span>
            <span className="stat-label">Temperatura promedio</span>
          </div>
        </div>
      </div>
      



<div className="cultivos-grid">
  {parcelas
    .filter(p => filtroActivo === 'todos' || p.estado === filtroActivo)
    .map(parcela => (
      <div key={parcela.id} className={`cultivo-card estado-${parcela.estado}`}>
        <div className="cultivo-header">
          <h3>{parcela.cultivo_actual || 'Sin cultivo'}</h3>
          <span className={`estado-badge ${parcela.estado}`}>
            {parcela.estado?.replace('-', ' ')?.toUpperCase() || 'SIN CULTIVO'}
          </span>
        </div>
        
        <div className="cultivo-info">
          {/* SOLO INFORMACIÓN ESENCIAL */}
          <div className="info-esencial">
            <p><strong>Parcela:</strong> {parcela.nombre}</p>
            <p><strong>Ubicación:</strong> {parcela.ubicacion}</p>
            
            {/* MOSTRAR SOLO SI HAY CULTIVO */}
            {parcela.cultivo ? (
              <>
                <p><strong>Variedad:</strong> {parcela.cultivo.variedad || 'No especificada'}</p>
                <div className="edad-destacada">
                  <p><strong>Edad:</strong> 
                    <span className="valor-edad">
                      {parcela.cultivo_procesado?.edad_formateada || 'Calculando...'}
                    </span>
                  </p>
                </div>
              </>
            ) : (
              <p className="sin-cultivo-texto">
                <i className="fas fa-info-circle"></i>
                Sin cultivo activo
              </p>
            )}
          </div>
          
          {/* ÚLTIMA REVISIÓN */}
          <div className="ultima-revision">
            <small>
              <i className="fas fa-clock"></i>
              Última revisión: {new Date().toLocaleDateString('es-ES')}
            </small>
          </div>
        </div>
        
        <div className="cultivo-acciones">
          <Link to={`/dashboard/agronomo/cultivos/${parcela.id}`}>
            <button className="btn-ver-detalle btn-primary">
              <i className="fas fa-eye"></i>
              Ver detalles
            </button>
          </Link>
          
          <label className="btn-analizar">
            <i className="fas fa-camera"></i>
            Analizar
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => analizarImagen(e, parcela)} 
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>
    ))}
</div>

{/* MENSAJE CUANDO NO HAY PARCELAS */}
{parcelas.length === 0 && (
  <div className="sin-parcelas">
    <div className="sin-parcelas-contenido">
      <i className="fas fa-seedling fa-3x"></i>
      <h3>No hay cultivos registrados</h3>
      <p>Comienza agregando tu primera parcela con cultivo.</p>
      <Link to="/dashboard/agronomo/parcelas">
        <button className="btn-agregar-primera">
          <i className="fas fa-plus"></i>
          Agregar primera parcela
        </button>
      </Link>
    </div>
  </div>
)}

{/* MENSAJE CUANDO EL FILTRO NO ENCUENTRA RESULTADOS */}
{parcelas.length > 0 && parcelas.filter(p => filtroActivo === 'todos' || p.estado === filtroActivo).length === 0 && (
  <div className="sin-resultados-filtro">
    <div className="sin-resultados-contenido">
      <i className="fas fa-filter fa-2x"></i>
      <h3>No hay cultivos con este estado</h3>
      <p>Prueba cambiando el filtro o revisa el estado de tus cultivos.</p>
      <button 
        className="btn-limpiar-filtro"
        onClick={() => setFiltroActivo('todos')}
      >
        <i className="fas fa-times"></i>
        Mostrar todos
      </button>
    </div>
  </div>
)}
      
      {/* Modal para análisis de imagen */}
      {/* Modal para análisis de imagen */}
      {imagenSeleccionada && (
        <div className="modal-analisis">
          <div className="modal-contenido">
            <button className="cerrar-modal" onClick={() => setImagenSeleccionada(null)}>×</button>
            
            <h3>Análisis de cultivo: {parcelaSeleccionada?.cultivo_actual || 'No especificado'}</h3>
            
            <div className="analisis-layout">
              {/* Columna izquierda - Imágenes */}
              <div className="columna-imagenes">
                <div className="imagen-principal">
                  <h4>Imagen analizada</h4>
                  <img src={imagenSeleccionada} alt="Imagen para analizar" className="imagen-analizada" />
                </div>
                
                {analisisPlanta && !analisisPlanta.error && analisisPlanta.imagen_similar && (
                  <div className="imagen-referencia-contenedor">
                    <h4>Imagen de referencia</h4>
                    <img src={analisisPlanta.imagen_similar} alt="Planta similar" className="imagen-referencia" />
                  </div>
                )}
              </div>
              
              {/* Columna derecha - Resultados */}
              <div className="columna-resultados">
                {analizando ? (
                  <div className="analizando">
                    <i className="fas fa-spinner fa-spin"></i>
                    <p>Analizando imagen con Plant.ID API...</p>
                    <p className="progress-text">Esto puede tardar unos segundos</p>
                  </div>
                ) : analisisPlanta ? (
                  analisisPlanta.error ? (
                    <div className="error-analisis">
                      <i className="fas fa-exclamation-triangle"></i>
                      <p>{analisisPlanta.mensaje}</p>
                    </div>
                  ) : (
                    <>
                      <div className="resultado-seccion">
                        <h4><i className="fas fa-search"></i> Identificación</h4>
                        <div className="resultado-contenido">
                          <span className="nombre-principal">{analisisPlanta.nombre_comun}</span>
                          <span className="nombre-cientifico">({analisisPlanta.nombre_identificado})</span>
                          <span className="confianza">{Math.round(analisisPlanta.probabilidad * 100)}% de confianza</span>
                        </div>
                      </div>
                      
                      <div className="resultado-seccion">
                        <h4><i className="fas fa-heart-pulse"></i> Estado de salud</h4>
                        <div className="resultado-contenido">
                          <span className={`salud-badge ${analisisPlanta.salud === 'Buena' ? 'buena' : 'atencion'}`}>
                            {analisisPlanta.salud}
                          </span>
                        </div>
                      </div>
                      
                      {analisisPlanta.posibles_problemas && analisisPlanta.posibles_problemas.length > 0 && (
                        <div className="resultado-seccion">
                          <h4><i className="fas fa-exclamation-triangle"></i> Posibles problemas</h4>
                          <div className="resultado-contenido">
                            <ul className="problemas-lista">
                              {analisisPlanta.posibles_problemas.map((problema, i) => (
                                <li key={i}>{problema}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                      
                      <div className="resultado-seccion recomendaciones-seccion">
                        <h4><i className="fas fa-lightbulb"></i> Recomendaciones</h4>
                        <div className="resultado-contenido">
                          <div className="recomendaciones-grid">
                            {analisisPlanta.recomendaciones.slice(0, 3).map((rec, i) => (
                              <div key={i} className="recomendacion-card">
                                <div className="recomendacion-numero">{i + 1}</div>
                                <div className="recomendacion-texto">
                                  {rec}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {analisisPlanta.descripcion && (
                        <div className="resultado-seccion descripcion-seccion">
                          <h4><i className="fas fa-info-circle"></i> Información adicional</h4>
                          <div className="resultado-contenido">
                            <p className="descripcion-texto">
                              {analisisPlanta.descripcion}
                            </p>
                            <div className="descripcion-acciones">
                              <button 
                                className="btn-ver-completa"
                                onClick={() => {
                                  const modal = document.querySelector('.descripcion-completa-modal');
                                  modal.style.display = 'flex';
                                }}
                              >
                                Ver información completa
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                       {/* Modal para información completa */}
          {analisisPlanta && analisisPlanta.descripcion && (
            <div className="descripcion-completa-modal" style={{ display: 'none' }}>
              <div className="modal-backdrop" onClick={(e) => {
                if (e.target.classList.contains('modal-backdrop')) {
                  e.target.parentElement.style.display = 'none';
                }
              }}>
                <div className="modal-contenido-descripcion">
                  <div className="modal-header">
                    <h3>Información completa sobre {analisisPlanta.nombre_comun}</h3>
                    <button 
                      className="cerrar-modal-descripcion"
                      onClick={() => {
                        document.querySelector('.descripcion-completa-modal').style.display = 'none';
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div className="modal-body">
                    <div className="descripcion-completa">
                      {analisisPlanta.descripcion.split('\n').map((parrafo, index) => (
                        <p key={index}>{parrafo}</p>
                      ))}
                    </div>
                    {analisisPlanta.nombre_identificado && (
                      <div className="info-cientifica">
                        <h4>Información científica</h4>
                        <p><strong>Nombre científico:</strong> {analisisPlanta.nombre_identificado}</p>
                        <p><strong>Confianza de identificación:</strong> {Math.round(analisisPlanta.probabilidad * 100)}%</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
                      <div className="acciones-analisis">
                        <button className="btn-guardar-analisis" onClick={guardarAnalisis}>
                          <i className="fas fa-save"></i>
                          Guardar análisis y recomendaciones
                        </button>
                      </div>
                    </>
                  )
                ) : (
                  <p>No se ha podido analizar la imagen</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EstadoCultivos;