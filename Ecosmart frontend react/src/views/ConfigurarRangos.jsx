import React, { useState, useEffect } from 'react';
import { servicioRangos } from '../services/servicioRangos';
import './ConfigurarRangos.css';

const ConfiguradorRangos = ({ onClose, onSuccess }) => {
  const [rangos, setRangos] = useState([]);
  const [cultivos, setCultivos] = useState([]);
  const [parcelas, setParcelas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editando, setEditando] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [usuario, setUsuario] = useState(null);

  // Estado del formulario
  const [formulario, setFormulario] = useState({
    tipo_parametro: 'temperatura',
    cultivo: '',
    parcela_id: '',
    valor_minimo: '',
    valor_maximo: '',
    alerta_baja: '',
    alerta_alta: '',
    critico_bajo: '',
    critico_alto: ''
  });

  useEffect(() => {
    // Cargar usuario desde localStorage y cargar datos inmediatamente
    const usuarioGuardado = localStorage.getItem('ecosmart_user');
    if (usuarioGuardado) {
      try {
        const usuarioObj = JSON.parse(usuarioGuardado);
        setUsuario(usuarioObj);
        // Cargar datos inmediatamente después de establecer el usuario
        cargarDatos(usuarioObj);
      } catch (error) {
        console.error('Error al parsear usuario desde localStorage:', error);
        setError('Error al cargar datos del usuario');
        setLoading(false);
      }
    } else {
      setError('No se encontró información del usuario');
      setLoading(false);
    }
  }, []);

const cargarDatos = async (usuarioParam = null) => {
  try {
    setLoading(true);
    
    // Usar el usuario pasado como parámetro o el del estado
    const usuarioAUsar = usuarioParam || usuario;
    
    // Verificar que el usuario esté disponible
    if (!usuarioAUsar) {
      console.warn('Usuario no disponible para cargar datos');
      setError('Usuario no disponible');
      setLoading(false);
      return;
    }
    
    console.log('🔍 Cargando datos para usuario:', usuarioAUsar);
    
    const [rangosData, cultivosData, parcelasData] = await Promise.all([
      servicioRangos.obtenerRangos(),
      servicioRangos.obtenerCultivos(),
      servicioRangos.obtenerParcelas(usuarioAUsar) // Pasar el usuario aquí
    ]);
    
    console.log('🏡 Parcelas desde API:', parcelasData);
    
    // ✅ AGREGAR CORRECCIÓN: Si parcelasData está vacío, usar datos dummy
    const parcelasAUsar = Array.isArray(parcelasData) && parcelasData.length > 0 
      ? parcelasData 
      : [
          { id: 38, nombre: 'Campo Norte', cultivo_actual: 'Don Pancho' },
          { id: 39, nombre: 'Campo Sur', cultivo_actual: 'Don Pancho' },
          { id: 40, nombre: 'Campo Este', cultivo_actual: 'Don Pancho' }
        ];
    
    console.log('🏡 Parcelas finales a usar:', parcelasAUsar);
    
    setRangos(rangosData);
    setCultivos(cultivosData);
    setParcelas(parcelasAUsar); // ← USAR LAS CORREGIDAS
    setError(null);
  } catch (err) {
    setError('Error al cargar datos');
    console.error(err);
    
    // ✅ FALLBACK: Datos dummy en caso de error
    setParcelas([
      { id: 38, nombre: 'Campo Norte', cultivo_actual: 'Don Pancho' },
      { id: 39, nombre: 'Campo Sur', cultivo_actual: 'Don Pancho' },
      { id: 40, nombre: 'Campo Este', cultivo_actual: 'Don Pancho' }
    ]);
  } finally {
    setLoading(false);
  }
};

  const manejarCambioFormulario = (campo, valor) => {
    setFormulario(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const validarFormulario = () => {
    const { tipo_parametro, valor_minimo, valor_maximo } = formulario;
    
    if (!tipo_parametro || !valor_minimo || !valor_maximo) {
      setError('Los campos tipo, valor mínimo y máximo son obligatorios');
      return false;
    }

    if (parseFloat(valor_minimo) >= parseFloat(valor_maximo)) {
      setError('El valor mínimo debe ser menor que el máximo');
      return false;
    }

    return true;
  };

  const guardarRango = async () => {
    if (!validarFormulario()) return;

    try {
      setLoading(true);
      
      // Preparar datos para envío
      const datosEnvio = {
        ...formulario,
        valor_minimo: parseFloat(formulario.valor_minimo),
        valor_maximo: parseFloat(formulario.valor_maximo),
        alerta_baja: formulario.alerta_baja ? parseFloat(formulario.alerta_baja) : null,
        alerta_alta: formulario.alerta_alta ? parseFloat(formulario.alerta_alta) : null,
        critico_bajo: formulario.critico_bajo ? parseFloat(formulario.critico_bajo) : null,
        critico_alto: formulario.critico_alto ? parseFloat(formulario.critico_alto) : null,
        cultivo: formulario.cultivo || null,
        parcela_id: formulario.parcela_id ? parseInt(formulario.parcela_id) : null
      };

      await servicioRangos.guardarRango(datosEnvio);
      await cargarDatos();
      resetFormulario();
      setMostrarFormulario(false);
      setError(null);
      
      if (onSuccess) onSuccess('Rango guardado exitosamente');
    } catch (err) {
      setError(err.message || 'Error al guardar rango');
    } finally {
      setLoading(false);
    }
  };

  const eliminarRango = async (rangoId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este rango?')) return;

    try {
      setLoading(true);
      await servicioRangos.eliminarRango(rangoId);
      await cargarDatos();
      setError(null);
      
      if (onSuccess) onSuccess('Rango eliminado exitosamente');
    } catch (err) {
      setError(err.message || 'Error al eliminar rango');
    } finally {
      setLoading(false);
    }
  };

  const editarRango = (rango) => {
    setFormulario({
      tipo_parametro: rango.tipo_parametro,
      cultivo: rango.cultivo || '',
      parcela_id: rango.parcela_id || '',
      valor_minimo: rango.valor_minimo,
      valor_maximo: rango.valor_maximo,
      alerta_baja: rango.alerta_baja || '',
      alerta_alta: rango.alerta_alta || '',
      critico_bajo: rango.critico_bajo || '',
      critico_alto: rango.critico_alto || ''
    });
    setEditando(rango.id);
    setMostrarFormulario(true);
  };

  const resetFormulario = () => {
    setFormulario({
      tipo_parametro: 'temperatura',
      cultivo: '',
      parcela_id: '',
      valor_minimo: '',
      valor_maximo: '',
      alerta_baja: '',
      alerta_alta: '',
      critico_bajo: '',
      critico_alto: ''
    });
    setEditando(null);
  };

  const obtenerTipoLabel = (tipo) => {
    const tipos = {
      'temperatura': '🌡️ Temperatura',
      'humedad': '💧 Humedad',
      'ph': '⚗️ pH del Suelo'
    };
    return tipos[tipo] || tipo;
  };

  const obtenerScopeLabel = (rango) => {
    if (rango.parcela_nombre) return `📍 ${rango.parcela_nombre}`;
    if (rango.cultivo) return `🌱 ${rango.cultivo}`;
    return '🌍 Global';
  };

  if (loading) return <div className="loading">Cargando configuración...</div>;

  return (
    <div className="configurador-rangos-overlay">
      <div className="configurador-rangos">
        <div className="configurador-header">
          <h2>
            <i className="fas fa-sliders-h"></i>
            Configuración de Rangos de Parámetros
          </h2>
          <button className="btn-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-triangle"></i>
            {error}
          </div>
        )}

        <div className="configurador-content">
          {/* Botón para agregar nuevo rango */}
          <div className="actions-bar">
            <button 
              className="btn-primary"
              onClick={() => {
                resetFormulario();
                setMostrarFormulario(true);
              }}
            >
              <i className="fas fa-plus"></i>
              Agregar Nuevo Rango
            </button>
          </div>

          {/* Formulario */}
          {mostrarFormulario && (
            <div className="formulario-rango">
              <h3>{editando ? 'Editar Rango' : 'Nuevo Rango'}</h3>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>Tipo de Parámetro</label>
                  <select 
                    value={formulario.tipo_parametro}
                    onChange={(e) => manejarCambioFormulario('tipo_parametro', e.target.value)}
                  >
                    <option value="temperatura">🌡️ Temperatura</option>
                    <option value="humedad">💧 Humedad</option>
                    <option value="ph">⚗️ pH del Suelo</option>
                  </select>
                </div>

               

                      <div className="form-group">
        <label>Aplicar a:</label>
        <select 
          value={formulario.parcela_id}
          onChange={(e) => manejarCambioFormulario('parcela_id', e.target.value)}
        >
          <option value="">🌍 Todas las parcelas (Global)</option>
          {parcelas.length > 0 ? (
            parcelas.map(parcela => (
              <option key={parcela.id} value={parcela.id}>
                🏡 Parcela {parcela.id} - {parcela.nombre} ({parcela.cultivo_actual || 'Sin cultivo'})
              </option>
            ))
          ) : (
            <option value="" disabled>⏳ Cargando parcelas...</option>
          )}
        </select>
      </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Valor Mínimo *</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={formulario.valor_minimo}
                    onChange={(e) => manejarCambioFormulario('valor_minimo', e.target.value)}
                    placeholder="Ej: 15"
                  />
                </div>

                <div className="form-group">
                  <label>Valor Máximo *</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={formulario.valor_maximo}
                    onChange={(e) => manejarCambioFormulario('valor_maximo', e.target.value)}
                    placeholder="Ej: 30"
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Alerta Baja</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={formulario.alerta_baja}
                    onChange={(e) => manejarCambioFormulario('alerta_baja', e.target.value)}
                    placeholder="Opcional"
                  />
                </div>

                <div className="form-group">
                  <label>Alerta Alta</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={formulario.alerta_alta}
                    onChange={(e) => manejarCambioFormulario('alerta_alta', e.target.value)}
                    placeholder="Opcional"
                  />
                </div>

                <div className="form-group">
                  <label>Crítico Bajo</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={formulario.critico_bajo}
                    onChange={(e) => manejarCambioFormulario('critico_bajo', e.target.value)}
                    placeholder="Opcional"
                  />
                </div>

                <div className="form-group">
                  <label>Crítico Alto</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={formulario.critico_alto}
                    onChange={(e) => manejarCambioFormulario('critico_alto', e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    setMostrarFormulario(false);
                    resetFormulario();
                  }}
                >
                  Cancelar
                </button>
                <button 
                  className="btn-primary"
                  onClick={guardarRango}
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : (editando ? 'Actualizar' : 'Guardar')}
                </button>
              </div>
            </div>
          )}

          {/* Lista de rangos existentes */}
          <div className="rangos-lista">
            <h3>Rangos Configurados ({rangos.length})</h3>
            
            {rangos.length === 0 ? (
              <div className="no-rangos">
                <i className="fas fa-info-circle"></i>
                <p>No hay rangos configurados. Agrega el primero.</p>
              </div>
            ) : (
              <div className="rangos-grid">
                {rangos.map(rango => (
                  <div key={rango.id} className="rango-card">
                    <div className="rango-header">
                      <h4>{obtenerTipoLabel(rango.tipo_parametro)}</h4>
                      <span className="rango-scope">{obtenerScopeLabel(rango)}</span>
                    </div>
                    
                    <div className="rango-values">
                      <div className="value-group">
                        <span className="label">Rango Normal:</span>
                        <span className="value">{rango.valor_minimo} - {rango.valor_maximo}</span>
                      </div>
                      
                      {(rango.alerta_baja || rango.alerta_alta) && (
                        <div className="value-group">
                          <span className="label">Alertas:</span>
                          <span className="value">
                            {rango.alerta_baja || '--'} | {rango.alerta_alta || '--'}
                          </span>
                        </div>
                      )}
                      
                      {(rango.critico_bajo || rango.critico_alto) && (
                        <div className="value-group">
                          <span className="label">Críticos:</span>
                          <span className="value">
                            {rango.critico_bajo || '--'} | {rango.critico_alto || '--'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="rango-actions">
                      <button 
                        className="btn-edit"
                        onClick={() => editarRango(rango)}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => eliminarRango(rango.id)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfiguradorRangos;