import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './PanelParcelas.css';
import FormularioParcela from './FormularioParcela';

const PanelParcelas = () => {
  const [parcelas, setParcelas] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [parcelaEditar, setParcelaEditar] = useState(null);
  const [cargando, setCargando] = useState(true);
  
  useEffect(() => {
    // En un proyecto real, aquí cargarías las parcelas desde el backend
    // Por ahora, usaremos datos de ejemplo
    setTimeout(() => {
      const parcelasEjemplo = [
        {
          id: 1,
          nombre: "Viñedo Norte",
          ubicacion: "Valle de Curicó",
          area: 5.2,
          tipo_suelo: "franco",
          cultivo_actual: "uva",
          fecha_siembra: "2025-01-15",
          estado: "óptimo",
          humedad: 68,
          temperatura: 22.5,
          latitud: -35.4252,
          longitud: -71.6536
        },
        {
          id: 2,
          nombre: "Huerto Sur",
          ubicacion: "Sector La Quebrada",
          area: 3.7,
          tipo_suelo: "arcilloso",
          cultivo_actual: "manzana",
          fecha_siembra: "2025-02-10",
          estado: "alerta",
          humedad: 42,
          temperatura: 24.8,
          latitud: -35.4298,
          longitud: -71.6498
        },
        {
          id: 3,
          nombre: "Campo Este",
          ubicacion: "Camino a Romeral",
          area: 8.1,
          tipo_suelo: "limoso",
          cultivo_actual: "maiz",
          fecha_siembra: "2025-03-05",
          estado: "crítico",
          humedad: 30,
          temperatura: 26.2,
          latitud: -35.4189,
          longitud: -71.6401
        }
      ];
      
      setParcelas(parcelasEjemplo);
      setCargando(false);
    }, 1000);
  }, []);
  
  const abrirFormulario = (parcela = null) => {
    setParcelaEditar(parcela);
    setMostrarFormulario(true);
  };
  
  const cerrarFormulario = () => {
    setMostrarFormulario(false);
    setParcelaEditar(null);
  };
  
  const guardarParcela = (parcelaData) => {
    // En un proyecto real, aquí harías una llamada API para guardar
    if (parcelaEditar) {
      // Actualizar parcela existente
      setParcelas(prevParcelas => 
        prevParcelas.map(p => 
          p.id === parcelaEditar.id ? { ...p, ...parcelaData } : p
        )
      );
    } else {
      // Crear nueva parcela
      const nuevaParcela = {
        ...parcelaData,
        id: parcelas.length ? Math.max(...parcelas.map(p => p.id)) + 1 : 1,
        estado: "óptimo", // Estado por defecto
        humedad: 65, // Valores de ejemplo
        temperatura: 22
      };
      
      setParcelas(prevParcelas => [...prevParcelas, nuevaParcela]);
    }
    
    cerrarFormulario();
  };
  
  const eliminarParcela = (id) => {
    // En un proyecto real, aquí harías una llamada API para eliminar
    if (window.confirm('¿Está seguro que desea eliminar esta parcela?')) {
      setParcelas(prevParcelas => prevParcelas.filter(p => p.id !== id));
    }
  };
  
  const getEstadoColor = (estado) => {
    switch (estado) {
      case "óptimo": return "estado-optimo";
      case "alerta": return "estado-alerta";
      case "crítico": return "estado-critico";
      default: return "";
    }
  };
  
  const getTipoSueloLabel = (tipo) => {
    const tiposSuelo = {
      arenoso: "Arenoso",
      arcilloso: "Arcilloso",
      limoso: "Limoso",
      franco: "Franco",
      humifero: "Humífero",
      calcareo: "Calcáreo",
      pedregoso: "Pedregoso"
    };
    
    return tiposSuelo[tipo] || tipo;
  };
  
  const getCultivoLabel = (cultivo) => {
    const cultivos = {
      maiz: "Maíz",
      trigo: "Trigo",
      soja: "Soja",
      arroz: "Arroz",
      papa: "Papa",
      tomate: "Tomate",
      uva: "Uva",
      manzana: "Manzana",
      cafe: "Café",
      no_cultivado: "Sin cultivo"
    };
    
    return cultivos[cultivo] || cultivo;
  };
  
  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return "No disponible";
    
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  if (cargando) {
    return (
      <div className="cargando-container">
        <div className="cargando-spinner"></div>
        <p>Cargando parcelas...</p>
      </div>
    );
  }
  
  return (
    <div className="panel-parcelas">
      <div className="panel-parcelas-header">
        <h1>Mis Parcelas</h1>
        <button className="btn-nueva-parcela" onClick={() => abrirFormulario()}>
          <i className="fas fa-plus"></i> Nueva Parcela
        </button>
      </div>
      
      {parcelas.length === 0 ? (
        <div className="sin-parcelas">
          <i className="fas fa-seedling"></i>
          <h2>No tiene parcelas registradas</h2>
          <p>Para comenzar, agregue una nueva parcela haciendo clic en el botón "Nueva Parcela".</p>
        </div>
      ) : (
        <div className="parcelas-grid">
          {parcelas.map(parcela => (
            <div key={parcela.id} className="parcela-card">
              <div className={`parcela-estado ${getEstadoColor(parcela.estado)}`}></div>
              
              <h3 className="parcela-nombre">{parcela.nombre}</h3>
              
              <div className="parcela-ubicacion">
                <i className="fas fa-map-marker-alt"></i>
                <span>{parcela.ubicacion}</span>
              </div>
              
              <div className="parcela-info">
                <div className="parcela-info-item">
                  <span className="info-label">Área:</span>
                  <span className="info-valor">{parcela.area} ha</span>
                </div>
                
                <div className="parcela-info-item">
                  <span className="info-label">Tipo de suelo:</span>
                  <span className="info-valor">{getTipoSueloLabel(parcela.tipo_suelo)}</span>
                </div>
                
                <div className="parcela-info-item">
                  <span className="info-label">Cultivo actual:</span>
                  <span className="info-valor">{getCultivoLabel(parcela.cultivo_actual)}</span>
                </div>
                
                <div className="parcela-info-item">
                  <span className="info-label">Fecha de siembra:</span>
                  <span className="info-valor">{formatearFecha(parcela.fecha_siembra)}</span>
                </div>
              </div>
              
              <div className="parcela-metrics">
                <div className="metric">
                  <i className="fas fa-thermometer-half"></i>
                  <span>{parcela.temperatura}°C</span>
                </div>
                <div className="metric">
                  <i className="fas fa-tint"></i>
                  <span>{parcela.humedad}%</span>
                </div>
              </div>
              
              <div className="parcela-actions">
                <button className="btn-editar" onClick={() => abrirFormulario(parcela)}>
                  <i className="fas fa-edit"></i> Editar
                </button>
                <button className="btn-eliminar" onClick={() => eliminarParcela(parcela.id)}>
                  <i className="fas fa-trash-alt"></i> Eliminar
                </button>
                <Link to={`/parcelas/${parcela.id}`} className="btn-detalle">
                  <i className="fas fa-eye"></i> Ver Detalles
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Formulario modal para crear/editar parcela */}
      {mostrarFormulario && (
        <FormularioParcela 
          onClose={cerrarFormulario} 
          onGuardar={guardarParcela} 
          parcelaEditar={parcelaEditar} 
        />
      )}
    </div>
  );
};

export default PanelParcelas;