import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LandingPage from './views/LandingPage';
import AjusteParametros from "./views/AjusteParametros";
import Login from "./views/Login";
import Registro from "./views/Registro";
import RecuperarContrasena from './views/recuperar';
import DashboardTecnico from './views/DashboardTecnico';
import SensoresPanel from './views/sensores';
import Usuarios from './views/Usuarios';
import HeaderTecnico from './views/headertecnico';
import Configuracion from './views/configuracion';
import DashboardAgricultor from './views/DashboardAgricultor'; 
import ChatContainer from './views/conversaciones';
import HeaderAgricultor from './views/headeragricultor';



function App() {
  const API_URL = 'http://localhost:5000/api';

   const getUserId = () => {
    const user = JSON.parse(localStorage.getItem('ecosmart_user') || '{}');
    return user.id || null;
  };

  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />

        {/* Rutas para técnico */}
        <Route path="/sensores" element={
          <div className="app-container">
            <HeaderTecnico />
            <div className="content-container">
              <SensoresPanel API_URL={API_URL} />
            </div>
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

        <Route path="/dashboard/tecnico" element={
          <div className="app-container">
            <HeaderTecnico />
            <DashboardTecnico />
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

        {/* Rutas para agrónomo */}
        <Route path="/dashboard/agronomo" element={
          <div className="app-container">
            <HeaderTecnico />
            <div className="content-container">
              Página de agrónomo en construcción
            </div>
          </div>
        } />

        {/* Rutas */}
        

        {/* Rutas para agricultor */}
        <Route path="/dashboard/agricultor" element={
  <div className="app-container">
    <HeaderAgricultor />
    <DashboardAgricultor />
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


        {/* Puedes agregar más rutas para otros roles aquí */}

        <Route path="/configuracion" element={
          <div className="app-container">
            <HeaderTecnico />
            <div className="content-container">
              <Configuracion />
            </div>
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




      </Routes>
    </Router>
  );
}

export default App;