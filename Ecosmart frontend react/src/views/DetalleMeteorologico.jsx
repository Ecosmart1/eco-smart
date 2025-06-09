import React, { useState, useEffect } from 'react';
import './DetalleMeteorologico.css';
import servicioMeteo from '../services/servicioMeteo';

const DetalleMeteorologico = ({ ubicacion, onClose }) => {
  const [datosMeteo, setDatosMeteo] = useState(null);
  const [datosHorarios, setDatosHorarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const cargarDatosMeteorologicos = async () => {
      try {
        setCargando(true);
        setError(null);
        
        let datos;
        let datosOneCall;
        
        // Si tenemos coordenadas específicas
        if (ubicacion && ubicacion.lat && ubicacion.lon) {
          datos = await servicioMeteo.obtenerPronostico(ubicacion.lat, ubicacion.lon);
          datosOneCall = await servicioMeteo.obtenerDatosCompletos(ubicacion.lat, ubicacion.lon);
        } 
        // Si tenemos nombre de ciudad o ubicación
        else if (ubicacion && typeof ubicacion === 'string') {
          // Primero obtener las coordenadas para poder hacer la llamada a One Call API
          const coordenadas = await servicioMeteo.obtenerCoordenadas(ubicacion);
          datos = await servicioMeteo.obtenerPronostico(coordenadas.lat, coordenadas.lon);
          datosOneCall = await servicioMeteo.obtenerDatosCompletos(coordenadas.lat, coordenadas.lon);
        }
        // Ubicación por defecto (Curicó, Maule)
        else {
          const coordenadas = await servicioMeteo.obtenerCoordenadas('Curicó, Maule');
          datos = await servicioMeteo.obtenerPronostico(coordenadas.lat, coordenadas.lon);
          datosOneCall = await servicioMeteo.obtenerDatosCompletos(coordenadas.lat, coordenadas.lon);
        }
        
        setDatosMeteo(datos);
        setDatosHorarios(datosOneCall.hourly || []);
      } catch (err) {
        console.error('Error al cargar datos meteorológicos detallados:', err);
        setError('No se pudieron cargar los datos meteorológicos detallados');
      } finally {
        setCargando(false);
      }
    };
    
    cargarDatosMeteorologicos();
  }, [ubicacion]);
  
  const formatearHora = (timestamp) => {
    const fecha = new Date(timestamp * 1000);
    return fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  if (cargando) {
    return (
      <div className="meteo-detalle-cargando">
        <div className="meteo-spinner"></div>
        <p>Cargando datos meteorológicos detallados...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="meteo-detalle-error">
        <i className="fas fa-exclamation-triangle"></i>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Reintentar</button>
      </div>
    );
  }
  
  if (!datosMeteo) return null;
  
  const { actual, pronostico } = datosMeteo;
  
  return (
    <div className="meteo-detalle-contenedor">
      <div className="meteo-detalle-header">
        <h2>Meteorología detallada: {actual.ubicacion}</h2>
        <button className="btn-cerrar" onClick={onClose}>×</button>
      </div>
      
      <div className="meteo-detalle-principal">
        <div className="meteo-detalle-actual">
          <div className="meteo-detalle-condicion">
            <i className={`fas fa-${actual.icono} fa-3x`}></i>
            <span>{actual.condicion}</span>
          </div>
          <div className="meteo-detalle-temperatura">
            <span className="temp-valor-grande">{actual.temperatura}</span>
            <span className="temp-unidad-grande">°C</span>
          </div>
        </div>
        
        <div className="meteo-detalle-info">
          <div className="meteo-detalle-parametro">
            <i className="fas fa-tint"></i>
            <span className="parametro-label">Humedad:</span>
            <span className="parametro-valor">{actual.humedad}%</span>
          </div>
          <div className="meteo-detalle-parametro">
            <i className="fas fa-wind"></i>
            <span className="parametro-label">Viento:</span>
            <span className="parametro-valor">{actual.viento.velocidad} km/h {actual.viento.direccion}</span>
          </div>
          <div className="meteo-detalle-parametro">
            <i className="fas fa-cloud-rain"></i>
            <span className="parametro-label">Precipitación:</span>
            <span className="parametro-valor">{actual.precipitacion}</span>
          </div>
          <div className="meteo-detalle-parametro">
            <i className="fas fa-compress-alt"></i>
            <span className="parametro-label">Presión:</span>
            <span className="parametro-valor">{actual.presion || 'N/D'} hPa</span>
          </div>
          <div className="meteo-detalle-parametro">
            <i className="fas fa-sun"></i>
            <span className="parametro-label">Índice UV:</span>
            <span className="parametro-valor">{actual.uv || 'N/D'}</span>
          </div>
        </div>
      </div>
      
      {/* Gráfico de temperatura hora a hora */}
      <div className="meteo-detalle-seccion">
        <h3>Temperatura por hora</h3>
        <div className="meteo-grafico-container">
          <div className="meteo-grafico-horas">
            {datosHorarios.slice(0, 24).map((hora, index) => (
              <div key={index} className="hora-item">
                <div className="hora-tiempo">{formatearHora(hora.dt)}</div>
                <div className="hora-icono">
                  <i className={`fas fa-${obtenerIcono(hora.weather[0].icon)}`}></i>
                </div>
                <div className="hora-temp">{Math.round(hora.temp)}°</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Pronóstico diario más detallado */}
      <div className="meteo-detalle-seccion">
        <h3>Pronóstico de 5 días</h3>
        <div className="meteo-detalle-pronostico">
          {pronostico.map((dia, index) => (
            <div key={index} className="dia-detalle-item">
              <div className="dia-detalle-fecha">{dia.dia}</div>
              <div className="dia-detalle-condicion">
                <i className={`fas fa-${dia.icono}`}></i>
                <span>{dia.condicion}</span>
              </div>
              <div className="dia-detalle-temps">
                <span className="temp-max">{dia.maxima}°</span>
                <span className="temp-min">{dia.minima}°</span>
              </div>
              <div className="dia-detalle-extra">
                <div className="dia-detalle-param">
                  <i className="fas fa-tint"></i>
                  <span>{dia.probabilidadLluvia || '0%'}</span>
                </div>
                <div className="dia-detalle-param">
                  <i className="fas fa-wind"></i>
                  <span>{dia.viento || 'N/D'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Aquí irán más gráficos y datos en futuras implementaciones */}
      <div className="meteo-detalle-footer">
        <p>Datos proporcionados por OpenWeatherMap</p>
        <button className="btn-cerrar-secundario" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
};

// Función auxiliar para obtener el icono correcto
const obtenerIcono = (iconoOWM) => {
  const iconos = {
    '01d': 'sun',
    '01n': 'moon',
    '02d': 'cloud-sun',
    '02n': 'cloud-moon',
    '03d': 'cloud',
    '03n': 'cloud',
    '04d': 'cloud',
    '04n': 'cloud',
    '09d': 'cloud-showers-heavy',
    '09n': 'cloud-showers-heavy',
    '10d': 'cloud-sun-rain',
    '10n': 'cloud-moon-rain',
    '11d': 'bolt',
    '11n': 'bolt',
    '13d': 'snowflake',
    '13n': 'snowflake',
    '50d': 'smog',
    '50n': 'smog'
  };
  
  return iconos[iconoOWM] || 'cloud';
};

export default DetalleMeteorologico;