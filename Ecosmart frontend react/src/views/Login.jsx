// frontend/src/views/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';
import "./vistascompartidas.css";

const Login = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRememberChange = () => {
    setRememberMe(!rememberMe);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Simulamos un tiempo de espera como si fuera una petición real
      setTimeout(() => {
        // Usuarios simulados para pruebas
        if (credentials.email === 'tecnico@ecosmart.com' && credentials.password === 'tecnico123') {
          // Usuario técnico
          localStorage.setItem('ecosmart_user', JSON.stringify({
            id: 1,
            nombre: 'Roberto Técnico',
            email: credentials.email,
            rol: 'tecnico'
          }));
          
          // Redirigir al dashboard de técnico
          navigate('/dashboard/tecnico');
        } 
        else if (credentials.email === 'agricultor@ecosmart.com' && credentials.password === 'agricultor123') {
          // Usuario agricultor
          localStorage.setItem('ecosmart_user', JSON.stringify({
            id: 2,
            nombre: 'Juan Agricultor',
            email: credentials.email,
            rol: 'agricultor'
          }));
          
          // Aquí redirigirías al dashboard de agricultor
          navigate('/dashboard/agricultor');
        } 
        else {
          setError('Credenciales incorrectas. Intente de nuevo.');
        }
        
        setIsLoading(false);
      }, 1000);
    } catch (err) {
      console.error('Error de login:', err);
      setError('Error en el servidor. Intente nuevamente.');
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page view-container">
      <div className="login-container">
        <div className="login-box">
          <div className="login-header">
            <img src="/assets/logo-ecosmart.png" alt="EcoSmart Logo" className="login-logo" />
            <h1>EcoSmart</h1>
          </div>
          
          <h2>Iniciar Sesión</h2>
          <p className="login-subtitle">Accede a tu cuenta de EcoSmart</p>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Correo electrónico</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Ingresa tu correo electrónico"
                value={credentials.email}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <div className="password-header">
                <label htmlFor="password">Contraseña</label>
                <Link to="/recuperar-contrasena" className="forgot-password">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Ingresa tu contraseña"
                value={credentials.password}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="remember-me">
              <label className="checkbox-container">
                <input 
                  type="checkbox" 
                  id="remember" 
                  name="remember" 
                  checked={rememberMe}
                  onChange={handleRememberChange}
                />
                <span>Recordarme</span>
              </label>
            </div>
            
            <button 
              type="submit" 
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
          
          <div className="login-footer">
            <p>¿No tienes una cuenta? <Link to="/registro">Regístrate</Link></p>
          </div>
          
          {/* Para pruebas - colocado dentro del login box */}
          <div className="test-credentials">
            <p><strong>Para pruebas:</strong> tecnico@ecosmart.com / tecnico123</p>
          </div>
        </div>
      </div>
      
      {/* Lado derecho - imagen de fondo con información */}
      <div className="login-background">
        <div className="login-info">
          <h2>Agricultura Inteligente</h2>
          <p>Optimiza tus cultivos con EcoSmart, la plataforma de monitoreo agrícola en tiempo real.</p>
          
          <ul className="login-features">
            <li>
              <i className="feature-icon">✓</i>
              Monitoreo en tiempo real de condiciones ambientales
            </li>
            <li>
              <i className="feature-icon">✓</i>
              Alertas automáticas ante condiciones adversas
            </li>
            <li>
              <i className="feature-icon">✓</i>
              Reportes detallados para optimizar tus cultivos
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;