import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Importación de vistas públicas
import LandingPage from './views/LandingPage';
import Login from "./views/Login";
import Registro from "./views/Registro";
import RecuperarContrasena from './views/recuperar';

// Importación de componentes de navegación
import HeaderTecnico from './views/headertecnico';
import HeaderAgricultor from './views/HeaderAgricultor';
// import HeaderAgronomo from './views/HeaderAgronomo'; // Comentado temporalmente

// Importación de vistas para técnico
import DashboardTecnico from './views/DashboardTecnico';
import SensoresPanel from './views/sensores';
import Usuarios from './views/Usuarios';
import AjusteParametros from "./views/AjusteParametros";
import Configuracion from './views/configuracion';

// Importación de vistas para agricultor
import DashboardAgricultor from './views/DashboardAgricultor';
import GestionParcelas from './views/GestionParcelas';
import DetalleParcela from './views/DetalleParcela';
import FormularioParcela from './views/FormularioParcela';
import EditarParcelaPage from './views/EditarParcelaPage';

// importación consultas IA
import ConsultasIA from './views/ConsultasIA';

// importación consultas IA
import ConsultasIA from './views/ConsultasIA';

/**
 * Componente principal de la aplicación
 * Configura todas las rutas disponibles mediante React Router
 */
function App() {
  // URL base para la API - puede configurarse según el entorno
  const API_URL = 'http://localhost:5000/api';
  
  return (
    <Router>
      <Routes>
        {/* ===== RUTAS PÚBLICAS ===== */}
        {/* Páginas accesibles para todos los usuarios sin autenticación */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
        
        {/* ===== RUTAS PARA TÉCNICO ===== */}
        {/* Dashboard principal del técnico */}
        <Route path="/dashboard/tecnico" element={
          <div className="app-container">
            <HeaderTecnico />
            <DashboardTecnico />
          </div>
        } />
        
        {/* Gestión de usuarios */}
        <Route path="/dashboard/tecnico/Usuarios" element={
          <div className="app-container">
            <HeaderTecnico />
            <div className="content-container">
              <Usuarios />
            </div>
          </div>
        } />
        
        {/* Panel de sensores */}
        <Route path="/sensores" element={
          <div className="app-container">
            <HeaderTecnico />
            <div className="content-container">
              <SensoresPanel API_URL={API_URL} />
            </div>
          </div>
        } />
        
        {/* Ajustes de parámetros */}
        <Route path="/dashboard/tecnico/ajustes" element={
          <div className="app-container">
            <HeaderTecnico />
            <AjusteParametros />
          </div>
        } />
        
        {/* Alertas para técnico */}
        <Route path="/dashboard/tecnico/alertas" element={
          <div className="app-container">
            <HeaderTecnico />
            <div className="content-container">
              Página de alertas en construcción
            </div>
          </div>
        } />
        
        {/* Configuración general */}
        <Route path="/configuracion" element={
          <div className="app-container">
            <HeaderTecnico />
            <div className="content-container">
              <Configuracion />
            </div>
          </div>
        } />
        
        {/* ===== RUTAS PARA AGRÓNOMO ===== */}
        {/* Dashboard principal del agrónomo */}
        <Route path="/dashboard/agronomo" element={
          <div className="app-container">
            <HeaderTecnico />
            <div className="content-container">
              Página de agrónomo en construcción
            </div>
          </div>
        } />
        
        {/* ===== RUTAS PARA AGRICULTOR ===== */}
        {/* Dashboard principal del agricultor */}
        <Route path="/dashboard/agricultor" element={
          <div className="app-container">
            <DashboardAgricultor />
          </div>
        } />
<<<<<<< HEAD
        <Route path="/dashboard/agricultor/consultas" element={
          <div className="app-container">
            <ConsultasIA />
          </div>
        } />
=======
        <Route path="/dashboard/agronomo/asistente" element={
          <div className="app-container">
            <AsistenteIA />
          </div>
      } />
>>>>>>> d62ae536edfbd7e1d6162de0ebad9ab004a40931
        {/* Lista de parcelas */}
        <Route path="/dashboard/agricultor/parcelas" element={
          <div className="app-container">
            <HeaderAgricultor activeItem="parcelas" />
            <div className="content-container">
              <GestionParcelas API_URL={API_URL} />
            </div>
          </div>
        } />
        
        {/* Detalle de parcela específica */}
        <Route path="/dashboard/agricultor/parcelas/:id" element={
          <div className="app-container">
            <HeaderAgricultor activeItem="parcelas" />
            <div className="content-container">
              <DetalleParcela API_URL={API_URL} />
            </div>
          </div>
        } />
        
        {/* Creación de nueva parcela */}
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

        {/* Edición de parcela existente */}
      <Route path="/dashboard/agricultor/parcelas/editar/:id" element={
        <div className="app-container">
          <HeaderAgricultor activeItem="parcelas" />
          <div className="content-container">
            <EditarParcelaPage API_URL={API_URL} />
          </div>
        </div>
      } />
      {/*  Ruta sensores de agricultor   /*/}
      <Route path="/dashboard/agricultor/sensores" element={
        <div className="app-container">
          <HeaderAgricultor activeItem="sensores" />
          <div className="content-container">
            <SensoresPanel API_URL={API_URL} />
          </div>
        </div>
      } />
      
      {/* Alertas para agricultor */}
        
      </Routes>
    </Router>
  );
}

export default App;