import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Alert, Container, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaSave, FaTimes } from 'react-icons/fa';
import './FormularioParcela.css';

const FormularioParcela = ({ parcelaEditar, onClose, API_URL, redirectUrl }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: '',
    ubicacion: '',
    hectareas: '',
    cultivo_actual: '',
    fecha_siembra: '',
    latitud: '',
    longitud: ''
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [cultivos, setCultivos] = useState(['Maíz', 'Trigo', 'Soja', 'Girasol', 'Avena', 'Cebada', 'Papa', 'Tomate', 'Lechuga', 'Otro']);
  
  // Inicializar formulario si hay una parcela para editar
  useEffect(() => {
    if (parcelaEditar) {
      // Asegurarse de que todos los campos esperados estén inicializados
      const parcelaFormateada = {
        nombre: parcelaEditar.nombre || '',
        ubicacion: parcelaEditar.ubicacion || '',
        hectareas: parcelaEditar.hectareas || '',
        cultivo_actual: parcelaEditar.cultivo_actual || '',
        fecha_siembra: parcelaEditar.fecha_siembra || '',
        latitud: parcelaEditar.latitud || '',
        longitud: parcelaEditar.longitud || ''
      };
      setFormData(parcelaFormateada);
    }
  }, [parcelaEditar]);

  // Manejar cambios en los inputs del formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  // Enviar el formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    
    try {
      // Validar datos
      if (!formData.nombre) {
        throw new Error('El nombre de la parcela es obligatorio');
      }
      
      // Formar datos a enviar
      const parcela = {
        ...formData,
        // Asegurarse de que hectareas sea un número
        hectareas: formData.hectareas ? parseFloat(formData.hectareas) : 0
      };
      
      let response;
      
      // Si es edición, hacer PUT, si es nueva, hacer POST
      if (parcelaEditar) {
        response = await axios.put(`${API_URL}/parcelas/${parcelaEditar.id}`, parcela);
      } else {
        response = await axios.post(`${API_URL}/parcelas`, parcela);
      }
      
      console.log('Parcela guardada:', response.data);
      
      // Redirigir o cerrar según se indique
      if (redirectUrl) {
        navigate(redirectUrl, { 
          state: { 
            successMessage: parcelaEditar ? 'Parcela actualizada exitosamente' : 'Parcela creada exitosamente' 
          }
        });
      } else if (onClose) {
        onClose();
      }
      
    } catch (err) {
      console.error('Error al guardar parcela:', err);
      setError(err.message || 'Error al guardar la parcela. Intente nuevamente.');
      setGuardando(false); // Importante: resetear el estado de guardando en caso de error
    } finally {
      // Asegurarse de que siempre se resetee el estado de guardando, incluso si hay navegación
      setTimeout(() => {
        setGuardando(false);
      }, 500); // Un pequeño retraso para evitar cambios de estado durante la navegación
    }
  };

  return (
    <Container className="formulario-parcela">
      <div className="formulario-header">
        <h2>{parcelaEditar ? 'Editar Parcela' : 'Nueva Parcela'}</h2>
      </div>
      
      {error && (
        <Alert variant="danger" className="mt-3" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      <Form onSubmit={handleSubmit}>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Nombre de la parcela *</Form.Label>
              <Form.Control
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                placeholder="Ej: Parcela Norte"
              />
            </Form.Group>
          </Col>
          
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Ubicación</Form.Label>
              <Form.Control
                type="text"
                name="ubicacion"
                value={formData.ubicacion}
                onChange={handleChange}
                placeholder="Ej: Talca, las rastras"
              />
            </Form.Group>
          </Col>
        </Row>
        
        <Form.Group className="mb-3">
          <Form.Label>Área (hectáreas) *</Form.Label>
          <Form.Control
            type="number"
            step="0.01"
            min="0"
            name="hectareas"
            value={formData.hectareas}
            onChange={handleChange}
            required
            placeholder="Ej: 5.5"
          />
        </Form.Group>
        
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Cultivo actual</Form.Label>
              <Form.Select
                name="cultivo_actual"
                value={formData.cultivo_actual}
                onChange={handleChange}
              >
                <option value="">Seleccione un cultivo</option>
                {cultivos.map((cultivo, idx) => (
                  <option key={idx} value={cultivo}>{cultivo}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Fecha de siembra</Form.Label>
              <Form.Control
                type="date"
                name="fecha_siembra"
                value={formData.fecha_siembra}
                onChange={handleChange}
              />
              <Form.Text className="text-muted">
                Deje en blanco si no hay fecha de siembra
              </Form.Text>
            </Form.Group>
          </Col>
        </Row>
        
        <div className="coordenadas-section mt-4">
          <h5>Coordenadas geográficas</h5>
          
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Latitud</Form.Label>
                <Form.Control
                  type="text"
                  name="latitud"
                  value={formData.latitud}
                  onChange={handleChange}
                  placeholder="Ej: -35.423296"
                />
              </Form.Group>
            </Col>
            
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Longitud</Form.Label>
                <Form.Control
                  type="text"
                  name="longitud"
                  value={formData.longitud}
                  onChange={handleChange}
                  placeholder="Ej: -71.64525"
                />
              </Form.Group>
            </Col>
          </Row>
          
          <div className="coordenadas-ayuda">
            <p>Para obtener las coordenadas exactas de su parcela:</p>
            <ol>
              <li>Abra <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a></li>
              <li>Ubique su parcela y haga clic derecho sobre ella</li>
              <li>Seleccione la opción "¿Qué hay aquí?"</li>
              <li>Aparecerá una tarjeta en la parte inferior con las coordenadas exactas</li>
              <li>Copie estos números: el primero es la latitud y el segundo es la longitud</li>
            </ol>
          </div>
        </div>
        
        <div className="formulario-botones mt-4">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={guardando}
            className="me-2"
          >
            <FaTimes className="me-2" /> Cancelar
          </Button>
          
          <Button
            variant="success"
            type="submit"
            disabled={guardando}
          >
            {guardando ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Guardando...
              </>
            ) : (
              <>
                <FaSave className="me-2" /> Guardar parcela
              </>
            )}
          </Button>
        </div>
      </Form>
    </Container>
  );
};

export default FormularioParcela;