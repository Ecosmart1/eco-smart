// src/views/NotificacionesVista.jsx
import React from 'react';
import { Container, Card, ListGroup, Badge, Button } from 'react-bootstrap';
import { useNotificaciones } from "./notificaciones";
import { BsInfoCircle, BsExclamationTriangle, BsCheckCircle } from 'react-icons/bs';

const NotificacionesVista = () => {
  const { 
    notificaciones, 
    loading, 
    marcarLeida, 
    marcarTodasLeidas,
    ejecutarAccion,
    cargarNotificaciones 
  } = useNotificaciones();

  // Cargar notificaciones al montar
  React.useEffect(() => {
    cargarNotificaciones(false); // false para traer todas, no solo las no leídas
  }, []);

  const getIcono = (tipo) => {
    switch(tipo) {
      case 'warning': return <BsExclamationTriangle className="text-warning" />;
      case 'error': return <BsExclamationTriangle className="text-danger" />;
      case 'success': return <BsCheckCircle className="text-success" />;
      default: return <BsInfoCircle className="text-info" />;
    }
  };

  return (
    <Container className="py-4">
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center bg-primary text-white">
          <h4 className="mb-0">Centro de Notificaciones</h4>
          <Button 
            variant="outline-light" 
            size="sm"
            onClick={marcarTodasLeidas}
          >
            Marcar todas como leídas
          </Button>
        </Card.Header>
        
        <Card.Body>
          {loading ? (
            <p className="text-center">Cargando notificaciones...</p>
          ) : notificaciones.length === 0 ? (
            <p className="text-center">No tienes notificaciones</p>
          ) : (
            <ListGroup variant="flush">
              {notificaciones.map(notif => (
                <ListGroup.Item 
                  key={notif.id}
                  className={`py-3 ${!notif.leida ? 'border-start border-4 border-primary' : ''}`}
                >
                  <div className="d-flex">
                    <div className="me-3 fs-4 align-self-center">
                      {getIcono(notif.tipo)}
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">
                          {notif.titulo}
                          {!notif.leida && 
                            <Badge bg="primary" pill className="ms-2">Nueva</Badge>
                          }
                        </h5>
                        <small className="text-muted">
                          {new Date(notif.fecha).toLocaleString()}
                        </small>
                      </div>
                      <p className="my-2">{notif.mensaje}</p>
                      <div className="d-flex">
                        {notif.accion && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="me-2"
                            onClick={() => ejecutarAccion(notif)}
                          >
                            {notif.accion === 'ver_parcela' ? 'Ver parcela' : 
                             notif.accion === 'ajustar_riego' ? 'Ajustar riego' : 
                             notif.accion}
                          </Button>
                        )}
                        {!notif.leida && (
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => marcarLeida(notif.id)}
                          >
                            Marcar como leída
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default NotificacionesVista;