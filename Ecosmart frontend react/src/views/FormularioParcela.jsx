import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './FormularioParcela.css';
import { getAuthHeaders } from '../services/serviciorutas'; // Asegúrate de importar la función getAuthHeaders

/**
 * Componente FormularioParcela
 * Permite crear o editar una parcela agrícola
 * 
 * @param {function} onClose - Función para cerrar el formulario
 * @param {function} onGuardar - Función para guardar la parcela (compatibilidad)
 * @param {object} parcelaEditar - Datos de una parcela existente para editar
 * @param {string} API_URL - URL base de la API
 * @param {string} redirectUrl - URL a la que redirigir después de guardar
 */
const FormularioParcela = ({ onClose, onGuardar, parcelaEditar = null, API_URL, redirectUrl = '/dashboard/agricultor/parcelas' }) => {
  const navigate = useNavigate();
  
  // Estado principal para los datos de la parcela
  const [parcela, setParcela] = useState(parcelaEditar || {
    nombre: '',
    ubicacion: '',
    hectareas: '',
    cultivo_actual: '',
    fecha_siembra: '',
    latitud: '',
    longitud: ''
  });

  // Estados adicionales para manejar el formulario
  const [errores, setErrores] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false); // Control de envío
  const [otrosCultivos, setOtrosCultivos] = useState(''); // Para la opción "Otro" en cultivos
  const [mostrarInputCultivo, setMostrarInputCultivo] = useState(false); // Mostrar campo para cultivo personalizado
