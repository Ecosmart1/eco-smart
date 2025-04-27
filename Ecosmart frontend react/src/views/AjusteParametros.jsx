import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import "./vistascompartidas.css";
import './AjusteParametros.css';
import SensorService from '../services/serviciossensores';

const AjusteParametros = () => {
  const navigate = useNavigate();
  
  // Estado para los parámetros y UI
  const [parametros, setParametros] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);
  
  // Verificar autenticación
  useEffect(() => {
    const userStr = localStorage.getItem('ecosmart_user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    // Temporalmente comentado para pruebas
    /*
    if (!user || user.rol !== 'tecnico') {
      navigate('/login');
    }
    */
    
    // Cargar parámetros iniciales
    cargarParametros();
  }, [navigate]);

  // Función para cargar parámetros
  const cargarParametros = async () => {
    try {
      console.log("Cargando parámetros...");
      const params = await SensorService.obtenerParametros();
      console.log("Parámetros obtenidos:", params);
      setParametros(params);
      setLoading(false);
    } catch (error) {
      console.error("Error cargando parámetros:", error);
      // En caso de error, usar valores por defecto
      setParametros({
        temperatura: { min: 10, max: 35, variacion: 1.0 },
        humedadSuelo: { min: 20, max: 80, variacion: 2.0 },
        phSuelo: { min: 5.5, max: 7.5, variacion: 0.1 },
        nutrientes: {
          nitrogeno: { min: 100, max: 300 },
          fosforo: { min: 20, max: 80 },
          potasio: { min: 100, max: 250 }
        },
        simulacion: { intervalo: 5, duracion: 60 }
      });
      setLoading(false);
    }
  };

  // Manejar cambios en los inputs
  const handleChange = (categoria, parametro, valor) => {
    if (!parametros) return;
    
    if (categoria === 'nutrientes') {
      const [nutriente, propiedad] = parametro.split('.');
      setParametros(prev => ({
        ...prev,
        nutrientes: {
          ...prev.nutrientes,
          [nutriente]: {
            ...prev.nutrientes[nutriente],
            [propiedad]: Number(valor)
          }
        }
      }));
    } else {
      setParametros(prev => ({
        ...prev,
        [categoria]: {
          ...prev[categoria],
          [parametro]: Number(valor)
        }
      }));
    }
  };

  // Guardar configuración
  const guardarConfiguracion = async () => {
    try {
      console.log("Guardando configuración...", parametros);
      const resultado = await SensorService.guardarParametros(parametros);
      if (resultado) {
        setGuardadoExitoso(true);
        setTimeout(() => {
          setGuardadoExitoso(false);
        }, 3000);
      }
    } catch (error) {
      console.error("Error guardando configuración:", error);
    }
  };

  // Ir a la pantalla de sensores
  const irASensores = () => {
    navigate('/sensores');
  };

  if (loading || !parametros) {
    return <div className="loading">Cargando parámetros...</div>;
  }

  return (
    <div className="ajuste-parametros-container">
      <header className="dashboard-header">
        <div className="logo-container">
          <img src="/assets/logo-ecosmart.png" alt="EcoSmart Logo" className="logo" />
          <span className="logo-text">EcoSmart</span>
        </div>
        <div className="user-menu">
          <span className="user-name">Usuario Técnico</span>
          <Link to="/login" className="logout-button">Cerrar sesión</Link>
        </div>
      </header>

      <div className="dashboard-layout">
        <aside className="sidebar">
          <nav className="sidebar-nav">
            <div className="sidebar-header">Panel de Técnico</div>
            <ul className="sidebar-menu">
              <li className="sidebar-item">
                <Link to="/dashboard/tecnico" className="sidebar-link">
                  <i className="fas fa-tachometer-alt"></i>
                  <span>Dashboard</span>
                </Link>
              </li>
              <li className="sidebar-item">
                <Link to="/sensores" className="sidebar-link">
                  <i className="fas fa-microchip"></i>
                  <span>Sensores</span>
                </Link>
              </li>
              <li className="sidebar-item active">
                <Link to="/dashboard/tecnico/ajustes" className="sidebar-link">
                  <i className="fas fa-sliders-h"></i>
                  <span>Ajuste de Parámetros</span>
                </Link>
              </li>
            </ul>
          </nav>
        </aside>

        <main className="main-content">
          <div className="page-header">
            <h1>Ajuste de Parámetros</h1>
            <p>Configure los parámetros para los sensores y la simulación.</p>
          </div>

          {guardadoExitoso && (
            <div className="alerta-exito">
              ¡Configuración guardada con éxito!
            </div>
          )}

          <div className="parametros-form">
            <div className="parametros-section">
              <h2>Temperatura</h2>
              <div className="param-group">
                <label>Mínimo (°C):</label>
                <input 
                  type="number"
                  value={parametros.temperatura.min}
                  onChange={(e) => handleChange('temperatura', 'min', e.target.value)}
                />
              </div>
              <div className="param-group">
                <label>Máximo (°C):</label>
                <input 
                  type="number"
                  value={parametros.temperatura.max}
                  onChange={(e) => handleChange('temperatura', 'max', e.target.value)}
                />
              </div>
              <div className="param-group">
                <label>Variación:</label>
                <input 
                  type="number"
                  step="0.1"
                  value={parametros.temperatura.variacion}
                  onChange={(e) => handleChange('temperatura', 'variacion', e.target.value)}
                />
              </div>
            </div>

            <div className="parametros-section">
              <h2>Humedad del Suelo</h2>
              <div className="param-group">
                <label>Mínimo (%):</label>
                <input 
                  type="number"
                  value={parametros.humedadSuelo.min}
                  onChange={(e) => handleChange('humedadSuelo', 'min', e.target.value)}
                />
              </div>
              <div className="param-group">
                <label>Máximo (%):</label>
                <input 
                  type="number"
                  value={parametros.humedadSuelo.max}
                  onChange={(e) => handleChange('humedadSuelo', 'max', e.target.value)}
                />
              </div>
              <div className="param-group">
                <label>Variación:</label>
                <input 
                  type="number"
                  step="0.1"
                  value={parametros.humedadSuelo.variacion}
                  onChange={(e) => handleChange('humedadSuelo', 'variacion', e.target.value)}
                />
              </div>
            </div>

            <div className="parametros-section">
              <h2>pH del Suelo</h2>
              <div className="param-group">
                <label>Mínimo:</label>
                <input 
                  type="number"
                  step="0.1"
                  value={parametros.phSuelo.min}
                  onChange={(e) => handleChange('phSuelo', 'min', e.target.value)}
                />
              </div>
              <div className="param-group">
                <label>Máximo:</label>
                <input 
                  type="number"
                  step="0.1"
                  value={parametros.phSuelo.max}
                  onChange={(e) => handleChange('phSuelo', 'max', e.target.value)}
                />
              </div>
              <div className="param-group">
                <label>Variación:</label>
                <input 
                  type="number"
                  step="0.01"
                  value={parametros.phSuelo.variacion}
                  onChange={(e) => handleChange('phSuelo', 'variacion', e.target.value)}
                />
              </div>
            </div>

            <div className="parametros-section">
              <h2>Simulación</h2>
              <div className="param-group">
                <label>Intervalo de lectura (s):</label>
                <input 
                  type="number"
                  value={parametros.simulacion.intervalo}
                  onChange={(e) => handleChange('simulacion', 'intervalo', e.target.value)}
                />
              </div>
              <div className="param-group">
                <label>Duración (min):</label>
                <input 
                  type="number"
                  value={parametros.simulacion.duracion}
                  onChange={(e) => handleChange('simulacion', 'duracion', e.target.value)}
                />
              </div>
            </div>

            <div className="buttons-container">
              <button 
                className="btn-guardar"
                onClick={guardarConfiguracion}
              >
                Guardar Configuración
              </button>
              <button 
                className="btn-sensores"
                onClick={irASensores}
              >
                Ver Sensores
              </button>
              <Link to="/dashboard/tecnico" className="btn-volver">
                Volver al Dashboard
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AjusteParametros;