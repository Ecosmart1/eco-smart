// Componente Header reutilizable
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './headertecnico.css'; // Asegúrate de tener estilos para el header



function HeaderTecnico() {
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
      <div className="header">
        <div className="logo-container">
          <img src="/logo-ecosmart.png" alt="EcoSmart Logo" />
          <span className="logo-text">EcoSmart</span>
        </div>
        
        <div className="nav-menu">
          <Link to="/dashboard/tecnico" className="nav-item">Panel de control</Link>
          <Link to="/sensores" className="nav-item">Sensores</Link>
          <Link to="/dashboard/tecnico/alertas" className="nav-item">Alertas</Link>
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

  export default HeaderTecnico;