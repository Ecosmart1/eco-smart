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
  const [parcelas, setParcelas] = useState([]);
  const [parcelaSeleccionada, setParcelaSeleccionada] = useState(null);
  const [cargandoParcelas, setCargandoParcelas] = useState(true);

  // NUEVO: Estado para condición seleccionada y popup de simulación terminada
  const [condicionSeleccionada, setCondicionSeleccionada] = useState(null);
  const [popupMensaje, setPopupMensaje] = useState('');

  // Obtener información del usuario almacenada al iniciar sesión
  const [user, setUser] = useState(() => {
    const userStr = localStorage.getItem('ecosmart_user');
    return userStr ? JSON.parse(userStr) : null;
  });

  // NUEVO: Función para cargar parcelas
  const fetchParcelas = async () => {
    try {
      setCargandoParcelas(true);
      const response = await fetch(`${API_URL}/parcelas`);
      if (!response.ok) {
        throw new Error('Error al cargar las parcelas');
      }
      const data = await response.json();
      setParcelas(data);
      // Seleccionar primera parcela por defecto si existe
      if (data.length > 0 && !parcelaSeleccionada) {
        setParcelaSeleccionada(data[0].id);
      }
    } catch (err) {
      console.error("Error cargando parcelas:", err);
    } finally {
      setCargandoParcelas(false);
    }
  };

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
  
  // Cargar sensores, parámetros y parcelas al inicio
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
    fetchParcelas(); // NUEVO: Cargar parcelas
    
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
      // Mostrar popup cuando termina la simulación
      if (condicionSeleccionada) {
        setPopupMensaje('¡La simulación ha terminado!');
        setTimeout(() => setPopupMensaje(''), 3000);
      }
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

  // MODIFICADO: Iniciar simulación con parámetros y parcela seleccionada
  const iniciarSimulacionConParametros = async (params = null) => {
    try {
      const paramsToUse = params || parametros;
      console.log("Iniciando simulación con parámetros:", paramsToUse);
      
      // Determinar si usar la simulación específica por parcela o la general
      let url = `${API_URL}/simulacion/iniciar`;
      if (parcelaSeleccionada) {
        url = `${API_URL}/simulacion/iniciar/${parcelaSeleccionada}`;
        console.log(`Simulando datos para parcela ID: ${parcelaSeleccionada}`);
      }
      
      const response = await fetch(url, {
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

  // MODIFICADO: simularCondicion ahora marca la condición seleccionada
  const simularCondicion = async (condicion) => {
    try {
      setCondicionSeleccionada(condicion);
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

  // Botón de condición con color destacado si está seleccionada
  const botonCondicion = (cond, label) => (
    <button
      onClick={() => simularCondicion(cond)}
      className={condicionSeleccionada === cond ? 'condicion-activa' : ''}
      style={condicionSeleccionada === cond ? { backgroundColor: '#f44336', color: '#fff' } : {}}
    >
      {label}
    </button>
  );

  if (loading) {
    return <div className="loading">Cargando sensores...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="app-container">
      {/* Título general arriba de ambas secciones */}
      <div className="titulo-ecosmart">
        <h1>EcoSmart - Sistema de Sensores Agrícolas</h1>
      </div>
      <div className="sensores-layout">
        <div className="panel-izquierdo">
          <div className="control-panel">
            <h2>Panel de Control</h2>

            {/* NUEVO: Selector de parcelas */}
            <div className="parcela-selector">
              <h3>Asignar Datos a Parcela:</h3>
              <div className="selector-container">
                <select
                  value={parcelaSeleccionada || ''}
                  onChange={(e) => setParcelaSeleccionada(e.target.value ? Number(e.target.value) : null)}
                  disabled={simulacionActiva || cargandoParcelas}
                >
                  <option value="">Seleccione una parcela</option>
                  {parcelas.map(parcela => (
                    <option key={parcela.id} value={parcela.id}>
                      {parcela.nombre} ({parcela.cultivo_actual || 'Sin cultivo'})
                    </option>
                  ))}
                </select>
                {parcelaSeleccionada && (
                  <div className="parcela-seleccionada">
                    <p>Los datos se asignarán a: <strong>{
                      parcelas.find(p => p.id === Number(parcelaSeleccionada))?.nombre || 'Parcela seleccionada'
                    }</strong></p>
                  </div>
                )}
              </div>
            </div>

            <div className="buttons">
              <button
                onClick={iniciarSimulacion}
                disabled={simulacionActiva}
              >
                {parcelaSeleccionada
                  ? `Iniciar Simulación en Parcela`
                  : 'Iniciar Simulación General'}
              </button>
              <div className="buttons-terminar">
                <button onClick={detenerSimulacion} disabled={!simulacionActiva}>
                  Detener Simulación
                </button>
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
              {botonCondicion('normal', 'Normal')}
              {botonCondicion('heladas', 'Heladas')}
              {botonCondicion('sequia', 'Sequía')}
              {botonCondicion('lluvia', 'Lluvia Intensa')}
            </div>

            {/* Mostrar parámetros actuales de la simulación */}
            {parametros && (
              <div className="parametros-activos">
                <h3>Parámetros Activos de Simulación:</h3>
                <p>Temperatura: {parametros.temperatura?.min}°C - {parametros.temperatura?.max}°C</p>
                <p>Humedad: {parametros.humedadSuelo?.min}% - {parametros.humedadSuelo?.max}%</p>
                <p>pH: {parametros.phSuelo?.min} - {parametros.phSuelo?.max}</p>
                {parametros.simulacion && (
                  <>
                    <p>Frecuencia de simulación: {parametros.simulacion.intervalo} segundos</p>
                    <p>Duración de simulación: {parametros.simulacion.duracion} minutos</p>
                  </>
                )}
              </div>
            )}
          </div>
          {popupMensaje && (
            <div className="popup-simulacion-terminada">
              {popupMensaje}
            </div>
          )}
        </div>
        <div className="panel-derecho">
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
      </div>
    </div>
  );
}

export default SensoresPanel;

// --- Agrega esto a tu sensores.css ---
