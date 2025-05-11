import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';

// ===== VISTAS PÚBLICAS =====
import LandingPage from './views/LandingPage';
import Login from "./views/Login";
import Registro from "./views/Registro";
import RecuperarContrasena from './views/recuperar';

// ===== COMPONENTES DE NAVEGACIÓN =====
import HeaderTecnico from './views/headertecnico';
import HeaderAgricultor from './views/HeaderAgricultor';
// import HeaderAgronomo from './views/HeaderAgronomo'; // Comentado temporalmente

// ===== VISTAS PARA TÉCNICO =====
import DashboardTecnico from './views/DashboardTecnico';
import SensoresPanel from './views/sensores';
import Usuarios from './views/Usuarios';
import AjusteParametros from "./views/AjusteParametros";
import Configuracion from './views/configuracion';

// ===== VISTAS PARA AGRICULTOR =====
import DashboardAgricultor from './views/DashboardAgricultor';
import ChatContainer from './views/conversaciones';
import GestionParcelas from './views/GestionParcelas';
import DetalleParcela from './views/DetalleParcela';
import FormularioParcela from './views/FormularioParcela';
import EditarParcelaPage from './views/EditarParcelaPage';

/**
 * Componente principal de la aplicación
 * Configura todas las rutas disponibles mediante React Router
 */
function App() {
  // URL base para la API - puede configurarse según el entorno
  const API_URL = 'http://localhost:5000/api';

  const getUserId = () => {
    const user = JSON.parse(localStorage.getItem('ecosmart_user') || '{}');
    return user.id || null;
  };

  return (
    <Router>
      <Routes>
        {/* ===== RUTAS PÚBLICAS ===== */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
        
        {/* ===== RUTAS PARA TÉCNICO ===== */}
        <Route path="/dashboard/tecnico" element={
          <div className="app-container">
            <HeaderTecnico />
            <DashboardTecnico />
          </div>
        } />
        
        <Route path="/dashboard/tecnico/Usuarios" element={
          <div className="app-container">
            <HeaderTecnico />
            <div className="content-container">
              <Usuarios />
            </div>
          </div>
        } />
        
        <Route path="/sensores" element={
          <div className="app-container">
            <HeaderTecnico />
            <div className="content-container">
              <SensoresPanel API_URL={API_URL} />
            </div>
          </div>
        } />
        
        <Route path="/dashboard/tecnico/ajustes" element={
          <div className="app-container">
            <HeaderTecnico />
            <AjusteParametros />
          </div>
        } />
        
        <Route path="/dashboard/tecnico/alertas" element={
          <div className="app-container">
            <HeaderTecnico />
            <div className="content-container">
              Página de alertas en construcción
            </div>
          </div>
        } />
        
        <Route path="/dashboard/tecnico/chat" element={
          <div className="app-container">
            <HeaderTecnico />
            <div className="content-container">
              <ChatContainer userId={getUserId()} />
            </div>
          </div>
        } />

        {/* ===== RUTAS PARA AGRICULTOR ===== */}
        <Route path="/dashboard/agricultor" element={
          <div className="app-container">
            <HeaderAgricultor />
            <DashboardAgricultor />
          </div>
        } />
        
        <Route path="/dashboard/agricultor/sensores" element={
          <div className="app-container">
            <HeaderAgricultor />
            <div className="content-container">
              <SensoresPanel API_URL={API_URL} />
            </div>
          </div>
        } />

        <Route path="/dashboard/agricultor/chat" element={
          <div className="app-container">
            <HeaderAgricultor />
            <div className="content-container">
              <ChatContainer userId={getUserId()} />
            </div>
          </div>
        } />

        <Route path="/dashboard/agricultor/alertas" element={
          <div className="app-container">
            <HeaderAgricultor />
            <div className="content-container">
              {/* Contenido de alertas */}
            </div>
          </div>
        } />
        
        <Route path="/dashboard/agricultor/parcelas" element={
          <div className="app-container">
            <HeaderAgricultor activeItem="parcelas" />
            <div className="content-container">
              <GestionParcelas API_URL={API_URL} />
            </div>
          </div>
        } />
        
        <Route path="/dashboard/agricultor/parcelas/:id" element={
          <div className="app-container">
            <HeaderAgricultor activeItem="parcelas" />
            <div className="content-container">
              <DetalleParcela API_URL={API_URL} />
            </div>
          </div>
        } />
        
        <Route path="/dashboard/agricultor/parcelas/nueva" element={
          <div className="app-container">
            <HeaderAgricultor activeItem="parcelas" />
            <div className="content-container" style={{ 
              overflow: 'auto',
              paddingBottom: '20px'
            }}>
              <FormularioParcela 
                API_URL={API_URL} 
                mode="create" 
                redirectUrl="/dashboard/agricultor/parcelas" 
              />
            </div>
          </div>
        } />

        <Route path="/dashboard/agricultor/parcelas/editar/:id" element={
          <div className="app-container">
            <HeaderAgricultor activeItem="parcelas" />
            <div className="content-container">
              <EditarParcelaPage API_URL={API_URL} />
            </div>
          </div>
        } />
        
        {/* ===== RUTAS PARA AGRÓNOMO ===== */}
        <Route path="/dashboard/agronomo" element={
          <div className="app-container">
            <HeaderTecnico />
            <div className="content-container">
              Página de agrónomo en construcción
            </div>
          </div>
        } />
        
        {/* ===== CONFIGURACIÓN GENERAL ===== */}
        <Route path="/configuracion" element={
          <div className="app-container">
            <HeaderTecnico />
            <div className="content-container">
              <Configuracion />
            </div>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;