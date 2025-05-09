import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './HeaderAgricultor.css';

/**
 * Componente de cabecera para el rol de agricultor
 * Muestra navegación principal y opciones de usuario
 * @param {object} props - Propiedades del componente
 * @param {string} props.activeItem - Ítem activo en la navegación
 */
const HeaderAgricultor = ({ activeItem }) => {
  // Estados
  const [usuario, setUsuario] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const navigate = useNavigate();
  
  // Efecto para cargar datos de usuario
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
  
  // Función para cerrar sesión
  const cerrarSesion = () => {
    localStorage.removeItem('ecosmart_user');
    navigate('/login');
  };
  
  // Función para alternar el menú desplegable
  const toggleMenu = () => {
    setMenuAbierto(!menuAbierto);
  };
  
  // Función para cerrar el menú al hacer clic fuera
  const handleClickOutside = (event) => {
    const userProfileElement = document.querySelector('.user-profile');
    if (userProfileElement && !userProfileElement.contains(event.target)) {
      setMenuAbierto(false);
    }
  };
  
  // Agregar/remover event listener para cerrar el menú
  useEffect(() => {
    if (menuAbierto) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuAbierto]);

  // Enlaces de navegación principal
  const navLinks = [
    { to: "/dashboard/agricultor", label: "Dashboard", id: "dashboard" },
    { to: "/dashboard/agricultor/parcelas", label: "Parcelas", id: "parcelas" },
    { to: "/dashboard/agricultor/sensores", label: "Sensores", id: "sensores" },
    { to: "/dashboard/agricultor/alertas", label: "Alertas", id: "alertas" },
    { to: "/dashboard/agricultor/asistente", label: "Asistente IA", id: "asistente" }
  ];

  // Opciones del menú desplegable de usuario
  const menuItems = [
    { to: "/dashboard/agricultor/perfil", label: "Mi Perfil" },
    { to: "/dashboard/agricultor/configuracion", label: "Configuración" }
  ];

  return (
    <header className="dashboard-header">
      {/* Logo y título */}
      <div className="logo-container">
        <img src="/public/logo-ecosmart.png" alt="EcoSmart Logo" className="logo" />
        <h1 className="app-title">EcoSmart</h1>
      </div>
      
      {/* Navegación principal */}
      <nav className="header-nav">
        {navLinks.map(link => (
          <Link
            key={link.id}
            to={link.to}
            className={`nav-item ${activeItem === link.id ? 'active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      
      {/* Perfil de usuario y menú desplegable */}
      <div className="user-profile" onClick={toggleMenu}>
        <div className="user-avatar">
          {usuario?.nombre.charAt(0)}
        </div>
        <div className="user-info">
          <div className="user-name">{usuario?.nombre}</div>
          <div className="user-role">Agricultor</div>
        </div>
        <div className="user-menu-icon">
          {menuAbierto ? '▲' : '▼'}
        </div>
        
        {/* Menú desplegable (visible condicionalmente) */}
        {menuAbierto && (
          <div className="user-dropdown-menu">
            {menuItems.map((item, index) => (
              <Link 
                key={index}
                to={item.to} 
                className="dropdown-item"
                onClick={(e) => e.stopPropagation()} // Evitar que se cierre al hacer clic en el enlace
              >
                {item.label}
              </Link>
            ))}
            <div className="dropdown-divider"></div>
            <div 
              className="dropdown-item logout-item" 
              onClick={(e) => {
                e.stopPropagation();
                cerrarSesion();
              }}
            >
              Cerrar Sesión
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default HeaderAgricultor;