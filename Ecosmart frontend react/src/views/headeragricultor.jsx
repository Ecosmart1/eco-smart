import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './HeaderAgricultor.css'; // Renombrado con mayúscula inicial

function HeaderAgricultor() { // Nombre corregido del componente
    const [user, setUser] = useState(() => {
      const userStr = localStorage.getItem('ecosmart_user');
      return userStr ? JSON.parse(userStr) : null;
    });
  
    useEffect(() => {
      // Escucha cambios en localStorage (por ejemplo, después de login/logout)
      const onStorage = () => {
        const userStr = localStorage.getItem('ecosmart_user');
        setUser(userStr ? JSON.parse(userStr) : null);
      };
      window.addEventListener('storage', onStorage);
      // También actualiza al montar el componente
      onStorage();
      return () => window.removeEventListener('storage', onStorage);
    }, []);
  
    return (
      <div className="header agricultor-header"> {/* Añadida clase especial para agricultor */}
        <div className="logo-container">
          <img src="/logo-ecosmart.png" alt="EcoSmart Logo" />
          <span className="logo-text">EcoSmart</span>
        </div>
        
        <div className="nav-menu agricultor-nav"> {/* Clase específica para agricultor */}
          <Link to="/dashboard/agricultor" className="nav-item">Panel de control</Link>
          <Link to="/parcelas" className="nav-item">Parcelas</Link>
          <Link to="/dashboard/agricultor/alertas" className="nav-item">Alertas</Link>
          <Link to="/dashboard/agricultor/chat" className="nav-item">
            <i className="material-icons">chat</i>
            <span>Asistente IA</span>
          </Link>
        </div>
        
        <div className="user-section">
          <div className="user-avatar">
            {user ? user.nombre.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-info">
            <span className="user-name">{user ? user.nombre : 'Invitado'}</span>
            <Link to="/configuracion" className="user-role">Configuración</Link>
          </div>
        </div>
      </div>
    );
}

export default HeaderAgricultor; // Nombre corregido en export