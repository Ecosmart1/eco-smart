import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './HeaderAgricultor.css';

const HeaderAgricultor = ({ activeItem }) => {
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

  const toggleMenu = () => {
    setMenuAbierto(!menuAbierto);
  };

  return (
    <div className="dashboard-header">
      <div className="logo-container">
        <img src="/public/logo-ecosmart.png" alt="EcoSmart Logo" className="logo" />
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
        <Link 
          to="/dashboard/agricultor/alertas" 
          className={`nav-item ${activeItem === 'alertas' ? 'active' : ''}`}
        >
          Alertas
        </Link>
        <Link 
          to="/dashboard/agricultor/asistente" 
          className={`nav-item ${activeItem === 'asistente' ? 'active' : ''}`}
        >
          Asistente IA
        </Link>
      </div>
      <div className="user-profile" onClick={toggleMenu}>
        <div className="user-avatar">
          {usuario?.nombre.charAt(0)}
        </div>
        <div className="user-info">
          <div className="user-name">{usuario?.nombre}</div>
          <div className="user-role">Agricultor</div>
        </div>
        <div className="user-menu-icon">▼</div>
        
        {menuAbierto && (
          <div className="user-dropdown-menu">
            <Link to="/dashboard/agricultor/perfil" className="dropdown-item">Mi Perfil</Link>
            <Link to="/dashboard/agricultor/configuracion" className="dropdown-item">Configuración</Link>
            <div className="dropdown-divider"></div>
            <div className="dropdown-item" onClick={cerrarSesion}>Cerrar Sesión</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeaderAgricultor;