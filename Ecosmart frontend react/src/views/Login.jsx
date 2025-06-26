import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
  setShowPassword(!showPassword);
};

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Guarda el usuario en localStorage
        localStorage.setItem('ecosmart_user', JSON.stringify(data));
        localStorage.setItem('ecosmart_token', data.token);
        // Redirige según el rol
        if (data.rol === 'tecnico') {
          navigate('/dashboard/tecnico');
        } else if (data.rol === 'agricultor') {
          navigate('/dashboard/agricultor');
        } else if (data.rol === 'agronomo') {
          navigate('/dashboard/agronomo');
        } else {
          navigate('/'); // O la ruta por defecto
        }
      } else {
        setError(data.error || 'Credenciales incorrectas');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-box">
          <div className="back-to-home">
            <Link to="/" className="btn-back-home">
              <i className="fas fa-arrow-left"></i> Volver al inicio
            </Link>
          </div>
          <div className="login-header">
            <img src="/logo-ecosmart.png" alt="EcoSmart Logo" className="login-logo" />
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
             
             <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                placeholder="Ingresa tu contraseña"
                value={credentials.password}
                onChange={handleChange}
                required
              />
              <button 
                type="button"
                className="toggle-password"
                onClick={togglePasswordVisibility}
              >
                <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
              </button>
            </div>
            </div>
            
            <div className="remember-me">
              <label className="checkbox-container">
                <input type="checkbox" id="remember" name="remember" />
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
          
          <div className="test-credentials">
            <h4>Cuentas para prueba:</h4>
            <div className="test-account">
              <p><strong>Técnico:</strong> tecnico@ecosmart.com / tecnico123</p>
            </div>
            <div className="test-account">
              <p><strong>Agricultor:</strong> agricultor@ecosmart.com / agricultor123</p>
            </div>
            <div className="test-account">
              <p><strong>Agrónomo:</strong> agronomo@ecosmart.com / agronomo123</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="login-background">
        <div className="login-info">
          <h2>Plataforma de Agricultura Inteligente</h2>
          <p>Optimiza tus cultivos, ahorra recursos y mejora tu producción con nuestra tecnología de punta para la agricultura moderna.</p>
          
          <ul className="login-features">
            <li>
              <i className="fas fa-chart-line"></i>
              <span>Monitoreo en tiempo real de tus cultivos</span>
            </li>
            <li>
              <i className="fas fa-tint"></i>
              <span>Control inteligente de riego y recursos</span>
            </li>
            <li>
              <i className="fas fa-leaf"></i>
              <span>Detección temprana de problemas en cultivos</span>
            </li>
            <li>
              <i className="fas fa-robot"></i>
              <span>Recomendaciones personalizadas con IA</span>
            </li>
            <li>
              <i className="fas fa-cloud-sun-rain"></i>
              <span>Integración con datos meteorológicos</span>
            </li>
          </ul>
          
          <div className="login-brands">
            <p>Respaldado por:</p>
            <div className="brand-logos">
              <span className="brand-logo">Universidad de Talca</span>
              <span className="brand-logo">Ministerio de Agricultura</span>
              <span className="brand-logo">FIA</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;