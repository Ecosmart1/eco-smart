// frontend/src/views/RecuperarContrasena.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './recuperar.css';

const RecuperarContrasena = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setEmail(e.target.value);
    // Limpiar mensajes previos al cambiar el correo
    setMessage(null);
    setError(null);
  };
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validar email
  if (!email.trim()) {
    setError('Por favor ingresa tu correo electrónico');
    return;
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    setError('Por favor ingresa un correo electrónico válido');
    return;
  }
  
  setIsSubmitting(true);
  setError(null);
  setMessage(null);
  
  try {
    // Llamada real a la API
    const response = await fetch('http://localhost:5000/api/recuperar-contrasena', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      setMessage('Se ha enviado un correo con instrucciones para recuperar tu contraseña');
      // Limpiar el campo de email después de enviar
      setEmail('');
    } else {
      setError(data.error || 'Ocurrió un error al procesar tu solicitud');
    }
  } catch (error) {
    console.error('Error:', error);
    setError('Error de conexión. Por favor intenta más tarde.');
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <div className="recuperar-page">
      <div className="recuperar-container">
        <div className="recuperar-header">
          <img src="/logo-ecosmart.png" alt="EcoSmart Logo" className="recuperar-logo" />
          <h1>EcoSmart</h1>
        </div>
        
        <div className="recuperar-form-container">
          <h2>Recuperar Contraseña</h2>
          <p className="recuperar-description">
            Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.
          </p>
          
          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}
          
          <form className="recuperar-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Correo electrónico</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={handleChange}
                placeholder="Ingresa tu correo electrónico"
                disabled={isSubmitting}
              />
            </div>
            
            <div className="form-buttons">
              <Link to="/login" className="btn-volver">
                Volver al Inicio de Sesión
              </Link>
              <button 
                type="submit" 
                className="btn-enviar"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Enviando...' : 'Enviar Instrucciones'}
              </button>
            </div>
          </form>
        </div>
        
        <div className="recuperar-footer">
          <p>¿No tienes una cuenta? <Link to="/registro">Regístrate</Link></p>
        </div>
      </div>
    </div>
  );
};

export default RecuperarContrasena;