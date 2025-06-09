import React, { useState, useEffect } from 'react';
import './MeteorologiaWidget.css';
import servicioMeteo from '../services/servicioMeteo';
import DetalleMeteorologico from './DetalleMeteorologico';

const MeteorologiaWidget = ({ ubicacion }) => {
  const [datosMeteo, setDatosMeteo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  
  useEffect(() => {
    const cargarDatosMeteorologicos = async () => {
      try {
        setCargando(true);
        setError(null);
        
        let datos;
        
        // Si tenemos coordenadas específicas
        if (ubicacion && ubicacion.lat && ubicacion.lon) {
          datos = await servicioMeteo.obtenerPronostico(ubicacion.lat, ubicacion.lon);
        } 
        // Si tenemos nombre de ciudad o ubicación
        else if (ubicacion && typeof ubicacion === 'string') {
          datos = await servicioMeteo.obtenerPronosticoPorCiudad(ubicacion);
        }
        // Ubicación por defecto (Curicó, Maule)
        else {
          datos = await servicioMeteo.obtenerPronosticoPorCiudad('Curicó, Maule');
        }
        
        setDatosMeteo(datos);
      } catch (err) {
        console.error('Error al cargar datos meteorológicos:', err);
        setError('No se pudieron cargar los datos meteorológicos');
      } finally {
        setCargando(false);
      }
    };
    
    cargarDatosMeteorologicos();
    
    // Actualizar datos cada 30 minutos
    const intervalo = setInterval(cargarDatosMeteorologicos, 30 * 60 * 1000);
    
    return () => clearInterval(intervalo);
  }, [ubicacion]);
  
  const abrirDetalleMeteo = () => {
    setMostrarDetalle(true);
  };
  
  const cerrarDetalleMeteo = () => {
    setMostrarDetalle(false);
  };
  
  if (cargando) {
    return (
      <div className="meteo-cargando">
        <div className="meteo-spinner"></div>
        <p>Cargando datos meteorológicos...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="meteo-error">
        <i className="fas fa-exclamation-triangle"></i>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Reintentar</button>
      </div>
    );
  }
  
  if (!datosMeteo) return null;
  
  const { actual, pronostico } = datosMeteo;
  
  return (
    <>
      <div className="meteo-widget" onClick={abrirDetalleMeteo}>
        <div className="meteo-content">
          <div className="meteo-actual">
            <div className="meteo-principal">
              <div className="meteo-condicion">
                <i className={`fas fa-${actual.icono}`}></i>
                <span>{actual.condicion}</span>
              </div>
              <div className="meteo-temperatura">
                <span className="temp-valor">{actual.temperatura}</span>
                <span className="temp-unidad">°C</span>
              </div>
            </div>
            <div className="meteo-detalles">
              <div className="meteo-detalle">
                <span className="detalle-label">Humedad:</span>
                <span className="detalle-valor">{actual.humedad}%</span>
              </div>
              <div className="meteo-detalle">
                <span className="detalle-label">Viento:</span>
                <span className="detalle-valor">{actual.viento.velocidad} km/h {actual.viento.direccion}</span>
              </div>
              <div className="meteo-detalle">
                <span className="detalle-label">Precipitación:</span>
                <span className="detalle-valor">{actual.precipitacion}</span>
              </div>
              <div className="meteo-ubicacion">
                <i className="fas fa-map-marker-alt"></i>
                <span>{actual.ubicacion}</span>
              </div>
            </div>
          </div>
          <div className="meteo-pronostico">
            {pronostico.map((dia, index) => (
              <div key={index} className="pronostico-dia">
                <div className="pronostico-fecha">{dia.dia}</div>
                <div className="pronostico-condicion">
                  <i className={`fas fa-${dia.icono}`}></i>
                </div>
                <div className="pronostico-temp">
                  <span className="temp-max">{dia.maxima}°</span>
                  <span className="temp-min">{dia.minima}°</span>
                </div>
              </div>
            ))}
          </div>
          <div className="meteo-ver-mas">
            <span>Haga clic para ver datos detallados</span>
            <i className="fas fa-chevron-right"></i>
          </div>
        </div>
      </div>
      
      {mostrarDetalle && (
        <DetalleMeteorologico 
          ubicacion={ubicacion} 
          onClose={cerrarDetalleMeteo} 
        />
      )}
    </>
  );
};

export default MeteorologiaWidget;