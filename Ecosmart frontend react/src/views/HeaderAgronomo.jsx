import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './HeaderAgronomo.css';

const HeaderAgronomo = ({ activeItem }) => {
  const [usuario, setUsuario] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [alertasAbierto, setAlertasAbierto] = useState(false);
  const navigate = useNavigate();

  const menuRef = useRef();
  const alertasRef = useRef();
  const [alertas, setAlertas] = useState([]);

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('ecosmart_user');
    if (!usuarioGuardado) {
      navigate('/login');
      return;
    }
    const usuarioObj = JSON.parse(usuarioGuardado);
    if (usuarioObj.rol !== 'agronomo' && usuarioObj.rol !== 'tecnico') {
      navigate('/login');
      return;
    }
    setUsuario(usuarioObj);
  }, [navigate]);

  const cerrarSesion = () => {
    localStorage.removeItem('ecosmart_user');
    localStorage.removeItem('ecosmart_token');
    window.dispatchEvent(new CustomEvent('session_cleared'));
    navigate('/login');
  };

  // Cargar alertas
  useEffect(() => {
    fetch('http://localhost:5000/api/alertas')
      .then(res => res.json())
      .then(data => setAlertas(Array.isArray(data) ? data : []))
      .catch(() => setAlertas([]));
  }, []);

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
    <div className="dashboard-header-agronomo">
      <div className="logo-container">
        <img src="/logo-ecosmart.png" alt="EcoSmart Logo" className="logo" />
        <h1 className="app-title">EcoSmart</h1>
      </div>
      
      <div className="header-nav">
        <Link 
          to="/dashboard/agronomo" 
          className={`nav-item ${activeItem === 'dashboard' ? 'active' : ''}`}
        >
          Dashboard
        </Link>
        <Link 
          to="/dashboard/agronomo/parcelas" 
          className={`nav-item ${activeItem === 'parcelas' ? 'active' : ''}`}
        >
          Parcelas
        </Link>
        <Link 
          to="/dashboard/agronomo/chat" 
          className={`nav-item ${activeItem === 'chat' ? 'active' : ''}`}
        >
          Asistente IA
        </Link>
      </div>
      
      <div className="header-user-alertas">
        <div className="notificaciones-wrapper" ref={alertasRef}>
          <button
            className="icono-campana"
            onClick={toggleAlertas}
            aria-label="Ver alertas"
          >
            <i className="fas fa-bell"></i>
            {alertas.length > 0 && (
              <span className="badge-alerta">{alertas.length}</span>
            )}
          </button>
          {alertasAbierto && (
            <div className="menu-alertas">
              <h4>Alertas recientes</h4>
              {alertas.length === 0 ? (
                <div className="alerta-vacia">Sin alertas</div>
              ) : (
                <ul>
                  {alertas.map(alerta => (
                    <li key={alerta.id} className={`alerta-item ${alerta.severidad}`}>
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
            </div>
          )}
        </div>
        <div className="user-profile" onClick={toggleMenu} ref={menuRef}>
          <div className="user-avatar agronomo">
            <i className="fas fa-user-tie"></i>
          </div>
          <div className="user-info">
            <div className="user-name">{usuario?.nombre}</div>
            <div className="user-role">
              {usuario?.rol === 'agronomo' ? 'Agrónomo' : 'Técnico Agrícola'}
            </div>
          </div>
          <div className="user-menu-icon">
            <i className={`fas fa-chevron-${menuAbierto ? 'up' : 'down'}`}></i>
          </div>
          
          {menuAbierto && (
            <div className="user-dropdown-menu">
              <Link to="/dashboard/agronomo/perfil" className="dropdown-item">
                <i className="fas fa-user"></i>
                Mi Perfil
              </Link>
              <Link to="/configuracion" className="dropdown-item">
                <i className="fas fa-cog"></i>
                Configuración
              </Link>
              <Link to="/dashboard/agronomo/reportes" className="dropdown-item">
                <i className="fas fa-chart-bar"></i>
                Reportes
              </Link>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item logout" onClick={cerrarSesion}>
                <i className="fas fa-sign-out-alt"></i>
                Cerrar Sesión
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeaderAgronomo;