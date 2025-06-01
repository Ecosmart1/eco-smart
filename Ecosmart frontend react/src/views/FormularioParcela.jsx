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
    otro_cultivo: '',
    fecha_siembra: '',
    latitud: '',
    longitud: ''
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  // Eliminar "Otro" de la lista principal para evitar duplicados
  const [cultivos, setCultivos] = useState(['Maíz', 'Trigo', 'Soja', 'Girasol', 'Avena', 'Cebada', 'Papa', 'Tomate', 'Lechuga']);
  
  // Inicializar formulario si hay una parcela para editar
  useEffect(() => {
    if (parcelaEditar) {
      // Asegurarse de que todos los campos esperados estén inicializados
      let cultivoActual = parcelaEditar.cultivo_actual || '';
      let otroCultivo = '';
      
      // Verificar si el cultivo actual no está en la lista predefinida
      if (cultivoActual && !cultivos.includes(cultivoActual)) {
        otroCultivo = cultivoActual;
        cultivoActual = 'Otro';
      }
      
      const parcelaFormateada = {
        nombre: parcelaEditar.nombre || '',
        ubicacion: parcelaEditar.ubicacion || '',
        hectareas: parcelaEditar.hectareas || '',
        cultivo_actual: cultivoActual,
        otro_cultivo: otroCultivo,
        fecha_siembra: parcelaEditar.fecha_siembra || '',
        latitud: parcelaEditar.latitud || '',
        longitud: parcelaEditar.longitud || ''
      };
      setFormData(parcelaFormateada);
    }
  }, [parcelaEditar, cultivos]);

  // Manejar cambios en los inputs del formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "cultivo_actual") {
      setFormData(prevState => ({
        ...prevState,
        [name]: value,
        // Limpiar el campo otro_cultivo si no se selecciona "Otro"
        otro_cultivo: value === "Otro" ? prevState.otro_cultivo : ''
      }));
    } else {
      setFormData(prevState => ({
        ...prevState,
        [name]: value
      }));
    }
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
      // validacion de hectareas
      if(parseFloat(formData.hectareas) < 0){
        throw new Error('El área de la parcela debe ser un número positivo');
      }
      // validacion de ubicacion
      if (!formData.ubicacion) {
        throw new Error('La ubicación de la parcela es obligatoria');
      }
      // validacion de latitud y longitud
      if (formData.latitud && isNaN(parseFloat(formData.latitud))) {
        throw new Error('La latitud debe ser un número válido');
      }
      if (formData.longitud && isNaN(parseFloat(formData.longitud))) {
        throw new Error('La longitud debe ser un número válido');
      }

      // Crear copia para no modificar el estado directamente
      const parcelaData = {...formData};
      
      // Procesar el campo de cultivo personalizado
      if (formData.cultivo_actual === "Otro") {
        if (!formData.otro_cultivo.trim()) {
          throw new Error('Debe especificar el cultivo cuando selecciona "Otro"');
        }
        parcelaData.cultivo_actual = formData.otro_cultivo.trim();
      }
      
      // Eliminar campo auxiliar que no debe enviarse al servidor
      delete parcelaData.otro_cultivo;
      
      // Formar datos a enviar
      const parcela = {
        ...parcelaData,
        // Asegurarse de que hectareas sea un número
        hectareas: parcelaData.hectareas ? parseFloat(parcelaData.hectareas) : 0
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
      
      // Mostrar mensaje de error más detallado
      if (err.response) {
        setError(`Error del servidor: ${err.response.status} - ${err.response.data?.message || err.message}`);
      } else if (err.request) {
        setError('No se pudo conectar con el servidor. Verifique su conexión.');
      } else {
        setError(err.message || 'Error al guardar la parcela. Intente nuevamente.');
      }
      
      setGuardando(false);
    } finally {
      // Asegurarse de que siempre se resetee el estado de guardando, incluso si hay navegación
      setTimeout(() => {
        setGuardando(false);
      }, 500);
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
                className="rounded-pill border-success"
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
                className="rounded-pill border-success"
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
            className="rounded-pill border-success"
          />
        </Form.Group>
        
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Cultivo actual</Form.Label>
              <div className="cultivo-selector">
                <Form.Select
                  name="cultivo_actual"
                  value={formData.cultivo_actual}
                  onChange={handleChange}
                  className="rounded-pill border-success"
                >
                  <option value="">Seleccione un cultivo</option>
                  // sin cultivo
                  <option value="Sin cultivo">Sin cultivo</option>
                  {cultivos.map((cultivo, idx) => (
                    <option key={idx} value={cultivo}>{cultivo}</option>
                  ))}
                  <option value="Otro">Otro</option>
                </Form.Select>
                
                {formData.cultivo_actual === "Otro" && (
                  <Form.Control
                    type="text"
                    name="otro_cultivo"
                    value={formData.otro_cultivo || ''}
                    onChange={handleChange}
                    placeholder="Especifique el cultivo"
                    className="mt-2 rounded-pill border-success"
                  />
                )}
              </div>
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
                className="rounded-pill border-success"
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
                  className="rounded-pill border-success"
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
                  className="rounded-pill border-success"
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
          variant="outline-secondary"  // Cambiar "secondary" a "outline-secondary"
          onClick={onClose}
          disabled={guardando}
          className="me-2 rounded-pill btn-cancelar" // Añadir la clase btn-cancelar
        >
          <FaTimes className="me-2" /> Cancelar
        </Button>
          
          <Button
            variant="success"
            type="submit"
            disabled={guardando}
            className="rounded-pill"
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