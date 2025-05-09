import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Container, Row, Col, Card, Button, Alert, Spinner, Table } from 'react-bootstrap';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { FaArrowLeft, FaEdit, FaTrash, FaSeedling } from 'react-icons/fa';
import L from 'leaflet';
import './DetalleParcela.css';
import MeteorologiaWidget from './MeteorologiaWidget';

// Corregir el ícono de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const DetalleParcela = ({ API_URL }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [parcela, setParcela] = useState(null);
  const [sensores, setSensores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchParcelaData = async () => {
      try {
        setLoading(true);
        
        // Obtener datos de la parcela
        const response = await axios.get(`${API_URL}/parcelas/${id}`);
        setParcela(response.data);
        
        // Intentar obtener datos de sensores si tienes un endpoint para ello
        try {
          const sensoresResponse = await axios.get(`${API_URL}/parcelas/${id}/sensores`);
          setSensores(sensoresResponse.data);
        } catch (err) {
          // Si no tienes sensores configurados, simplemente ignora el error
          console.log('No se pudieron cargar los sensores o no existen para esta parcela');
          setSensores([]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error al cargar datos de la parcela:', err);
        setError('Error al cargar los datos de la parcela. Intente nuevamente más tarde.');
        setLoading(false);
      }
    };
    
    fetchParcelaData();
  }, [id, API_URL]);
  
  // Función para eliminar parcela
  const handleDelete = async () => {
    if (window.confirm('¿Está seguro que desea eliminar esta parcela? Esta acción no se puede deshacer.')) {
      try {
        await axios.delete(`${API_URL}/parcelas/${id}`);
        navigate('/dashboard/agricultor/parcelas');
      } catch (err) {
        console.error('Error al eliminar parcela:', err);
        setError('Error al eliminar la parcela. Intente nuevamente más tarde.');
      }
    }
  };
  
  // Mostrar spinner mientras carga
  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Cargando...</span>
        </Spinner>
      </Container>
    );
  }
  
  // Mostrar error si no se pudo cargar la parcela
  if (!parcela) {
    return (
      <Container className="mt-4">
        <Alert variant="warning">
          No se encontró la parcela solicitada o ocurrió un error al cargarla.
          <div className="mt-3">
            <Button variant="primary" onClick={() => navigate('/dashboard/agricultor/parcelas')}>
              Volver a la lista de parcelas
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }
  
  return (
    <Container className="mt-4 mb-5">
      {/* Cabecera con botón volver y acciones */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Button 
          variant="outline-primary" 
          onClick={() => navigate('/dashboard/agricultor/parcelas')}
          className="d-flex align-items-center"
        >
          <FaArrowLeft className="me-2" /> Volver a parcelas
        </Button>
        
        <div>
          <Button 
            variant="warning" 
            className="me-2"
            onClick={() => navigate(`/dashboard/agricultor/parcelas/editar/${id}`)}
          >
            <FaEdit className="me-1" /> Editar parcela
          </Button>
          <Button 
            variant="danger"
            onClick={handleDelete}
          >
            <FaTrash className="me-1" /> Eliminar
          </Button>
        </div>
      </div>
      
      {/* Mostrar errores si existen */}
      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}
      
      {/* Título de la parcela */}
      <h2 className="mb-4">{parcela.nombre}</h2>
      
      <Row>
        {/* Columna izquierda - Información general y mapa */}
        <Col lg={7}>
          {/* Información general */}
          <Card className="mb-4 shadow-sm">
            <Card.Header className="bg-success text-white">
              <h4 className="mb-0">Información general</h4>
            </Card.Header>
            <Card.Body>
              <Table responsive borderless>
                <tbody>
                  <tr>
                    <td><strong>Cultivo actual:</strong></td>
                    <td>
                      <div className="d-flex align-items-center">
                        <FaSeedling className="me-2 text-success" />
                        {parcela.cultivo_actual || 'No especificado'}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Ubicación:</strong></td>
                    <td>{parcela.ubicacion || 'No especificada'}</td>
                  </tr>
                  <tr>
                    <td><strong>Área:</strong></td>
                    <td>{parcela.hectareas || 0} hectáreas</td>
                  </tr>
                  <tr>
                    <td><strong>Fecha de siembra:</strong></td>
                    <td>{parcela.fecha_siembra ? new Date(parcela.fecha_siembra).toLocaleDateString() : 'No especificada'}</td>
                  </tr>
                  <tr>
                    <td><strong>Coordenadas:</strong></td>
                    <td>{parcela.latitud}, {parcela.longitud}</td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
          
          {/* Mapa */}
          <Card className="mb-4 shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h4 className="mb-0">Ubicación</h4>
            </Card.Header>
            <Card.Body className="p-0">
              {parcela.latitud && parcela.longitud ? (
                <div className="parcela-mapa">
                  <MapContainer 
                    center={[parcela.latitud, parcela.longitud]} 
                    zoom={14} 
                    style={{ height: "400px", width: "100%" }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <Marker position={[parcela.latitud, parcela.longitud]}>
                      <Popup>
                        <strong>{parcela.nombre}</strong><br />
                        {parcela.cultivo_actual && `Cultivo: ${parcela.cultivo_actual}`}<br />
                        {parcela.hectareas && `Área: ${parcela.hectareas} ha`}
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
              ) : (
                <Alert variant="info" className="m-3">
                  No hay coordenadas disponibles para mostrar esta parcela en el mapa.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        {/* Columna derecha - Clima y sensores */}
        <Col lg={5}>
          {/* Pronóstico del clima */}
          <div className="mb-4">
            <MeteorologiaWidget 
              ubicacion={{ 
                lat: parcela.latitud, 
                lon: parcela.longitud 
              }} 
            />
          </div>
          
          {/* Datos de sensores */}
          <Card className="shadow-sm">
            <Card.Header className="bg-warning">
              <h4 className="mb-0">Sensores</h4>
            </Card.Header>
            <Card.Body>
              {sensores.length > 0 ? (
                <div className="sensores-contenedor">
                  {sensores.map(sensor => (
                    <div key={sensor.id} className="sensor-item mb-3 p-3 border rounded">
                      <h5>{sensor.nombre}</h5>
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="sensor-valor">
                          <span className="h3">{sensor.valor}</span> {sensor.unidad}
                        </div>
                        <div className="sensor-timestamp text-muted">
                          Última lectura: {new Date(sensor.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="sensor-estado mt-2">
                        <div className={`estado-indicador ${sensor.estado === 'normal' ? 'bg-success' : sensor.estado === 'advertencia' ? 'bg-warning' : 'bg-danger'}`}></div>
                        <span className="ms-2">{sensor.estado || 'Normal'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert variant="info">
                  No hay sensores configurados para esta parcela.
                  <div className="mt-2">
                    <Button variant="outline-primary" size="sm">Agregar sensores</Button>
                  </div>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DetalleParcela;