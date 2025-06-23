import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Button, Alert, Spinner } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaSeedling, FaRuler, FaCalendarAlt, FaCheckCircle, FaUserCircle } from 'react-icons/fa';
import './GestionParcelas.css';

const GestionParcelas = ({ API_URL }) => {
  const [parcelas, setParcelas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [userRole, setUserRole] = useState('');
  const navigate = useNavigate();
  const location = useLocation(); 
  
  // Obtener el rol del usuario al cargar el componente
  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('ecosmart_user');
    if (usuarioGuardado) {
      try {
        const usuario = JSON.parse(usuarioGuardado);
        setUserRole(usuario.rol || '');
      } catch (err) {
        console.error('Error al parsear datos de usuario:', err);
      }
    }
  }, []);
  
  // Verificar si hay un mensaje de éxito en la navegación
  useEffect(() => {
    // Si hay un mensaje en el estado de navegación
    if (location.state && location.state.successMessage) {
      setSuccessMessage(location.state.successMessage);
      
      // Quitar el mensaje después de 5 segundos
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [location]);
  
  // Cargar parcelas al iniciar el componente
  useEffect(() => {
    fetchParcelas();
  }, []);

  // Función para obtener todas las parcelas
  const fetchParcelas = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('ecosmart_user') || '{}');
      const response = await axios.get(`${API_URL}/parcelas`, {
        headers: { 'X-User-Id': user.id }
      });
      setParcelas(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error al cargar parcelas:', err);
      setError('Error al cargar las parcelas. Intente nuevamente más tarde.');
      setLoading(false);
    }
  };

 const handleDelete = async (id) => {
  if (window.confirm('¿Está seguro que desea eliminar esta parcela? Esta acción no se puede deshacer.')) {
    try {
      const user = JSON.parse(localStorage.getItem('ecosmart_user') || '{}');
      
      console.log('🔍 DEBUG Frontend: Eliminando parcela', id, 'Usuario:', user.id);
      
      await axios.delete(`${API_URL}/parcelas/${id}`, {
        headers: { 
          'X-User-Id': user.id,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ DEBUG Frontend: Parcela eliminada exitosamente');
      
      setParcelas(parcelas.filter(parcela => parcela.id !== id));
      setSuccessMessage('Parcela eliminada exitosamente');
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err) {
      console.error('❌ DEBUG Frontend Error:', err);
      console.error('Status:', err.response?.status);
      console.error('Data:', err.response?.data);
      setError(`Error al eliminar la parcela: ${err.response?.data?.error || err.message}`);
    }
  }
};

  // Función para determinar la ruta base según el rol del usuario
  const getBaseRoute = () => {
    if (userRole === 'agronomo') {
      return '/dashboard/agronomo';
    } else if (userRole === 'agricultor') {
      return '/dashboard/agricultor';
    } else if (userRole === 'tecnico') {
      return '/dashboard/agronomo'; // Los técnicos usan la misma ruta que los agrónomos
    } else {
      // Si no hay rol definido, usar la ruta actual
      const currentPath = location.pathname;
      if (currentPath.includes('/dashboard/agronomo')) {
        return '/dashboard/agronomo';
      } else if (currentPath.includes('/dashboard/agricultor')) {
        return '/dashboard/agricultor';
      } else {
        // Valor predeterminado si no se puede determinar
        return '/dashboard';
      }
    }
  };

  // Función para ir a crear una nueva parcela
  const handleNewParcela = () => {
    navigate(`${getBaseRoute()}/parcelas/nueva`);
  };

  // Función para ver detalles de una parcela
  const verDetalleParcela = (id) => {
    navigate(`${getBaseRoute()}/parcelas/${id}`);
  };

  // Función para editar una parcela
  const editarParcela = (id) => {
    navigate(`${getBaseRoute()}/parcelas/editar/${id}`);
  };

  // Mostrar spinner mientras carga
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "60vh" }}>
        <Spinner animation="border" role="status" className="text-success">
          <span className="visually-hidden">Cargando...</span>
        </Spinner>
      </div>
    );
  }

  // Determinar la clase CSS para el grid según el número de parcelas
  const gridClass = parcelas.length === 1 
    ? 'parcelas-grid single-item' 
    : parcelas.length <= 3 
      ? 'parcelas-grid single-row' 
      : 'parcelas-grid';

  return (
    <div className="gestion-parcelas-container">
      <div className="parcelas-header">
        <h2>Gestión de Parcelas</h2>
        <Button 
          variant="success" 
          onClick={handleNewParcela}
          className="btn-nueva-parcela"
        >
          <FaPlus className="me-2" /> Nueva Parcela
        </Button>
      </div>

      {/* Mensaje de éxito */}
      {successMessage && (
        <Alert variant="success" onClose={() => setSuccessMessage('')} dismissible className="mensaje-exito">
          <FaCheckCircle className="me-2" /> {successMessage}
        </Alert>
      )}

      {/* Mostrar errores si existen */}
      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}

      {/* Lista de parcelas */}
      {parcelas.length === 0 ? (
        <div className="no-parcelas-message">
          <FaSeedling size={48} />
          <h4>No hay parcelas registradas</h4>
          <p className="text-muted">Comience creando una nueva parcela usando el botón "Nueva Parcela".</p>
          <Button 
            variant="success" 
            onClick={handleNewParcela}
            className="mt-3"
          >
            <FaPlus className="me-2" /> Crear Primera Parcela
          </Button>
        </div>
      ) : (
        <div className={gridClass}>
          {parcelas.map(parcela => (
            <div key={parcela.id} className="parcela-card">
              <div className="parcela-header">
                <h4>{parcela.nombre}</h4>
                 {parcela.cultivo_actual && (
                  <span className="parcela-tipo-badge">
                    {parcela.cultivo_actual}
                  </span>
                )}
              </div>
              <div className="parcela-content">
                <div className="parcela-info">
                  {/* Mostrar dueño solo si el usuario es agrónomo */}
                  {userRole === 'agronomo' && (
                    <p>
                      <FaUserCircle />
                      <strong>Dueño:</strong>
                      <span style={{ display: 'inline-block', width: 8 }}></span>
                      {parcela.usuario_nombre ? parcela.usuario_nombre : 'Sin asignar'}
                      {parcela.usuario_email && (
                        <span style={{ color: '#888', fontSize: '0.95em' }}> ({parcela.usuario_email})</span>
                      )}
                    </p>
                  )}
                  <p>
                    <FaSeedling /> 
                    <strong>Cultivo:</strong>
                    <span style={{ display: 'inline-block', width: 8 }}></span>
                    {parcela.cultivo_actual || 'Sin cultivo actual'}
                  </p>
                  <p>
                    <FaRuler /> 
                    <strong>Área:</strong>
                    <span style={{ display: 'inline-block', width: 8 }}></span>
                    {parcela.hectareas || 0} ha
                  </p>
                  <p>
                    <FaCalendarAlt /> 
                    <strong>Fecha siembra:</strong>
                    <span style={{ display: 'inline-block', width: 8 }}></span>
                    {parcela.fecha_siembra ? new Date(parcela.fecha_siembra).toLocaleDateString() : 'No especificada'}
                  </p>
                </div>
                <div className="parcela-actions">
                  <Button 
                    variant="primary" 
                    className="btn-ver-detalles"
                    onClick={() => verDetalleParcela(parcela.id)}
                  >
                    <FaSearch className="me-1" /> Ver Detalles
                  </Button>
                  <div className="action-buttons">
                    <Button 
                      variant="warning" 
                      className="btn-editar"
                      onClick={() => editarParcela(parcela.id)}
                    >
                      <FaEdit /> 
                    </Button>
                    <Button 
                      variant="danger" 
                      className="btn-eliminar"
                      onClick={() => handleDelete(parcela.id)}
                    >
                      <FaTrash />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GestionParcelas;