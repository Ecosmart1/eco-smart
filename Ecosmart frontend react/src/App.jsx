import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [sensores, setSensores] = useState([]);
  const [datos, setDatos] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [simulacionActiva, setSimulacionActiva] = useState(false);

  const API_URL = 'http://localhost:5000/api';

  // Obtener lista de sensores
  useEffect(() => {
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
    fetchSensores();
  }, []);

  // Fetch de datos periódicamente solo si la simulación está activa
  useEffect(() => {
    let interval;
    if (simulacionActiva) {
      interval = setInterval(() => {
        fetchDatosSensores();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [simulacionActiva]);

  // Fetch único cuando la simulación se detiene (para mostrar últimos datos)
  useEffect(() => {
    if (!simulacionActiva) {
      fetchDatosSensores();
    }
    // eslint-disable-next-line
  }, [simulacionActiva]);

  // Función para obtener datos actuales de los sensores
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

  // Iniciar simulación
  const iniciarSimulacion = async () => {
    try {
      const response = await fetch(`${API_URL}/simulacion/iniciar`, {
        method: 'POST'
      });
      const data = await response.json();
      alert(data.mensaje);
      setSimulacionActiva(true);
    } catch (err) {
      setError(err.message);
    }
  };

  // Detener simulación
  const detenerSimulacion = async () => {
    try {
      const response = await fetch(`${API_URL}/simulacion/detener`, {
        method: 'POST'
      });
      const data = await response.json();
      alert(data.mensaje);
      setSimulacionActiva(false);
    } catch (err) {
      setError(err.message);
    }
  };

  // Simular condición específica
  const simularCondicion = async (condicion) => {
    try {
      const response = await fetch(`${API_URL}/condiciones/${condicion}`, {
        method: 'POST'
      });
      const data = await response.json();
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
      <h1>EcoSmart - Sistema de Sensores Agrícolas</h1>
      
      <div className="control-panel">
        <h2>Panel de Control</h2>
        <div className="buttons">
          <button onClick={iniciarSimulacion}>Iniciar Simulación</button>
          <div className="buttons-terminar">
            <button onClick={detenerSimulacion}>Detener Simulación</button>
          </div>
        </div>
        
        <div className="conditions">
          <h3>Condiciones:</h3>
          <button onClick={() => simularCondicion('normal')}>Normal</button>
          <button onClick={() => simularCondicion('heladas')}>Heladas</button>
          <button onClick={() => simularCondicion('sequia')}>Sequía</button>
          <button onClick={() => simularCondicion('lluvia')}>Lluvia Intensa</button>
        </div>
      </div>
      
      <div className="sensors-container">
        <h2>Sensores</h2>
        <div className="sensors-grid">
          {sensores.map(sensor => (
            <div className="sensor-card" key={sensor.id}>
              <h3>{sensor.tipo} ({sensor.id})</h3>
              <div className="sensor-info">
                <p>Unidad: {sensor.unidad}</p>
                <p>Rango: {sensor.valor_minimo} - {sensor.valor_maximo}</p>
                <p>Frecuencia: {sensor.frecuencia}s</p>
              </div>
              <div className="sensor-reading">
                {datos[sensor.id] ? (
                  <>
                    <h4>Última lectura</h4>
                    <p className="reading-value">
                      {datos[sensor.id].valor} {sensor.unidad}
                    </p>
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

export default App;