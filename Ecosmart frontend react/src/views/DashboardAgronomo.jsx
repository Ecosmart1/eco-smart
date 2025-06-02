import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './DashboardAgronomo.css';
import { getAuthHeaders } from '../services/serviciorutas';
import FormularioParcela from './FormularioParcela';
import servicioRecomendaciones from '../services/servicioRecomendaciones.js';
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
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
// Importar servicios de OpenRouter
import { 
  getConversaciones, 
  getConversacion, 
  enviarMensaje as enviarMensajeAPI, 
  nuevaConversacion, 
  eliminarConversacion 
} from '../services/servicioOpenrouter.js';

const API_URL = "http://localhost:5000/api";

const DashboardAgronomo = () => {
  const [usuario, setUsuario] = useState(null);
  const [usuarioId, setUsuarioId] = useState(null);
  const [parcelas, setParcelas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mensajeChat, setMensajeChat] = useState('');
  const [historialChat, setHistorialChat] = useState([]);
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);
  const [conversacionActual, setConversacionActual] = useState(null);
  const [conversaciones, setConversaciones] = useState([]);
  const [errorConexion, setErrorConexion] = useState(false);
  const [estadoIA, setEstadoIA] = useState('conectado');
  
  // Nuevos estados para recomendaciones
  const [recomendaciones, setRecomendaciones] = useState([]);
  const [cargandoRecomendaciones, setCargandoRecomendaciones] = useState(false);
  
  const navigate = useNavigate();

  // Verificar usuario al montar el componente - MODIFICADO PARA MANEJAR TOKEN FALTANTE
  useEffect(() => {
    console.log('=== VERIFICANDO AUTENTICACIÓN ===');
    
    // Verificar localStorage
    const usuarioGuardado = localStorage.getItem('ecosmart_user');
    const tokenGuardado = localStorage.getItem('ecosmart_token');
    
    console.log('Usuario en localStorage:', usuarioGuardado);
    console.log('Token en localStorage:', tokenGuardado ? 'Existe' : 'No existe');
    
    // MODIFICADO: Solo verificar usuario para desarrollo
    if (!usuarioGuardado) {
      console.log('No hay datos de usuario, redirigiendo al login');
      navigate('/login');
      return;
    }
    
    // AGREGADO: Si no hay token, crear uno temporal para desarrollo
    if (!tokenGuardado) {
      console.log('⚠️  Token faltante, creando token temporal para desarrollo');
      localStorage.setItem('ecosmart_token', 'temp_token_development');
    }
    
    try {
      const usuarioObj = JSON.parse(usuarioGuardado);
      console.log('Usuario parseado:', usuarioObj);
      
      // Verificar rol
      if (!usuarioObj.rol || (usuarioObj.rol !== 'agronomo' && usuarioObj.rol !== 'tecnico')) {
        console.log('Rol no válido:', usuarioObj.rol);
        localStorage.clear(); // Limpiar datos corruptos
        navigate('/login');
        return;
      }
      
      // Verificar que tenga ID
      if (!usuarioObj.id) {
        console.log('Usuario sin ID válido');
        localStorage.clear();
        navigate('/login');
        return;
      }
      
      console.log('✅ Autenticación exitosa, cargando dashboard');
      setUsuario(usuarioObj);
      setUsuarioId(usuarioObj.id);
      
      // Cargar datos
      fetchParcelas();
      inicializarChat(usuarioObj.id);
      // Cargar recomendaciones iniciales
      cargarRecomendaciones();
      
    } catch (error) {
      console.error('Error al parsear usuario:', error);
      localStorage.clear();
      navigate('/login');
    }
  }, [navigate]);

  // Función para cargar recomendaciones
  const cargarRecomendaciones = async (maxCaracteres = 100) => {
    if (!usuario) return;
    
    try {
      setCargandoRecomendaciones(true);
      const recomendacionesData = await servicioRecomendaciones.obtenerRecomendaciones(false, maxCaracteres);
      setRecomendaciones(recomendacionesData);
    } catch (error) {
      console.error("Error al cargar recomendaciones:", error);
    } finally {
      setCargandoRecomendaciones(false);
    }
  };

  // Función para solicitar recomendaciones específicas al asistente
  const solicitarRecomendacionesAlAsistente = async () => {
    setMensajeChat("Proporciona recomendaciones precisas para el manejo de mis cultivos basadas en los datos de sensores de los últimos 7 días.");
    await enviarMensaje();
  };

  // Función para verificar y renovar token si es necesario - MODIFICADA
  const verificarAutenticacion = async () => {
    const token = localStorage.getItem('ecosmart_token');
    const usuario = localStorage.getItem('ecosmart_user');
    
    console.log('Verificando autenticación...');
    console.log('Token existe:', !!token);
    console.log('Usuario existe:', !!usuario);
    
    if (!usuario) {
      console.log('Datos de usuario faltantes, redirigiendo al login');
      navigate('/login');
      return false;
    }
    
    // AGREGADO: Si no hay token, crear uno temporal
    if (!token) {
      console.log('Token faltante, creando temporal');
      localStorage.setItem('ecosmart_token', 'temp_token_development');
    }
    
    try {
      // AGREGADO: Para desarrollo, saltear verificación de token con servidor
      if (token === 'temp_token_development' || !token) {
        console.log('🚧 Modo desarrollo: saltando verificación de token');
        return true;
      }
      
      // Verificar que el token sea válido haciendo una llamada de prueba
      const response = await fetch(`${API_URL}/auth/verify`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (response.status === 401) {
        console.log('Token expirado, redirigiendo al login');
        localStorage.clear();
        navigate('/login');
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn('Error al verificar token:', error);
      // En caso de error de red, asumir que está bien para desarrollo
      return true;
    }
  };

  // Inicializar chat cargando conversaciones existentes
  const inicializarChat = async (userId) => {
    try {
      console.log('Inicializando chat para usuario:', userId);
      setEstadoIA('reconectando');
      
      const response = await getConversaciones(userId);
      
      if (response.data && response.data.length > 0) {
        setConversaciones(response.data);
        const conversacionReciente = response.data[0];
        setConversacionActual(conversacionReciente.id);
        await cargarHistorialChat(conversacionReciente.id, userId);
      }
      
      setEstadoIA('conectado');
      setErrorConexion(false);
    } catch (error) {
      console.error('Error al inicializar chat:', error);
      setEstadoIA('error');
      setErrorConexion(true);
    }
  };

  // Cargar historial de una conversación específica
  const cargarHistorialChat = async (convId, userId) => {
    try {
      console.log('Cargando historial de conversación:', convId);
      const response = await getConversacion(convId, userId);
      
      if (response.data && response.data.messages) {
        const mensajesFormateados = response.data.messages.map(msg => ({
          id: `${msg.timestamp}_${Math.random()}`,
          mensaje: msg.content,
          tipo: msg.sender === 'user' ? 'usuario' : 'ia',
          timestamp: new Date(msg.timestamp)
        }));
        
        setHistorialChat(mensajesFormateados);
      }
    } catch (error) {
      console.error('Error al cargar historial:', error);
      setHistorialChat([]);
    }
  };

  // NUEVAS FUNCIONES PARA MANEJO DE CONVERSACIONES
  // Función para cambiar de conversación
  const cambiarConversacion = async (conversacionId) => {
    try {
      console.log('Cambiando a conversación:', conversacionId);
      setConversacionActual(conversacionId);
      setHistorialChat([]); // Limpiar chat actual
      
      // Cargar historial de la conversación seleccionada
      await cargarHistorialChat(conversacionId, usuarioId);
      
    } catch (error) {
      console.error('Error al cambiar conversación:', error);
      setHistorialChat([]);
    }
  };

  // Función para crear nueva conversación
  const crearNuevaConversacion = async () => {
    try {
      console.log('Creando nueva conversación...');
      const response = await nuevaConversacion(usuarioId);
      const nuevaConv = response.data;
      
      // Actualizar lista de conversaciones
      setConversaciones(prev => [nuevaConv, ...prev]);
      setConversacionActual(nuevaConv.id);
      setHistorialChat([]);
      
      console.log('Nueva conversación creada:', nuevaConv.id);
      
    } catch (error) {
      console.error('Error al crear nueva conversación:', error);
      // Crear conversación temporal local
      const conversacionTemporal = {
        id: `temp_${Date.now()}`,
        title: `Chat ${new Date().toLocaleString()}`,
        created_at: new Date().toISOString(),
        message_count: 0
      };
      
      setConversaciones(prev => [conversacionTemporal, ...prev]);
      setConversacionActual(conversacionTemporal.id);
      setHistorialChat([]);
    }
  };

  // Función para eliminar conversación específica
  const eliminarConversacionEspecifica = async (conversacionId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta conversación?')) {
      return;
    }
    
    try {
      await eliminarConversacion(conversacionId, usuarioId);
      
      // Remover de la lista local
      setConversaciones(prev => prev.filter(conv => conv.id !== conversacionId));
      
      // Si era la conversación actual, crear una nueva
      if (conversacionActual === conversacionId) {
        setConversacionActual(null);
        setHistorialChat([]);
        await crearNuevaConversacion();
      }
      
    } catch (error) {
      console.error('Error al eliminar conversación:', error);
      // Remover localmente aunque falle el backend
      setConversaciones(prev => prev.filter(conv => conv.id !== conversacionId));
      
      if (conversacionActual === conversacionId) {
        setConversacionActual(null);
        setHistorialChat([]);
      }
    }
  };

  // Función para obtener título de conversación
  const obtenerTituloConversacion = (conversacion) => {
    if (conversacion.title) {
      return conversacion.title;
    }
    
    const fecha = new Date(conversacion.created_at);
    return `Chat ${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString()}`;
  };

  // Abrir/cerrar formulario de nueva parcela
  const abrirFormulario = () => setMostrarFormulario(true);
  const cerrarFormulario = () => setMostrarFormulario(false);

  // Guardar parcela en backend
  const guardarParcela = async (parcelaData) => {
    try {
      if (!(await verificarAutenticacion())) return;
      
      const res = await fetch(`${API_URL}/parcelas`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(parcelaData)
      });
      
      if (res.status === 401) {
        alert("Sesión expirada. Por favor, inicia sesión nuevamente.");
        localStorage.clear();
        navigate('/login');
        return;
      }
      
      if (res.ok) {
        fetchParcelas();
        cerrarFormulario();
        alert("Parcela guardada exitosamente");
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al guardar la parcela: ${errorData.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error("Error al guardar parcela:", error);
      alert("Error de conexión. Verifica tu conexión a internet.");
    }
  };

  // Obtener parcelas desde backend - MEJORADO
  const fetchParcelas = async () => {
    setCargando(true);
    console.log('Obteniendo parcelas...');
    
    try {
      const res = await fetch(`${API_URL}/parcelas`, {
        headers: getAuthHeaders()
      });
      
      console.log('Respuesta parcelas:', res.status);
      
      if (res.status === 401) {
        console.warn("Token expirado, usando datos de ejemplo");
        setErrorConexion(true);
        // No redirigir, usar datos de ejemplo
      } else if (res.ok) {
        const data = await res.json();
        console.log('Parcelas obtenidas:', data.length);
        const parcelasConEstado = data.map(parcela => ({
          ...parcela,
          estado: parcela.estado || 'óptimo'
        }));
        setParcelas(parcelasConEstado);
        setErrorConexion(false);
        
        // También actualizar las recomendaciones después de obtener las parcelas
        await cargarRecomendaciones();
        
        setCargando(false);
        return;
      } else {
        throw new Error(`Error del servidor: ${res.status}`);
      }
    } catch (error) {
      console.warn("Error al obtener parcelas, usando datos de ejemplo:", error);
      setErrorConexion(true);
    }
    
    // Datos de ejemplo cuando falla la API o hay problemas de auth
    const parcelasEjemplo = [
      { 
        id: 1, 
        nombre: 'Campo Norte', 
        ubicacion: 'Km 5, Molina', 
        hectareas: 12.5, 
        cultivo_actual: 'Maíz', 
        variedad: 'Maíz choclero', 
        estado: 'óptimo', 
        edad: '60 días', 
        usuario_id: usuarioId || 1 
      },
      { 
        id: 2, 
        nombre: 'Viñedo Sur', 
        ubicacion: 'Km 5, Molina', 
        hectareas: 8.3, 
        cultivo_actual: 'Tomate', 
        variedad: 'Roma', 
        estado: 'alerta', 
        edad: '45 días', 
        usuario_id: usuarioId || 1 
      },
      { 
        id: 3, 
        nombre: 'Huerto Oeste', 
        ubicacion: 'Km 5, Molina', 
        hectareas: 5.7, 
        cultivo_actual: 'Trigo', 
        variedad: 'Triticum aestivum', 
        estado: 'crítico', 
        edad: '90 días', 
        usuario_id: usuarioId || 2 
      },
      { 
        id: 4, 
        nombre: 'Campo Este', 
        ubicacion: 'Km 5, Molina', 
        hectareas: 15.0, 
        cultivo_actual: 'Papaya', 
        variedad: 'Maradol', 
        estado: 'óptimo', 
        edad: '120 días', 
        usuario_id: usuarioId || 2 
      }
    ];
    setParcelas(parcelasEjemplo);
    
    // Cargar recomendaciones con datos de ejemplo
    await cargarRecomendaciones();
    
    setCargando(false);
  };

  // Función para reintentar conexión con IA
  const reintentarConexionIA = async () => {
    await inicializarChat(usuarioId);
  };

  // Enviar mensaje usando el servicio de OpenRouter
  const enviarMensaje = async () => {
    if (!mensajeChat.trim() || enviandoMensaje) return;

    setEnviandoMensaje(true);
    
    const nuevoMensaje = {
      id: Date.now(),
      mensaje: mensajeChat,
      tipo: 'usuario',
      timestamp: new Date()
    };
    
    setHistorialChat(prev => [...prev, nuevoMensaje]);
    
    const mensajeEnviado = mensajeChat;
    setMensajeChat('');

    try {
      setEstadoIA('reconectando');
      
      let convId = conversacionActual;
      if (!convId) {
        console.log('Creando nueva conversación...');
        const nuevaConv = await nuevaConversacion(usuarioId);
        convId = nuevaConv.data.id;
        setConversacionActual(convId);
        await inicializarChat(usuarioId);
      }

      // MODIFICADO: Preparar contexto para incluir datos del servicio de recomendaciones
      const contextoDatos = await servicioRecomendaciones.prepararContextoParaAsistente();
      
      const contextData = {
        timestamp: new Date().toISOString(),
        user_role: usuario?.rol || 'agronomo',
        user_name: usuario?.nombre || 'Usuario',
        error_conexion: errorConexion,
        parcelas_disponibles: parcelas.map(p => ({
          id: p.id,
          nombre: p.nombre,
          cultivo: p.cultivo_actual,
          variedad: p.variedad,
          estado: p.estado,
          ubicacion: p.ubicacion,
          hectareas: p.hectareas,
          edad: p.edad
        })),
        total_parcelas: parcelas.length,
        parcelas_criticas: parcelas.filter(p => p.estado === 'crítico').length,
        parcelas_alerta: parcelas.filter(p => p.estado === 'alerta').length,
        parcelas_optimas: parcelas.filter(p => p.estado === 'óptimo').length,
        sistema_info: {
          sensores_activos: false,
          ultima_actualizacion: new Date().toISOString(),
          modo_operacion: errorConexion ? 'offline' : 'online'
        },
        // Incluir datos agrícolas del servicio de recomendaciones
        datos_agricolas: contextoDatos
      };

      const response = await enviarMensajeAPI(usuarioId, mensajeEnviado, convId, contextData);
      
      const respuestaIA = {
        id: Date.now() + 1,
        mensaje: response.data.reply || 'Respuesta recibida del asistente',
        tipo: 'ia',
        timestamp: new Date()
      };
      
      setHistorialChat(prev => [...prev, respuestaIA]);
      setEstadoIA('conectado');
      setErrorConexion(false);

    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      setEstadoIA('error');
      
      if (error.message && error.message.includes('401')) {
        const mensajeAuth = {
          id: Date.now() + 1,
          mensaje: "⚠️ **Error de autenticación detectado**\n\nParece que tu sesión ha expirado. Por favor:\n1. Verifica tus credenciales\n2. Intenta cerrar sesión y volver a iniciar\n3. Contacta al equipo técnico si el problema persiste",
          tipo: 'ia',
          timestamp: new Date()
        };
        setHistorialChat(prev => [...prev, mensajeAuth]);
        return;
      }
      
      let respuestaFallback = generarRespuestaSimulada(mensajeEnviado, parcelas, usuario);
      
      const mensajeError = {
        id: Date.now() + 1,
        mensaje: respuestaFallback + "\n\n*(Modo offline - Trabajando con datos locales)*",
        tipo: 'ia',
        timestamp: new Date()
      };
      
      setHistorialChat(prev => [...prev, mensajeError]);
    } finally {
      setEnviandoMensaje(false);
    }
  };

  // Función para generar respuestas simuladas inteligentes (fallback)
  const generarRespuestaSimulada = (mensaje, parcelas, usuario) => {
    const mensajeLower = mensaje.toLowerCase();
    
    if (mensajeLower.includes('riego') || mensajeLower.includes('agua')) {
      return `🌱 **Recomendaciones de Riego**\n\nPara tus ${parcelas.length} parcelas:\n• **Tomate**: Riego por goteo cada 2-3 días\n• **Maíz/Trigo**: Riego profundo 1-2 veces por semana\n• **Papaya**: Mantener humedad constante\n\n💧 **Horarios óptimos**: 6-8 AM o después de las 6 PM`;
    }
    
    if (mensajeLower.includes('parcela') || mensajeLower.includes('estado')) {
      const parcelasOptimas = parcelas.filter(p => p.estado === 'óptimo').length;
      const parcelasAlerta = parcelas.filter(p => p.estado === 'alerta').length;
      const parcelasCriticas = parcelas.filter(p => p.estado === 'crítico').length;
      
      return `📊 **Estado de Parcelas**\n\n✅ **Óptimas**: ${parcelasOptimas}\n⚠️ **Alertas**: ${parcelasAlerta}\n🚨 **Críticas**: ${parcelasCriticas}\n\n**Cultivos actuales:**\n${parcelas.map(p => `• ${p.nombre}: ${p.cultivo_actual} (${p.estado})`).join('\n')}`;
    }
    
    return `👋 **¡Hola ${usuario?.nombre}!**\n\nComo tu agrónomo virtual, puedo ayudarte con:\n• Análisis de ${parcelas.length} parcelas\n• Recomendaciones de riego\n• Control de plagas\n• Planificación de cosechas\n\n*¿En qué aspecto te gustaría que te ayude?*`;
  };

  // Función para limpiar el historial del chat
  const limpiarChat = async () => {
    try {
      if (conversacionActual) {
        await eliminarConversacion(conversacionActual, usuarioId);
      }
      
      setHistorialChat([]);
      setConversacionActual(null);
      await inicializarChat(usuarioId);
      
    } catch (error) {
      console.error('Error al limpiar chat:', error);
      setHistorialChat([]);
      setConversacionActual(null);
      setEstadoIA('conectado');
    }
  };

  // Función para manejar el cierre de sesión
  const cerrarSesion = () => {
    console.log('Cerrando sesión...');
    localStorage.clear();
    navigate('/login');
  };

  

  // Si no hay usuario, mostrar cargando o redirigir
  if (!usuario) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ fontSize: '18px' }}>Verificando autenticación...</div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Si esto toma mucho tiempo, {' '}
          <button 
            onClick={cerrarSesion}
            style={{
              background: 'none',
              border: 'none',
              color: '#007bff',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
          >
            haz clic aquí para ir al login
          </button>
        </div>
      </div>
    );
  }

  if (cargando) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '20% 0',
        width: '100%'
      }}>
        <p>Cargando datos del dashboard...</p>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Bienvenido {usuario.nombre} ({usuario.rol})
        </p>
      </div>
    );
  }

  // Calcular estadísticas
  const totalParcelas = parcelas.length;
  const parcelasOptimas = parcelas.filter(p => p.estado === 'óptimo').length;
  const parcelasAlerta = parcelas.filter(p => p.estado === 'alerta').length;
  const parcelasCriticas = parcelas.filter(p => p.estado === 'crítico').length;

  const datosPieChart = [
    { name: 'Críticas', value: parcelasCriticas || 0, color: '#F44336' },
    { name: 'Moderadas', value: parcelasAlerta || 0, color: '#FFC107' },
    { name: 'Óptimo', value: parcelasOptimas || 0, color: '#4CAF50' }
  ];

  const obtenerColorEstadoIA = () => {
    switch (estadoIA) {
      case 'conectado': return '#4CAF50';
      case 'reconectando': return '#FFC107';
      case 'error': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const obtenerTextoEstadoIA = () => {
    switch (estadoIA) {
      case 'conectado': return 'IA Conectada';
      case 'reconectando': return 'Reconectando...';
      case 'error': return 'Error de conexión';
      default: return 'Desconectado';
    }
  };

  return (
    <div className="ecosmart-dashboard">

      {errorConexion && (
        <div className="alerta-conexion">
          <div className="alerta-conexion-content">
            <i className="fas fa-exclamation-triangle"></i>
            <span>Problemas de conectividad detectados. Trabajando en modo offline con datos de ejemplo.</span>
            <button onClick={() => { fetchParcelas(); reintentarConexionIA(); }}>
              <i className="fas fa-sync-alt"></i> Reintentar
            </button>
          </div>
        </div>
      )}
      
      <div className="dashboard-content">
        
        {/* PRIMER TERCIO: ALERTAS Y ESTADO DE CULTIVOS */}
        <div className="dashboard-section primer-tercio">
          <div className="ecosmart-panel alertas-activas-panel">
            <h2 className="panel-title">ALERTAS ACTIVAS</h2>
            
            <div className="alertas-content">
              <div className="alertas-chart">
                <PieChart width={200} height={200}>
                  <Pie
                    data={datosPieChart}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {datosPieChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
                <div className="alertas-legend">
                  <div className="alertas-legend-item">
                    <span className="legend-color-box" style={{ backgroundColor: '#F44336' }}></span>
                    <span>Alertas críticas: {parcelasCriticas}</span>
                  </div>
                  <div className="alertas-legend-item">
                    <span className="legend-color-box" style={{ backgroundColor: '#FFC107' }}></span>
                    <span>Alertas moderadas: {parcelasAlerta}</span>
                  </div>
                  <div className="alertas-legend-item">
                    <span className="legend-color-box" style={{ backgroundColor: '#4CAF50' }}></span>
                    <span>Óptimo: {parcelasOptimas}</span>
                  </div>
                </div>
              </div>
              
              <div className="alertas-cards">
                {parcelas.filter(p => p.estado === 'crítico' || p.estado === 'alerta').slice(0, 4).map(parcela => (
                  <div key={parcela.id} className="alerta-card">
                    <div className="alerta-card-icon">
                      <i className="fas fa-exclamation-triangle"></i>
                    </div>
                    <div className="alerta-card-info">
                      <h3>Plantación: {parcela.cultivo_actual}</h3>
                      <p>Variedad: {parcela.variedad}</p>
                      <p>Edad: {parcela.edad}</p>
                      <p>Ubicación: {parcela.ubicacion}</p>
                      <span className={`alerta-status ${parcela.estado === 'crítico' ? 'critico' : 'moderado'}`}>
                        {parcela.estado === 'crítico' ? 'Alertas críticas' : 'Alertas moderadas'}
                      </span>
                    </div>
                  </div>
                ))}
                
                {parcelas.filter(p => p.estado === 'óptimo').slice(0, 2).map(parcela => (
                  <div key={parcela.id} className="alerta-card">
                    <div className="alerta-card-icon optimal">
                      <i className="fas fa-check-circle"></i>
                    </div>
                    <div className="alerta-card-info">
                      <h3>Plantación: {parcela.cultivo_actual}</h3>
                      <p>Variedad: {parcela.variedad}</p>
                      <p>Edad: {parcela.edad}</p>
                      <p>Ubicación: {parcela.ubicacion}</p>
                      <span className="alerta-status optimo">Óptimo</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="ecosmart-panel estado-cultivos-panel">
            <div className="panel-header">
              <h2 className="panel-title">Estado de cultivos</h2>
              <p className="panel-subtitle">Ver estado actual de los cultivos y sus indicadores críticos</p>
            </div>
            
            <div className="estado-cultivos-resumen">
              <div className="cultivo-estado-item">
                <i className="fas fa-seedling"></i>
                <span>Total de cultivos monitoreados: {totalParcelas}</span>
              </div>
              <div className="cultivo-estado-item">
                <i className="fas fa-chart-line"></i>
                <span>Promedio de salud: {Math.round((parcelasOptimas / totalParcelas) * 100) || 78}%</span>
              </div>
              <div className="cultivo-estado-item">
                <i className="fas fa-thermometer-half"></i>
                <span>Temperatura promedio: 22°C {errorConexion ? '(estimado)' : ''}</span>
              </div>
            </div>
            
            <div className="ver-mas-btn">
              <Link to="/dashboard/agronomo/cultivos">
                <button>Ver más detalles</button>
              </Link>
            </div>
          </div>
        </div>

        {/* SEGUNDO TERCIO: RECOMENDACIONES Y CHAT IA */}
        <div className="dashboard-section segundo-tercio">
          <div className="ecosmart-panel recomendaciones-panel">
            <div className="panel-header">
              <h2 className="panel-title">Recomendaciones IA</h2>
              <p className="panel-subtitle">Análisis basado en el estado actual de los cultivos</p>
              <button 
                onClick={() => cargarRecomendaciones()} 
                className={`btn-actualizar-recomendaciones ${cargandoRecomendaciones ? 'loading' : ''}`}
                disabled={cargandoRecomendaciones}
              >
                <i className={`fas ${cargandoRecomendaciones ? 'fa-spinner fa-spin' : 'fa-sync'}`}></i>
                {cargandoRecomendaciones ? ' Actualizando...' : ' Actualizar'}
              </button>
            </div>
            
            <div className="recomendaciones-list">
              {cargandoRecomendaciones ? (
                <div className="recomendaciones-cargando">
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Generando recomendaciones...</span>
                </div>
              ) : recomendaciones.length > 0 ? (
                recomendaciones.slice(0, 3).map((rec, index) => (
                  <div key={index} className="recomendacion-item">
                    <div className="recomendacion-icon">
                      <i className={`fas fa-${
                        rec.recomendacion.toLowerCase().includes('riego') ? 'tint' : 
                        rec.recomendacion.toLowerCase().includes('fertiliz') ? 'leaf' :
                        rec.recomendacion.toLowerCase().includes('plaga') ? 'bug' :
                        'seedling'
                      }`}></i>
                    </div>
                    <div className="recomendacion-content">
                      <span className="recomendacion-cultivo">{rec.cultivo} - {rec.parcela}: </span>
                      <span className="recomendacion-texto">{rec.recomendacion}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="recomendaciones-empty">
                  <i className="fas fa-info-circle"></i>
                  <span>No hay recomendaciones disponibles en este momento.</span>
                </div>
              )}
              
              <div className="actualizacion-info">
                <i className="fas fa-info-circle"></i>
                <span>
                  Recomendaciones actualizadas basadas en datos de los últimos 7 días
                  {errorConexion ? ' (simulados)' : ''}. 
                  {errorConexion && ' Conecta sensores para análisis más precisos.'}
                </span>
              </div>
            </div>
            
            <div className="ver-mas-btn">
              <Link to="/dashboard/agronomo/recomendaciones">
                <button>Ver todas las recomendaciones</button>
              </Link>
            </div>
          </div>

          {/* CHAT CON ASISTENTE IA - MEJORADO CON SELECTOR DE CONVERSACIONES */}
          <div className="chat-asistente-ia">
            <div className="chat-asistente-header">
              <h3>Asistente IA Agrónomo</h3>
              <div className="chat-header-actions">
                <span className="connection-status">
                  <i className="fas fa-circle" style={{color: obtenerColorEstadoIA()}}></i>
                  {obtenerTextoEstadoIA()}
                </span>
                {estadoIA === 'error' && (
                  <button onClick={reintentarConexionIA} className="btn-reconectar" title="Reintentar conexión">
                    <i className="fas fa-sync-alt"></i>
                  </button>
                )}
                <button onClick={crearNuevaConversacion} className="btn-nueva-conversacion" title="Nueva conversación">
                  <i className="fas fa-plus"></i>
                </button>
              </div>
            </div>
            
            {/* SELECTOR DE CONVERSACIONES */}
            {conversaciones.length > 0 && (
              <div className="chat-selector-conversaciones">
                <div className="selector-header">
                  <i className="fas fa-comments"></i>
                  <span>Conversaciones ({conversaciones.length})</span>
                  <button 
                    className="btn-toggle-conversaciones"
                    onClick={() => {
                      const selector = document.querySelector('.conversaciones-lista');
                      selector.style.display = selector.style.display === 'none' ? 'block' : 'none';
                    }}
                  >
                    <i className="fas fa-chevron-down"></i>
                  </button>
                </div>
                
                <div className="conversaciones-lista" style={{ display: 'none' }}>
                  {conversaciones.slice(0, 10).map(conversacion => (
                    <div 
                      key={conversacion.id} 
                      className={`conversacion-item ${conversacionActual === conversacion.id ? 'activa' : ''}`}
                      onClick={() => cambiarConversacion(conversacion.id)}
                    >
                      <div className="conversacion-info">
                        <div className="conversacion-titulo">
                          <i className="fas fa-comment-dots"></i>
                          <span>{obtenerTituloConversacion(conversacion)}</span>
                        </div>
                        <div className="conversacion-meta">
                          <span className="conversacion-fecha">
                            {new Date(conversacion.created_at).toLocaleDateString()}
                          </span>
                          <span className="conversacion-mensajes">
                            {conversacion.message_count || 0} mensajes
                          </span>
                        </div>
                      </div>
                      <div className="conversacion-acciones">
                        {conversacionActual === conversacion.id && (
                          <span className="conversacion-activa-indicator">
                            <i className="fas fa-check-circle"></i>
                          </span>
                        )}
                        <button 
                          className="btn-eliminar-conversacion"
                          onClick={(e) => {
                            e.stopPropagation();
                            eliminarConversacionEspecifica(conversacion.id);
                          }}
                          title="Eliminar conversación"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {conversaciones.length > 10 && (
                    <div className="conversaciones-mas">
                      <button onClick={() => console.log('Mostrar más conversaciones')}>
                        Ver más conversaciones ({conversaciones.length - 10} más)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="chat-asistente-body">
              {historialChat.length === 0 ? (
                <div className="chat-bienvenida">
                  <div className="chat-bienvenida-content">
                    <i className="fas fa-robot"></i>
                    <h4>¡Hola {usuario?.nombre}!</h4>
                    {conversacionActual ? (
                      <p>Has seleccionado una conversación. ¿En qué puedo ayudarte?</p>
                    ) : (
                      <p>Soy tu asistente agrónomo virtual especializado. Puedo ayudarte con:</p>
                    )}
                    <ul>
                      <li>🌱 Análisis de estado de cultivos ({totalParcelas} parcelas)</li>
                      <li>💧 Recomendaciones de riego y fertilización</li>
                      <li>🐛 Diagnóstico y control de plagas</li>
                      <li>📅 Planificación de cosechas</li>
                      <li>🔧 Solución de problemas técnicos</li>
                      <li>📊 Análisis de datos disponibles</li>
                    </ul>
                    <p><strong>¿En qué puedo ayudarte hoy?</strong></p>
                    <div className="sugerencias-rapidas">
                      <button onClick={() => setMensajeChat("¿Cuál es el estado actual de mis parcelas?")}>
                        📊 Estado de parcelas
                      </button>
                      <button onClick={() => setMensajeChat("¿Qué recomendaciones tienes para el riego?")}>
                        💧 Consejos de riego
                      </button>
                      <button onClick={() => solicitarRecomendacionesAlAsistente()}>
                        🌿 Generar recomendaciones
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                historialChat.map(msg => (
                  <div key={msg.id} className={`chat-asistente-message ${msg.tipo === 'usuario' ? 'user' : msg.tipo === 'error' ? 'error' : 'bot'}`}>
                    <div className={`chat-asistente-bubble ${msg.tipo === 'usuario' ? 'user' : msg.tipo === 'error' ? 'error' : 'bot'}`}>
                      {msg.mensaje}
                    </div>
                    <div className="message-timestamp">
                      {msg.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
              
              {enviandoMensaje && (
                <div className="chat-asistente-message bot">
                  <div className="chat-asistente-bubble bot">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    IA analizando tu consulta especializada...
                  </div>
                </div>
              )}
            </div>
            
            <div className="chat-asistente-input-container">
              <input 
                className="chat-asistente-input"
                type="text" 
                placeholder="Escribe tu consulta agrícola especializada..." 
                value={mensajeChat}
                onChange={(e) => setMensajeChat(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && enviarMensaje()}
                disabled={enviandoMensaje}
              />
              <button 
                className="chat-asistente-send"
                onClick={enviarMensaje}
                disabled={enviandoMensaje || !mensajeChat.trim()}
                title="Enviar consulta a IA especializada"
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>

        {/* TERCER TERCIO: PARCELAS */}
        <div className="dashboard-section tercer-tercio">
          <div className="ecosmart-panel parcelas-panel">
            <div className="panel-header">
              <h2 className="panel-title">Parcelas</h2>
              <p className="panel-subtitle">Explora cultivos y sus condiciones actuales.</p>
              <button className="btn-add-parcela" onClick={abrirFormulario}>
                <i className="fas fa-plus"></i> Nueva Parcela
              </button>
            </div>
            
            <div className="parcelas-grid">
              {parcelas.slice(0, 6).map(parcela => (
                <div key={parcela.id} className="parcela-card">
                  <div className={`parcela-estado-indicator ${parcela.estado}`}></div>
                  <h3>Plantación: {parcela.cultivo_actual}</h3>
                  <p>Variedad: {parcela.variedad}</p>
                  <p>Edad: {parcela.edad}</p>
                  <p>Ubicación: {parcela.ubicacion}</p>
                  <p>Hectáreas: {parcela.hectareas} ha</p>
                  <div className="parcela-btn-container">
                    <Link to={`/dashboard/agronomo/parcelas/${parcela.id}`}>
                      <button className="parcela-btn">Ver Detalles</button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="ver-mas-btn">
              <Link to="/dashboard/agronomo/parcelas">
                <button>Ver todas las parcelas</button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {mostrarFormulario && (
        <FormularioParcela 
          onClose={cerrarFormulario}
          onGuardar={guardarParcela}
          API_URL={API_URL}
        />
      )}
    </div>
  );
};

export default DashboardAgronomo;