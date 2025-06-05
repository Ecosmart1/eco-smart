import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AlertasAgricultor.css';

const AlertasAgricultor = ({ usuario }) => {
  const [alertas, setAlertas] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
  if (!usuario) return;
  fetch('http://localhost:5000/api/alertas')
    .then(res => res.json())
    .then(data => {
      console.log('Alertas recibidas:', data);
      setAlertas(
        Array.isArray(data)
          ? data.map(alerta => ({
              ...alerta,
              parcela: alerta.parcela || alerta.parcelaNombre || alerta.parcela_nombre || 'Sin nombre'
            }))
          : []
      );
    })
    .catch(() => setAlertas([]));
}, [usuario]);

  return (
    <div className="alertas-page">
      <h2>Alertas recientes</h2>
      {alertas.length === 0 ? (
        <div className="alerta-vacia">Sin alertas activas</div>
      ) : (
        <ul className="alertas-lista">
          {alertas.map(alerta => (
            <li key={alerta.id} className={`alerta-item ${alerta.severidad}`}>
              <div>
                <strong>{alerta.mensaje}</strong>
                <div className="alerta-detalle">
                  <span>{alerta.timestamp}</span> | <span>{alerta.parcela}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button className="volver-btn" onClick={() => navigate(-1)}>Volver</button>
    </div>
  );
};

export default AlertasAgricultor;