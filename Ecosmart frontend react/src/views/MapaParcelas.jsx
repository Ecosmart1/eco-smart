// MapaParcelas.jsx
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'; // Añadido useMap
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './MapaParcelas.css';
import { Icon } from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Corregir el ícono de Leaflet (mismo código que tienes en DetalleParcela)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const defaultIcon = new Icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Componente que actualiza el mapa cuando hay scroll o cambio de tamaño
function MapaActualizador() {
  const map = useMap();
  
  useEffect(() => {
    // Actualiza el mapa inmediatamente
    map.invalidateSize();
    
    // Y después de un pequeño retraso para asegurar renderizado completo
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300);
    
    // Actualiza cuando hay scroll en la página
    const handleScroll = () => {
      map.invalidateSize();
    };
    
    // Actualiza cuando cambia el tamaño de la ventana
    const handleResize = () => {
      map.invalidateSize();
    };
    
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);
  
  return null; // Este componente no renderiza nada visual
}

const MapaParcelas = ({ API_URL }) => {
  const [parcelas, setParcelas] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchParcelas = async () => {
      try {
        const response = await axios.get(`${API_URL}/parcelas`);
        setParcelas(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error al cargar parcelas:', err);
        setLoading(false);
      }
    };

    fetchParcelas();
  }, [API_URL]);

  // Calcular el centro del mapa basado en todas las parcelas
  const calcularCentro = () => {
    if (parcelas.length === 0) return [-33.45, -70.67]; // Coordenadas por defecto
    
    // Si solo hay una parcela
    if (parcelas.length === 1 && parcelas[0].latitud && parcelas[0].longitud) {
      return [parcelas[0].latitud, parcelas[0].longitud];
    }
    
    // Calcular el promedio de latitudes y longitudes
    let sumLat = 0, sumLng = 0, count = 0;
    
    parcelas.forEach(parcela => {
      if (parcela.latitud && parcela.longitud) {
        sumLat += parseFloat(parcela.latitud);
        sumLng += parseFloat(parcela.longitud);
        count++;
      }
    });
    
    return count > 0 ? [sumLat / count, sumLng / count] : [-33.45, -70.67];
  };

  // Calcular el nivel de zoom óptimo
  const calcularZoom = () => {
    return parcelas.length === 1 ? 14 : 11;
  };

  if (loading) {
    return <div className="mapa-loading">Cargando mapa...</div>;
  }

  // Verificar si hay parcelas con coordenadas
  const parcelasConCoordenadas = parcelas.filter(p => p.latitud && p.longitud);
  
  if (parcelasConCoordenadas.length === 0) {
    return (
      <div className="mapa-sin-coordenadas">
        <p>No hay parcelas con coordenadas disponibles para mostrar en el mapa.</p>
        <p>Agregue coordenadas a sus parcelas para visualizarlas aquí.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-map-container">
      <MapContainer 
        center={calcularCentro()} 
        zoom={calcularZoom()} 
        style={{ height: "350px", width: "100%", borderRadius: "8px" }}
      >
        <MapaActualizador /> {/* Componente que soluciona el problema de scroll */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {parcelasConCoordenadas.map(parcela => (
          <Marker 
            key={parcela.id} 
            position={[parcela.latitud, parcela.longitud]}
          >
            <Popup>
              <div className="mapa-popup">
                <h5>{parcela.nombre}</h5>
                <p>{parcela.cultivo_actual || 'Sin cultivo'} - {parcela.hectareas} ha</p>
                <button 
                  className="btn-ver-detalle"
                  onClick={() => navigate(`/dashboard/agricultor/parcelas/${parcela.id}`)}
                >
                  Ver detalles
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapaParcelas;