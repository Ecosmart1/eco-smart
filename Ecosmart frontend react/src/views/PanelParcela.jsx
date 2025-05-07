import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './PanelParcelas.css';
import FormularioParcela from './FormularioParcela';
import servicioMeteo from '../services/servicioMeteo';

const PanelParcelas = () => {
  const [parcelas, setParcelas] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [parcelaEditar, setParcelaEditar] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [clima, setClima] = useState({});

  useEffect(() => {
    // Traer las parcelas desde el backend y luego obtener el clima de cada una
    const fetchParcelasYClima = async () => {
      setCargando(true);
      try {
        const response = await fetch('http://localhost:5000/api/parcelas');
        if (!response.ok) throw new Error('Error al cargar las parcelas');
        const data = await response.json();
        setParcelas(data);

        // Obtener el clima de cada parcela real
        data.forEach(async (parcela) => {
          if (parcela.latitud && parcela.longitud) {
            try {
              const datosClima = await servicioMeteo.obtenerPronostico(parcela.latitud, parcela.longitud);
              setClima(prev => ({ ...prev, [parcela.id]: datosClima.actual }));
            } catch (e) {
              setClima(prev => ({ ...prev, [parcela.id]: { error: true } }));
            }
          }
        });
      } catch (error) {
        console.error('Error al cargar las parcelas:', error);
        setParcelas([]);
      }
      setCargando(false);
    };

    fetchParcelasYClima();
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
    if (parcelaEditar) {
      setParcelas(prevParcelas =>
        prevParcelas.map(p =>
          p.id === parcelaEditar.id ? { ...p, ...parcelaData } : p
        )
      );
    } else {
      const nuevaParcela = {
        ...parcelaData,
        id: parcelas.length ? Math.max(...parcelas.map(p => p.id)) + 1 : 1,
        estado: "óptimo",
        humedad: 65,
        temperatura: 22
      };
      setParcelas(prevParcelas => [...prevParcelas, nuevaParcela]);
    }
    cerrarFormulario();
  };

  const eliminarParcela = (id) => {
    if (window.confirm('¿Está seguro que desea eliminar esta parcela?')) {
      setParcelas(prevParcelas => prevParcelas.filter(p => p.id !== id));
      setClima(prev => {
        const nuevo = { ...prev };
        delete nuevo[id];
        return nuevo;
      });
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

              {/* Clima actual de la parcela */}
              <div className="parcela-clima">
                {clima[parcela.id] && !clima[parcela.id].error ? (
                  <span>
                    <i className={`fas fa-${clima[parcela.id].icono || 'cloud'}`}></i>
                    {clima[parcela.id].temperatura}°C, {clima[parcela.id].condicion}
                  </span>
                ) : clima[parcela.id] && clima[parcela.id].error ? (
                  <span>No se pudo obtener el clima</span>
                ) : (
                  <span>Obteniendo clima...</span>
                )}
              </div>

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