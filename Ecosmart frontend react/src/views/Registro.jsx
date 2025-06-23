// frontend/src/views/Registro.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Registro.css';

const Registro = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    email: '',
    password: '',
    confirmPassword: '',
    tipoUsuario: 'agricultor'
  });
  // Añadir después del useState para formData
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Limpiar error del campo cuando el usuario escribe
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };
  const togglePasswordVisibility = () => {
  setShowPassword(!showPassword);
};

const toggleConfirmPasswordVisibility = () => {
  setShowConfirmPassword(!showConfirmPassword);
};
  const handleTipoUsuarioChange = (tipo) => {
    setFormData({
      ...formData,
      tipoUsuario: tipo
    });
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validar nombres
    if (!formData.nombres.trim()) {
      newErrors.nombres = 'El nombre es obligatorio';
    }
    
    // Validar apellido paterno
    if (!formData.apellidoPaterno.trim()) {
      newErrors.apellidoPaterno = 'El apellido paterno es obligatorio';
    }
    // validar apellido materno
    if (!formData.apellidoMaterno.trim()) {
      newErrors.apellidoMaterno = 'El apellido materno es obligatorio';
    }


    // Validar email
    if (!formData.email.trim()) {
      newErrors.email = 'El correo electrónico es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El correo electrónico no es válido';
    }
    
    // Validar contraseña
    if (!formData.password) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    // Validar confirmación de contraseña
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
  
    setIsSubmitting(true);
  
    try {
      const response = await fetch('http://localhost:5000/api/registro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: formData.nombres + ' ' + formData.apellidoPaterno + ' ' + formData.apellidoMaterno,
          email: formData.email,
          password: formData.password,
          rol: formData.tipoUsuario,
        }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        // Registro exitoso, redirige al login
        navigate('/login');
      } else {
        setErrors({ api: data.error || 'Error en el registro' });
      }
    } catch (error) {
      setErrors({ api: 'Error de conexión con el servidor' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="registro-page">
      <div className="registro-container">
        <div className="registro-header">
          <Link to="/" className="logo-link">
            <img src="/logo-ecosmart.png" alt="EcoSmart Logo" className="registro-logo" />
            <h1>EcoSmart</h1>
          </Link>
        </div>
        
        <div className="registro-form-container">
          <h2>Registrarse</h2>
          
          <form className="registro-form" onSubmit={handleSubmit}>

            <div className="form-group">
              <label htmlFor="nombres">Nombres</label>
              <input
                type="text"
                id="nombres"
                name="nombres"
                value={formData.nombres}
                onChange={handleChange}
                className={errors.nombres ? 'input-error' : ''}
                placeholder="Ingresa tus nombres"
              />
              {errors.nombres && <span className="error-message">{errors.nombres}</span>}
            </div>
            <hr />
            <div className="form-group">
              <label htmlFor="apellidoPaterno">Apellido Paterno</label>
              <input
                type="text"
                id="apellidoPaterno"
                name="apellidoPaterno"
                value={formData.apellidoPaterno}
                onChange={handleChange}
                className={errors.apellidoPaterno ? 'input-error' : ''}
                placeholder="Ingresa tu apellido paterno"
              />
              {errors.apellidoPaterno && <span className="error-message">{errors.apellidoPaterno}</span>}
            </div>
            
            <div className="form-group">
              <label htmlFor="apellidoMaterno">Apellido Materno</label>
              <input
                type="text"
                id="apellidoMaterno"
                name="apellidoMaterno"
                value={formData.apellidoMaterno}
                onChange={handleChange}
                placeholder="Ingresa tu apellido materno"
                required
              />
              {errors.apellidoMaterno && <span className="error-message">{errors.apellidoMaterno}</span>}
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Correo electrónico</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'input-error' : ''}
                placeholder="ejemplo@correo.com"
                required
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>
            
            <div className="form-group">
  <label htmlFor="password">Contraseña</label>
  <div className="password-input-wrapper">
    <input
      type={showPassword ? "text" : "password"}
      id="password"
      name="password"
      value={formData.password}
      onChange={handleChange}
      className={errors.password ? 'input-error' : ''}
      placeholder="Crea una contraseña segura"
    />
    <button 
      type="button"
      className="toggle-password"
      onClick={togglePasswordVisibility}
    >
      <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
    </button>
  </div>
  {errors.password && <span className="error-message">{errors.password}</span>}
</div>

<div className="form-group">
  <label htmlFor="confirmPassword">Repetir Contraseña</label>
  <div className="password-input-wrapper">
    <input
      type={showConfirmPassword ? "text" : "password"}
      id="confirmPassword"
      name="confirmPassword"
      value={formData.confirmPassword}
      onChange={handleChange}
      className={errors.confirmPassword ? 'input-error' : ''}
      placeholder="Repite tu contraseña"
    />
    <button 
      type="button"
      className="toggle-password"
      onClick={toggleConfirmPasswordVisibility}
    >
      <i className={showConfirmPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
    </button>
  </div>
  {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
</div>
            
            <div className="form-group tipo-usuario">
              <label>Tipo de Usuario</label>
              <div className="tipo-usuario-options">
                <div 
                  className={`tipo-option ${formData.tipoUsuario === 'agricultor' ? 'active' : ''}`}
                  onClick={() => handleTipoUsuarioChange('agricultor')}
                >
                  <i className="fas fa-tractor"></i>
                  <span>Agricultor</span>
                </div>
                <div 
                  className={`tipo-option ${formData.tipoUsuario === 'tecnico' ? 'active' : ''}`}
                  onClick={() => handleTipoUsuarioChange('tecnico')}
                >
                  <i className="fas fa-tools"></i>
                  <span>Técnico</span>
                </div>
                <div 
                  className={`tipo-option ${formData.tipoUsuario === 'agronomo' ? 'active' : ''}`}
                  onClick={() => handleTipoUsuarioChange('agronomo')}
                >
                  <i className="fas fa-microscope"></i>
                  <span>Agrónomo</span>
                </div>
              </div>
            </div>
            
            <div className="form-buttons">
              <Link to="/login" className="btn-volver">
                Volver
              </Link>
              <button 
                type="submit" 
                className="btn-registrar"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Registrando...' : 'Registrarse'}
              </button>
            </div>
          </form>
        </div>
        
        <div className="registro-footer">
          <p>¿Ya tienes una cuenta? <Link to="/login">Iniciar sesión</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Registro;