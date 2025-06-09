import React, { useEffect, useState } from 'react';
import HeaderAgricultor from './headeragricultor';
import './AlertasAgricultor.css';
import { useAlertas } from '../context/AlertasContext';

const TickIcon = () => (
  <svg className="tick-icon" width="18" height="18" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="10" fill="#22963e"/>
    <path d="M6 10.5L9 13.5L14 8.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const AlertasUsuario = () => {
  const [alertas, setAlertas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const { fetchAlertasActivas } = useAlertas();

  useEffect(() => {
    // Obtener usuario desde localStorage
    const usuarioGuardado = localStorage.getItem('ecosmart_user');
    if (!usuarioGuardado) return;
    const usuarioObj = JSON.parse(usuarioGuardado);
    setUsuario(usuarioObj);

    // Traer alertas activas
    fetch(`http://localhost:5000/api/alertas`)
      .then(res => res.json())
      .then(data => setAlertas(Array.isArray(data) ? data : []))
      .catch(() => setAlertas([]));

    // Traer historial de alertas (inactivas)
    fetch(`http://localhost:5000/api/alertas?inactivas=1`)
      .then(res => res.json())
      .then(data => setHistorial(Array.isArray(data) ? data : []))
      .catch(() => setHistorial([]));
  }, []);

  // Marcar alerta como revisada
  const marcarComoRevisada = (alertaId) => {
    fetch(`http://localhost:5000/api/alertas/${alertaId}/revisada`, {
      method: 'PUT'
    })
      .then(res => {
        if (res.ok) {
          setAlertas(alertas.filter(a => a.id !== alertaId));
          fetchAlertasActivas(); // Actualiza el número en el header
          // Opcional: recargar historial
          fetch(`http://localhost:5000/api/alertas?inactivas=1`)
            .then(res => res.json())
            .then(data => setHistorial(Array.isArray(data) ? data : []));
        }
      });
  };

  // Eliminar alerta
  const eliminarAlerta = (alertaId) => {
    fetch(`http://localhost:5000/api/alertas/${alertaId}`, {
      method: 'DELETE'
    })
      .then(res => {
        if (res.ok) {
          setAlertas(alertas.filter(a => a.id !== alertaId));
          setHistorial(historial.filter(a => a.id !== alertaId));
          fetchAlertasActivas(); // Actualiza el número en el header
        }
      });
  };

  return (
    <div className="alertas-usuario-page">
      <div className="alertas-usuario-content">
        <h2>Alertas actuales</h2>
        {alertas.length === 0 ? (
          <div className="alerta-vacia">No hay alertas activas para tu cuenta.</div>
        ) : (
          <ul className="alertas-usuario-lista">
            {alertas.map(alerta => (
              <li key={alerta.id} className={`alerta-usuario-item ${alerta.severidad}`}>
                <div className="alerta-usuario-header">
                  <span className={`alerta-severidad-badge ${alerta.severidad}`}>{alerta.severidad.toUpperCase()}</span>
                  <span className="alerta-tipo">{alerta.tipo}</span>
                  <span className="alerta-fecha">{alerta.timestamp}</span>
                </div>
                <div className="alerta-usuario-body">
                  <strong>{alerta.mensaje}</strong>
                  <div className="alerta-info-extra">
                    <span><b>Parcela:</b> {alerta.parcela}</span>
                  </div>
                  <div className="alerta-acciones">
                    <button
                      className="btn-alerta revisar"
                      onClick={() => marcarComoRevisada(alerta.id)}
                    >
                      <TickIcon /> Marcar como revisada
                    </button>
                    <button
                      className="btn-alerta eliminar"
                      onClick={() => eliminarAlerta(alerta.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <h2 style={{ marginTop: 40 }}>Historial de alertas</h2>
        {historial.length === 0 ? (
          <div className="alerta-vacia">No hay alertas antiguas.</div>
        ) : (
          <ul className="alertas-usuario-lista">
            {historial.map(alerta => (
              <li key={alerta.id} className={`alerta-usuario-item ${alerta.severidad} historial`}>
                <div className="alerta-usuario-header">
                  <span className={`alerta-severidad-badge ${alerta.severidad}`}>{alerta.severidad.toUpperCase()}</span>
                  <span className="alerta-tipo">{alerta.tipo}</span>
                  <span className="alerta-fecha">{alerta.timestamp}</span>
                  <span className="alerta-tick-revisada" title="Revisada">
                    <TickIcon />
                  </span>
                </div>
                <div className="alerta-usuario-body">
                  <strong>{alerta.mensaje}</strong>
                  <div className="alerta-info-extra">
                    <span><b>Parcela:</b> {alerta.parcela}</span>
                  </div>
                  <div className="alerta-acciones">
                    <button
                      className="btn-alerta eliminar"
                      onClick={() => eliminarAlerta(alerta.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AlertasUsuario;