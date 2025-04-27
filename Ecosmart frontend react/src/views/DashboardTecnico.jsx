// frontend/src/views/DashboardTecnico.jsx
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './DashboardTecnico.css';
import "./vistascompartidas.css";

const DashboardTecnico = () => {
  const navigate = useNavigate();
  
  // Obtener información del usuario almacenada al iniciar sesión
  const userStr = localStorage.getItem('ecosmart_user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  // Protección básica de ruta
  useEffect(() => {
    // Si no hay usuario o no es técnico, redirigir al login
    if (!user || user.rol !== 'tecnico') {
      navigate('/login');
    }
  }, [navigate, user]);

  // Función para cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem('ecosmart_user');
    navigate('/login');
  };

  // Si aún estamos verificando o no hay usuario, mostrar nada
  if (!user) {
    return null;
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="logo-container">
          <img src="/logo-ecosmart.png" alt="EcoSmart Logo" className="logo" />
          <span className="logo-text">EcoSmart</span>
        </div>
        <div className="user-menu">
          <span className="user-name">{user.nombre}</span>
          <button onClick={handleLogout} className="logout-button">
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="dashboard-layout">
        {/* Menú lateral */}
        <aside className="sidebar">
          <nav className="sidebar-nav">
            <div className="sidebar-header">Panel de Técnico</div>
            <ul className="sidebar-menu">
              <li className="sidebar-item active">
                <Link to="/dashboard/tecnico" className="sidebar-link">
                  <i className="fas fa-tachometer-alt"></i>
                  <span>Dashboard</span>
                </Link>
              </li>
              <li className="sidebar-item">
                <Link to="/dashboard/tecnico/clientes" className="sidebar-link">
                  <i className="fas fa-users"></i>
                  <span>Clientes</span>
                </Link>
              </li>
              <li className="sidebar-item">
                <Link to="/dashboard/tecnico/dispositivos" className="sidebar-link">
                  <i className="fas fa-microchip"></i>
                  <span>Dispositivos</span>
                </Link>
              </li>
              <li className="sidebar-item">
                <Link to="/dashboard/tecnico/ajustes" className="sidebar-link">
                  <i className="fas fa-sliders-h"></i>
                  <span>Ajuste de Parámetros</span>
                </Link>
              </li>
              <li className="sidebar-item">
  <Link to="/sensores" className="sidebar-link">
    <i className="fas fa-microchip"></i>
    <span>Sensores</span>
  </Link>
</li>
            </ul>
          </nav>
        </aside>

        {/* Contenido principal */}
        <main className="main-content">
          <div className="page-header">
            <h1>Panel de Control</h1>
            <p>Bienvenido, {user.nombre}. Aquí puedes gestionar tus tareas de técnico.</p>
          </div>

          {/* Tarjetas de estadísticas */}
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-card-icon blue">
                <i className="fas fa-users"></i>
              </div>
              <div className="stat-card-info">
                <h3>Clientes Activos</h3>
                <p className="stat-value">12</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-card-icon green">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="stat-card-info">
                <h3>Dispositivos Activos</h3>
                <p className="stat-value">48</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-card-icon orange">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <div className="stat-card-info">
                <h3>Alertas Pendientes</h3>
                <p className="stat-value">5</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-card-icon purple">
                <i className="fas fa-calendar-check"></i>
              </div>
              <div className="stat-card-info">
                <h3>Tareas Programadas</h3>
                <p className="stat-value">7</p>
              </div>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="section-header">
            <h2>Acciones Rápidas</h2>
          </div>
          
          <div className="action-cards">
            <div className="action-card" onClick={() => navigate('/dashboard/tecnico/ajustes')}>
              <div className="action-card-icon">
                <i className="fas fa-sliders-h"></i>
              </div>
              <div className="action-card-content">
                <h3>Ajuste de Parámetros</h3>
                <p>Configurar sensores y umbrales de alerta</p>
              </div>
              <div className="action-card-arrow">
                <i className="fas fa-chevron-right"></i>
              </div>
            </div>
            
            <div className="action-card">
              <div className="action-card-icon">
                <i className="fas fa-tools"></i>
              </div>
              <div className="action-card-content">
                <h3>Mantenimiento</h3>
                <p>Programar visitas de mantenimiento</p>
              </div>
              <div className="action-card-arrow">
                <i className="fas fa-chevron-right"></i>
              </div>
            </div>
            
            <div className="action-card">
              <div className="action-card-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              <div className="action-card-content">
                <h3>Reportes</h3>
                <p>Ver informes de rendimiento</p>
              </div>
              <div className="action-card-arrow">
                <i className="fas fa-chevron-right"></i>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardTecnico;