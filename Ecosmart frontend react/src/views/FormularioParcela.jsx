import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Alert, Container, Spinner, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaSave, FaTimes, FaSeedling, FaMapMarkedAlt } from 'react-icons/fa';
import './FormularioParcela.css';

const FormularioParcela = ({ parcelaEditar, onClose, API_URL, redirectUrl }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    // Datos de la parcela
    nombre: '',
    ubicacion: '',
    hectareas: '',
    latitud: '',
    longitud: '',
    
    // Datos del cultivo
    tiene_cultivo: false,
    cultivo: {
      nombre: '',
      variedad: '',
      etapa_desarrollo: 'siembra',
      fecha_siembra: '',
      dias_cosecha_estimados: '',
      otro_cultivo: ''
    }
  });
  
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  
  // Lista de cultivos disponibles
  const cultivos = ['Maíz', 'Trigo', 'Soja', 'Girasol', 'Avena', 'Cebada', 'Papa', 'Tomate', 'Lechuga', 'Zanahoria', 'Cebolla'];
  
  // Etapas de desarrollo
  const etapasDesarrollo = [
    'siembra', 'germinacion', 'emergencia', 'crecimiento', 
    'desarrollo vegetativo', 'floracion', 'fructificacion', 
    'maduracion', 'cosecha'
  ];

  // Días estimados de cosecha por cultivo
  const diasCosechaPorCultivo = {
    'Maíz': 120,
    'Trigo': 110,
    'Soja': 100,
    'Tomate': 90,
    'Lechuga': 60,
    'Papa': 95,
    'Zanahoria': 80,
    'Cebolla': 100,
    'Girasol': 130,
    'Avena': 90,
    'Cebada': 85
  };

  // Función para cargar datos del cultivo de la parcela
const cargarDatosCultivo = async (parcelaId) => {
  try {
    const token = localStorage.getItem('ecosmart_token');
    const user = JSON.parse(localStorage.getItem('ecosmart_user') || '{}');
    const response = await fetch(`${API_URL}/parcelas/${parcelaId}/cultivo`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'X-User-Id': user.id
      }
    });
    
    if (response.ok) {
      const datosCultivo = await response.json();
      console.log("🌿 Datos del cultivo cargados para edición:", datosCultivo);
      
      // Actualizar el formulario con los datos del cultivo
      setFormData(prevState => ({
        ...prevState,
        tiene_cultivo: true,
        cultivo: {
          nombre: datosCultivo.nombre || '',
          variedad: datosCultivo.variedad || '',
          etapa_desarrollo: datosCultivo.etapa_desarrollo || 'siembra',
          fecha_siembra: datosCultivo.fecha_siembra ? 
            datosCultivo.fecha_siembra.split('T')[0] : '',
          dias_cosecha_estimados: datosCultivo.dias_cosecha_estimados || '',
          otro_cultivo: ''
        }
      }));
    } else {
      console.log("⚠️ No se encontró cultivo para esta parcela");
    }
  } catch (error) {
    console.log("⚠️ Error al cargar datos del cultivo:", error);
  }
};
  // Inicializar formulario si hay una parcela para editar