// Detectar cultivos personalizados cuando se carga una parcela para editar
useEffect(() => {
  if (parcelaEditar && parcelaEditar.cultivo_actual) {
    // Lista de cultivos predefinidos
    const cultivosPredefinidos = [
      "Maíz", "Trigo", "Soja", "Arroz", "Papa", 
      "Tomate", "Uva", "Manzana", "Café", "Sin cultivo actual"
    ];
    
    // Si el cultivo actual no está en la lista predefinida, activar el input personalizado
    if (!cultivosPredefinidos.includes(parcelaEditar.cultivo_actual)) {
      setMostrarInputCultivo(true);
      setOtrosCultivos(parcelaEditar.cultivo_actual);
    }
  }
}, [parcelaEditar]);
  /**
   * Maneja los cambios en los campos del formulario
   * Contiene lógica especial para el caso del cultivo "Otro"
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Manejo especial para cultivo_actual
    if (name === 'cultivo_actual') {
      if (value === 'Otro') {
        setMostrarInputCultivo(true);
        // No actualizamos el valor del cultivo_actual todavía
      } else {
        setMostrarInputCultivo(false);
        setParcela(prevState => ({
          ...prevState,
          [name]: value
        }));
      }
    } else {
      // Para el resto de campos, actualización normal
      setParcela(prevState => ({
        ...prevState,
        [name]: value
      }));
    }

    // Limpiar errores al modificar un campo
    if (errores[name]) {
      setErrores(prevErrors => ({
        ...prevErrors,
        [name]: null
      }));
    }
  };

  /**
   * Maneja los cambios en el input de "otros cultivos"
   * Actualiza tanto el estado local como el valor en parcela
   */
  const handleOtrosCultivosChange = (e) => {
    const value = e.target.value;
    setOtrosCultivos(value);
    setParcela(prevState => ({
      ...prevState,
      cultivo_actual: value
    }));
  };

  /**
   * Valida el formulario antes de enviar
   * @returns {boolean} - true si el formulario es válido
   */
  const validarFormulario = () => {
    const nuevosErrores = {};
    
    // Validación del nombre
    if (!parcela.nombre.trim()) 
      nuevosErrores.nombre = "El nombre es obligatorio";
    
    // Validación del área
    if (!parcela.hectareas) 
      nuevosErrores.hectareas = "El área es obligatoria";
    else if (isNaN(parcela.hectareas) || parcela.hectareas <= 0)
      nuevosErrores.hectareas = "El área debe ser un número positivo";

    // Validación de coordenadas geográficas
    if (parcela.latitud && (isNaN(parcela.latitud) || parcela.latitud < -90 || parcela.latitud > 90))
      nuevosErrores.latitud = "La latitud debe ser un número entre -90 y 90";

    if (parcela.longitud && (isNaN(parcela.longitud) || parcela.longitud < -180 || parcela.longitud > 180))
      nuevosErrores.longitud = "La longitud debe ser un número entre -180 y 180";

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  /**
   * Maneja el cierre del formulario
   * Utiliza onClose si está disponible, o navega a la ruta indicada
   */
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(redirectUrl || '/dashboard/agricultor/parcelas');
    }
  }

  /**
   * Maneja el envío del formulario
   * Valida, prepara los datos y realiza la petición a la API
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    setIsSubmitting(true);

    // Convertir valores numéricos
    const parcelaFinal = {
      ...parcela,
      hectareas: parseFloat(parcela.hectareas),
      latitud: parcela.latitud ? parseFloat(parcela.latitud) : null,
      longitud: parcela.longitud ? parseFloat(parcela.longitud) : null
    };

    try {
      // Usar onGuardar si está disponible (compatibilidad)
      if (onGuardar) {
        onGuardar(parcelaFinal, true);
        return;
      }
      
      // Determinar si es creación o actualización
      if (parcelaEditar && parcelaEditar.id) {
  // Actualizar parcela existente
  await fetch(`${API_URL}/parcelas/${parcelaEditar.id}`, {
    method: 'PUT',
    headers: getAuthHeaders(), // Usar la función de autenticación
    body: JSON.stringify(parcelaFinal)
  });
  
  // ...
} else {
  // Crear nueva parcela
  await fetch(`${API_URL}/parcelas`, {
    method: 'POST',
    headers: getAuthHeaders(), // Usar la función de autenticación
    body: JSON.stringify(parcelaFinal)
  });
        
        // Redirigir con mensaje de éxito
        navigate(redirectUrl, {
          state: { successMessage: '¡Parcela creada exitosamente!' }
        });
      }
    } catch (error) {
      console.error('Error al guardar la parcela:', error);
      setErrores({ 
        general: 'Ocurrió un error al guardar la parcela. Por favor, intente nuevamente.' 
      });
      setIsSubmitting(false);
    }
  };

  // Renderizado del componente
  return (
    <div className="parcela-form-overlay">
      <div className="parcela-form-container">
        {/* Cabecera del formulario */}
        <div className="parcela-form-header">
          <h2>{parcelaEditar ? 'Editar Parcela' : 'Nueva Parcela'}</h2>
          <button className="btn-cerrar" onClick={handleClose}>×</button>
        </div>

        {/* Formulario principal */}
        <form onSubmit={handleSubmit} className="parcela-form">
          {/* Mensaje de error general */}
          {errores.general && (
            <div className="error-general">
              {errores.general}
            </div>
          )}
          
          {/* Campo: Nombre de la parcela */}
          <div className="form-group">
            <label htmlFor="nombre">Nombre de la parcela *</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={parcela.nombre}
              onChange={handleChange}
              className={errores.nombre ? 'input-error' : ''}
            />
            {errores.nombre && <span className="error-message">{errores.nombre}</span>}
          </div>

          {/* Campo: Ubicación */}
          <div className="form-group">
            <label htmlFor="ubicacion">Ubicación</label>
            <input
              type="text"
              id="ubicacion"
              name="ubicacion"
              value={parcela.ubicacion}
              onChange={handleChange}
              placeholder="Ej: Sector Norte, Valle Central"
            />
          </div>

          {/* Campo: Área (hectáreas) */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="hectareas">Área (hectáreas) *</label>
              <input
                type="number"
                id="hectareas"
                name="hectareas"
                step="0.01"
                min="0"
                value={parcela.hectareas}
                onChange={handleChange}
                className={errores.hectareas ? 'input-error' : ''}
              />
              {errores.hectareas && <span className="error-message">{errores.hectareas}</span>}
            </div>
          </div>

          {/* Fila: Cultivo actual y Fecha de siembra */}
          <div className="form-row">
            {/* Campo: Cultivo actual */}
            <div className="form-group">
              <label htmlFor="cultivo_actual">Cultivo actual</label>
              <select
                id="cultivo_actual"
                name="cultivo_actual"
                value={parcela.cultivo_actual}
                onChange={handleChange}
              >
                <option value="">Seleccione un cultivo</option>
                <option value="Maíz">Maíz</option>
                <option value="Trigo">Trigo</option>
                <option value="Soja">Soja</option>
                <option value="Arroz">Arroz</option>
                <option value="Papa">Papa</option>
                <option value="Tomate">Tomate</option>
                <option value="Uva">Uva</option>
                <option value="Manzana">Manzana</option>
                <option value="Café">Café</option>
                <option value="Sin cultivo actual">Sin cultivo actual</option>
                <option value="Otro">Otro...</option>
              </select>
              
              {/* Campo para "Otro" cultivo (aparece condicionalmente) */}
              {mostrarInputCultivo && (
                <input
                  type='text'
                  placeholder='Especifique el cultivo'
                  value={otrosCultivos}
                  onChange={handleOtrosCultivosChange}
                  className='input-otro-cultivo'
                  style={{width: '100%', padding: '8px'}}
                />
              )}
            </div>

            {/* Campo: Fecha de siembra */}
            <div className="form-group">
              <label htmlFor="fecha_siembra">Fecha de siembra</label>
              <input
                type="date"
                id="fecha_siembra"
                name="fecha_siembra"
                value={parcela.fecha_siembra || ''}
                onChange={handleChange}
              />
              <small style={{ marginTop: '5px', display: 'block', color: '#666' }}>
                Deje en blanco si no hay fecha de siembra
              </small>
            </div>
          </div>

          {/* Sección de coordenadas geográficas */}
          <div className="form-section">
            <h3>Coordenadas geográficas</h3>
            <div className="form-row">
              {/* Campo: Latitud */}
              <div className="form-group">
                <label htmlFor="latitud">Latitud</label>
                <input
                  type="number"
                  id="latitud"
                  name="latitud"
                  step="0.000001"
                  value={parcela.latitud}
                  onChange={handleChange}
                  placeholder="Ej: -33.447487"
                  className={errores.latitud ? 'input-error' : ''}
                />
                {errores.latitud && <span className="error-message">{errores.latitud}</span>}
              </div>
              
              {/* Campo: Longitud */}
              <div className="form-group">
                <label htmlFor="longitud">Longitud</label>
                <input
                  type="number"
                  id="longitud"
                  name="longitud"
                  step="0.000001"
                  value={parcela.longitud}
                  onChange={handleChange}
                  placeholder="Ej: -70.673676"
                  className={errores.longitud ? 'input-error' : ''}
                />
                {errores.longitud && <span className="error-message">{errores.longitud}</span>}
              </div>
            </div>
            {/* Instrucciones específicas sobre "¿Qué hay aquí?" */}
                <div className="coordenadas-info">
                  <p>Para obtener las coordenadas exactas de su parcela:</p>
                  <ol style={{ paddingLeft: '20px', margin: '5px 0' }}>
                    <li>Abra <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#4CAF50' }}>Google Maps</a></li>
                    <li>Ubique su parcela y haga clic derecho sobre ella</li>
                    <li>Seleccione la opción "¿Qué hay aquí?"</li>
                    <li>Aparecerá una tarjeta en la parte inferior con las coordenadas exactas</li>
                    <li>Copie estos números: el primero es la latitud y el segundo es la longitud</li>
                  </ol>
                </div>
          </div>

          {/* Botones de acción */}
          <div className="form-actions">
            <button 
              type="button" 
              className="btn-cancelar" 
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-guardar"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormularioParcela;