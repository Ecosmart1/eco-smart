import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Configuracion.css'; // Asegúrate de tener este archivo CSS
import './vistascompartidas.css'; // Asegúrate de tener este archivo CSS

const Configuracion = () => {
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    rol: '',
    password: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Obtener usuario actual de localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('ecosmart_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setForm(f => ({
        ...f,
        nombre: user.nombre || '',
        email: user.email || '',
        rol: user.rol || ''
      }));
    }
  }, []);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setMensaje('');
    setError('');
    setLoading(true);

    // Validar cambio de contraseña
    if (form.newPassword && form.newPassword !== form.confirmNewPassword) {
      setError('Las contraseñas nuevas no coinciden.');
      setLoading(false);
      return;
    }

    try {
      // Obtener usuario actual
      const userStr = localStorage.getItem('ecosmart_user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user) throw new Error('Usuario no autenticado');

      // Construir payload
      const payload = {
        nombre: form.nombre,
        email: form.email,
        rol: form.rol
      };
      if (form.newPassword) {
        payload.password = form.password;
        payload.newPassword = form.newPassword;
      }

      const response = await fetch(`http://localhost:5000/api/usuarios/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar los datos');
      }

      setMensaje('Datos actualizados correctamente');
      setForm(f => ({
        ...f,
        password: '',
        newPassword: '',
        confirmNewPassword: ''
      }));

      // Actualizar localStorage si el nombre/email cambió
      const updatedUser = { ...user, nombre: form.nombre, email: form.email };
      localStorage.setItem('ecosmart_user', JSON.stringify(updatedUser));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ecosmart_user');
    navigate('/login');
  };

  // ...importaciones y lógica...

return (
    <div className="config-page">
      <div className="config-container">
        <h2>Configuración de Usuario</h2>
        <form className="config-form" onSubmit={handleSubmit}>
          <label>
            Nombre:
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Correo electrónico:
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Rol:
            <input
              type="text"
              name="rol"
              value={form.rol}
              disabled
              readOnly
            />
          </label>
          <hr />
          <div className="config-section">Cambiar contraseña</div>
          <label>
            Contraseña actual:
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
          </label>
          <label>
            Nueva contraseña:
            <input
              type="password"
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </label>
          <label>
            Confirmar nueva contraseña:
            <input
              type="password"
              name="confirmNewPassword"
              value={form.confirmNewPassword}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </label>
          {mensaje && <div className="success-message">{mensaje}</div>}
          {error && <div className="error-message">{error}</div>}
          <div className="form-buttons">
            <button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
        <button className="logout-btn" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

export default Configuracion;