// Inicializar formulario si hay una parcela para editar
useEffect(() => {
  if (parcelaEditar) {
    console.log("📝 Cargando datos para edición:", parcelaEditar);
    
    const parcelaFormateada = {
      nombre: parcelaEditar.nombre || '',
      ubicacion: parcelaEditar.ubicacion || '',
      hectareas: parcelaEditar.hectareas || '',
      latitud: parcelaEditar.latitud || '',
      longitud: parcelaEditar.longitud || '',
      tiene_cultivo: !!parcelaEditar.cultivo_actual,
      cultivo: {
        nombre: parcelaEditar.cultivo_actual || '',
        variedad: '',
        etapa_desarrollo: 'crecimiento',
        fecha_siembra: parcelaEditar.fecha_siembra ? 
          parcelaEditar.fecha_siembra.split('T')[0] : '',
        dias_cosecha_estimados: '',
        otro_cultivo: ''
      }
    };
    setFormData(parcelaFormateada);
    
    // CARGAR DATOS DEL CULTIVO DESDE BD
    if (parcelaEditar.id && parcelaEditar.cultivo_actual) {
      cargarDatosCultivo(parcelaEditar.id);
    }
  }
}, [parcelaEditar, API_URL]);
  // Manejar cambios en los inputs del formulario
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'tiene_cultivo') {
      setFormData(prevState => ({
        ...prevState,
        tiene_cultivo: checked,
        cultivo: checked ? prevState.cultivo : {
          nombre: '',
          variedad: '',
          etapa_desarrollo: 'siembra',
          fecha_siembra: '',
          dias_cosecha_estimados: '',
          otro_cultivo: ''
        }
      }));
    } else if (name.startsWith('cultivo.')) {
      const cultivoField = name.split('.')[1];
      setFormData(prevState => ({
        ...prevState,
        cultivo: {
          ...prevState.cultivo,
          [cultivoField]: value,
          // Auto-completar días de cosecha si se selecciona un cultivo conocido
          ...(cultivoField === 'nombre' && diasCosechaPorCultivo[value] ? {
            dias_cosecha_estimados: diasCosechaPorCultivo[value]
          } : {})
        }
      }));
    } else {
      setFormData(prevState => ({
        ...prevState,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  // Enviar el formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');

    try {
      // Validaciones básicas
      if (!formData.nombre.trim()) {
        throw new Error('El nombre de la parcela es obligatorio');
      }
      if (!formData.ubicacion.trim()) {
        throw new Error('La ubicación de la parcela es obligatoria');
      }
      if (parseFloat(formData.hectareas) <= 0) {
        throw new Error('El área de la parcela debe ser un número positivo');
      }

      // Validaciones de cultivo si está habilitado
      if (formData.tiene_cultivo) {
        const cultivoNombre = formData.cultivo.nombre === 'Otro' ? 
          formData.cultivo.otro_cultivo : formData.cultivo.nombre;
        
        if (!cultivoNombre.trim()) {
          throw new Error('Debe especificar el nombre del cultivo');
        }
        if (!formData.cultivo.fecha_siembra) {
          throw new Error('La fecha de siembra es obligatoria cuando hay cultivo');
        }
        if (!formData.cultivo.dias_cosecha_estimados) {
          throw new Error('Los días estimados de cosecha son obligatorios');
        }
      }

      // Preparar datos para enviar
      const parcelaData = {
  nombre: formData.nombre.trim(),
  ubicacion: formData.ubicacion.trim(),
  hectareas: parseFloat(formData.hectareas),
  latitud: formData.latitud ? parseFloat(formData.latitud) : null,
  longitud: formData.longitud ? parseFloat(formData.longitud) : null,
  tiene_cultivo: formData.tiene_cultivo // <-- Asegúrate de enviar esto siempre
};

if (formData.tiene_cultivo) {
  const cultivoNombre = formData.cultivo.nombre === 'Otro' ? 
    formData.cultivo.otro_cultivo.trim() : formData.cultivo.nombre;
  parcelaData.cultivo = {
    nombre: cultivoNombre,
    variedad: formData.cultivo.variedad.trim() || null,
    etapa_desarrollo: formData.cultivo.etapa_desarrollo,
    fecha_siembra: formData.cultivo.fecha_siembra + 'T08:00:00',
    dias_cosecha_estimados: parseInt(formData.cultivo.dias_cosecha_estimados)
  };
}

      console.log('Datos a enviar:', parcelaData);

      const user = JSON.parse(localStorage.getItem('ecosmart_user') || '{}');
      const token = localStorage.getItem('ecosmart_token');
      const headers = {
        'Content-Type': 'application/json',
        'X-User-Id': user.id,
        'X-User-Rol': user.rol,
        'Authorization': `Bearer ${token}`
      };

      let response;
      if (parcelaEditar) {
        response = await axios.put(`${API_URL}/parcelas/${parcelaEditar.id}`, parcelaData, { headers });
      } else {
        response = await axios.post(`${API_URL}/parcelas`, parcelaData, { headers });
      }

      console.log('Respuesta del servidor:', response.data);

      // Redirigir o cerrar según se indique
      if (redirectUrl) {
        navigate(redirectUrl, { 
          state: { 
            successMessage: parcelaEditar ? 'Parcela actualizada exitosamente' : 'Parcela creada exitosamente',
            parcelaCreada: response.data
          }
        });
      } else if (onClose) {
        onClose(response.data);
      }
      
    } catch (err) {
      console.error('Error al guardar parcela:', err);
      
      if (err.response) {
        setError(`Error del servidor: ${err.response.status} - ${err.response.data?.error || err.message}`);
      } else if (err.request) {
        setError('No se pudo conectar con el servidor. Verifique su conexión.');
      } else {
        setError(err.message || 'Error al guardar la parcela. Intente nuevamente.');
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Container className="formulario-parcela">
      <div className="formulario-header">
        <h2>
          <FaMapMarkedAlt className="me-2" />
          {parcelaEditar ? 'Editar Parcela' : 'Nueva Parcela'}
        </h2>
      </div>
      
      {error && (
        <Alert variant="danger" className="mt-3" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      <Form onSubmit={handleSubmit}>
        {/* DATOS DE LA PARCELA */}
        <Card className="mb-4">
          <Card.Header>
            <h5 className="mb-0">📍 Información de la Parcela</h5>
          </Card.Header>
          <Card.Body>
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
                  <Form.Label>Ubicación *</Form.Label>
                  <Form.Control
                    type="text"
                    name="ubicacion"
                    value={formData.ubicacion}
                    onChange={handleChange}
                    required
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
                min="0.01"
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
                  <Form.Label>Latitud</Form.Label>
                  <Form.Control
                    type="number"
                    step="any"
                    name="latitud"
                    min="-90"
                    max="90"
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
                    type="number"
                    step="any"
                    name="longitud"
                    min="-180"
                    max="180"
                    value={formData.longitud}
                    onChange={handleChange}
                    placeholder="Ej: -71.64525"
                    className="rounded-pill border-success"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* DATOS DEL CULTIVO */}
        <Card className="mb-4">
          <Card.Header>
            <h5 className="mb-0">
              <FaSeedling className="me-2" />
              Información del Cultivo
            </h5>
          </Card.Header>
          <Card.Body>
            <Form.Group className="mb-3 checkbox-cultivo-visible">
              <Form.Check
                type="checkbox"
                name="tiene_cultivo"
                checked={formData.tiene_cultivo}
                onChange={handleChange}
                label="Esta parcela tiene un cultivo activo"
                className="fs-6"
              />
            </Form.Group>

            {formData.tiene_cultivo && (
              <>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tipo de cultivo *</Form.Label>
                      <Form.Select
                        name="cultivo.nombre"
                        value={formData.cultivo.nombre}
                        onChange={handleChange}
                        required
                        className="rounded-pill border-success"
                      >
                        <option value="">Seleccione un cultivo</option>
                        {cultivos.map((cultivo, idx) => (
                          <option key={idx} value={cultivo}>{cultivo}</option>
                        ))}
                        <option value="Otro">Otro</option>
                      </Form.Select>
                      
                      {formData.cultivo.nombre === "Otro" && (
                        <Form.Control
                          type="text"
                          name="cultivo.otro_cultivo"
                          value={formData.cultivo.otro_cultivo}
                          onChange={handleChange}
                          placeholder="Especifique el cultivo"
                          className="mt-2 rounded-pill border-success"
                          required
                        />
                      )}
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Variedad</Form.Label>
                      <Form.Control
                        type="text"
                        name="cultivo.variedad"
                        value={formData.cultivo.variedad}
                        onChange={handleChange}
                        placeholder="Ej: Cherry, Amarillo Duro"
                        className="rounded-pill border-success"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Etapa de desarrollo *</Form.Label>
                      <Form.Select
                        name="cultivo.etapa_desarrollo"
                        value={formData.cultivo.etapa_desarrollo}
                        onChange={handleChange}
                        required
                        className="rounded-pill border-success"
                      >
                        {etapasDesarrollo.map((etapa, idx) => (
                          <option key={idx} value={etapa}>
                            {etapa.charAt(0).toUpperCase() + etapa.slice(1)}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Fecha de siembra *</Form.Label>
                      <Form.Control
                        type="date"
                        name="cultivo.fecha_siembra"
                        value={formData.cultivo.fecha_siembra}
                        onChange={handleChange}
                        required
                        className="rounded-pill border-success"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Días estimados para cosecha *</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    max="365"
                    name="cultivo.dias_cosecha_estimados"
                    value={formData.cultivo.dias_cosecha_estimados}
                    onChange={handleChange}
                    placeholder="Ej: 90"
                    className="rounded-pill border-success"
                    required
                  />
                  <Form.Text className="text-muted">
                    Se auto-completa según el tipo de cultivo seleccionado
                  </Form.Text>
                </Form.Group>
              </>
            )}
          </Card.Body>
        </Card>
        
    <div className="formulario-botones mt-4">
  <Button
    variant="outline-secondary"
    onClick={() => {
      // LÓGICA INTELIGENTE PARA CANCELAR
      if (onClose) {
        // Si hay función onClose (modal), usarla
        onClose();
      } else if (redirectUrl) {
        // Si hay redirectUrl, navegar ahí
        navigate(redirectUrl);
      } else {
        // Por defecto, volver a parcelas
        navigate('/dashboard/agronomo/parcelas');
      }
    }}
    disabled={guardando}
    className="me-2 rounded-pill btn-cancelar"
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
        <FaSave className="me-2" /> 
        {parcelaEditar ? 'Actualizar parcela' : (formData.tiene_cultivo ? 'Crear parcela con cultivo' : 'Crear parcela')}
      </>
    )}
  </Button>
</div>
      </Form>
    </Container>
  );
};

export default FormularioParcela;