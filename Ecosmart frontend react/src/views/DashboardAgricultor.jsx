import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './DashboardAgricultor.css';
import MeteorologiaWidget from './MeteorologiaWidget';
import FormularioParcela from './FormularioParcela';
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
      {/* Header */}
      <div className="dashboard-header">
        <div className="logo-container">
          <img src="/public/logo-ecosmart.png" alt="EcoSmart Logo" className="logo" />
          <h1 className="app-title">EcoSmart</h1>
        </div>
        <div className="header-nav">
          <div className="nav-item active">Dashboard</div>
          <Link to="/dashboard/agricultor/parcelas" className="nav-item">Parcelas</Link>
          <div className="nav-item">Sensores</div>
          <div className="nav-item">Alertas</div>
          <div className="nav-item">Asistente IA</div>
        </div>
        <div className="user-profile">
          <div className="user-avatar">
            {usuario?.nombre.charAt(0)}
          </div>
          <div className="user-info">
            <div className="user-name">{usuario?.nombre}</div>
            <div className="user-role">Agricultor</div>
          </div>
          <div className="user-menu-icon">▼</div>
        </div>
      </div>

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
                  {/* Agregar más secciones si es necesario */}
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
              <Link to="/sensores" className="ver-todo">Ver todos</Link>
            </div>
            <div className="sensores-graficos">
              <div className="sensor-grafico">
                <h4>Humedad de Suelo</h4>
                <div className="grafico-container">
                  {/* Aquí iría un componente de gráfico real */}
                  <div className="grafico-placeholder">
                    <div className="grafico-linea"></div>
                    <div className="grafico-label">Últimas 24 horas</div>
                  </div>
                </div>
              </div>
              <div className="sensor-grafico">
                <h4>Temperatura Ambiente</h4>
                <div className="grafico-container">
                  {/* Aquí iría un componente de gráfico real */}
                  <div className="grafico-placeholder">
                    <div className="grafico-linea temperatura"></div>
                    <div className="grafico-label">Últimas 24 horas</div>
                  </div>
                </div>
              </div>
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