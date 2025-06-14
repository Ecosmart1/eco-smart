import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './DashboardAgricultor.css';
import MeteorologiaWidget from './MeteorologiaWidget';
import FormularioParcela from './FormularioParcela';
import { getAuthHeaders } from '../services/serviciorutas'; // Asegúrate de que esta función esté exportada correctamente
import servicioRecomendaciones from '../services/servicioRecomendaciones';
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
  const [alertas, setAlertas] = useState([]);
  const [cargandoAlertas, setCargandoAlertas] = useState(false);
  const [datosMeteo, setDatosMeteo] = useState(null); // Si tienes meteorología en backend, agrega fetch
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarGraficosPopup, setMostrarGraficosPopup] = useState(false);

  // Estados para popup de comparación de sensores
  const [mostrarCompararPopup, setMostrarCompararPopup] = useState(false);
  const [compararConfig, setCompararConfig] = useState([
    {
      parcela: null,
      tipo: 'temperatura',
      rango: '24h',
      datos: { temperatura: [], humedad: [], ph: [], nutrientes: [] }
    },
    {
      parcela: null,
      tipo: 'humedad',
      rango: '24h',
      datos: { temperatura: [], humedad: [], ph: [], nutrientes: [] }
    }
  ]);

  // Función para abrir/cerrar popup comparar
  const toggleCompararPopup = () => setMostrarCompararPopup(prev => !prev);

  // Cargar datos para cada lado del popup de comparación
  useEffect(() => {
    compararConfig.forEach((cfg, idx) => {
      if (!cfg.parcela) return;
      // Usar la misma lógica de fetchDatosSensores
      const fetchDatos = async () => {
        try {
          let periodo;
          switch(cfg.rango) {
            case '7d': periodo = '7d'; break;
            case '30d': periodo = '30d'; break;
            default: periodo = '24h'; break;
          }
          const parcelaId = cfg.parcela;
          const response = await fetch(
            `${API_URL}/sensores/datos?parcela=${parcelaId}&periodo=${periodo}`,
            { headers: getAuthHeaders() }
          );
          if (response.ok) {
            const data = await response.json();
            setCompararConfig(prev => {
              const nuevo = [...prev];
              nuevo[idx] = {
                ...nuevo[idx],
                datos: {
                  humedad: data.humedad || [],
                  temperatura: data.temperatura || [],
                  ph: data.ph || [],
                  nutrientes: data.nutrientes || []
                }
              };
              return nuevo;
            });
          } else {
            setCompararConfig(prev => {
              const nuevo = [...prev];
              nuevo[idx] = {
                ...nuevo[idx],
                datos: { temperatura: [], humedad: [], ph: [], nutrientes: [] }
              };
              return nuevo;
            });
          }
        } catch {
          setCompararConfig(prev => {
            const nuevo = [...prev];
            nuevo[idx] = {
              ...nuevo[idx],
              datos: { temperatura: [], humedad: [], ph: [], nutrientes: [] }
            };
            return nuevo;
          });
        }
      };
      fetchDatos();
    });
    // eslint-disable-next-line
  }, [
    compararConfig[0].parcela, compararConfig[0].tipo, compararConfig[0].rango,
    compararConfig[1].parcela, compararConfig[1].tipo, compararConfig[1].rango
  ]);

  const [recomendaciones, setRecomendaciones] = useState([]);
  const [cargandoRecomendaciones, setCargandoRecomendaciones] = useState(false);
  const [errorConexion, setErrorConexion] = useState(false);
  
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
  const cerrarFormulario = () => setMostrarFormulario(false);
  
  // Función para obtener alertas desde el backend
  const fetchAlertas = async () => {
    try {
      setCargandoAlertas(true);
      const response = await fetch(`${API_URL}/alertas`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Alertas obtenidas de la BD:', data.length);
        setAlertas(data);
        setErrorConexion(false);
      } else if (response.status === 401) {
        console.warn("Token expirado al obtener alertas");
        setErrorConexion(true);
        // Usar datos de ejemplo si no se pueden obtener alertas reales
        generarAlertasEjemplo();
      } else {
        throw new Error(`Error del servidor: ${response.status}`);
      }
    } catch (error) {
      console.error('Error al obtener alertas:', error);
      setErrorConexion(true);
      // Generar datos de ejemplo en caso de error
      generarAlertasEjemplo();
    } finally {
      setCargandoAlertas(false);
    }
  };
  
  // Generar alertas de ejemplo cuando hay error
  const generarAlertasEjemplo = () => {
    const alertasEjemplo = [
      {
        id: 1,
        parcela: 2,
        sensor_id: 234,
        tipo: "Humedad de suelo",
        valor: 12.5,
        severidad: "critico",
        mensaje: "Humedad de suelo criticamente baja",
        timestamp: new Date().toISOString(),
        activa: true,
        parcelaNombre: "Campo Norte"
      },
      {
        id: 2,
        parcela: 3,
        sensor_id: 118,
        tipo: "Temperatura",
        valor: 39.7,
        severidad: "alerta",
        mensaje: "Temperatura elevada",
        timestamp: new Date().toISOString(),
        activa: true,
        parcelaNombre: "Viñedo Sur"
      },
      {
        id: 3,
        parcela: 2,
        sensor_id: 156,
        tipo: "pH del suelo",
        valor: 4.2,
        severidad: "critico",
        mensaje: "pH del suelo demasiado ácido",
        timestamp: new Date().toISOString(),
        activa: true,
        parcelaNombre: "Campo Norte"
      }
    ];
    setAlertas(alertasEjemplo);
  };

  // Función para marcar una alerta como resuelta
  const marcarAlertaComoResuelta = async (alertaId) => {
    try {
      const res = await fetch(`${API_URL}/alertas/${alertaId}/revisada`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      
      if (res.ok) {
        // Actualizar lista de alertas quitando la resuelta
        setAlertas(alertas.filter(a => a.id !== alertaId));
      } else {
        console.error('Error al marcar alerta como resuelta');
      }
    } catch (error) {
      console.error('Error de conexión:', error);
    }
  };

  const cargarRecomendaciones = async (maxCaracteres = 150) => {
    try {
      setCargandoRecomendaciones(true);
      const recomendacionesData = await servicioRecomendaciones.obtenerRecomendaciones(false, maxCaracteres);
      setRecomendaciones(recomendacionesData);
    } catch (error) {
      console.error("Error al cargar recomendaciones:", error);
      // Usar recomendaciones estáticas si falla
      setRecomendaciones([
        {
          id: 'rec-fallback-1',
          parcela: 'Campo Este',
          cultivo: 'Maíz',
          recomendacion: 'Campo Este necesita riego inmediato. La humedad del suelo ha bajado a niveles críticos.'
        },
        {
          id: 'rec-fallback-2',
          parcela: 'Todas las parcelas',
          cultivo: 'General',
          recomendacion: 'Se prevén lluvias para el fin de semana. Considere ajustar los programas de riego.'
        },
        {
          id: 'rec-fallback-3',
          parcela: 'Viñedo Norte',
          cultivo: 'Viñas',
          recomendacion: 'Las condiciones son favorables para el desarrollo de hongos en Viñedo Norte.'
        }
      ]);
    } finally {
      setCargandoRecomendaciones(false);
    }
  };

  // Función para determinar el ícono según el contenido de la recomendación
  const obtenerIconoRecomendacion = (recomendacion) => {
    const texto = recomendacion.toLowerCase();
    if (texto.includes('riego') || texto.includes('humedad') || texto.includes('agua')) {
      return 'tint';
    } else if (texto.includes('lluvia') || texto.includes('precipitacion')) {
      return 'cloud-rain';
    } else if (texto.includes('fertiliz') || texto.includes('nutrient')) {
      return 'leaf';
    } else if (texto.includes('plaga') || texto.includes('insect') || texto.includes('hongo')) {
      return 'bug';
    } else if (texto.includes('temperatura') || texto.includes('clima') || texto.includes('calor')) {
      return 'thermometer-half';
    }
    return 'seedling';
  };
  
  // Obtener título basado en el tipo de recomendación
  const obtenerTituloRecomendacion = (recomendacion) => {
    const texto = recomendacion.toLowerCase();
    if (texto.includes('riego') || texto.includes('humedad') || texto.includes('agua')) {
      return 'Riego recomendado';
    } else if (texto.includes('lluvia') || texto.includes('precipitacion')) {
      return 'Alerta de lluvia';
    } else if (texto.includes('fertiliz') || texto.includes('nutrient')) {
      return 'Fertilización';
    } else if (texto.includes('plaga') || texto.includes('insect') || texto.includes('hongo')) {
      return 'Prevención de plagas';
    } else if (texto.includes('temperatura') || texto.includes('clima')) {
      return 'Alerta climática';
    }
    return 'Recomendación';
  };

  useEffect(() => {
    if (usuario && (parcelas.length > 0)) {
      cargarRecomendaciones();
      fetchAlertas();
    }
  }, [usuario, parcelas.length]);

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
      
      const response = await fetch(
        `${API_URL}/sensores/datos?parcela=${parcelaId}&periodo=${periodo}`,
        { headers: getAuthHeaders() } 
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
        console.log("Estructura de nutrientes:", datosCompletos.nutrientes);
        console.log("Primer elemento de nutrientes:", datosCompletos.nutrientes[0]);
        console.log("Datos cargados:", datosCompletos);
      } else {
        throw new Error(`Error del servidor: ${response.status}`);
      }
    } catch (error) {
      console.error('Error al obtener datos de sensores:', error);
      // Usar datos de prueba en caso de error
      setDatosSensores({
        temperatura: [{ 
          timestamp: new Date().toISOString(), 
          valor: 22.5 
        }],
        humedad: [{ 
          timestamp: new Date().toISOString(), 
          valor: 45.2 
        }],
        ph: [{ 
          timestamp: new Date().toISOString(), 
          valor: 6.8 
        }],
        nutrientes: [{ 
          timestamp: new Date().toISOString(), 
          valor: { 
            nitrogeno: 150, 
            fosforo: 45, 
            potasio: 200 
          } 
        }]
      });
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
      case "critico": return "severidad-alta";
      case "alerta": return "severidad-media";
      case "baja": return "severidad-baja";
      default: return "";
    }
  };

  // Obtener nombre de la parcela por ID
  const getParcelaNombre = (id) => {
    const parcela = parcelas.find(p => p.id === id);
    return parcela ? parcela.nombre : 'seleccionada';
  };

  // Formato de fecha/hora para los gráficos y alertas
  const formatXAxis = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Formatea la fecha para mostrarla amigable
  const formatearFecha = (fechaStr) => {
    try {
      const fecha = new Date(fechaStr);
      return fecha.toLocaleString();
    } catch (error) {
      return fechaStr;
    }
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
  
  const renderGraficoComparar = (tipo, datos) => {
  switch (tipo) {
    case 'temperatura':
    case 'humedad':
    case 'ph':
      return (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={datos[tipo]}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={formatXAxis} 
              stroke="#888"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              domain={tipo === 'ph' ? [0, 14] : tipo === 'temperatura' ? [0, 40] : [0, 100]}
              stroke="#888"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => tipo === 'humedad' ? `${value}%` : tipo === 'temperatura' ? `${value}°C` : value}
            />
            <Tooltip content={<CustomTooltip unidad={tipo === 'humedad' ? "%" : tipo === 'temperatura' ? "°C" : ""} />} />
            <Legend />
            <Line 
              name={tipo.charAt(0).toUpperCase() + tipo.slice(1)}
              type="monotone" 
              dataKey="valor" 
              stroke={tipo === 'temperatura' ? "#e74c3c" : tipo === 'humedad' ? "#3498db" : "#9b59b6"} 
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 1 }}
              activeDot={{ r: 5, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );

    case 'nutrientes':
      const datosFiltrados = datos.nutrientes?.filter(d => d.valor?.nitrogeno != null) || [];
      const dataFormateada = datosFiltrados.map(d => ({
        timestamp: d.timestamp,
        nitrogeno: d.valor.nitrogeno,
        fosforo: d.valor.fosforo,
        potasio: d.valor.potasio
      }));
      return (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={dataFormateada}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" tickFormatter={formatXAxis} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="nitrogeno" fill="#8bc34a" name="Nitrógeno" />
            <Bar dataKey="fosforo" fill="#ff9800" name="Fósforo" />
            <Bar dataKey="potasio" fill="#9c27b0" name="Potasio" />
          </BarChart>
        </ResponsiveContainer>
      );

    default:
      return <div>No hay datos para mostrar.</div>;
  }
};


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
          <button
            className="btn-add-parcela"
            onClick={() => navigate('/dashboard/agricultor/parcelas/nueva')}
          >
            + Nueva Parcela
          </button>
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
                  {/*Cada parcela al pulsar ver detalles debe redirigir a su informacion*/}
                  <button className="parcela-btn-detalle"
                  onClick={() => navigate(`/dashboard/agricultor/parcelas/${parcela.id}`)}>
                  Ver Detalles</button>

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
              <div className="header-actions">
                <Link to="/dashboard/agricultor/alertas" className="ver-todo">Ver todas</Link>
                <button 
                  onClick={fetchAlertas} 
                  className={`btn-actualizar-alertas ${cargandoAlertas ? 'loading' : ''}`}
                  disabled={cargandoAlertas}
                >
                  <i className={`fas ${cargandoAlertas ? 'fa-spinner fa-spin' : 'fa-sync'}`}></i>
                </button>
              </div>
            </div>
            <div className="alertas-list">
              {cargandoAlertas ? (
                <div className="alertas-cargando">
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Cargando alertas...</span>
                </div>
              ) : alertas.length > 0 ? (
                alertas.map(alerta => (
                  <div key={alerta.id} className="alerta-item">
                    <div className={`alerta-severidad ${getSeveridadColor(alerta.severidad)}`}></div>
                    <div className="alerta-content">
                      <div className="alerta-header">
                        <div className="alerta-title">
                          <i className={`fas fa-${alerta.tipo.toLowerCase().includes('temperatura') ? 'thermometer-half' : 
                                         alerta.tipo.toLowerCase().includes('humedad') ? 'tint' : 
                                         alerta.tipo.toLowerCase().includes('ph') ? 'flask' : 
                                         'exclamation-triangle'}`}></i>
                          <h4>{alerta.mensaje}</h4>
                        </div>
                        <span className="alerta-fecha">{formatearFecha(alerta.timestamp)}</span>
                      </div>
                      <div className="alerta-footer">
                        <span className="alerta-parcela">Parcela: {getParcelaNombre(alerta.parcela)}</span>
                        <div className="alerta-actions">
                          <button 
                            className="btn-alerta-resolver" 
                            onClick={() => marcarAlertaComoResuelta(alerta.id)}
                          >
                            Resolver
                          </button>
                          <button 
                            className="btn-alerta-mas"
                            onClick={() => consultarAsistente('general', alerta.parcela, getParcelaNombre(alerta.parcela))}
                            title="Consultar con IA"
                          >
                            <i className="fas fa-robot"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="alertas-empty">
                  <i className="fas fa-check-circle"></i>
                  <span>No hay alertas activas en este momento</span>
                </div>
              )}
              
              {alertas.length > 0 && (
                <div className="actualizacion-info">
                  <i className="fas fa-info-circle"></i>
                  <span>Alertas actualizadas en tiempo real. Última actualización: {new Date().toLocaleTimeString()}</span>
                </div>
              )}
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
                  onChange={e => setParcelaSeleccionada(e.target.value || null)}
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
                  <button 
                    className="btn-graficos"
                    style={{ marginLeft: 8 }}
                    onClick={toggleCompararPopup}
                  >
                    <i className="fas fa-sliders-h"></i> Comparar 
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
              <div className="header-actions">
                <Link to="/dashboard/agricultor/recomendaciones" className="ver-todo">Ver todas</Link>
                <button 
                  onClick={() => cargarRecomendaciones()} 
                  className={`btn-actualizar-recomendaciones ${cargandoRecomendaciones ? 'loading' : ''}`}
                  disabled={cargandoRecomendaciones}
                >
                  <i className={`fas ${cargandoRecomendaciones ? 'fa-spinner fa-spin' : 'fa-sync'}`}></i>
                </button>
              </div>
            </div>
            <div className="recomendaciones-list">
              {cargandoRecomendaciones ? (
                <div className="recomendaciones-cargando">
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Generando recomendaciones...</span>
                </div>
              ) : recomendaciones.length > 0 ? (
                recomendaciones.slice(0, 3).map((rec, index) => (
                  <div className="recomendacion-item" key={rec.id || `rec-${index}`}>
                    <div className="recomendacion-icon">
                      <i className={`fas fa-${obtenerIconoRecomendacion(rec.recomendacion)}`}></i>
                    </div>
                    <div className="recomendacion-content">
                      <h4>{obtenerTituloRecomendacion(rec.recomendacion)}</h4>
                      <p><strong>{rec.parcela} - {rec.cultivo}:</strong> {rec.recomendacion}</p>
                      <button 
                        className="btn-recomendacion"
                        onClick={() => consultarAsistente('general', null, rec.parcela)}
                      >
                        <i className="fas fa-robot"></i> Asistencia IA
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="recomendaciones-empty">
                  <i className="fas fa-info-circle"></i>
                  <span>No hay recomendaciones disponibles en este momento.</span>
                </div>
              )}
              
              {recomendaciones.length > 0 && (
                <div className="actualizacion-info">
                  <i className="fas fa-info-circle"></i>
                  <span>Recomendaciones basadas en datos de sensores de los últimos 7 días.</span>
                </div>
              )}
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
                          stroke="#9b59b6" 
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
                        data={datosSensores.nutrientes
                          .filter(dato => dato.valor && typeof dato.valor === 'object' && dato.valor.nitrogeno) 
                          .map(dato => {
                            console.log("Procesando dato válido:", dato);
                            return {
                              timestamp: dato.timestamp,
                              nitrogeno: dato.valor.nitrogeno,
                              fosforo: dato.valor.fosforo,
                              potasio: dato.valor.potasio
                            };
                          })
                        }
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
                          formatter={(value, name, props) => {
                            // props.dataKey es el dataKey real ("nitrogeno", "fosforo", "potasio")
                            let label = "";
                            switch (props.dataKey) {
                              case "nitrogeno": label = "Nitrógeno"; break;
                              case "fosforo": label = "Fósforo"; break;
                              case "potasio": label = "Potasio"; break;
                              default: label = name;
                            }
                            return [`${value} mg/L`, label];
                          }}
                          labelFormatter={(label) => new Date(label).toLocaleString()}
                        />
                      <Legend
                        formatter={(value) => {
                          if (value === "nitrogeno") return "Nitrógeno";
                          if (value === "fosforo") return "Fósforo";
                          if (value === "potasio") return "Potasio";
                          return value;
                        }}
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

      {/* NUEVO: Popup comparar sensores */}
      {mostrarCompararPopup && (
        <div className="graficos-popup-overlay">
          <div className="graficos-popup-container">
            <div className="graficos-popup-header">
              <h2>Comparar Lectura de Sensores</h2>
              <button className="btn-cerrar" onClick={toggleCompararPopup}>×</button>
            </div>
            <div className="graficos-popup-content" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {[0, 1].map(idx => (
                <div className="grafico-item" key={idx}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
                    {/* Selector de parcela */}
                    <select
                      value={compararConfig[idx].parcela || ''}
                      onChange={e => {
                        const val = e.target.value || null;
                        setCompararConfig(prev => {
                          const nuevo = [...prev];
                          nuevo[idx].parcela = val;
                          return [...nuevo];
                        });
                      }}
                      className="selector-parcela"
                      style={{ minWidth: 120 }}
                    >
                      <option value="">Seleccione parcela</option>
                      {parcelas.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                    {/* Selector de tipo de gráfico */}
                    <label>
                      Sensor:
                      <select
                        value={compararConfig[idx].tipo}
                        onChange={e => {
                          setCompararConfig(prev => {
                            const nuevo = [...prev];
                            nuevo[idx].tipo = e.target.value;
                            return [...nuevo];
                          });
                        }}
                        className="selector-parcela"
                        style={{ marginLeft: 8, minWidth: 120 }}
                      >
                        <option value="temperatura">Temperatura</option>
                        <option value="humedad">Humedad</option>
                        <option value="ph">pH</option>
                        <option value="nutrientes">Nutrientes</option>
                      </select>
                    </label>
                    {/* Selector de rango de tiempo */}
                    <label>
                      Rango:
                      <select
                        value={compararConfig[idx].rango}
                        onChange={e => {
                          setCompararConfig(prev => {
                            const nuevo = [...prev];
                            nuevo[idx].rango = e.target.value;
                            return [...nuevo];
                          });
                        }}
                        className="selector-parcela"
                        style={{ marginLeft: 8, minWidth: 90 }}
                      >
                        <option value="24h">24h</option>
                        <option value="7d">7d</option>
                        <option value="30d">30d</option>
                      </select>
                    </label>
                  </div>
                  {/* Mostrar el gráfico correspondiente según selección */}
                  {renderGraficoComparar(compararConfig[idx].tipo, compararConfig[idx].datos)}
                </div>
              ))}
            </div>
            <div className="graficos-popup-footer">
              <span style={{ color: '#666', fontSize: 14 }}>Selecciona el sensor, rango y parcela para cada gráfico</span>
              <button className="btn-cerrar-secundario" onClick={toggleCompararPopup}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAgricultor;