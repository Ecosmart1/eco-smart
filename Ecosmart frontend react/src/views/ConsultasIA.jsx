// filepath: c:\Users\Vicente\Documents\eco-smart\Ecosmart frontend react\src\views\ConsultasIA.jsx
import React, { useState } from 'react';
import './ConsultasIA.css';

const API_URL = 'http://localhost:5000/api/ia/consultas';

function ConsultasIA() {
  const [consulta, setConsulta] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleConsultaChange = (event) => {
    setConsulta(event.target.value);
  };

  const enviarConsulta = async () => {
  if (!consulta.trim()) {
    alert('Por favor, ingresa una consulta.');
    return;
  }

  setCargando(true);
  setRespuesta('');

  try {
    const response = await fetch('http://localhost:5000/api/ia/consultas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ consulta }),
    });

    const data = await response.json();
    if (response.ok) {
      setRespuesta(data.respuesta);
    } else {
      setRespuesta(data.error || 'Error al obtener la consulta.');
    }
  } catch (error) {
    setRespuesta('Error al conectar con el servidor.');
  } finally {
    setCargando(false);
  }
};

  return (
    <div className="consultas-ia-container">
      <h1>Consultas IA</h1>
      <p>Realiza consultas relacionadas con la agricultura y recibe respuestas técnicas y concisas.</p>
      <div className="consulta-form">
        <textarea
          placeholder="Escribe tu consulta aquí..."
          value={consulta}
          onChange={handleConsultaChange}
        ></textarea>
        <button onClick={enviarConsulta} disabled={cargando}>
          {cargando ? 'Cargando...' : 'Enviar Consulta'}
        </button>
      </div>
      {respuesta && (
        <div className="respuesta-container">
          <h3>Respuesta:</h3>
          <p>{respuesta}</p>
        </div>
      )}
    </div>
  );
}

export default ConsultasIA;