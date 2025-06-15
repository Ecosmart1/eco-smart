import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuthHeaders } from '../services/serviciorutas';
import './Usuarios.css';

const API_URL = "http://localhost:5000/api";

const Usuarios = () => {
  const navigate = useNavigate();
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
    // Verificar autenticación
    const usuario = localStorage.getItem('ecosmart_user');
    const token = localStorage.getItem('ecosmart_token');
    
    if (!usuario || !token) {
      navigate('/login');
      return;
    }

    try {
      const usuarioObj = JSON.parse(usuario);
      if (usuarioObj.rol !== 'tecnico') {
        navigate('/login');
        return;
      }
    } catch (error) {
      console.error('Error al verificar usuario:', error);
      navigate('/login');
      return;
    }

    fetchUsuarios();
  }, [navigate]);

  const fetchUsuarios = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/usuarios`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (response.status === 401 || response.status === 403) {
        // Token expirado o sin permisos
        localStorage.removeItem('ecosmart_token');
        localStorage.removeItem('ecosmart_user');
        navigate('/login');
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      setError(`Error al cargar usuarios: ${err.message}`);
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
      setError('');
      
      const response = await fetch(`${API_URL}/usuarios/${id}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm),
      });
      
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('ecosmart_token');
        localStorage.removeItem('ecosmart_user');
        navigate('/login');
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al actualizar usuario');
      }
      
      setEditUserId(null);
      await fetchUsuarios();
      
      // Mostrar mensaje de éxito
      setError('Usuario actualizado exitosamente');
      setTimeout(() => setError(''), 3000);
      
    } catch (err) {
      console.error('Error al actualizar usuario:', err);
      setError(`Error al actualizar: ${err.message}`);
    }
  };

  const handleEditCancel = () => {
    setEditUserId(null);
    setEditForm({ nombre: '', email: '', rol: '' });
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    
    try {
      setError('');
      
      const response = await fetch(`${API_URL}/usuarios/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('ecosmart_token');
        localStorage.removeItem('ecosmart_user');
        navigate('/login');
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al eliminar usuario');
      }
      
      await fetchUsuarios();
      
      // Mostrar mensaje de éxito
      setError('Usuario eliminado exitosamente');
      setTimeout(() => setError(''), 3000);
      
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
      setError(`Error al eliminar: ${err.message}`);
    }
  };

  // Función para cargar el historial de un usuario
  const fetchHistorialUsuario = async (userId, userName) => {
    setLoadingHistorial(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/logs?usuario_id=${userId}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('ecosmart_token');
        localStorage.removeItem('ecosmart_user');
        navigate('/login');
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al cargar el historial');
      }
      
      const data = await response.json();
      setHistorialData(data.logs || data || []);
      setSelectedUser({ id: userId, nombre: userName });
      setShowHistorial(true);
      
    } catch (err) {
      console.error('Error al cargar historial:', err);
      setError(`Error al cargar historial: ${err.message}`);
    } finally {
      setLoadingHistorial(false);
    }
  };

  // Formatear fecha para mostrar en la tabla
  const formatDate = (dateString) => {
    try {
      const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      return new Date(dateString).toLocaleDateString('es-ES', options);
    } catch (error) {
      return 'Fecha inválida';
    }
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

  // Función para obtener clase CSS según tipo de error/éxito
  const getMessageClass = (message) => {
    if (message.includes('exitosamente')) {
      return 'success-message';
    }
    return 'error-message';
  };

  return (
    <div className="user-page">
      <div className="user-content">
        <div className="back-to-home">
          <Link to="/dashboard/tecnico" className="btn-back-home">
            <i className="fas fa-arrow-left"></i> Volver al panel
          </Link>
        </div>
        
        <div className="page-header">
          <h2>Usuarios Registrados</h2>
          <p className="user-subtitle">Visualiza y gestiona los usuarios actualmente en la plataforma</p>
        </div>

        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <span>Cargando usuarios...</span>
          </div>
        )}
        
        {error && (
          <div className={getMessageClass(error)}>
            <i className={`fas ${error.includes('exitosamente') ? 'fa-check-circle' : 'fa-exclamation-triangle'}`}></i>
            {error}
          </div>
        )}
        
        {!loading && !error && usuarios.length === 0 && (
          <div className="no-data-message">
            <i className="fas fa-users"></i>
            <p>No se encontraron usuarios registrados</p>
          </div>
        )}

        {!loading && usuarios.length > 0 && (
          <div className="user-table-wrapper">
            <div className="table-header">
              <h3>Total de usuarios: {usuarios.length}</h3>
              <button 
                className="btn-refresh"
                onClick={fetchUsuarios}
                disabled={loading}
              >
                <i className="fas fa-sync-alt"></i> Actualizar
              </button>
            </div>
            
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
                    <td>
                      <span className="user-id">#{usuario.id}</span>
                    </td>
                    <td>
                      {editUserId === usuario.id ? (
                        <input
                          name="nombre"
                          value={editForm.nombre}
                          onChange={handleEditChange}
                          className="edit-input"
                          placeholder="Nombre del usuario"
                        />
                      ) : (
                        <span className="user-name">{usuario.nombre}</span>
                      )}
                    </td>
                    <td>
                      {editUserId === usuario.id ? (
                        <input
                          name="email"
                          type="email"
                          value={editForm.email}
                          onChange={handleEditChange}
                          className="edit-input"
                          placeholder="Correo electrónico"
                        />
                      ) : (
                        <span className="user-email">{usuario.email}</span>
                      )}
                    </td>
                    <td>
                      {editUserId === usuario.id ? (
                        <select
                          name="rol"
                          value={editForm.rol}
                          onChange={handleEditChange}
                          className="edit-select"
                        >
                          <option value="tecnico">Técnico</option>
                          <option value="agricultor">Agricultor</option>
                          <option value="agronomo">Agrónomo</option>
                        </select>
                      ) : (
                        <span className={`role-badge ${usuario.rol}`}>
                          {usuario.rol}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        {editUserId === usuario.id ? (
                          <>
                            <button 
                              className="btn-save"
                              onClick={() => handleEditSave(usuario.id)}
                            >
                              <i className="fas fa-check"></i> Guardar
                            </button>
                            <button 
                              className="btn-cancel"
                              onClick={handleEditCancel}
                            >
                              <i className="fas fa-times"></i> Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              className="btn-edit"
                              onClick={() => handleEditClick(usuario)}
                              title="Editar usuario"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="btn-historial"
                              onClick={() => fetchHistorialUsuario(usuario.id, usuario.nombre)}
                              title="Ver historial"
                            >
                              <i className="fas fa-history"></i>
                            </button>
                            <button
                              className="btn-delete"
                              onClick={() => handleDeleteUser(usuario.id)}
                              title="Eliminar usuario"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </>
                        )}
                      </div>
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
                <h3>
                  <i className="fas fa-history"></i>
                  Historial de Acciones - {selectedUser?.nombre}
                </h3>
                <button 
                  className="close-modal-btn"
                  onClick={() => setShowHistorial(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="historial-modal-body">
                {loadingHistorial ? (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <span>Cargando historial...</span>
                  </div>
                ) : historialData.length === 0 ? (
                  <div className="no-data-message">
                    <i className="fas fa-clipboard-list"></i>
                    <p>No hay registros de actividad para este usuario.</p>
                  </div>
                ) : (
                  <div className="historial-table-wrapper">
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
                            <td className="date-cell">
                              {formatDate(log.fecha)}
                            </td>
                            <td>
                              <span className={`action-badge ${log.accion}`}>
                                {getActionDescription(log.accion)}
                              </span>
                            </td>
                            <td className="entity-cell">
                              <span className="entity-name">{log.entidad}</span>
                              {log.entidad_id && (
                                <span className="entity-id">#{log.entidad_id}</span>
                              )}
                            </td>
                            <td className="details-cell">
                              {log.detalles && log.detalles.length > 50 
                                ? (
                                  <span title={log.detalles}>
                                    {log.detalles.substring(0, 50)}...
                                  </span>
                                )
                                : (log.detalles || '-')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              <div className="historial-modal-footer">
                <button 
                  className="btn-cerrar" 
                  onClick={() => setShowHistorial(false)}
                >
                  <i className="fas fa-times"></i> Cerrar
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