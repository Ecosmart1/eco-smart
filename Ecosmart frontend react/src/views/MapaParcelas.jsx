// MapaParcelas.jsx
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './MapaParcelas.css';

// Corregir el ícono de Leaflet (mismo código que tienes en DetalleParcela)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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