import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Usuarios.css';

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editUserId, setEditUserId] = useState(null);
  const [editForm, setEditForm] = useState({ nombre: '', email: '', rol: '' });
  
  // Estados para el historial
  const [showHistorial, setShowHistorial] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [historialData, setHistorialData] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

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

  // Función para cargar el historial de un usuario
  const fetchHistorialUsuario = async (userId, userName) => {
    setLoadingHistorial(true);
    try {
      // Obtener el usuario actual para verificar rol
      const usuarioActual = JSON.parse(localStorage.getItem('ecosmart_user'));
      const headers = { 
        'Content-Type': 'application/json',
        'X-User-Id': usuarioActual.id,
        'X-User-Rol': usuarioActual.rol
      };

      const response = await fetch(`http://localhost:5000/api/logs?usuario_id=${userId}`, {
        headers
      });
      
      if (!response.ok) throw new Error('Error al cargar el historial');
      
      const data = await response.json();
      setHistorialData(data.logs || []);
      setSelectedUser({ id: userId, nombre: userName });
      setShowHistorial(true);
    } catch (err) {
      console.error('Error:', err);
      setError(`Error al cargar historial: ${err.message}`);
    } finally {
      setLoadingHistorial(false);
    }
  };

  // Formatear fecha para mostrar en la tabla
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('es-ES', options);
  };

  // Obtener descripción amigable de la acción
  const getActionDescription = (action) => {
    const actionMap = {
      'login': 'Inicio de sesión',
      'crear_parcela': 'Creó una parcela',
      'actualizar_parcela': 'Actualizó una parcela',
      'eliminar_parcela': 'Eliminó una parcela',
      'consulta_datos_sensores': 'Consultó datos de sensores',
      'consulta_ia': 'Realizó consulta al asistente',
      'listar_parcelas': 'Visualizó listado de parcelas',
      'exportar_csv': 'Exportó datos a CSV',
      'iniciar_simulacion': 'Inició simulación',
      'detener_simulacion': 'Detuvo simulación'
    };
    
    return actionMap[action] || action;
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
                            className="btn-historial"
                            onClick={() => fetchHistorialUsuario(usuario.id, usuario.nombre)}
                          >
                            Historial
                          </button>
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

        {/* Modal de Historial */}
        {showHistorial && (
          <div className="historial-modal-overlay">
            <div className="historial-modal">
              <div className="historial-modal-header">
                <h3>Historial de Acciones - {selectedUser?.nombre}</h3>
                <button 
                  className="close-modal-btn"
                  onClick={() => setShowHistorial(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="historial-modal-body">
                {loadingHistorial ? (
                  <div className="loading">Cargando historial...</div>
                ) : historialData.length === 0 ? (
                  <p className="no-data-message">No hay registros de actividad para este usuario.</p>
                ) : (
                  <table className="historial-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Acción</th>
                        <th>Entidad</th>
                        <th>Detalles</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historialData.map(log => (
                        <tr key={log.id}>
                          <td>{formatDate(log.fecha)}</td>
                          <td>
                            <span className={`action-badge ${log.accion}`}>
                              {getActionDescription(log.accion)}
                            </span>
                          </td>
                          <td>
                            {log.entidad} 
                            {log.entidad_id ? ` #${log.entidad_id}` : ''}
                          </td>
                          <td className="details-cell">
                            {log.detalles && log.detalles.length > 50 
                              ? `${log.detalles.substring(0, 50)}...` 
                              : log.detalles || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              
              <div className="historial-modal-footer">
                <button 
                  className="btn-cerrar" 
                  onClick={() => setShowHistorial(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="user-background"></div>
    </div>
  );
};

export default Usuarios;