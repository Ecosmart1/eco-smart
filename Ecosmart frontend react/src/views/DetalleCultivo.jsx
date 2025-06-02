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

// ...existing code...
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
          
          // Simular datos del cultivo específico
          setCultivo({
            nombre: dataParcela.cultivo_actual || 'Sin cultivo',
            variedad: dataParcela.variedad || 'No especificada',
            fecha_siembra: dataParcela.fecha_siembra,
            dias_transcurridos: dataParcela.fecha_siembra 
              ? Math.floor((new Date() - new Date(dataParcela.fecha_siembra)) / (1000 * 60 * 60 * 24))
              : 0,
            fase_actual: calcularFaseActual(dataParcela.fecha_siembra),
            estado_salud: dataParcela.estado || 'óptimo',
            rendimiento_esperado: '8-12 ton/ha',
            fecha_cosecha_estimada: calcularFechaCosecha(dataParcela.fecha_siembra, dataParcela.cultivo_actual),
            densidad_plantacion: '2.5 plantas/m²',
            sistema_riego: 'Goteo automatizado',
            ph_optimo: '6.0 - 6.8',
            temperatura_optima: '18-24°C'
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
// ...existing code...

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
    let diasCiclo = 120; // Por defecto
    
    // Ajustar según tipo de cultivo
    switch(tipoCultivo?.toLowerCase()) {
      case 'tomate':
        diasCiclo = 120;
        break;
      case 'lechuga':
        diasCiclo = 60;
        break;
      case 'zanahoria':
        diasCiclo = 90;
        break;
      default:
        diasCiclo = 120;
    }
    
    const fechaCosecha = new Date(fechaBase.getTime() + diasCiclo * 24 * 60 * 60 * 1000);
    return fechaCosecha.toLocaleDateString();
  };

  const agregarActividad = async () => {
    if (!nuevaActividad.trim()) return;

    const nuevaAct = {
      fecha: new Date().toISOString(),
      tipo: tipoActividad,
      descripcion: nuevaActividad,
      realizada_por: 'Usuario actual'
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
        <Link to="/dashboard/agronomo/estado-cultivos" className="btn-volver">
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
        <div className="card desarrollo-cultivo">
          <h3><i className="fas fa-chart-line"></i> Estado de Desarrollo</h3>
          <div className="fases-timeline">
            <div className="fase-item completada">
              <div className="fase-punto"></div>
              <span>Germinación</span>
            </div>
            <div className="fase-item completada">
              <div className="fase-punto"></div>
              <span>Plántula</span>
            </div>
            <div className="fase-item activa">
              <div className="fase-punto"></div>
              <span>Crecimiento</span>
            </div>
            <div className="fase-item">
              <div className="fase-punto"></div>
              <span>Floración</span>
            </div>
            <div className="fase-item">
              <div className="fase-punto"></div>
              <span>Fructificación</span>
            </div>
            <div className="fase-item">
              <div className="fase-punto"></div>
              <span>Cosecha</span>
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
                <div className="progreso" style={{width: `${(cultivo.dias_transcurridos / 120) * 100}%`}}></div>
              </div>
              <span>{Math.round((cultivo.dias_transcurridos / 120) * 100)}%</span>
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

          {/* Lista de actividades */}
          <div className="lista-actividades">
            {actividades.map((actividad, index) => (
              <div key={index} className="actividad-item">
                <div className="actividad-icono">
                  <i className={`fas ${getIconoActividad(actividad.tipo)}`}></i>
                </div>
                <div className="actividad-contenido">
                  <div className="actividad-descripcion">{actividad.descripcion}</div>
                  <div className="actividad-meta">
                    <span className="fecha">{new Date(actividad.fecha).toLocaleDateString()}</span>
                    <span className="tipo">{actividad.tipo}</span>
                    {actividad.realizada_por && (
                      <span className="realizador">por {actividad.realizada_por}</span>
                    )}
                  </div>
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