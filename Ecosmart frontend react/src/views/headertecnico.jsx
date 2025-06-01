import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './headertecnico.css';

function HeaderTecnico() {
  const [user, setUser] = useState(() => {
    const userStr = localStorage.getItem('ecosmart_user');
    return userStr ? JSON.parse(userStr) : null;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const userStr = localStorage.getItem('ecosmart_user');
      setUser(userStr ? JSON.parse(userStr) : null);
    };
    
    window.addEventListener('storage', handleStorageChange);
    handleStorageChange();
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const userRole = user?.rol || 'invitado';

  return (
    <div className="header">
      <div className="logo-container">
        <img src="/logo-ecosmart.png" alt="EcoSmart Logo" />
        <span className="logo-text">EcoSmart</span>
      </div>
      
      <div className="nav-menu">
        {/* Panel de control según rol */}
        {userRole === 'agricultor' ? (
          <Link to="/dashboard/agricultor" className="nav-item">Dashboard</Link>
        ) : (
          <Link to="/dashboard/tecnico" className="nav-item">Panel de control</Link>
        )}
        
        {/* Enlace común para todos */}
        <Link to="/sensores" className="nav-item">Sensores</Link>
        
        {/* Alertas para todos los usuarios registrados */}
        {(userRole === 'agricultor' || userRole === 'tecnico') && (
          <Link to={userRole === 'agricultor' ? '/dashboard/agricultor/alertas' : '/dashboard/tecnico/alertas'} 
                className="nav-item">
            Alertas
          </Link>
        )}
        
        {/* Asistente IA para todos los usuarios registrados */}
        {(userRole === 'agricultor' || userRole === 'agronomo') && (
          <Link to={userRole === 'agricultor' ? '/dashboard/agricultor/chat' : '/dashboard/tecnico/chat'} 
                className="nav-item">
            <span>Consultas IA</span>
          </Link>
        )}
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