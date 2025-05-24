import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './HeaderAgronomo.css';

const HeaderAgronomo = ({ activeItem }) => {
  const [usuario, setUsuario] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const navigate = useNavigate();

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
    // Disparar evento para limpiar datos de chat
    window.dispatchEvent(new CustomEvent('session_cleared'));
    navigate('/login');
  };

  const toggleMenu = () => {
    setMenuAbierto(!menuAbierto);
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
          to="/dashboard/agronomo/alertas" 
          className={`nav-item ${activeItem === 'alertas' ? 'active' : ''}`}
        >
          Alertas
        </Link>
        <Link 
          to="/dashboard/agronomo/chat" 
          className={`nav-item ${activeItem === 'chat' ? 'active' : ''}`}
        >
          Asistente IA
        </Link>
      </div>
      
      <div className="user-profile" onClick={toggleMenu}>
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
  );
};

export default HeaderAgronomo;