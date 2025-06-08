// Componente IconoNotificaciones.jsx (para usar en Header)
import React, { useState } from 'react';
import { Badge, Button, Modal, Spinner, ListGroup } from 'react-bootstrap';
import { BsBell, BsInfoCircle, BsExclamationTriangle, BsCheckCircle } from 'react-icons/bs';
import { useNotificaciones } from './NotificacionesProvider';

const IconoNotificaciones = () => {
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
  
  const handleShowModal = () => {
    setShowModal(true);
    // Opcionalmente recargar al abrir
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
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default IconoNotificaciones;