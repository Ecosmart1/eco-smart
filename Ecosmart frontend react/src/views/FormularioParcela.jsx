import React, { useState } from 'react';
import './FormularioParcela.css';

const FormularioParcela = ({ onClose, onGuardar, parcelaEditar = null }) => {
  const [parcela, setParcela] = useState(parcelaEditar || {
    nombre: '',
    ubicacion: '',
    hectareas: '',
    cultivo_actual: '',
    fecha_siembra: '',
    latitud: '',
    longitud: ''
  });

  const [errores, setErrores] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setParcela(prevState => ({
      ...prevState,
      [name]: value
    }));

    if (errores[name]) {
      setErrores(prevErrors => ({
        ...prevErrors,
        [name]: null
      }));
    }
  };

  const validarFormulario = () => {
    const nuevosErrores = {};
    if (!parcela.nombre.trim()) nuevosErrores.nombre = "El nombre es obligatorio";
    if (!parcela.hectareas) nuevosErrores.hectareas = "El área es obligatoria";
    else if (isNaN(parcela.hectareas) || parcela.hectareas <= 0)
      nuevosErrores.hectareas = "El área debe ser un número positivo";

    if (parcela.latitud && (isNaN(parcela.latitud) || parcela.latitud < -90 || parcela.latitud > 90))
      nuevosErrores.latitud = "La latitud debe ser un número entre -90 y 90";

    if (parcela.longitud && (isNaN(parcela.longitud) || parcela.longitud < -180 || parcela.longitud > 180))
      nuevosErrores.longitud = "La longitud debe ser un número entre -180 y 180";

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    const parcelaFinal = {
      ...parcela,
      hectareas: parseFloat(parcela.hectareas),
      latitud: parcela.latitud ? parseFloat(parcela.latitud) : null,
      longitud: parcela.longitud ? parseFloat(parcela.longitud) : null
    };

    onGuardar(parcelaFinal);
  };

  return (
    <div className="parcela-form-overlay">
      <div className="parcela-form-container">
        <div className="parcela-form-header">
          <h2>{parcelaEditar ? 'Editar Parcela' : 'Nueva Parcela'}</h2>
          <button className="btn-cerrar" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="parcela-form">
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
            {/*agregar más campos aquí */}
          </div>

          <div className="form-row">
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
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="fecha_siembra">Fecha de siembra</label>
              <input
                type="date"
                id="fecha_siembra"
                name="fecha_siembra"
                value={parcela.fecha_siembra || ''}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Coordenadas geográficas</h3>
            <div className="form-row">
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
            <div className="coordenadas-info">
              <p>Puede encontrar las coordenadas en Google Maps haciendo clic derecho sobre su parcela.</p>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancelar" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-guardar">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormularioParcela;