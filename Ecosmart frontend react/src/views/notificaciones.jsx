import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

// Crear contexto de notificaciones
export const NotificacionesContext = createContext();

// Hook personalizado para usar el contexto
export const useNotificaciones = () => useContext(NotificacionesContext);

/**
 * Proveedor del contexto de notificaciones
 * Gestiona el estado y la lógica de notificaciones para toda la aplicación
 */
export const NotificacionesProvider = ({ children }) => {
  // Estados principales
  const [notificaciones, setNotificaciones] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Obtener el ID de usuario del localStorage
  const userId = localStorage.getItem('userId') || 
                (localStorage.getItem('ecosmart_user') ? 
                JSON.parse(localStorage.getItem('ecosmart_user')).id : null);
  
  /**
   * Carga las notificaciones desde el servidor
   * @param {boolean} mostrarSoloNoLeidas - Si es true, solo trae las notificaciones no leídas
   */
  const cargarNotificaciones = async (mostrarSoloNoLeidas = false) => {
    if (!userId) {
      console.log("No hay usuario autenticado, omitiendo carga de notificaciones");
      return;
    }
    
    setLoading(true);
    try {
      console.log("Cargando notificaciones para usuario", userId);
      const response = await axios.get(`/api/notificaciones?no_leidas=${mostrarSoloNoLeidas}`, {
        headers: { 
          'X-User-Id': userId,
          'Content-Type': 'application/json'
        }
      });
      
      // Validar que los datos tienen la estructura esperada
      if (response.data && Array.isArray(response.data.notificaciones)) {
        setNotificaciones(response.data.notificaciones);
        setNoLeidas(response.data.total_no_leidas || 0);
      } else {
        console.warn("Formato inesperado de respuesta:", response.data);
        setNotificaciones([]);
        setNoLeidas(0);
      }
      
      setError(null);
    } catch (err) {
      console.error("Error cargando notificaciones:", err);
      setError("No se pudieron cargar las notificaciones");
      setNotificaciones([]);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Marca una notificación como leída
   * @param {number} id - El ID de la notificación a marcar
   */
  const marcarLeida = async (id) => {
    if (!userId || !id) return;
    
    try {
      console.log("Marcando como leída la notificación", id);
      await axios.put(`/api/notificaciones/${id}/leer`, {}, {
        headers: { 
          'X-User-Id': userId,
          'Content-Type': 'application/json'
        }
      });
      
      // Actualizar estado local para reflejar el cambio inmediatamente
      setNotificaciones(prev => 
        prev.map(n => n.id === id ? {...n, leida: true} : n)
      );
      setNoLeidas(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error al marcar notificación como leída:", err);
      // Opcionalmente, mostrar un mensaje de error al usuario
    }
  };
  
  /**
   * Marca todas las notificaciones como leídas
   */
  const marcarTodasLeidas = async () => {
    if (!userId) return;
    
    try {
      console.log("Marcando todas las notificaciones como leídas");
      await axios.put(`/api/notificaciones/leer-todas`, {}, {
        headers: { 
          'X-User-Id': userId,
          'Content-Type': 'application/json'
        }
      });
      
      // Actualizar estado local
      setNotificaciones(prev => prev.map(n => ({...n, leida: true})));
      setNoLeidas(0);
    } catch (err) {
      console.error("Error al marcar todas las notificaciones:", err);
      // Opcionalmente, mostrar un mensaje de error al usuario
    }
  };
  
  /**
   * Ejecuta la acción asociada a una notificación
   * @param {Object} notificacion - La notificación que contiene la acción
   */
  const ejecutarAccion = (notificacion) => {
    if (!notificacion || !notificacion.accion) {
      console.log("Notificación sin acción definida");
      return;
    }
    
    // Marcar como leída primero
    marcarLeida(notificacion.id);
    
    // Ejecutar la acción correspondiente
    console.log(`Ejecutando acción: ${notificacion.accion}`);
    switch (notificacion.accion) {
      case 'ver_parcela':
        if (notificacion.entidad_id) {
          // Determinar si es agronomo o agricultor para la URL
          const rol = localStorage.getItem('ecosmart_user') 
            ? JSON.parse(localStorage.getItem('ecosmart_user')).rol 
            : 'agricultor';
            
          window.location.href = `/dashboard/${rol}/parcelas/${notificacion.entidad_id}`;
        }
        break;
        
      case 'ajustar_riego':
        if (notificacion.entidad_id) {
          const rol = localStorage.getItem('ecosmart_user') 
            ? JSON.parse(localStorage.getItem('ecosmart_user')).rol 
            : 'agricultor';
            
          window.location.href = `/dashboard/${rol}/parcelas/${notificacion.entidad_id}/riego`;
        }
        break;
        
      case 'ver_cultivo':
        if (notificacion.entidad_id) {
          window.location.href = `/dashboard/agronomo/cultivos/${notificacion.entidad_id}`;
        }
        break;
        
      case 'ver_alertas':
        const rol = localStorage.getItem('ecosmart_user') 
          ? JSON.parse(localStorage.getItem('ecosmart_user')).rol 
          : 'agricultor';
        window.location.href = `/dashboard/${rol}/alertas`;
        break;
        
      default:
        console.log(`Acción no implementada: ${notificacion.accion}`);
    }
  };
  
  // Iniciar intervalo de actualización al montar
  useEffect(() => {
    if (userId) {
      // Cargar notificaciones inicialmente
      cargarNotificaciones();
      
      // Actualizar cada 30 segundos
      const intervalo = setInterval(() => {
        cargarNotificaciones();
      }, 30000);
      
      // Limpiar el intervalo al desmontar
      return () => clearInterval(intervalo);
    }
  }, [userId]);
  
  // Valores que expondrá el contexto
  const contextValue = {
    notificaciones,
    noLeidas,
    loading,
    error,
    cargarNotificaciones,
    marcarLeida,
    marcarTodasLeidas,
    ejecutarAccion
  };
  
  return (
    <NotificacionesContext.Provider value={contextValue}>
      {children}
    </NotificacionesContext.Provider>
  );
};

// Componente para mostrar un icono de notificaciones en el header
export const IconoNotificaciones = () => {
  const [showModal, setShowModal] = useState(false);
  const { 
    notificaciones, 
    noLeidas, 
    loading, 
    marcarLeida, 
    marcarTodasLeidas,
    ejecutarAccion,
    cargarNotificaciones 
  } = useNotificaciones();
  
  // Importamos los íconos y componentes necesarios dinámicamente
  // para evitar problemas si no están disponibles
  const [components, setComponents] = useState(null);
  
  // Cargar los componentes necesarios
  useEffect(() => {
    const loadComponents = async () => {
      try {
        // Importamos los componentes de forma dinámica
        const reactBootstrap = await import('react-bootstrap');
        const reactIcons = await import('react-icons/bs');
        const reactRouter = await import('react-router-dom');
        
        setComponents({
          Badge: reactBootstrap.Badge,
          Button: reactBootstrap.Button,
          Modal: reactBootstrap.Modal,
          Spinner: reactBootstrap.Spinner,
          ListGroup: reactBootstrap.ListGroup,
          BsBell: reactIcons.BsBell,
          BsInfoCircle: reactIcons.BsInfoCircle,
          BsExclamationTriangle: reactIcons.BsExclamationTriangle,
          BsCheckCircle: reactIcons.BsCheckCircle,
          Link: reactRouter.Link
        });
      } catch (err) {
        console.error("Error cargando componentes:", err);
      }
    };
    
    loadComponents();
  }, []);
  
  // Si los componentes no están cargados, mostrar un fallback
  if (!components) {
    return (
      <button 
        className="btn btn-outline-light position-relative"
        onClick={() => {}}
      >
        🔔
        {noLeidas > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>
    );
  }
  
  const { Badge, Button, Modal, Spinner, ListGroup, 
          BsBell, BsInfoCircle, BsExclamationTriangle, BsCheckCircle, Link } = components;
  
  const handleShowModal = () => {
    setShowModal(true);
    // Cargar notificaciones frescas al abrir
    cargarNotificaciones();
  };
  
  const getIcono = (tipo) => {
    switch(tipo) {
      case 'warning': return <BsExclamationTriangle className="text-warning" />;
      case 'error': return <BsExclamationTriangle className="text-danger" />;
      case 'success': return <BsCheckCircle className="text-success" />;
      default: return <BsInfoCircle className="text-info" />;
    }
  };
  
  return (
    <>
      <Button 
        variant="outline-light" 
        className="position-relative"
        onClick={handleShowModal}
      >
        <BsBell size={20} />
        {noLeidas > 0 && (
          <Badge 
            pill 
            bg="danger" 
            className="position-absolute top-0 start-100 translate-middle"
          >
            {noLeidas > 9 ? '9+' : noLeidas}
          </Badge>
        )}
      </Button>
      
      <Modal 
        show={showModal} 
        onHide={() => setShowModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Centro de notificaciones</Modal.Title>
          {noLeidas > 0 && (
            <Button 
              variant="outline-secondary" 
              size="sm"
              className="ms-auto me-2"
              onClick={marcarTodasLeidas}
            >
              Marcar todas como leídas
            </Button>
          )}
        </Modal.Header>
        <Modal.Body className="p-0">
          {loading ? (
            <div className="d-flex justify-content-center p-4">
              <Spinner animation="border" />
            </div>
          ) : notificaciones.length === 0 ? (
            <p className="text-center p-4">No tienes notificaciones</p>
          ) : (
            <ListGroup variant="flush">
              {notificaciones.map(notif => (
                <ListGroup.Item 
                  key={notif.id}
                  className={!notif.leida ? 'fw-bold border-start border-4 border-primary' : ''}
                  action={!notif.leida}
                  onClick={() => !notif.leida && marcarLeida(notif.id)}
                >
                  <div className="d-flex">
                    <div className="me-2 fs-5 align-self-center">
                      {getIcono(notif.tipo)}
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">{notif.titulo}</h6>
                        <small className="text-muted ms-2">
                          {new Date(notif.fecha).toLocaleString()}
                        </small>
                      </div>
                      <p className="mb-1 text-secondary">{notif.mensaje}</p>
                      {notif.accion && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            ejecutarAccion(notif);
                          }}
                        >
                          {notif.accion === 'ver_parcela' ? 'Ver parcela' : 
                           notif.accion === 'ajustar_riego' ? 'Ajustar riego' : 
                           notif.accion === 'ver_cultivo' ? 'Ver cultivo' :
                           notif.accion === 'ver_alertas' ? 'Ver alertas' :
                           notif.accion}
                        </Button>
                      )}
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between">
          <Button 
            variant="outline-primary" 
            as={Link} 
            to="/notificaciones"
            onClick={() => setShowModal(false)}
          >
            Ver todas
          </Button>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default NotificacionesProvider;