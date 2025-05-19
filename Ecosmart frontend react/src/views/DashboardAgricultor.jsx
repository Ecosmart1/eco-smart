import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './DashboardAgricultor.css';
import MeteorologiaWidget from './MeteorologiaWidget';
import FormularioParcela from './FormularioParcela';
import { getAuthHeaders } from '../services/serviciorutas'; // Asegúrate de que esta función esté exportada correctamente
// Importaciones de Recharts para gráficos
import {
  LineChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import MapaParcelas from './MapaParcelas';
import { Spinner } from 'react-bootstrap';


const API_URL = "http://localhost:5000/api"; 

const DashboardAgricultor = () => {
  const [usuario, setUsuario] = useState(null);
  const [parcelas, setParcelas] = useState([]);
  const [alertas, setAlertas] = useState([]); // cuando hayan alertas en backend, agrega fetch
  const [datosMeteo, setDatosMeteo] = useState(null); // Si tienes meteorología en backend, agrega fetch
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarGraficosPopup, setMostrarGraficosPopup] = useState(false);
  
  // Nuevos estados para sensores
  const [datosSensores, setDatosSensores] = useState({
    humedad: [],
    temperatura: [],
    ph: [],
    nutrientes: []
  });
  const [parcelaSeleccionada, setParcelaSeleccionada] = useState(null);
  const [rangoTiempo, setRangoTiempo] = useState('24h'); // Opciones: '24h', '7d', '30d'
  
  const navigate = useNavigate();

  // Función para mostrar/ocultar el popup de gráficos
  const toggleGraficosPopup = () => {
    setMostrarGraficosPopup(!mostrarGraficosPopup);
  };

  // Abrir/cerrar formulario de nueva parcela
  const abrirFormulario = () => setMostrarFormulario(true);
  const cerrarFormulario = () => setMostrarFormulario(false);

  // Guardar parcela en backend
  const guardarParcela = async (parcelaData) => {
  try {
    const res = await fetch(`${API_URL}/parcelas`, {
      method: "POST",
      headers: getAuthHeaders(), // Usar la función importada
      body: JSON.stringify(parcelaData)
    });
    if (res.ok) {
      fetchParcelas();
      cerrarFormulario();
    } else {
      const errorData = await res.json().catch(() => ({}));
      alert(`Error al guardar la parcela: ${errorData.error || 'Error desconocido'}`);
    }
  } catch (error) {
    console.error("Error al guardar parcela:", error);
    alert("Error de conexión");
  }
};

  // Obtener parcelas desde backend
  const fetchParcelas = async () => {
  setCargando(true);
  try {
    const res = await fetch(`${API_URL}/parcelas`, {
      headers: getAuthHeaders() // Usar la función importada
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error("Error al obtener parcelas:", errorData);
      setParcelas([]);
      return;
    }
    
    const data = await res.json();
    setParcelas(data);
  } catch (error) {
    console.error("Error al obtener parcelas:", error);
    setParcelas([]);
  } finally {
    setCargando(false);
  }
};

  // NUEVA FUNCIÓN: Consultar al asistente IA sobre datos de sensores
  const consultarAsistente = (tipo, parcelaId, parcelaNombre) => {
    let mensaje = "";
    
    // Construir mensaje según el tipo de sensor
    switch(tipo) {
      case 'humedad':
        mensaje = `¿Cómo están los niveles de humedad en mi parcela "${parcelaNombre}"? ¿Debo programar riego?`;
        break;
      case 'temperatura':
        mensaje = `¿Es adecuada la temperatura actual para los cultivos en mi parcela "${parcelaNombre}"?`;
        break;
      case 'general':
        mensaje = `¿Puedes analizar los datos de sensores de mi parcela "${parcelaNombre}" y darme recomendaciones?`;
        break;
      default:
        mensaje = `¿Qué puedes decirme sobre mi parcela "${parcelaNombre}" según los datos de sensores?`;
    }
    
    // Navegar a la página de chat con el contexto adecuado
    navigate('/dashboard/agricultor/chat', { 
      state: { 
        initialMessage: mensaje,
        parcelaId: parcelaId
      }
    });
  };

  // Función para obtener datos de sensores
  const fetchDatosSensores = async () => {
    try {
      // Definir periodo de tiempo para la consulta
      let periodo;
      switch(rangoTiempo) {
        case '7d': periodo = '7d'; break;
        case '30d': periodo = '30d'; break;
        default: periodo = '24h'; break;
      }
      
      // Definir parcela para la consulta
      const parcelaId = parcelaSeleccionada ? parcelaSeleccionada : 
                       (parcelas.length > 0 ? parcelas[0].id : null);
      
      if (!parcelaId) return; // No hay parcelas para consultar
      
      // CORREGIDO: Usar 'parcela' en lugar de 'parcela_id'
      const response = await fetch(
      `${API_URL}/sensores/datos?parcela=${parcelaId}&periodo=${periodo}`,
      { headers: getAuthHeaders() } // Usar la función importada
    );
      
      if (response.ok) {
        const data = await response.json();
        // Asegurarse de que todos los tipos de datos estén presentes
        const datosCompletos = {
          humedad: data.humedad || [],
          temperatura: data.temperatura || [],
          ph: data.ph || [],
          nutrientes: data.nutrientes || []
        };
        setDatosSensores(datosCompletos);
        console.log("Datos cargados:", datosCompletos);
      }

      
    } catch (error) {
      console.error('Error al obtener datos de sensores:', error);
      // Si hay error, usar datos de prueba
      generarDatosPrueba();
    }
  };


  

  // Verificar usuario y cargar parcelas al montar
  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('ecosmart_user');
    if (!usuarioGuardado) {
      navigate('/login');
      return;
    }
    const usuarioObj = JSON.parse(usuarioGuardado);
    if (usuarioObj.rol !== 'agricultor') {
      navigate('/login');
      return;
    }
    setUsuario(usuarioObj);
    fetchParcelas();
  }, [navigate]);

  // Cargar datos de sensores
  useEffect(() => {
    if (usuario && (parcelas.length > 0)) {
      fetchDatosSensores();
    }
  }, [usuario, parcelas.length, parcelaSeleccionada, rangoTiempo]);

  // Helpers para estilos
  const getEstadoColor = (estado) => {
    switch (estado) {
      case "óptimo": return "estado-optimo";
      case "alerta": return "estado-alerta";
      case "crítico": return "estado-critico";
      default: return "";
    }
  };

  const getSeveridadColor = (severidad) => {
    switch (severidad) {
      case "alta": return "severidad-alta";
      case "media": return "severidad-media";
      case "baja": return "severidad-baja";
      default: return "";
    }
  };

  // Obtener nombre de la parcela por ID
  const getParcelaNombre = (id) => {
    const parcela = parcelas.find(p => p.id === id);
    return parcela ? parcela.nombre : 'seleccionada';
  };

  // Formato de fecha/hora para los gráficos
  const formatXAxis = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Tooltip personalizado para gráficos
  const CustomTooltip = ({ active, payload, label, unidad }) => {
    if (active && payload && payload.length) {
      return (
        <div className="sensor-chart-tooltip">
          <p className="tooltip-time">{new Date(label).toLocaleString()}</p>
          <p className="tooltip-value">
            {`${payload[0].name}: ${payload[0].value} ${unidad}`}
          </p>
        </div>
      );
    }
    return null;
  };

  if (cargando) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '20% 0',
        width: '100%'
      }}>
        <p>Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-agricultor">

      {/* Contenido principal */}
      <div className="dashboard-content">
        {/* Bienvenida y fecha */}
        <div className="welcome-section">
          <div>
            <h2>Bienvenido, {usuario?.nombre}</h2>
            <p className="current-date">{new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <button className="btn-add-parcela" onClick={abrirFormulario}>+ Nueva Parcela</button>
        </div>

        {/* Sección 1: Resumen de parcelas y mapa */}
        <div className="dashboard-row">
          <div className="dashboard-card parcelas-resumen">
            <div className="card-header">
              <h3>Mis Parcelas</h3>
              <Link to="/dashboard/agricultor/parcelas" className="ver-todo">Ver todas</Link>
            </div>
            <div className="parcelas-grid">
              {parcelas.map(parcela => (
                <div key={parcela.id} className="parcela-card">
                  <div className={`parcela-estado ${getEstadoColor(parcela.estado)}`}></div>
                  <h4>{parcela.nombre}</h4>
                  <div className="parcela-details">
                    <div className="parcela-detail">
                      <span className="detail-label">Cultivo:</span>
                      <span className="detail-value">{parcela.cultivo_actual}</span>
                    </div>
                    <div className="parcela-detail">
                      <span className="detail-label">Área:</span>
                      <span className="detail-value">{parcela.hectareas} ha</span>
                    </div>
                    <div className="parcela-detail">
                      <span className="detail-label">Fecha siembra:</span>
                      <span className="detail-value">{parcela.fecha_siembra ? new Date(parcela.fecha_siembra).toLocaleDateString() : '-'}</span>
                    </div>
                  </div>
                  <button className="parcela-btn-detalle">Ver Detalles</button>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-card mapa-parcelas">
            <div className="card-header">
              <h3>Mapa de Parcelas</h3>
            </div>
            <div className="mapa-container">
              <MapaParcelas API_URL={API_URL} />
            </div>
          </div>
        </div>

        {/* Sección 2: Alertas y meteorología */}
        <div className="dashboard-row">
          <div className="dashboard-card alertas-panel">
            <div className="card-header">
              <h3>Alertas Activas</h3>
              <Link to="/alertas" className="ver-todo">Ver todas</Link>
            </div>
            <div className="alertas-list">
              {alertas.map(alerta => (
                <div key={alerta.id} className="alerta-item">
                  <div className={`alerta-severidad ${getSeveridadColor(alerta.severidad)}`}></div>
                  <div className="alerta-content">
                    <div className="alerta-header">
                      <div className="alerta-title">
                        <i className={`fas fa-${alerta.tipo === 'humedad' ? 'tint' : alerta.tipo === 'temperatura' ? 'thermometer-half' : 'bug'}`}></i>
                        <h4>{alerta.mensaje}</h4>
                      </div>
                      <span className="alerta-fecha">{alerta.fecha}</span>
                    </div>
                    <div className="alerta-footer">
                      <span className="alerta-parcela">{alerta.parcelaNombre}</span>
                      <div className="alerta-actions">
                        <button className="btn-alerta-resolver">Resolver</button>
                        <button className="btn-alerta-mas">...</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-card meteo-panel">
            <div className="card-header">
              <h3>Meteorología</h3>
            </div>
            <MeteorologiaWidget ubicacion="Curicó, Maule" />
          </div>
        </div>

        {/* Sección 3: Lecturas de sensores y recomendaciones */}
        <div className="dashboard-row">
          <div className="dashboard-card sensores-panel">
            <div className="card-header">
              <h3>Lecturas de Sensores</h3>
              <div className="sensores-controles">
                {/* Selector de parcela */}
                <select 
                  value={parcelaSeleccionada || ''}
                  onChange={(e) => setParcelaSeleccionada(e.target.value || null)}
                  className="selector-parcela"
                >
                  <option value="">Todas las parcelas</option>
                  {parcelas.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                
                {/* Selector de rango de tiempo */}
                <div className="selector-tiempo">
                  <button 
                    className={rangoTiempo === '24h' ? 'activo' : ''} 
                    onClick={() => setRangoTiempo('24h')}
                  >
                    24h
                  </button>
                  <button 
                    className={rangoTiempo === '7d' ? 'activo' : ''} 
                    onClick={() => setRangoTiempo('7d')}
                  >
                    7d
                  </button>
                  <button 
                    className={rangoTiempo === '30d' ? 'activo' : ''} 
                    onClick={() => setRangoTiempo('30d')}
                  >
                    30d
                  </button>
                  <button 
                    className="btn-graficos"
                    onClick={toggleGraficosPopup}
                  >
                    <i className="fas fa-chart-line"></i> Ver más sensores
                  </button>
                </div>
              </div>
            </div>
            <div className="sensores-graficos">
              {/* Gráfico de Humedad */}
              <div className="sensor-grafico">
                <h4>Humedad de Suelo</h4>
                <div className="grafico-container">
                  {datosSensores.humedad && datosSensores.humedad.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={datosSensores.humedad}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
                        <XAxis 
                          dataKey="timestamp" 
                          tickFormatter={formatXAxis} 
                          stroke="#888"
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          domain={[0, 100]}
                          stroke="#888"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip 
                          content={<CustomTooltip unidad="%" />} 
                        />
                        <Legend />
                        <Line 
                          name="Humedad"
                          type="monotone" 
                          dataKey="valor" 
                          stroke="#3498db" 
                          strokeWidth={2}
                          dot={{ r: 3, strokeWidth: 1 }}
                          activeDot={{ r: 5, strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="grafico-placeholder">
                      <div className="grafico-linea"></div>
                      <div className="grafico-label">No hay datos disponibles</div>
                    </div>
                  )}
                </div>
                {/* NUEVO: Botón para consultar asistente sobre humedad */}
                {parcelaSeleccionada && (
                  <div className="sensor-actions">
                    <button 
                      onClick={() => consultarAsistente('humedad', parcelaSeleccionada, getParcelaNombre(parcelaSeleccionada))}
                      className="btn-consultar-ia"
                    >
                      <i className="fas fa-robot"></i> Consultar al asistente
                    </button>
                  </div>
                )}
              </div>
              
              {/* Gráfico de Temperatura */}
              <div className="sensor-grafico">
                <h4>Temperatura Ambiente</h4>
                <div className="grafico-container">
                  {datosSensores.temperatura && datosSensores.temperatura.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={datosSensores.temperatura}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
                        <XAxis 
                          dataKey="timestamp" 
                          tickFormatter={formatXAxis} 
                          stroke="#888"
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          domain={[0, 40]}
                          stroke="#888"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `${value}°C`}
                        />
                        <Tooltip 
                          content={<CustomTooltip unidad="°C" />} 
                        />
                        <Legend />
                        <Line 
                          name="Temperatura"
                          type="monotone" 
                          dataKey="valor" 
                          stroke="#e74c3c" 
                          strokeWidth={2}
                          dot={{ r: 3, strokeWidth: 1 }}
                          activeDot={{ r: 5, strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="grafico-placeholder">
                      <div className="grafico-linea temperatura"></div>
                      <div className="grafico-label">No hay datos disponibles</div>
                    </div>
                  )}
                </div>
                {/* NUEVO: Botón para consultar asistente sobre temperatura */}
                {parcelaSeleccionada && (
                  <div className="sensor-actions">
                    <button 
                      onClick={() => consultarAsistente('temperatura', parcelaSeleccionada, getParcelaNombre(parcelaSeleccionada))}
                      className="btn-consultar-ia"
                    >
                      <i className="fas fa-robot"></i> Consultar al asistente
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="sensores-footer">
              <Link to="/dashboard/agricultor/sensores" className="ver-detalle">Ver análisis detallado</Link>
              {/* NUEVO: Botón para consultar sobre todos los sensores */}
              {parcelaSeleccionada && (
                <button 
                  onClick={() => consultarAsistente('general', parcelaSeleccionada, getParcelaNombre(parcelaSeleccionada))}
                  className="btn-consultar-ia-general"
                >
                  <i className="fas fa-robot"></i> Analizar todos los sensores con IA
                </button>
              )}
            </div>
          </div>

          <div className="dashboard-card recomendaciones-panel">
            <div className="card-header">
              <h3>Recomendaciones</h3>
            </div>
            <div className="recomendaciones-list">
              <div className="recomendacion-item">
                <div className="recomendacion-icon">
                  <i className="fas fa-tint"></i>
                </div>
                <div className="recomendacion-content">
                  <h4>Riego recomendado</h4>
                  <p>Campo Este necesita riego inmediato. La humedad del suelo ha bajado a niveles críticos.</p>
                  <button className="btn-recomendacion">Programar riego</button>
                </div>
              </div>
              <div className="recomendacion-item">
                <div className="recomendacion-icon">
                  <i className="fas fa-cloud-rain"></i>
                </div>
                <div className="recomendacion-content">
                  <h4>Alerta de lluvia</h4>
                  <p>Se prevén lluvias para el fin de semana. Considere ajustar los programas de riego.</p>
                  <button className="btn-recomendacion">Ajustar riego</button>
                </div>
              </div>
              <div className="recomendacion-item">
                <div className="recomendacion-icon">
                  <i className="fas fa-bug"></i>
                </div>
                <div className="recomendacion-content">
                  <h4>Prevención de plagas</h4>
                  <p>Las condiciones son favorables para el desarrollo de hongos en Viñedo Norte.</p>
                  <button className="btn-recomendacion">Ver tratamiento</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Formulario modal para crear parcela */}
      {mostrarFormulario && (
        <FormularioParcela 
          onClose={cerrarFormulario}
          onGuardar={guardarParcela}
        />
      )}

      {/* Popup de gráficos adicionales */}
      {mostrarGraficosPopup && (
        <div className="graficos-popup-overlay">
          <div className="graficos-popup-container">
            <div className="graficos-popup-header">
              <h2>Análisis detallado de sensores</h2>
              <button className="btn-cerrar" onClick={toggleGraficosPopup}>×</button>
            </div>
            
            <div className="graficos-popup-content">
              {/* Temperatura */}
              <div className="grafico-item">
                <h4>Temperatura Ambiente</h4>
                <div className="grafico-container">
                  {datosSensores.temperatura && datosSensores.temperatura.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={datosSensores.temperatura}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
                        <XAxis 
                          dataKey="timestamp" 
                          tickFormatter={formatXAxis} 
                          stroke="#888"
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          domain={[0, 40]}
                          stroke="#888"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `${value}°C`}
                        />
                        <Tooltip 
                          content={<CustomTooltip unidad="°C" />} 
                        />
                        <Legend />
                        <Line 
                          name="Temperatura"
                          type="monotone" 
                          dataKey="valor" 
                          stroke="#e74c3c" 
                          strokeWidth={2}
                          dot={{ r: 3, strokeWidth: 1 }}
                          activeDot={{ r: 5, strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="grafico-placeholder">
                      <div className="grafico-linea temperatura"></div>
                      <div className="grafico-label">No hay datos disponibles</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Humedad */}
              <div className="grafico-item">
                <h4>Humedad del Suelo</h4>
                <div className="grafico-container">
                  {datosSensores.humedad && datosSensores.humedad.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={datosSensores.humedad}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
                        <XAxis 
                          dataKey="timestamp" 
                          tickFormatter={formatXAxis} 
                          stroke="#888"
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          domain={[0, 100]}
                          stroke="#888"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip 
                          content={<CustomTooltip unidad="%" />} 
                        />
                        <Legend />
                        <Line 
                          name="Humedad"
                          type="monotone" 
                          dataKey="valor" 
                          stroke="#3498db" 
                          strokeWidth={2}
                          dot={{ r: 3, strokeWidth: 1 }}
                          activeDot={{ r: 5, strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="grafico-placeholder">
                      <div className="grafico-linea humedad"></div>
                      <div className="grafico-label">No hay datos disponibles</div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* pH del suelo */}
              <div className="grafico-item">
                <h4>pH del Suelo</h4>
                <div className="grafico-container">
                  {datosSensores.ph && datosSensores.ph.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={datosSensores.ph}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
                        <XAxis 
                          dataKey="timestamp" 
                          tickFormatter={formatXAxis} 
                          stroke="#888"
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          domain={[0, 14]}
                          stroke="#888"
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip content={<CustomTooltip unidad="" />} />
                        <Legend />
                        <Line 
                          name="pH"
                          type="monotone" 
                          dataKey="valor" 
                          stroke="#8884d8" 
                          strokeWidth={2}
                          dot={{ r: 3, strokeWidth: 1 }}
                          activeDot={{ r: 5, strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="grafico-placeholder">
                      <div className="grafico-linea ph"></div>
                      <div className="grafico-label">No hay datos disponibles</div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Nutrientes - Gráfico de barras mixto */}
              <div className="grafico-item">
                <h4>Nutrientes del Suelo</h4>
                <div className="grafico-container">
                  {datosSensores.nutrientes && datosSensores.nutrientes.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart 
                        data={datosSensores.nutrientes.map(dato => ({
                          timestamp: dato.timestamp,
                          nitrogeno: dato.valor?.nitrogeno || 0,
                          fosforo: dato.valor?.fosforo || 0,
                          potasio: dato.valor?.potasio || 0
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="timestamp" 
                          tickFormatter={formatXAxis}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          label={{ value: 'mg/L', angle: -90, position: 'insideLeft' }}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                          formatter={(value, name) => [
                            `${value} mg/L`, 
                            name === "nitrogeno" ? "Nitrógeno" : 
                            name === "fosforo" ? "Fósforo" : "Potasio"
                          ]}
                          labelFormatter={(label) => new Date(label).toLocaleString()}
                        />
                        <Legend 
                          formatter={(value) => 
                            value === "nitrogeno" ? "Nitrógeno" : 
                            value === "fosforo" ? "Fósforo" : "Potasio"
                          }
                        />
                        <Bar dataKey="nitrogeno" fill="#8bc34a" name="Nitrógeno" />
                        <Bar dataKey="fosforo" fill="#ff9800" name="Fósforo" />
                        <Bar dataKey="potasio" fill="#9c27b0" name="Potasio" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="grafico-placeholder">
                      <div className="grafico-barras"></div>
                      <div className="grafico-label">No hay datos disponibles</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="graficos-popup-footer">
              <div className="rango-info">
                <span>Período: {rangoTiempo === '24h' ? 'últimas 24 horas' : rangoTiempo === '7d' ? 'últimos 7 días' : 'últimos 30 días'}</span>
                <span>Parcela: {parcelaSeleccionada ? getParcelaNombre(parcelaSeleccionada) : 'Todas'}</span>
              </div>
              <button className="btn-cerrar-secundario" onClick={toggleGraficosPopup}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAgricultor;