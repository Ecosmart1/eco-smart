import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './AjusteParametros.css';
import SensorService from '../services/serviciossensores';

function AjusteParametros() {
  const [parametros, setParametros] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const cargarParametros = async () => {
      const params = await SensorService.obtenerParametros();
      setParametros(params);
    };
    
    cargarParametros();
  }, []);

  const handleChange = (categoria, subcategoria, valor) => {
    setParametros(prevParams => {
      // Copia profunda para prevenir modificación directa del estado
      const nuevoParams = JSON.parse(JSON.stringify(prevParams));
      
      if (subcategoria) {
        nuevoParams[categoria][subcategoria] = parseFloat(valor);
      } else {
        nuevoParams[categoria] = parseFloat(valor);
      }
      
      return nuevoParams;
    });
  };

  const handleNutrienteChange = (nutriente, tipo, valor) => {
    setParametros(prevParams => {
      const nuevoParams = JSON.parse(JSON.stringify(prevParams));
      nuevoParams.nutrientes[nutriente][tipo] = parseFloat(valor);
      return nuevoParams;
    });
  };

  const handleSimulacionChange = (campo, valor) => {
    setParametros(prevParams => {
      const nuevoParams = JSON.parse(JSON.stringify(prevParams));
      nuevoParams.simulacion[campo] = parseFloat(valor);
      return nuevoParams;
    });
  };

  const guardarCambios = async () => {
    setGuardando(true);
    setMensaje('');
    
    try {
      const resultado = await SensorService.guardarParametros(parametros);
      if (resultado) {
        setMensaje('Parámetros guardados correctamente');
      } else {
        setMensaje('Error al guardar los parámetros');
      }
    } catch (error) {
      setMensaje(`Error: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  };

  if (!parametros) {
    return <div className="loading">Cargando parámetros...</div>;
  }

  return (
    <div className="ajuste-parametros-container">
      <h2>Ajuste de Parámetros</h2>
      
      <div className="panel-parametros">
        <h3>Parámetros de Sensores</h3>
        
        <div className="seccion-parametro">
          <h4>Temperatura (°C)</h4>
          <div className="rango-parametro">
            <div className="ajuste-campo">
              <label>Mínimo:</label>
              <input 
                type="number" 
                value={parametros.temperatura.min}
                onChange={(e) => handleChange('temperatura', 'min', e.target.value)}
                step="0.1"
              />
            </div>
            <div className="ajuste-campo">
              <label>Máximo:</label>
              <input 
                type="number" 
                value={parametros.temperatura.max}
                onChange={(e) => handleChange('temperatura', 'max', e.target.value)}
                step="0.1"
              />
            </div>
            <div className="ajuste-campo">
              <label>Variación:</label>
              <input 
                type="number" 
                value={parametros.temperatura.variacion}
                onChange={(e) => handleChange('temperatura', 'variacion', e.target.value)}
                step="0.1"
                min="0.1"
              />
            </div>
          </div>
        </div>
        
        <div className="seccion-parametro">
          <h4>Humedad del Suelo (%)</h4>
          <div className="rango-parametro">
            <div className="ajuste-campo">
              <label>Mínimo:</label>
              <input 
                type="number" 
                value={parametros.humedadSuelo.min}
                onChange={(e) => handleChange('humedadSuelo', 'min', e.target.value)}
                step="1"
                min="0"
                max="100"
              />
            </div>
            <div className="ajuste-campo">
              <label>Máximo:</label>
              <input 
                type="number" 
                value={parametros.humedadSuelo.max}
                onChange={(e) => handleChange('humedadSuelo', 'max', e.target.value)}
                step="1"
                min="0"
                max="100"
              />
            </div>
            <div className="ajuste-campo">
              <label>Variación:</label>
              <input 
                type="number" 
                value={parametros.humedadSuelo.variacion}
                onChange={(e) => handleChange('humedadSuelo', 'variacion', e.target.value)}
                step="0.1"
                min="0.1"
              />
            </div>
          </div>
        </div>
        
        <div className="seccion-parametro">
          <h4>pH del Suelo</h4>
          <div className="rango-parametro">
            <div className="ajuste-campo">
              <label>Mínimo:</label>
              <input 
                type="number" 
                value={parametros.phSuelo.min}
                onChange={(e) => handleChange('phSuelo', 'min', e.target.value)}
                step="0.1"
                min="0"
                max="14"
              />
            </div>
            <div className="ajuste-campo">
              <label>Máximo:</label>
              <input 
                type="number" 
                value={parametros.phSuelo.max}
                onChange={(e) => handleChange('phSuelo', 'max', e.target.value)}
                step="0.1"
                min="0"
                max="14"
              />
            </div>
            <div className="ajuste-campo">
              <label>Variación:</label>
              <input 
                type="number" 
                value={parametros.phSuelo.variacion}
                onChange={(e) => handleChange('phSuelo', 'variacion', e.target.value)}
                step="0.01"
                min="0.01"
              />
            </div>
          </div>
        </div>
        
        {/* Nueva sección para nutrientes separados */}
        <div className="seccion-parametro">
          <h4>Nutrientes (mg/L)</h4>
          
          <div className="nutriente-ajuste">
            <h5>Nitrógeno</h5>
            <div className="rango-parametro">
              <div className="ajuste-campo">
                <label>Mínimo:</label>
                <input 
                  type="number" 
                  value={parametros.nutrientes.nitrogeno.min}
                  onChange={(e) => handleNutrienteChange('nitrogeno', 'min', e.target.value)}
                  step="1"
                  min="0"
                />
              </div>
              <div className="ajuste-campo">
                <label>Máximo:</label>
                <input 
                  type="number" 
                  value={parametros.nutrientes.nitrogeno.max}
                  onChange={(e) => handleNutrienteChange('nitrogeno', 'max', e.target.value)}
                  step="1"
                  min="0"
                />
              </div>
            </div>
          </div>
          
          <div className="nutriente-ajuste">
            <h5>Fósforo</h5>
            <div className="rango-parametro">
              <div className="ajuste-campo">
                <label>Mínimo:</label>
                <input 
                  type="number" 
                  value={parametros.nutrientes.fosforo.min}
                  onChange={(e) => handleNutrienteChange('fosforo', 'min', e.target.value)}
                  step="1"
                  min="0"
                />
              </div>
              <div className="ajuste-campo">
                <label>Máximo:</label>
                <input 
                  type="number" 
                  value={parametros.nutrientes.fosforo.max}
                  onChange={(e) => handleNutrienteChange('fosforo', 'max', e.target.value)}
                  step="1"
                  min="0"
                />
              </div>
            </div>
          </div>
          
          <div className="nutriente-ajuste">
            <h5>Potasio</h5>
            <div className="rango-parametro">
              <div className="ajuste-campo">
                <label>Mínimo:</label>
                <input 
                  type="number" 
                  value={parametros.nutrientes.potasio.min}
                  onChange={(e) => handleNutrienteChange('potasio', 'min', e.target.value)}
                  step="1"
                  min="0"
                />
              </div>
              <div className="ajuste-campo">
                <label>Máximo:</label>
                <input 
                  type="number" 
                  value={parametros.nutrientes.potasio.max}
                  onChange={(e) => handleNutrienteChange('potasio', 'max', e.target.value)}
                  step="1"
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="seccion-parametro">
          <h4>Configuración de Simulación</h4>
          <div className="rango-parametro">
            <div className="ajuste-campo">
              <label>Intervalo (segundos):</label>
              <input 
                type="number" 
                value={parametros.simulacion.intervalo}
                onChange={(e) => handleSimulacionChange('intervalo', e.target.value)}
                step="1"
                min="1"
              />
            </div>
            <div className="ajuste-campo">
              <label>Duración (minutos):</label>
              <input 
                type="number" 
                value={parametros.simulacion.duracion}
                onChange={(e) => handleSimulacionChange('duracion', e.target.value)}
                step="1"
                min="1"
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="botones-accion">
        <button onClick={guardarCambios} disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar Cambios'}
        </button>
        <Link to="/sensores" className="boton-volver">Volver a Sensores</Link>
      </div>
      
      {mensaje && <div className="mensaje">{mensaje}</div>}
    </div>
  );
}

export default AjusteParametros;