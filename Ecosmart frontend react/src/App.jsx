import { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import LandingPage from './views/LandingPage';
import AjusteParametros from "./views/AjusteParametros";
import Login from "./views/Login";
import Registro from "./views/Registro";
import RecuperarContrasena from './views/recuperar';
import DashboardTecnico from './views/DashboardTecnico';
import SensoresPanel from './views/sensores';

// Componente Header reutilizable
function Header() {
  return (
    <div className="header">
      <div className="logo-container">
        <img src="/assets/logo-ecosmart.png" alt="EcoSmart Logo" />
        <span className="logo-text">EcoSmart</span>
      </div>
      
      <div className="nav-menu">
        <Link to="/dashboard/tecnico" className="nav-item">Panel de control</Link>
        <Link to="/sensores" className="nav-item">Sensores</Link>
        <Link to="/alertas" className="nav-item">Alertas</Link>
      </div>
      
      <div className="user-section">
        <div className="user-avatar">U</div>
        <div className="user-info">
          <span className="user-name">Nombre de Usuario</span>
          <Link to="/configuracion" className="user-role">Configuración</Link>
        </div>
      </div>
    </div>
  );
}

// App principal con rutas
function App() {
  const API_URL = 'http://localhost:5000/api';

  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
        
        {/* Rutas que requieren layout con header */}
        <Route path="/sensores" element={
          <div className="app-container">
            <Header />
            <div className="content-container">
              <SensoresPanel API_URL={API_URL} />
            </div>
          </div>
        } />
        
        <Route path="/dashboard/tecnico" element={
          <div className="app-container">
            <DashboardTecnico />
          </div>
        } />
        
        <Route path="/dashboard/tecnico/ajustes" element={
          <div className="app-container">
            <AjusteParametros />
          </div>
        } />
        
        <Route path="/alertas" element={
          <div className="app-container">
            <Header />
            <div className="content-container">
              Página de alertas en construcción
            </div>
          </div>
        } />
        
        <Route path="/configuracion" element={
          <div className="app-container">
            <Header />
            <div className="content-container">
              Página de configuración en construcción
            </div>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;