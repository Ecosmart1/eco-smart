import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';
import Table from 'react-bootstrap/Table';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { FaArrowLeft, FaEdit, FaTrash, FaSeedling } from 'react-icons/fa';
import L from 'leaflet';
import './DetalleParcela.css';
import MeteorologiaWidget from './MeteorologiaWidget';
import { Icon } from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import servicioMeteo from '../services/servicioMeteo';
import servicioRecomendaciones from '../services/servicioRecomendaciones';

// Corregir el ícono de Leaflet
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

const API_URL = "http://localhost:5000/api";

const DetalleParcela = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [parcela, setParcela] = useState(null);
  const [sensores, setSensores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState('');
  const [pronostico, setPronostico] = useState([]);
  const [recomendacionClima, setRecomendacionClima] = useState('');
  const [cargandoRecomendacion, setCargandoRecomendacion] = useState(false);

  // Obtener el rol del usuario al montar el componente
  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('ecosmart_user');
    if (usuarioGuardado) {
      try {
        const usuario = JSON.parse(usuarioGuardado);
        setUserRole(usuario.rol || '');
      } catch (err) {
        console.error('Error al parsear datos de usuario:', err);
      }
    }
  }, []);

  // Función para determinar la ruta base según el rol del usuario
  const getBaseRoute = () => {
    if (userRole === 'agronomo') {
      return '/dashboard/agronomo';
    } else if (userRole === 'agricultor') {
      return '/dashboard/agricultor';
    } else if (userRole === 'tecnico') {
      return '/dashboard/agronomo'; // Los técnicos usan la misma ruta que los agrónomos
    } else {
      // Si no hay rol definido, usar la ruta actual
      const currentPath = window.location.pathname;
      if (currentPath.includes('/dashboard/agronomo')) {
        return '/dashboard/agronomo';
      } else if (currentPath.includes('/dashboard/agricultor')) {
        return '/dashboard/agricultor';
      } else {
        // Valor predeterminado si no se puede determinar
        return '/dashboard';
      }
    }
  };

  useEffect(() => {
    const fetchParcelaData = async () => {
      try {
        setLoading(true);
        const user = JSON.parse(localStorage.getItem('ecosmart_user') || '{}');
        // Obtener datos de la parcela
        const response = await axios.get(`${API_URL}/parcelas/${id}`, {
          headers: { 'X-User-Id': user.id }
        });
        setParcela(response.data);
        
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
        navigate(`${getBaseRoute()}/parcelas`);
      } catch (err) {
        console.error('Error al eliminar parcela:', err);
        setError('Error al eliminar la parcela. Intente nuevamente más tarde.');
      }
    }
  };
  
  // Obtener pronóstico de 5 días al cargar la parcela
  useEffect(() => {
    const cargarPronostico = async () => {
      if (parcela && parcela.latitud && parcela.longitud) {
        try {
          const datos = await servicioMeteo.obtenerPronostico(parcela.latitud, parcela.longitud);
          setPronostico(datos.pronostico || []);
        } catch (err) {
          setPronostico([]);
        }
      }
    };
    cargarPronostico();
  }, [parcela]);

  // Usar endpoint Flask para recomendaciones basadas en clima
  useEffect(() => {
    const obtenerRecomendacionClima = async () => {
      if (pronostico.length > 0 && parcela) {
        setCargandoRecomendacion(true);
        try {
          // Llama directamente al endpoint Flask que creaste
          const response = await axios.post(
            `${API_URL}/asistente/recomendar`,
            {
              parcela: {
                id: parcela.id,
                nombre: parcela.nombre,
                cultivo: parcela.cultivo_actual,
                ubicacion: parcela.ubicacion,
                latitud: parcela.latitud,
                longitud: parcela.longitud,
                hectareas: parcela.hectareas,
                fecha_siembra: parcela.fecha_siembra
              },
              pronostico: pronostico
            }
          );
          const recomendaciones = response.data?.recomendaciones;
          setRecomendacionClima(
            Array.isArray(recomendaciones)
              ? recomendaciones
              : [recomendaciones || 'No se pudo obtener recomendación de la IA.']
          );
        } catch (err) {
          setRecomendacionClima(['No se pudo obtener recomendación de la IA.']);
        } finally {
          setCargandoRecomendacion(false);
        }
      }
    };
    obtenerRecomendacionClima();
  }, [pronostico, parcela, API_URL]);

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
            <Button variant="primary" onClick={() => navigate(`${getBaseRoute()}/parcelas`)}>
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
          onClick={() => navigate(`${getBaseRoute()}/parcelas`)}
          className="d-flex align-items-center"
        >
          <FaArrowLeft className="me-2" /> Volver a parcelas
        </Button>
        
        <div>
          <Button 
            variant="warning" 
            className="me-2"
            onClick={() => navigate(`${getBaseRoute()}/parcelas/editar/${id}`)}
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

      {userRole === 'agronomo' && (
        <div style={{ marginBottom: 18, marginTop: -18, color: '#22963e', fontWeight: 500, fontSize: '1.08em' }}>
          Dueño: {parcela.usuario_nombre ? parcela.usuario_nombre : 'Sin asignar'}
          {parcela.usuario_email && (
            <span style={{ color: '#888', fontSize: '0.95em' }}> ({parcela.usuario_email})</span>
          )}
        </div>
      )}
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
                  {/* Mostrar dueño y detalles de cultivo solo para agrónomo */}
                  {userRole === 'agronomo' && (
                    <>
                      <tr>
                        <td><strong>Etapa:</strong></td>
                        <td>{parcela.cultivo && parcela.cultivo.etapa_desarrollo}</td>
                      </tr>
                    
                      <tr>
                        <td><strong>Variedad:</strong></td>
                        <td>{parcela.variedad || (parcela.cultivo && parcela.cultivo.variedad) || '-'}</td>
                      </tr>
                      <tr>
                        <td><strong>Edad:</strong></td>
                        <td>{parcela.cultivo && parcela.cultivo.edad_dias ? `${parcela.cultivo.edad_dias} días` : (parcela.edad || '-')}</td>
                      </tr>
                      <tr>
                        <td><strong>Coordenadas:</strong></td>
                        <td>{parcela.latitud && parcela.longitud ? `${parcela.latitud}, ${parcela.longitud}` : '-'}</td>
                      </tr>
                      <tr>
                        <td><strong>Hectáreas:</strong></td>
                        <td>{parcela.hectareas ? `${parcela.hectareas} ha` : '-'}</td>
                      </tr>
                      <tr>
                        <td><strong>Fecha de creación parcela:</strong></td>
                        <td>
                          {parcela.fecha_creacion
                            ? (typeof parcela.fecha_creacion === 'string'
                                ? new Date(parcela.fecha_creacion).toLocaleDateString()
                                : new Date(parcela.fecha_creacion).toLocaleDateString())
                            : '-'}
                        </td>
                      </tr>
                      
                      
                      <tr>
                        <td><strong>Progreso cosecha:</strong></td>
                        <td>{parcela.cultivo && parcela.cultivo.progreso_cosecha}%</td>
                      </tr>
                    </>
                  )}
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
              ubicacion={
                parcela.latitud && parcela.longitud &&
                !isNaN(Number(parcela.latitud)) && !isNaN(Number(parcela.longitud))
                  ? { lat: Number(String(parcela.latitud).replace(',', '.')), lon: Number(String(parcela.longitud).replace(',', '.')) }
                  : parcela.ubicacion // fallback a string ciudad
              }
            />
          </div>
          {/* Recomendaciones en formato caja */}
          <Card className="mb-4 shadow-sm">
            <Card.Header className="bg-warning text-dark">
              <h4 className="mb-0">Recomendaciones</h4>
            </Card.Header>
            <Card.Body>
              {cargandoRecomendacion ? (
                <p>Consultando IA...</p>
              ) : (
                Array.isArray(recomendacionClima) && recomendacionClima.length > 0 ? (
                  <ul style={{ paddingLeft: 20 }}>
                    {recomendacionClima.map((rec, idx) => (
                      <li key={idx} style={{ marginBottom: 8 }}>{rec}</li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    {typeof recomendacionClima === 'string'
                      ? recomendacionClima
                      : 'Analizando el pronóstico...'}
                  </p>
                )
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DetalleParcela;