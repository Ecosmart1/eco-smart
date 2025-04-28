import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './sensores.css';
import "./vistascompartidas.css";
import SensorService from '../services/serviciossensores';

function SensoresPanel({ API_URL = 'http://localhost:5000/api' }) {
  const [sensores, setSensores] = useState([]);
  const [datos, setDatos] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [simulacionActiva, setSimulacionActiva] = useState(false);
  const [parametros, setParametros] = useState(null);

  // Obtener lista de sensores y parámetros
  const fetchSensores = async () => {
    try {
      const response = await fetch(`${API_URL}/sensores`);
      if (!response.ok) {
        throw new Error('Error al cargar los sensores');
      }
      const data = await response.json();
      setSensores(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };
  
  const actualizarSensores = () => {
    fetchSensores();
  };
  
  // Asegúrate de que esta función se llame después de guardar parámetros
  useEffect(() => {
    const cargarParametros = async () => {
      try {
        const params = await SensorService.obtenerParametros();
        console.log("Parámetros cargados en Sensores:", params);
        setParametros(params);
      } catch (error) {
        console.error("Error cargando parámetros:", error);
      }
    };
    
    fetchSensores();
    cargarParametros();
    
    // Suscribirse a cambios en los parámetros
    const unsuscribir = SensorService.suscribirse((nuevosParams) => {
        setParametros(nuevosParams);
        console.log("Actualizados parámetros en Sensores:", nuevosParams);
        
        // Refrescar la lista de sensores para mostrar frecuencia actualizada
        fetchSensores();
        
        // Si hay simulación activa, reiniciarla con nuevos parámetros
        if (simulacionActiva) {
          detenerSimulacion().then(() => iniciarSimulacionConParametros(nuevosParams));
        }
      });
    
      return () => unsuscribir();
    }, [API_URL]);

  // Fetch de datos periódicamente si la simulación está activa
  useEffect(() => {
    let interval;
    if (simulacionActiva) {
      interval = setInterval(() => {
        fetchDatosSensores();
      }, parametros?.simulacion?.intervalo * 1000 || 5000);
    }
    return () => clearInterval(interval);
  }, [simulacionActiva, parametros]);

  // Fetch único cuando la simulación se detiene
  useEffect(() => {
    if (!simulacionActiva) {
      fetchDatosSensores();
    }
  }, [simulacionActiva]);

  const fetchDatosSensores = async () => {
    try {
      const response = await fetch(`${API_URL}/datos`);
      if (!response.ok) {
        throw new Error('Error al cargar datos');
      }
      const data = await response.json();
      setDatos(data);
    } catch (err) {
      setError(err.message);
    }
  };

  // Iniciar simulación con parámetros
  const iniciarSimulacionConParametros = async (params = null) => {
    try {
      const paramsToUse = params || parametros;
      console.log("Iniciando simulación con parámetros:", paramsToUse);
      const response = await fetch(`${API_URL}/simulacion/iniciar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paramsToUse)
      });
      const data = await response.json();
      alert(data.mensaje);
      setSimulacionActiva(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const iniciarSimulacion = () => iniciarSimulacionConParametros();

  const detenerSimulacion = async () => {
    try {
      const response = await fetch(`${API_URL}/simulacion/detener`, {
        method: 'POST'
      });
      const data = await response.json();
      alert(data.mensaje);
      setSimulacionActiva(false);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const exportar_csv = async () => {
    try {
      window.open(`${API_URL}/exportar_csv`, '_blank');
    } catch (err) {
      setError(err.message);
    } 
  };

  const simularCondicion = async (condicion) => {
    try {
      const response = await fetch(`${API_URL}/condiciones/${condicion}`, {
        method: 'POST'
      });
      const data = await response.json();
      
      // Actualizar los parámetros locales con los recibidos del servidor
      if (data.parametros) {
        setParametros(data.parametros);
        
        // También actualizar el servicio para que otros componentes se enteren
        if (SensorService && typeof SensorService.guardarParametrosDesdeCondicion === 'function') {
          await SensorService.guardarParametrosDesdeCondicion(data.parametros);
        } else if (SensorService && typeof SensorService.guardarParametros === 'function') {
          await SensorService.guardarParametros(data.parametros);
        }
      }
      
      alert(data.mensaje);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="loading">Cargando sensores...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="app-container">
      <div className="header">
        <div className="logo-container">
          <img src="/assets/logo-ecosmart.png" alt="Logo EcoSmart" />
          <span className="logo-text">EcoSmart</span>
        </div>
        
        <div className="nav-menu">
          <Link to="/dashboard/tecnico" className="nav-item">Panel de control</Link>
          <Link to="/sensores" className="nav-item active">Sensores</Link>
          <Link to="/alertas" className="nav-item">Alertas</Link>
        </div>
        
        <div className="user-section">
          <div className="user-avatar">U</div>
          <div className="user-info">
            <span className="user-name">Nombre de Usuario</span>
            <span className="user-role">Configuración</span>
          </div>
        </div>
      </div>
      
      <h1>EcoSmart - Sistema de Sensores Agrícolas</h1>
      
      <div className="control-panel">
        <h2>Panel de Control</h2>
        <div className="buttons">
          <button onClick={iniciarSimulacion}>Iniciar Simulación</button>
          <div className="buttons-terminar">
            <button onClick={detenerSimulacion}>Detener Simulación</button>
          </div>
          <div className="buttons-exportar">
            <button onClick={exportar_csv}>Exportar Datos</button>
          </div>
          <div className="buttons-ajustes">
            <Link to="/dashboard/tecnico/ajustes" className="button-link">Ajustar Parámetros</Link>
          </div>
        </div>
        
        <div className="conditions">
          <h3>Condiciones:</h3>
          <button onClick={() => simularCondicion('normal')}>Normal</button>
          <button onClick={() => simularCondicion('heladas')}>Heladas</button>
          <button onClick={() => simularCondicion('sequia')}>Sequía</button>
          <button onClick={() => simularCondicion('lluvia')}>Lluvia Intensa</button>
        </div>
        
        {parametros && (
          <div className="parametros-activos">
            <h3>Parámetros Activos:</h3>
            <p>Temperatura: {parametros.temperatura.min}°C - {parametros.temperatura.max}°C</p>
            <p>Humedad: {parametros.humedadSuelo.min}% - {parametros.humedadSuelo.max}%</p>
            <p>pH: {parametros.phSuelo.min} - {parametros.phSuelo.max}</p>
          </div>
        )}
      </div>
      
      <div className="sensors-container">
        <h2>Sensores</h2>
        <div className="sensors-grid">
          {sensores.map(sensor => (
            <div className="sensor-card" key={sensor.id}>
              <h3>{sensor.tipo} ({sensor.id})</h3>
              <div className="sensor-info">
                <p>Unidad: {sensor.unidad}</p>
                {sensor.id !== 4 && (
                  <p>Rango: {sensor.valor_minimo} - {sensor.valor_maximo}</p>
                )}
                <p>Frecuencia: {sensor.frecuencia}s</p>
              </div>
              <div className="sensor-reading">
                {datos[sensor.id] ? (
                  <>
                    <h4>Última lectura</h4>
                    {sensor.id === 4 ? (
                      // Vista especial para nutrientes
                      <div className="nutrientes-container">
                        <div className="nutriente-item">
                          <span className="nutriente-label">Nitrógeno:</span>
                          <span className="nutriente-value">
                            {datos[sensor.id].valor.nitrogeno} {sensor.unidad}
                          </span>
                        </div>
                        <div className="nutriente-item">
                          <span className="nutriente-label">Fósforo:</span>
                          <span className="nutriente-value">
                            {datos[sensor.id].valor.fosforo} {sensor.unidad}
                          </span>
                        </div>
                        <div className="nutriente-item">
                          <span className="nutriente-label">Potasio:</span>
                          <span className="nutriente-value">
                            {datos[sensor.id].valor.potasio} {sensor.unidad}
                          </span>
                        </div>
                      </div>
                    ) : (
                      // Vista normal para otros sensores
                      <p className="reading-value">
                        {datos[sensor.id].valor} {sensor.unidad}
                      </p>
                    )}
                  </>
                ) : (
                  <p>Sin lecturas</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SensoresPanel;