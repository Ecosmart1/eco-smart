import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './DashboardTecnico.css';
import "./vistascompartidas.css";
import { getAuthHeaders } from '../services/serviciorutas';

const API_URL = "http://localhost:5000/api";

const DashboardTecnico = () => {
  const navigate = useNavigate();
  
  // Estados principales
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorConexion, setErrorConexion] = useState(false);
  
  // Estados para estadísticas
  const [estadisticas, setEstadisticas] = useState({
    totalUsuarios: 0,
    usuariosActivos: 0,
    dispositivosActivos: 0,
    alertasPendientes: 0,
    parcelasMonitoreadas: 0,
    sensoresOnline: 0
  });
  
  // Estados para datos reales
  const [alertasRecientes, setAlertasRecientes] = useState([]);
  const [usuariosReales, setUsuariosReales] = useState([]);
  const [parcelasReales, setParcelasReales] = useState([]);

  // Permitir acceso a técnico y agrónomo
  useEffect(() => {
    console.log('🔍 DASHBOARD DEBUG: useEffect ejecutado');
    
    const usuarioGuardado = localStorage.getItem('ecosmart_user');
    
    console.log('🔍 DASHBOARD DEBUG: Usuario en localStorage:', usuarioGuardado ? 'Existe' : 'No existe');
    
    if (!usuarioGuardado) {
      console.log('🔍 DASHBOARD DEBUG: No hay usuario, redirigiendo a login...');
      navigate('/login');
      return;
    }
    
    try {
      const usuarioObj = JSON.parse(usuarioGuardado);
      console.log('🔍 DASHBOARD DEBUG: Usuario parseado:', usuarioObj);
      console.log('🔍 DASHBOARD DEBUG: Rol del usuario:', usuarioObj.rol);
      
      // Permitir técnico o agrónomo
      if (usuarioObj.rol !== 'tecnico' && usuarioObj.rol !== 'agronomo') {
        console.log('🔍 DASHBOARD DEBUG: Usuario no es técnico ni agrónomo, redirigiendo...');
        navigate('/login');
        return;
      }
      
      console.log('🔍 DASHBOARD DEBUG: Usuario válido, cargando dashboard...');
      setUsuario(usuarioObj);
      cargarDashboardData();
    } catch (error) {
      console.error('🔍 DASHBOARD DEBUG: Error al verificar usuario:', error);
      navigate('/login');
    }
  }, [navigate]);

  // Cargar todos los datos del dashboard
  const cargarDashboardData = async () => {
    setCargando(true);
    try {
      await Promise.all([
        cargarEstadisticasUsuarios(),
        cargarEstadisticasParcelas(),
        cargarEstadisticasAlertas(),
        cargarEstadisticasSensores(),
        cargarAlertasRecientes()
      ]);
      setErrorConexion(false);
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
      setErrorConexion(true);
    } finally {
      setCargando(false);
    }
  };

  // Cargar estadísticas de usuarios usando endpoint existente
  const cargarEstadisticasUsuarios = async () => {
    try {
      // Obtener total de usuarios
      const totalResponse = await fetch(`${API_URL}/usuarios/total`, {
        headers: getAuthHeaders()
      });
      
      // Obtener lista de usuarios para calcular activos
      const usuariosResponse = await fetch(`${API_URL}/usuarios`, {
        headers: getAuthHeaders()
      });
      
      if (totalResponse.ok) {
        const totalData = await totalResponse.json();
        setEstadisticas(prev => ({
          ...prev,
          totalUsuarios: totalData.total || 0
        }));
      }

      if (usuariosResponse.ok) {
        const usuariosData = await usuariosResponse.json();
        if (Array.isArray(usuariosData)) {
          setUsuariosReales(usuariosData);
          setEstadisticas(prev => ({
            ...prev,
            usuariosActivos: usuariosData.length
          }));
        }
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

  // Cargar estadísticas de parcelas usando endpoint existente
  const cargarEstadisticasParcelas = async () => {
    try {
      const response = await fetch(`${API_URL}/parcelas`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const parcelas = await response.json();
        if (Array.isArray(parcelas)) {
          setParcelasReales(parcelas);
          setEstadisticas(prev => ({
            ...prev,
            parcelasMonitoreadas: parcelas.length
          }));
        }
      }
    } catch (error) {
      console.error('Error al cargar parcelas:', error);
    }
  };

  // Cargar estadísticas de alertas usando endpoint existente
  const cargarEstadisticasAlertas = async () => {
    try {
      const response = await fetch(`${API_URL}/alertas`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const alertas = await response.json();
        if (Array.isArray(alertas)) {
          const alertasActivas = alertas.filter(alerta => alerta.activa !== false);
          setEstadisticas(prev => ({
            ...prev,
            alertasPendientes: alertasActivas.length
          }));
        }
      }
    } catch (error) {
      console.error('Error al cargar alertas:', error);
    }
  };

  // Cargar estadísticas de sensores usando endpoint existente
  const cargarEstadisticasSensores = async () => {
    try {
      const response = await fetch(`${API_URL}/sensores`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const sensores = await response.json();
        if (Array.isArray(sensores)) {
          setEstadisticas(prev => ({
            ...prev,
            sensoresOnline: sensores.length,
            dispositivosActivos: sensores.length
          }));
        }
      }
    } catch (error) {
      console.error('Error al cargar sensores:', error);
    }
  };

  // Cargar alertas recientes usando endpoint existente
  const cargarAlertasRecientes = async () => {
    try {
      const response = await fetch(`${API_URL}/alertas`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const alertas = await response.json();
        
        if (Array.isArray(alertas)) {
          const alertasRecientes = alertas
            .filter(alerta => alerta.activa !== false)
            .slice(0, 5)
            .map(alerta => ({
              id: alerta.id,
              tipo: alerta.tipo || 'Sistema',
              mensaje: alerta.mensaje || 'Sin mensaje',
              severidad: alerta.severidad || 'moderado',
              timestamp: alerta.timestamp || new Date().toISOString(),
              parcela: alerta.parcela || 'Parcela desconocida'
            }));
          
          setAlertasRecientes(alertasRecientes);
        }
      }
    } catch (error) {
      console.error('Error al cargar alertas recientes:', error);
      setAlertasRecientes([]);
    }
  };

  // Función para obtener color según severidad
  const getSeveridadColor = (severidad) => {
    switch (severidad) {
      case 'critico': return '#f44336';
      case 'alerta': 
      case 'moderado': return '#ff9800';
      case 'baja': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  // Función para formatear fecha
  // Función para formatear fecha - VERSIÓN ARREGLADA
  const formatearFecha = (timestamp) => {
    try {
      if (!timestamp) return 'Sin fecha';
      
      // Si viene en formato "15/06/2025 15:11" (formato del backend)
      if (timestamp.includes('/')) {
        const [fechaParte, horaParte] = timestamp.split(' ');
        const [dia, mes, año] = fechaParte.split('/');
        
        // Crear fecha válida: año-mes-dia hora
        const fechaValida = new Date(`${año}-${mes}-${dia}T${horaParte || '00:00'}:00`);
        
        // Verificar que la fecha sea válida
        if (isNaN(fechaValida.getTime())) {
          return 'Fecha inválida';
        }
        
        return fechaValida.toLocaleString('es-CL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      // Si viene en formato ISO o estándar
      const fecha = new Date(timestamp);
      
      if (isNaN(fecha.getTime())) {
        return 'Fecha inválida';
      }
      
      return fecha.toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return 'Error en fecha';
    }
  };

  if (cargando) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Cargando panel de control...</p>
      </div>
    );
  }

  if (!usuario) {
    return null;
  }

  return (
    <div className="dashboard-tecnico">
      
      {/* Alerta de conexión */}
      {errorConexion && (
        <div className="alerta-conexion">
          <div className="alerta-conexion-content">
            <i className="fas fa-exclamation-triangle"></i>
            <span>Problemas de conectividad. Verificando conexión...</span>
            <button onClick={cargarDashboardData}>
              <i className="fas fa-sync-alt"></i> Reintentar
            </button>
          </div>
        </div>
      )}

      <div className="dashboard-content">
        
        {/* Header del dashboard */}
        <div className="dashboard-header-section">
          <div className="welcome-info">
            <h1>Panel de Control Técnico</h1>
            <p>Bienvenido, {usuario?.nombre}. Gestiona el sistema EcoSmart desde aquí.</p>
            <div className="fecha-actual">
              {new Date().toLocaleDateString('es-CL', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
          <div className="header-actions">
            <button onClick={cargarDashboardData} className="btn-actualizar">
              <i className="fas fa-sync-alt"></i> Actualizar
            </button>
          </div>
        </div>

        {/* Tarjetas de estadísticas principales */}
        <div className="stats-grid">
          <div
  className="stat-card usuarios"
  onClick={() => navigate('/dashboard/tecnico/Usuarios')}
  style={{ cursor: 'pointer' }}
>
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-info">
              <h3>Usuarios</h3>
              <div className="stat-value">{estadisticas.totalUsuarios}</div>
              <div className="stat-detail">
                {estadisticas.usuariosActivos} registrados
              </div>
            </div>
          </div>

          <div className="stat-card dispositivos">
            <div className="stat-icon">
              <i className="fas fa-microchip"></i>
            </div>
            <div className="stat-info">
              <h3>Sensores</h3>
              <div className="stat-value">{estadisticas.sensoresOnline}</div>
              <div className="stat-detail">
                Dispositivos activos
              </div>
            </div>
          </div>

          <div className="stat-card alertas">
            <div className="stat-icon">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <div className="stat-info">
              <h3>Alertas</h3>
              <div className="stat-value">{estadisticas.alertasPendientes}</div>
              <div className="stat-detail">
                Alertas activas
              </div>
            </div>
          </div>

          <div className="stat-card parcelas">
            <div className="stat-icon">
              <i className="fas fa-map"></i>
            </div>
            <div className="stat-info">
              <h3>Parcelas</h3>
              <div className="stat-value">{estadisticas.parcelasMonitoreadas}</div>
              <div className="stat-detail">
                Bajo monitoreo
              </div>
            </div>
          </div>
        </div>

        {/* Sección de alertas y acciones */}
        <div className="dashboard-widgets">
          <div className="widget-card alertas-widget">
            <div className="widget-header">
              <h3>Alertas Recientes</h3>
              {/* RUTA CORREGIDA - Usar la ruta definida en App.jsx */}
              <Link to="/dashboard/tecnico/alertas" className="ver-todas">
                Ver todas
              </Link>
            </div>
                        <div className="alertas-lista">
              {alertasRecientes.length > 0 ? (
                alertasRecientes.map(alerta => (
                  <div 
                    key={alerta.id} 
                    className={`alerta-item severidad-${alerta.severidad}`}
                  >
                    <div 
                      className="alerta-severidad"
                      style={{ backgroundColor: getSeveridadColor(alerta.severidad) }}
                    ></div>
                    <div className="alerta-content">
                      <div className="alerta-tipo">{alerta.tipo}</div>
                      <div className="alerta-mensaje">{alerta.mensaje}</div>
                      <div className="alerta-tiempo">
                        {formatearFecha(alerta.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-alertas">
                  <i className="fas fa-check-circle"></i>
                  <span>No hay alertas recientes</span>
                </div>
              )}
            </div>
          </div>

          <div className="widget-card acciones-widget">
            <div className="widget-header">
              <h3>Acciones Rápidas</h3>
            </div>
            <div className="acciones-grid">
              {/* RUTAS CORREGIDAS - Usar las rutas definidas en App.jsx */}
              <Link to="/dashboard/tecnico/Usuarios" className="accion-item">
                <div className="accion-icon">
                  <i className="fas fa-users-cog"></i>
                </div>
                <div className="accion-content">
                  <h4>Gestionar Usuarios</h4>
                  <p>Administrar cuentas de usuario</p>
                </div>
              </Link>

              <Link to="/dashboard/tecnico/ajustes" className="accion-item">
                <div className="accion-icon">
                  <i className="fas fa-sliders-h"></i>
                </div>
                <div className="accion-content">
                  <h4>Parámetros</h4>
                  <p>Configurar sensores y umbrales</p>
                </div>
              </Link>

              <Link to="/sensores" className="accion-item">
                <div className="accion-icon">
                  <i className="fas fa-microchip"></i>
                </div>
                <div className="accion-content">
                  <h4>Sensores</h4>
                  <p>Monitorear dispositivos</p>
                </div>
              </Link>

              <Link to="/dashboard/tecnico/chat" className="accion-item">
                <div className="accion-icon">
                  <i className="fas fa-robot"></i>
                </div>
                <div className="accion-content">
                  <h4>Asistente IA</h4>
                  <p>Consultas técnicas</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Resumen de datos reales */}
        <div className="dashboard-widgets">
          <div className="widget-card resumen-usuarios">
            <div className="widget-header">
              <h3>Usuarios del Sistema</h3>
              {/* RUTA CORREGIDA */}
              <Link to="/dashboard/tecnico/Usuarios" className="ver-todas">
                Gestionar
              </Link>
            </div>
            <div className="resumen-content">
              <div className="resumen-stat">
                <div className="resumen-numero">{usuariosReales.length}</div>
                <div className="resumen-label">Usuarios registrados</div>
              </div>
                            <div className="resumen-detalle">
                {usuariosReales.filter(u => u.rol === 'agricultor').length > 0 && (
                  <div className="detalle-item">
                    <span className="detalle-valor">{usuariosReales.filter(u => u.rol === 'agricultor').length}</span>
                    <span className="detalle-texto">Agricultores</span>
                  </div>
                )}
                {usuariosReales.filter(u => u.rol === 'agronomo').length > 0 && (
                  <div className="detalle-item">
                    <span className="detalle-valor">{usuariosReales.filter(u => u.rol === 'agronomo').length}</span>
                    <span className="detalle-texto">Agrónomos</span>
                  </div>
                )}
                {usuariosReales.filter(u => u.rol === 'tecnico').length > 0 && (
                  <div className="detalle-item">
                    <span className="detalle-valor">{usuariosReales.filter(u => u.rol === 'tecnico').length}</span>
                    <span className="detalle-texto">Técnicos</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="widget-card resumen-parcelas">
            <div className="widget-header">
              <h3>Parcelas Monitoreadas</h3>
              {/* Como no hay ruta específica para parcelas del técnico, enlazamos a sensores */}
              <Link to="/sensores" className="ver-todas">
                Ver sensores
              </Link>
            </div>
            <div className="resumen-content">
              <div className="resumen-stat">
                <div className="resumen-numero">{parcelasReales.length}</div>
                <div className="resumen-label">Parcelas activas</div>
              </div>
              {parcelasReales.length > 0 && (
                <div className="resumen-detalle">
                  <div className="detalle-item">
                    <span className="detalle-valor">
                      {parcelasReales.filter(p => p.usuario_id).length}
                    </span>
                    <span className="detalle-texto">Con usuario asignado</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardTecnico;