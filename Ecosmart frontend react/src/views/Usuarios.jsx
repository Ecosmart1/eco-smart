import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Usuarios.css';

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editUserId, setEditUserId] = useState(null);
  const [editForm, setEditForm] = useState({ nombre: '', email: '', rol: '' });

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/usuarios');
      if (!response.ok) throw new Error('Error al cargar los usuarios');
      const data = await response.json();
      setUsuarios(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (usuario) => {
    setEditUserId(usuario.id);
    setEditForm({ nombre: usuario.nombre, email: usuario.email, rol: usuario.rol });
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSave = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!response.ok) throw new Error('Error al actualizar usuario');
      setEditUserId(null);
      fetchUsuarios();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditCancel = () => {
    setEditUserId(null);
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/usuarios/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Error al eliminar usuario');
      fetchUsuarios();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="user-page">
      <div className="user-content">
        <div className="back-to-home">
          <Link to="/dashboard/tecnico" className="btn-back-home">
            <i className="fas fa-arrow-left"></i> Volver al panel
          </Link>
        </div>
        <h2>Usuarios Registrados</h2>
        <p className="user-subtitle">Visualiza y gestiona los usuarios actualmente en la plataforma</p>
        {loading && <div className="loading">Cargando usuarios...</div>}
        {error && <div className="error-message">{error}</div>}
        {!loading && !error && (
          <div className="user-table-wrapper">
            <table className="user-form">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(usuario => (
                  <tr key={usuario.id}>
                    <td>{usuario.id}</td>
                    <td>
                      {editUserId === usuario.id ? (
                        <input
                          name="nombre"
                          value={editForm.nombre}
                          onChange={handleEditChange}
                        />
                      ) : (
                        usuario.nombre
                      )}
                    </td>
                    <td>
                      {editUserId === usuario.id ? (
                        <input
                          name="email"
                          value={editForm.email}
                          onChange={handleEditChange}
                        />
                      ) : (
                        usuario.email
                      )}
                    </td>
                    <td>
                      {editUserId === usuario.id ? (
                        <select
                          name="rol"
                          value={editForm.rol}
                          onChange={handleEditChange}
                        >
                          <option value="tecnico">Técnico</option>
                          <option value="agricultor">Agricultor</option>
                          <option value="agronomo">Agrónomo</option>
                        </select>
                      ) : (
                        usuario.rol
                      )}
                    </td>
                    <td>
                      {editUserId === usuario.id ? (
                        <>
                          <button onClick={() => handleEditSave(usuario.id)}>Guardar</button>
                          <button onClick={handleEditCancel}>Cancelar</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEditClick(usuario)}>Actualizar</button>
                          <button
                            style={{ marginLeft: 8, background: '#b71c1c' }}
                            onClick={() => handleDeleteUser(usuario.id)}
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="user-background"></div>
    </div>
  );
};

export default Usuarios;