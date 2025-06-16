import React, { useState, useEffect } from 'react';
import { servicioAnomalias } from '../services/servicioAnomalias';
import './DetectorAnomalias.css';
import ConfiguradorRangos from './ConfigurarRangos';

const DetectorAnomalias = ({ parcelaId = null, mostrarResumen = false }) => {
  const [anomalias, setAnomalias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [filtroSeveridad, setFiltroSeveridad] = useState('todas');
  const [mostrarConfigurador, setMostrarConfigurador] = useState(false);

  useEffect(() => {
    cargarAnomalias();
  }, [parcelaId]);

  const cargarAnomalias = async () => {
    try {
      setLoading(true);
      const data = await servicioAnomalias.obtenerAnomalias(parcelaId);
      setAnomalias(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar anomalías');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 🔧 FUNCIONES DE ELIMINACIÓN CORREGIDAS
  const eliminarAnomalia = async (anomaliaId, event = null) => {
  // Prevenir propagación del evento si existe
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  console.log('🗑️ Intentando eliminar anomalía ID:', anomaliaId);
  
  if (!window.confirm('¿Estás seguro de eliminar esta anomalía?')) {
    return;
  }
  
  try {
    setLoading(true);
    console.log('📤 Enviando petición DELETE...');
    
    const resultado = await servicioAnomalias.eliminarAnomalia(anomaliaId);
    console.log('✅ Resultado:', resultado);
    
    // Recargar anomalías
    await cargarAnomalias();
    setError(null);
    
    console.log('🔄 Anomalías recargadas');
  } catch (err) {
    console.error('❌ Error eliminando anomalía:', err);
    setError(`Error al eliminar anomalía: ${err.message}`);
  } finally {
    setLoading(false);
  }
};

  const limpiarTodas = async (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log('🧹 Intentando limpiar todas las anomalías');
    
    if (!window.confirm('¿Eliminar TODAS las anomalías? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      setLoading(true);
      console.log('📤 Enviando petición para limpiar todas...');
      
      const resultado = await servicioAnomalias.limpiarTodasAnomalias();
      console.log('✅ Resultado:', resultado);
      
      await cargarAnomalias();
      setError(null);
      
      console.log('🔄 Todas las anomalías eliminadas');
    } catch (err) {
      console.error('❌ Error limpiando anomalías:', err);
      setError(`Error al limpiar anomalías: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getSeveridadColor = (severidad) => {
    switch (severidad) {
      case 'alto': return '#f44336';
      case 'medio': return '#ff9800';
      default: return '#4caf50';
    }
  };

  const getSeveridadIcon = (tipo) => {
    switch (tipo) {
      case 'temperatura': return 'fas fa-thermometer-half';
      case 'ph del suelo': return 'fas fa-flask';
      case 'humedad': return 'fas fa-tint';
      case 'nutrientes': return 'fas fa-leaf';
      default: return 'fas fa-exclamation-triangle';
    }
  };

  const formatearFecha = (fechaStr) => {
    try {
      const fecha = new Date(fechaStr);
      return fecha.toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return fechaStr;
    }
  };

  const anomaliasFiltradas = anomalias.filter(anomalia => {
    if (filtroSeveridad === 'todas') return true;
    return anomalia.severidad === filtroSeveridad;
  });

  // Componente Modal de Detalles CORREGIDO
  const ModalDetalles = () => (
    <div className="modal-overlay" onClick={() => setMostrarModal(false)}>
      <div className="modal-anomalias" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className="fas fa-exclamation-triangle"></i>
            Anomalías Detectadas ({anomaliasFiltradas.length})
          </h3>
          <div className="modal-header-actions">
            <button 
              className="btn-config-modal"
              onClick={(e) => {
                e.stopPropagation();
                setMostrarConfigurador(true);
              }}
              title="Configurar rangos de parámetros"
            >
              <i className="fas fa-cog"></i>
              Configurar Rangos
            </button>
            
            {anomalias.length > 0 && (
              <button 
                className="btn-clear-all"
                onClick={limpiarTodas}
                title="Eliminar todas las anomalías"
              >
                <i className="fas fa-broom"></i>
                Limpiar Todas
              </button>
            )}
            
            <button 
              className="btn-close"
              onClick={() => setMostrarModal(false)}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div className="modal-filtros">
          <button 
            className={`btn-filtro ${filtroSeveridad === 'todas' ? 'active' : ''}`}
            onClick={() => setFiltroSeveridad('todas')}
          >
            Todas ({anomalias.length})
          </button>
          <button 
            className={`btn-filtro ${filtroSeveridad === 'alto' ? 'active' : ''}`}
            onClick={() => setFiltroSeveridad('alto')}
          >
            Críticas ({anomalias.filter(a => a.severidad === 'alto').length})
          </button>
          <button 
            className={`btn-filtro ${filtroSeveridad === 'medio' ? 'active' : ''}`}
            onClick={() => setFiltroSeveridad('medio')}
          >
            Moderadas ({anomalias.filter(a => a.severidad === 'medio').length})
          </button>
        </div>

        <div className="modal-content">
          {loading && (
            <div className="loading-overlay">
              <div className="loading-spinner">Procesando...</div>
            </div>
          )}
          
          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-triangle"></i>
              {error}
              <button onClick={() => setError(null)}>×</button>
            </div>
          )}
          
          {anomaliasFiltradas.length === 0 ? (
            <div className="no-anomalias-filtradas">
              <i className="fas fa-search"></i>
              <p>No hay anomalías con este filtro</p>
            </div>
          ) : (
            <div className="anomalias-lista-modal">
              {anomaliasFiltradas.map(anomalia => (
                <div 
                  key={anomalia.id} 
                  className={`anomalia-item-modal severidad-${anomalia.severidad}`}
                >
                  <div className="anomalia-icon-modal">
                    <i 
                      className={getSeveridadIcon(anomalia.tipo)}
                      style={{ color: getSeveridadColor(anomalia.severidad) }}
                    ></i>
                  </div>
                  
                  <div className="anomalia-contenido">
                    

<div className="anomalia-titulo">
  <strong>{anomalia.mensaje}</strong>
  <div className="anomalia-actions">
    <span 
      className={`badge-severidad-modal ${anomalia.severidad}`}
      style={{ backgroundColor: getSeveridadColor(anomalia.severidad) }}
    >
      {anomalia.severidad.toUpperCase()}
    </span>
    
    {/* BOTÓN DE PRUEBA TEMPORAL */}
    <div 
      onClick={(e) => {
        console.log('🚨 CLICK EN DIV DETECTADO!');
        console.log('🚨 ID:', anomalia.id);
        e.preventDefault();
        e.stopPropagation();
        eliminarAnomalia(anomalia.id);
      }}
      style={{
        background: '#ff4444',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
        userSelect: 'none',
        zIndex: 9999,
        position: 'relative'
      }}
      title="ELIMINAR ANOMALÍA"
    >
      🗑️ ELIMINAR
    </div>
  </div>
</div>
                    
                    <div className="anomalia-detalles-modal">
                      <div className="detalle-row">
                        <span className="detalle-label">📊 Valor actual:</span>
                        <span className="detalle-valor">{anomalia.valor}</span>
                      </div>
                      <div className="detalle-row">
                        <span className="detalle-label">🎯 Rango esperado:</span>
                        <span className="detalle-valor">{anomalia.valor_esperado}</span>
                      </div>
                      <div className="detalle-row">
                        <span className="detalle-label">🏡 Parcela:</span>
                        <span className="detalle-valor">{anomalia.parcela_nombre}</span>
                      </div>
                      <div className="detalle-row">
                        <span className="detalle-label">⏰ Detectado:</span>
                        <span className="detalle-valor">{formatearFecha(anomalia.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading && anomalias.length === 0) return <div className="loading">Cargando anomalías...</div>;

  // Vista resumen para dashboard
  if (mostrarResumen) {
    const anomaliasAltas = anomalias.filter(a => a.severidad === 'alto').length;
    const anomaliasMedias = anomalias.filter(a => a.severidad === 'medio').length;

    return (
      <>
        <div className="anomalias-resumen clickeable" onClick={() => setMostrarModal(true)}>
          <h4>
            Anomalías Detectadas 
            <i className="fas fa-external-link-alt detalle-icon"></i>
          </h4>
          
          <div className="resumen-stats">
            <div className="stat-item critico">
              <i className="fas fa-exclamation-triangle"></i>
              <span>{anomaliasAltas} Críticas</span>
            </div>
            <div className="stat-item moderado">
              <i className="fas fa-exclamation-circle"></i>
              <span>{anomaliasMedias} Moderadas</span>
            </div>
            <div className="stat-item total">
              <i className="fas fa-chart-line"></i>
              <span>{anomalias.length} Total</span>
            </div>
          </div>
          
          <div className="click-hint">
            <i className="fas fa-mouse-pointer"></i>
            Clic para ver detalles
          </div>
        </div>
        
        {mostrarModal && <ModalDetalles />}
        
        {mostrarConfigurador && (
          <ConfiguradorRangos
            onClose={() => setMostrarConfigurador(false)}
            onSuccess={(mensaje) => {
              setMostrarConfigurador(false);
              console.log(mensaje);
              cargarAnomalias();
            }}
          />
        )}
      </>
    );
  }

  // Vista completa
  return (
    <>
      <div className="detector-anomalias">
        <div className="anomalias-header">
          <h3>
            <i className="fas fa-search"></i>
            Anomalías Detectadas ({anomalias.length})
          </h3>
          
          {anomalias.length > 0 && (
            <button 
              className="btn-clear-all-header"
              onClick={limpiarTodas}
              disabled={loading}
            >
              <i className="fas fa-broom"></i>
              Limpiar Todas
            </button>
          )}
        </div>

        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-triangle"></i>
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {anomalias.length === 0 ? (
          <div className="no-anomalias">
            <i className="fas fa-check-circle"></i>
            <p>No se detectaron anomalías en las últimas 24 horas</p>
          </div>
        ) : (
          <div className="anomalias-lista">
            {anomalias.map(anomalia => (
              <div 
                key={anomalia.id} 
                className={`anomalia-card severidad-${anomalia.severidad}`}
              >
                <div className="anomalia-header">
                  <div className="anomalia-icon">
                    <i 
                      className={getSeveridadIcon(anomalia.tipo)}
                      style={{ color: getSeveridadColor(anomalia.severidad) }}
                    ></i>
                  </div>
                  <div className="anomalia-info">
                    <h5>{anomalia.mensaje}</h5>
                    <span className="anomalia-fecha">
                      {formatearFecha(anomalia.timestamp)}
                    </span>
                  </div>
                  <div className="anomalia-actions-card">
                    <span 
                      className={`badge-severidad ${anomalia.severidad}`}
                      style={{ backgroundColor: getSeveridadColor(anomalia.severidad) }}
                    >
                      {anomalia.severidad.toUpperCase()}
                    </span>
                  <button 
                  className="btn-delete-card"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    eliminarAnomalia(anomalia.id);
                  }}
                  title="Eliminar esta anomalía"
                  disabled={loading}
                >
                  <i className="fas fa-times"></i>
                </button>
                  </div>
                </div>
                
                <div className="anomalia-detalles">
                  <div className="detalle-item">
                    <strong>Valor actual:</strong> {anomalia.valor}
                  </div>
                  <div className="detalle-item">
                    <strong>Rango esperado:</strong> {anomalia.valor_esperado}
                  </div>
                  <div className="detalle-item">
                    <strong>Parcela:</strong> {anomalia.parcela_nombre}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {mostrarModal && <ModalDetalles />}
    </>
  );
};

export default DetectorAnomalias;