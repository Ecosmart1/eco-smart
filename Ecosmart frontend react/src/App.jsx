import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import DashboardAgricultor from './views/DashboardAgricultor'; // Agrega esta línea

/*import HeaderAgronomo from './views/HeaderAgronomo';*/

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
        <DashboardAgricultor />
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
      </Routes>
    </Router>
  );
}

export default App;