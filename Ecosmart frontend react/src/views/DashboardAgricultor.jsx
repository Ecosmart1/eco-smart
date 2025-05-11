import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './DashboardAgricultor.css';
import MeteorologiaWidget from './MeteorologiaWidget';
import FormularioParcela from './FormularioParcela';
// Importaciones de Recharts para gráficos
import {
  LineChart,
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
  
  // Nuevos estados para sensores
  const [datosSensores, setDatosSensores] = useState({
    humedad: [],
    temperatura: []
  });
  const [parcelaSeleccionada, setParcelaSeleccionada] = useState(null);
  const [rangoTiempo, setRangoTiempo] = useState('24h'); // Opciones: '24h', '7d', '30d'
  
  const navigate = useNavigate();

  // Abrir/cerrar formulario de nueva parcela
  const abrirFormulario = () => setMostrarFormulario(true);
  const cerrarFormulario = () => setMostrarFormulario(false);

  // Guardar parcela en backend
  const guardarParcela = async (parcelaData) => {
    try {
      const res = await fetch(`${API_URL}/parcelas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parcelaData)
      });
      if (res.ok) {
        fetchParcelas();
        cerrarFormulario();
      } else {
        alert("Error al guardar la parcela");
      }
    } catch (error) {
      alert("Error de conexión");
    }
  };

  // Obtener parcelas desde backend
  const fetchParcelas = async () => {
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/parcelas`);
      const data = await res.json();
      setParcelas(data);
    } catch (error) {
      setParcelas([]);
    }
    setCargando(false);
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
  // En la función fetchDatosSensores, cambiar el nombre del parámetro
// En la función fetchDatosSensores, asegurarte de usar 'parcela' como parámetro:
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
    const response = await fetch(`${API_URL}/sensores/datos?parcela=${parcelaId}&periodo=${periodo}`);
    
    if (response.ok) {
      const data = await response.json();
      setDatosSensores(data);
    } else {
      console.error('Error al obtener datos de sensores:', await response.text());
      // Si falla, usar datos de prueba
      generarDatosPrueba();
    }
  } catch (error) {
    console.error('Error al obtener datos de sensores:', error);
    // Si hay error, usar datos de prueba
    generarDatosPrueba();
  }
};
  // Función para generar datos de prueba
  const generarDatosPrueba = () => {
    // Generar fechas para las últimas 24 horas con intervalos de 1 hora
    const ahora = new Date();
    const datos = {
      humedad: [],
      temperatura: []
    };
    
    for (let i = 24; i >= 0; i--) {
      const tiempo = new Date(ahora.getTime() - i * 60 * 60 * 1000);
      const timestamp = tiempo.toISOString();
      
      // Generar valores aleatorios con tendencias realistas
      const baseHumedad = 45 + Math.sin(i/4) * 10; // Oscila entre 35-55%
      const baseTemp = 22 + Math.sin(i/6) * 5; // Oscila entre 17-27°C
      
      datos.humedad.push({
        timestamp,
        valor: Math.round((baseHumedad + Math.random() * 5) * 10) / 10
      });
      
      datos.temperatura.push({
        timestamp,
        valor: Math.round((baseTemp + Math.random() * 2) * 10) / 10
      });
    }
    
    setDatosSensores(datos);
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
    </div>
  );
};

export default DashboardAgricultor;