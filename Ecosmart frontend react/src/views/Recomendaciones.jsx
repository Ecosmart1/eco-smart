import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import servicioRecomendaciones from '../services/servicioRecomendaciones';
import './Recomendaciones.css';

const RecomendacionesPage = () => {
  const [recomendaciones, setRecomendaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [filtroCultivo, setFiltroCultivo] = useState('');
  const [filtroParcela, setFiltroParcela] = useState('');
  const [ordenarPor, setOrdenarPor] = useState('parcela');
  const [maxCaracteres, setMaxCaracteres] = useState(200);
  const [cultivos, setCultivos] = useState([]);
  const [parcelas, setParcelas] = useState([]);

  // Cargar recomendaciones
  const cargarRecomendaciones = async (forzarActualizacion = false) => {
    setError(null);
    setCargando(true);
    try {
      const datos = await servicioRecomendaciones.obtenerRecomendaciones(forzarActualizacion, maxCaracteres);
      setRecomendaciones(datos);
      
      // Extraer listas únicas de cultivos y parcelas para los filtros
      const cultivosUnicos = [...new Set(datos.map(r => r.cultivo))].filter(Boolean);
      const parcelasUnicas = [...new Set(datos.map(r => r.parcela))].filter(Boolean);
      setCultivos(cultivosUnicos);
      setParcelas(parcelasUnicas);
    } catch (err) {
      console.error("Error al cargar recomendaciones:", err);
      setError("No se pudieron cargar las recomendaciones. Por favor, inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarRecomendaciones();
  }, []);

  // Cargar datos cuando cambia maxCaracteres
  useEffect(() => {
    cargarRecomendaciones(false);
  }, [maxCaracteres]);

  // Filtrar y ordenar recomendaciones
  const recomendacionesFiltradas = recomendaciones
    .filter(rec => !filtroCultivo || rec.cultivo.toLowerCase().includes(filtroCultivo.toLowerCase()))
    .filter(rec => !filtroParcela || rec.parcela.toLowerCase().includes(filtroParcela.toLowerCase()))
    .sort((a, b) => {
      if (ordenarPor === 'parcela') {
        return a.parcela.localeCompare(b.parcela);
      } else if (ordenarPor === 'cultivo') {
        return a.cultivo.localeCompare(b.cultivo);
      }
      return 0;
    });

  // Agrupar por parcela para mostrar en secciones
  const recomendacionesAgrupadas = {};
  recomendacionesFiltradas.forEach(rec => {
    if (!recomendacionesAgrupadas[rec.parcela]) {
      recomendacionesAgrupadas[rec.parcela] = [];
    }
    recomendacionesAgrupadas[rec.parcela].push(rec);
  });

  // Determinar icono según contenido de la recomendación
  const obtenerIcono = (recomendacion) => {
    const texto = recomendacion.toLowerCase();
    if (texto.includes('riego') || texto.includes('humedad') || texto.includes('agua')) {
      return 'fa-tint';
    } else if (texto.includes('fertiliz') || texto.includes('nutrient')) {
      return 'fa-leaf';
    } else if (texto.includes('plaga') || texto.includes('insect')) {
      return 'fa-bug';
    } else if (texto.includes('temperatura') || texto.includes('clima') || texto.includes('calor')) {
      return 'fa-thermometer-half';
    } else if (texto.includes('ph') || texto.includes('suelo') || texto.includes('acidez')) {
      return 'fa-flask';
    }
    return 'fa-seedling';
  };

  return (
    <div className="recomendaciones-page">
      <header className="recomendaciones-header">
        <div className="header-content">
          <h1>Recomendaciones para cultivos</h1>
          <p>Sistema de recomendaciones basadas en datos de sensores y condiciones agrícolas</p>
        </div>
        <div className="header-actions">
          <button 
            className={`btn-refresh ${cargando ? 'loading' : ''}`}
            onClick={() => cargarRecomendaciones(true)}
            disabled={cargando}
          >
            <i className={`fas ${cargando ? 'fa-spinner fa-spin' : 'fa-sync'}`}></i>
            {cargando ? ' Actualizando...' : ' Actualizar recomendaciones'}
          </button>
          <Link to="/dashboard/agronomo" className="btn-back">
            <i className="fas fa-arrow-left"></i> Volver al dashboard
          </Link>
        </div>
      </header>

      <div className="recomendaciones-controles">
        <div className="filtros-grupo">
          <div className="filtro">
            <label>Filtrar por cultivo:</label>
            <select 
              value={filtroCultivo} 
              onChange={(e) => setFiltroCultivo(e.target.value)}
            >
              <option value="">Todos los cultivos</option>
              {cultivos.map(cultivo => (
                <option key={cultivo} value={cultivo}>{cultivo}</option>
              ))}
            </select>
          </div>
          
          <div className="filtro">
            <label>Filtrar por parcela:</label>
            <select 
              value={filtroParcela} 
              onChange={(e) => setFiltroParcela(e.target.value)}
            >
              <option value="">Todas las parcelas</option>
              {parcelas.map(parcela => (
                <option key={parcela} value={parcela}>{parcela}</option>
              ))}
            </select>
          </div>
          
          <div className="filtro">
            <label>Ordenar por:</label>
            <select 
              value={ordenarPor} 
              onChange={(e) => setOrdenarPor(e.target.value)}
            >
              <option value="parcela">Parcela</option>
              <option value="cultivo">Cultivo</option>
            </select>
          </div>
        </div>
        
        <div className="opciones-grupo">
          <div className="opcion">
            <label>Longitud máxima: {maxCaracteres} caracteres</label>
            <input 
              type="range" 
              min="100" 
              max="500" 
              step="50" 
              value={maxCaracteres} 
              onChange={(e) => setMaxCaracteres(parseInt(e.target.value))}
            />
          </div>
        </div>
      </div>
      
      {error && (
        <div className="error-mensaje">
          <i className="fas fa-exclamation-triangle"></i>
          <span>{error}</span>
          <button onClick={() => cargarRecomendaciones(true)}>Reintentar</button>
        </div>
      )}
      
      {cargando && !recomendaciones.length ? (
        <div className="cargando-contenedor">
          <i className="fas fa-spinner fa-spin"></i>
          <span>Cargando recomendaciones...</span>
        </div>
      ) : (
        <>
          {ordenarPor === 'parcela' ? (
            // Vista agrupada por parcela
            Object.entries(recomendacionesAgrupadas).map(([parcela, recsGrupo]) => (
              <div className="grupo-parcela" key={parcela}>
                <div className="parcela-header">
                  <h2>{parcela}</h2>
                  <span className="parcela-stats">
                    {recsGrupo.length} recomendaciones • 
                    Cultivos: {[...new Set(recsGrupo.map(r => r.cultivo))].join(', ')}
                  </span>
                </div>
                
                <div className="recomendaciones-grid">
                  {recsGrupo.map((rec, index) => (
                    <div className="recomendacion-card" key={rec.id || index}>
                      <div className="recomendacion-icono">
                        <i className={`fas ${obtenerIcono(rec.recomendacion)}`}></i>
                      </div>
                      <div className="recomendacion-contenido">
                        <div className="recomendacion-cabecera">
                          <h3>{rec.cultivo}</h3>
                          <span className="recomendacion-fecha">
                            {rec.fecha ? new Date(rec.fecha).toLocaleDateString() : 'Fecha no disponible'}
                          </span>
                        </div>
                        <p className="recomendacion-texto">{rec.recomendacion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Vista de lista plana ordenada por cultivo
            <div className="recomendaciones-lista">
              {recomendacionesFiltradas.map((rec, index) => (
                <div className="recomendacion-item" key={rec.id || index}>
                  <div className="recomendacion-icono">
                    <i className={`fas ${obtenerIcono(rec.recomendacion)}`}></i>
                  </div>
                  <div className="recomendacion-contenido">
                    <div className="recomendacion-cabecera">
                      <h3>{rec.cultivo}</h3>
                      <span className="recomendacion-parcela">{rec.parcela}</span>
                    </div>
                    <p className="recomendacion-texto">{rec.recomendacion}</p>
                    <div className="recomendacion-footer">
                      <span className="recomendacion-fecha">
                        {rec.fecha ? new Date(rec.fecha).toLocaleDateString() : 'Fecha no disponible'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {recomendacionesFiltradas.length === 0 && (
            <div className="sin-resultados">
              <i className="fas fa-info-circle"></i>
              <p>No se encontraron recomendaciones con los filtros aplicados.</p>
              {(filtroCultivo || filtroParcela) && (
                <button onClick={() => {
                  setFiltroCultivo('');
                  setFiltroParcela('');
                }}>Limpiar filtros</button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RecomendacionesPage;