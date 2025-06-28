import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAlertas } from '../context/AlertasContext';
import './HeaderAgronomo.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

const HeaderAgronomo = ({ activeItem }) => {
  const [usuario, setUsuario] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [alertasAbierto, setAlertasAbierto] = useState(false);
  const [alertas, setAlertas] = useState([]);
  const { alertasActivas, fetchAlertasActivas } = useAlertas();
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const alertasRef = useRef(null);

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('ecosmart_user');
    if (!usuarioGuardado) {
      navigate('/login');
      return;
    }
    const usuarioObj = JSON.parse(usuarioGuardado);
    if (usuarioObj.rol !== 'agronomo') {
      navigate('/login');
      return;
    }
    setUsuario(usuarioObj);
  }, [navigate]);

  const cerrarSesion = () => {
    localStorage.removeItem('ecosmart_user');
    navigate('/login');
  };

  // Cargar alertas
  useEffect(() => {
    if (!usuario) return;
    // Trae todas las alertas para el menú desplegable
    fetch(`http://localhost:5000/api/alertas?user_id=${usuario.id}`)
      .then(res => res.json())
      .then(data => setAlertas(Array.isArray(data) ? data : []))
      .catch(() => setAlertas([]));

    // Ya no es necesario traer la cantidad de alertas activas, se usa el contexto
    fetchAlertasActivas(usuario.id);
  }, [usuario, fetchAlertasActivas]);

  // Cierra ambos menús si se hace click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        menuRef.current && !menuRef.current.contains(event.target) &&
        alertasRef.current && !alertasRef.current.contains(event.target)
      ) {
        setMenuAbierto(false);
        setAlertasAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Al abrir un menú, cierra el otro
  const toggleMenu = () => {
    setMenuAbierto(!menuAbierto);
    if (!menuAbierto) setAlertasAbierto(false);
  };
  const toggleAlertas = () => {
    setAlertasAbierto(!alertasAbierto);
    if (!alertasAbierto) setMenuAbierto(false);
  };

  if (!usuario) return null;

  return (
    <div className="dashboard-header-agronomo">
      <div className="logo-container-agronomo">
        <img src="/logo-ecosmart.png" alt="EcoSmart Logo" className="logo-agronomo" />
        <h1 className="app-title-agronomo">EcoSmart</h1>
      </div>
      <div className="header-nav-agronomo">
        <Link 
          to="/dashboard/agronomo" 
          className={`nav-item-agronomo ${activeItem === 'dashboard' ? 'active' : ''}`}
        >
          Dashboard
        </Link>
        <Link 
          to="/dashboard/agronomo/cultivos" 
          className={`nav-item-agronomo ${activeItem === 'cultivos' ? 'active' : ''}`}
        >
          Cultivos
        </Link>
        <Link 
          to="/dashboard/agronomo/parcelas" 
          className={`nav-item-agronomo ${activeItem === 'parcelas' ? 'active' : ''}`}
        >
          Parcelas
        </Link>
        <Link 
          to="/dashboard/agronomo/sensores" 
          className={`nav-item-agronomo ${activeItem === 'sensores' ? 'active' : ''}`}
        >
          Sensores
        </Link>
        <Link 
          to="/dashboard/agronomo/chat" 
          className={`nav-item-agronomo ${activeItem === 'chat' ? 'active' : ''}`}
        >
          Asistente IA
        </Link>
        <Link 
          to="/dashboard/agronomo/recomendaciones" 
          className={`nav-item-agronomo ${activeItem === 'recomendaciones' ? 'active' : ''}`}
        >
          Recomendaciones
        </Link>
      </div>
      <div className="header-user-alertas-agronomo">
        <div className="notificaciones-wrapper-agronomo" ref={alertasRef}>
          <button
            className="icono-campana-agronomo"
            onClick={() => navigate('/dashboard/agronomo/alertas')}
            aria-label="Ver alertas"
            style={{ position: 'relative' }}
          >
            <div className="notification-container-agronomo">
              <i className="fas fa-bell"></i>
              {alertasActivas > 0 && (
                <span className="notification-counter-agronomo">{alertasActivas}</span>
              )}
            </div>
          </button>
          {alertasAbierto && (
            <div className="menu-alertas-agronomo">
              <h4>Alertas recientes</h4>
              {alertas.length === 0 ? (
                <div className="alerta-vacia-agronomo">Sin alertas</div>
              ) : (
                <ul>
                  {alertas.map((alerta, index) => (
                    <li
                      key={index}
                      className={`alerta-item-agronomo ${alerta.tipo_alerta}`}
                      onClick={() => navigate('/dashboard/agronomo/alertas')}
                      style={{ cursor: 'pointer' }}
                    >
                      <div>
                        <strong>{alerta.mensaje}</strong>
                        <div className="alerta-detalle-agronomo">
                          <span>{new Date(alerta.fecha_creacion).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <button
                className="ver-todas-alertas-btn-agronomo"
                onClick={() => navigate('/dashboard/agronomo/alertas')}
              >
                Ver todas
              </button>
            </div>
          )}
        </div>
        <div className="user-profile-agronomo" onClick={toggleMenu} ref={menuRef}>
          <div className="user-avatar-agronomo">
            {usuario?.nombre?.charAt(0)}
          </div>
          <div className="user-info-agronomo">
            <div className="user-name-agronomo">{usuario?.nombre}</div>
            <div className="user-role-agronomo">Agrónomo</div>
          </div>
          <div className="user-menu-icon-agronomo">▼</div>
          {menuAbierto && (
            <div className="user-dropdown-menu-agronomo">
              <Link to="/dashboard/agronomo/ajustes" className="dropdown-item-agronomo">Configuración</Link>
              <div className="dropdown-divider-agronomo"></div>
              <div className="dropdown-item-agronomo" onClick={cerrarSesion}>Cerrar Sesión</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeaderAgronomo;
