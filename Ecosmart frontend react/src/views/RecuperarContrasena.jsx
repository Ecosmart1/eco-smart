import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './recuperar.css';

const RecuperarContrasena = () => {
  const [step, setStep] = useState(1); // 1: pedir correo, 2: pedir código y nueva contraseña
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Paso 1: Solicitar código
  const handleSendCode = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError('Por favor ingresa tu correo electrónico');
      return;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Por favor ingresa un correo electrónico válido');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:5000/api/recuperar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Se ha enviado un código temporal a tu correo.');
        setStep(2);
      } else {
        setError(data.error || 'No se pudo enviar el código.');
      }
    } catch {
      setError('Error de conexión. Intenta más tarde.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Paso 2: Verificar código y cambiar contraseña
  // ...existing code...
const handleResetPassword = async (e) => {
  e.preventDefault();
  setError(null);
  setMessage(null);

  if (!codigo.trim() || !password.trim() || !confirm.trim()) {
    setError('Completa todos los campos');
    return;
  }
  if (password !== confirm) {
    setError('Las contraseñas no coinciden');
    return;
  }

  setIsSubmitting(true);
  try {
    const response = await fetch('http://localhost:5000/api/resetear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, codigo, password }),
    });
    const data = await response.json();
    if (response.ok) {
      setMessage('¡Contraseña restablecida! Redirigiendo al login...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } else {
      setError(data.error || 'No se pudo restablecer la contraseña.');
    }
  } catch {
    setError('Error de conexión. Intenta más tarde.');
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
          {step === 1 && (
            <>
              <p className="recuperar-description">
                Ingresa tu correo electrónico y te enviaremos un código temporal para restablecer tu contraseña.
              </p>
              {message && <div className="success-message">{message}</div>}
              {error && <div className="error-message">{error}</div>}
              <form className="recuperar-form" onSubmit={handleSendCode}>
                <div className="form-group">
                  <label htmlFor="email">Correo electrónico</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Ingresa tu correo electrónico"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-buttons">
                  <Link to="/login" className="btn-volver">Volver al Inicio de Sesión</Link>
                  <button type="submit" className="btn-enviar" disabled={isSubmitting}>
                    {isSubmitting ? 'Enviando...' : 'Enviar Código'}
                  </button>
                </div>
              </form>
            </>
          )}
          {step === 2 && (
            <>
              <p className="recuperar-description">
                Ingresa el código que recibiste en tu correo y crea una nueva contraseña.
              </p>
              {message && <div className="success-message">{message}</div>}
              {error && <div className="error-message">{error}</div>}
              <form className="recuperar-form" onSubmit={handleResetPassword}>
                <div className="form-group">
                  <label htmlFor="codigo">Código recibido</label>
                  <input
                    type="text"
                    id="codigo"
                    value={codigo}
                    onChange={e => setCodigo(e.target.value)}
                    placeholder="Código de 6 dígitos"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Nueva contraseña</label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Nueva contraseña"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="confirm">Repetir contraseña</label>
                  <input
                    type="password"
                    id="confirm"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repite la contraseña"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-buttons">
                  <button type="button" className="btn-volver" onClick={() => setStep(1)} disabled={isSubmitting}>
                    Volver
                  </button>
                  <button type="submit" className="btn-enviar" disabled={isSubmitting}>
                    {isSubmitting ? 'Restableciendo...' : 'Restablecer Contraseña'}
                  </button>
                </div>
              </form>
            </>
          )}
          {step === 3 && (
            <div>
              <div className="success-message">{message}</div>
              <div className="form-buttons" style={{marginTop: 24}}>
                <Link to="/login" className="btn-enviar">Ir al inicio de sesión</Link>
              </div>
            </div>
          )}
        </div>
        <div className="recuperar-footer">
          <p>¿No tienes una cuenta? <Link to="/registro">Regístrate</Link></p>
        </div>
      </div>
    </div>
  );
};

export default RecuperarContrasena;