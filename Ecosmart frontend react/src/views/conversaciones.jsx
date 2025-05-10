import React, { useState, useEffect } from 'react';
import { 
  getConversaciones, 
  getConversacion, 
  enviarMensaje, 
  nuevaConversacion, 
  eliminarConversacion 
} from '../services/servicioOpenrouter.js';
import './conversaciones.css'; // Asegúrate de tener estilos para el chat

const ChatContainer = ({ userId }) => {
  const [conversaciones, setConversaciones] = useState([]);
  const [mensajes, setMensajes] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [conversacionActual, setConversacionActual] = useState(null);
  const [cargando, setCargando] = useState(false);

  // Cargar conversaciones al iniciar
  useEffect(() => {
    if (userId) {
      cargarConversaciones();
    }
  }, [userId]);

  // Cargar mensajes cuando se selecciona una conversación
  useEffect(() => {
    if (conversacionActual) {
      cargarMensajes(conversacionActual);
    }
  }, [conversacionActual]);

  const cargarConversaciones = async () => {
    try {
      const res = await getConversaciones(userId);
      setConversaciones(res.data);
    } catch (error) {
      console.error("Error al cargar conversaciones:", error);
    }
  };

  const cargarMensajes = async (convId) => {
    try {
      const res = await getConversacion(convId, userId);
      setMensajes(res.data.messages);
    } catch (error) {
      console.error("Error al cargar mensajes:", error);
      // Mostrar mensaje de error al usuario
      setMensajes([{
        sender: 'sistema',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
      // Si el error es de permisos, deseleccionar la conversación
      if (error.message.includes('permiso')) {
        setConversacionActual(null);
      }
    }
  };

  const handleNuevaConversacion = async () => {
    try {
      setCargando(true);
      console.log(`Intentando crear conversación para usuario: ${userId}`);
      
      // Verificar que userId sea válido
      if (!userId) {
        setMensajes([{
          sender: 'sistema',
          content: 'Error: No hay un usuario identificado. Por favor, inicia sesión de nuevo.',
          timestamp: new Date().toISOString()
        }]);
        setCargando(false);
        return;
      }
      
      const res = await nuevaConversacion(userId);
      const nuevaConv = res.data;
      
      console.log(`Conversación creada con ID: ${nuevaConv.id}`);
      setConversacionActual(nuevaConv.id);
      setMensajes([]);
      await cargarConversaciones();
      
      // Mensaje de bienvenida
      setMensajes([{
        sender: 'assistant',
        content: '¡Hola! Soy el asistente de EcoSmart. ¿En qué puedo ayudarte hoy?',
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error("Error al crear conversación:", error);
      setMensajes([{
        sender: 'sistema',
        content: `Error: ${error.message || 'Error al crear conversación'}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setCargando(false);
    }
  };

  const handleEnviarMensaje = async () => {
    if (!mensaje.trim()) return;
    
    setCargando(true);
    
    // Mostrar mensaje del usuario de inmediato
    const nuevoMensaje = {
      sender: 'user',
      content: mensaje,
      timestamp: new Date().toISOString()
    };
    setMensajes([...mensajes, nuevoMensaje]);
    
    try {
      // Si no hay conversación actual, crear una nueva
      let convId = conversacionActual;
      if (!convId) {
        console.log('Creando nueva conversación...');
        const nuevaConv = await nuevaConversacion(userId);
        convId = nuevaConv.data.id;
        setConversacionActual(convId);
        await cargarConversaciones();
      }
      
      console.log(`Enviando mensaje a conversación ${convId}`);
      const mensajeEnviado = mensaje;
      setMensaje(''); // Limpiar campo de entrada
      
      const respuesta = await enviarMensaje(userId, mensajeEnviado, convId);
      console.log('Respuesta recibida:', respuesta);
      
      // Añadir respuesta del asistente
      const mensajeRespuesta = {
        sender: 'assistant',
        content: respuesta.data.reply,
        timestamp: new Date().toISOString()
      };
      
      setMensajes(prevMensajes => [...prevMensajes, mensajeRespuesta]);
    } catch (error) {
      console.error('Error:', error);
      // Mostrar mensaje de error
      setMensajes(prevMensajes => [
        ...prevMensajes, 
        {
          sender: 'sistema',
          content: `Error: ${error.message}`,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setCargando(false);
    }
  };

  const handleEliminarConversacion = async (convId) => {
    try {
      await eliminarConversacion(convId, userId);
      
      if (convId === conversacionActual) {
        setConversacionActual(null);
        setMensajes([]);
      }
      
      await cargarConversaciones();
    } catch (error) {
      console.error("Error al eliminar conversación:", error);
      // Feedback al usuario
      alert("Error al eliminar conversación: " + error.message);
    }
  };

  return (
    <div className="chat-container">
      <div className="sidebar">
        <button onClick={handleNuevaConversacion}>Nueva conversación</button>
        <div className="conversaciones-lista">
          {conversaciones.length > 0 ? (
            conversaciones.map(conv => (
              <div 
                key={conv.id}
                className={`conversacion-item ${conv.id === conversacionActual ? 'active' : ''}`}
                onClick={() => setConversacionActual(conv.id)}
              >
                <span>{new Date(conv.created_at).toLocaleString()}</span>
                <button onClick={(e) => {
                  e.stopPropagation(); // Prevenir que se seleccione la conversación
                  handleEliminarConversacion(conv.id);
                }}>Eliminar</button>
              </div>
            ))
          ) : (
            <div className="no-conversaciones">
              <p>No tienes conversaciones previas</p>
              <p className="tip">Presiona "Nueva conversación" para empezar a chatear.</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="chat-area">
        {!conversacionActual && mensajes.length === 0 ? (
          <div className="bienvenida-chat">
            <div className="bienvenida-contenido">
              <img src="/logo-ecosmart.png" alt="EcoSmart Assistant" className="chat-logo" />
              <h2>Asistente IA de EcoSmart</h2>
              <p>Bienvenido al asistente inteligente de EcoSmart. ¿En qué puedo ayudarte hoy?</p>
              <p className="ejemplos-titulo">Puedes preguntarme sobre:</p>
              <div className="ejemplos-preguntas">
                <button onClick={() => setMensaje("¿Cómo puedo mejorar el riego de mis cultivos?")}>
                  ¿Cómo puedo mejorar el riego de mis cultivos?
                </button>
                <button onClick={() => setMensaje("¿Qué datos muestran los sensores de humedad?")}>
                  ¿Qué datos muestran los sensores de humedad?
                </button>
                <button onClick={() => setMensaje("Recomienda acciones para mi parcela")}>
                  Recomienda acciones para mi parcela
                </button>
              </div>
              <button className="btn-iniciar-chat" onClick={handleNuevaConversacion}>
                Iniciar una conversación
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mensajes">
              {mensajes.map((msg, idx) => (
                <div key={idx} className={`mensaje ${msg.sender}`}>
                  <div className="contenido">{msg.content}</div>
                  <div className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                </div>
              ))}
              {cargando && (
                <div className="mensaje cargando">
                  El asistente está escribiendo
                  <div className="dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="entrada-mensaje">
              <input
                type="text"
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleEnviarMensaje()}
                placeholder="Escribe un mensaje..."
                disabled={cargando}
              />
              <button onClick={handleEnviarMensaje} disabled={cargando || !mensaje.trim()}>
                Enviar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatContainer;