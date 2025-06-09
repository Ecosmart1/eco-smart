import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAlertas } from '../context/AlertasContext';
import './HeaderAgricultor.css';

const HeaderAgricultor = ({ activeItem }) => {
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
    if (usuarioObj.rol !== 'agricultor') {
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

  return (
    <div className="dashboard-header">
      <div className="logo-container">
        <img src="/logo-ecosmart.png" alt="EcoSmart Logo" className="logo" />
        <h1 className="app-title">EcoSmart</h1>
      </div>
      <div className="header-nav">
        <Link 
          to="/dashboard/agricultor" 
          className={`nav-item ${activeItem === 'dashboard' ? 'active' : ''}`}
        >
          Dashboard
        </Link>
        <Link 
          to="/dashboard/agricultor/parcelas" 
          className={`nav-item ${activeItem === 'parcelas' ? 'active' : ''}`}
        >
          Parcelas
        </Link>
        <Link 
          to="/dashboard/agricultor/sensores" 
          className={`nav-item ${activeItem === 'sensores' ? 'active' : ''}`}
        >
          Sensores
        </Link>
        {/* <Link 
          to="/dashboard/agricultor/alertas" 
          className={`nav-item ${activeItem === 'alertas' ? 'active' : ''}`}
        >
          Alertas
        </Link> */}
        <Link 
          to="/dashboard/agricultor/chat" 
          className={`nav-item ${activeItem === 'chat' ? 'active' : ''}`}
        >
          Asistente IA
        </Link>
      </div>
      <div className="header-user-alertas">
        <div className="notificaciones-wrapper" ref={alertasRef}>
          <button
            className="icono-campana"
            onClick={() => navigate('/dashboard/agricultor/alertas')}
            aria-label="Ver alertas"
            style={{ position: 'relative' }}
          >
            <div className="notification-container">
              <i className="fas fa-bell"></i>
              {alertasActivas > 0 && (
                <span className="notification-counter">{alertasActivas}</span>
              )}
            </div>
          </button>
          {alertasAbierto && (
            <div className="menu-alertas">
              <h4>Alertas recientes</h4>
              {alertas.length === 0 ? (
                <div className="alerta-vacia">Sin alertas</div>
              ) : (
                <ul>
                  {alertas.map(alerta => (
                    <li
                      key={alerta.id}
                      className={`alerta-item ${alerta.severidad}`}
                      onClick={() => navigate('/dashboard/agricultor/alertas')}
                      style={{ cursor: 'pointer' }}
                    >
                      <div>
                        <strong>{alerta.mensaje}</strong>
                        <div className="alerta-detalle">
                          <span>{alerta.fecha}</span> | <span>{alerta.parcela}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <button
                className="ver-todas-alertas-btn"
                onClick={() => navigate('/dashboard/agricultor/alertas')}
              >
                Ver todas
              </button>
            </div>
          )}
        </div>
        <div className="user-profile" onClick={toggleMenu} ref={menuRef}>
          <div className="user-avatar">
            {usuario?.nombre?.charAt(0)}
          </div>
          <div className="user-info">
            <div className="user-name">{usuario?.nombre}</div>
            <div className="user-role">Agricultor</div>
          </div>
          <div className="user-menu-icon">▼</div>
          {menuAbierto && (
            <div className="user-dropdown-menu">
              <Link to="/configuracion" className="dropdown-item">Configuración</Link>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item" onClick={cerrarSesion}>Cerrar Sesión</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeaderAgricultor;