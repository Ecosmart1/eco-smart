import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  getConversaciones, 
  getConversacion, 
  enviarMensaje, 
  nuevaConversacion, 
  eliminarConversacion 
} from '../services/servicioOpenrouter.js';
import './conversaciones.css'; // Asegúrate de tener estilos para el chat
import Markdown from 'markdown-to-jsx';

const API_URL = "http://localhost:5000/api";

const ChatContainer = ({ userId }) => {
  const [conversaciones, setConversaciones] = useState([]);
  const [mensajes, setMensajes] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [conversacionActual, setConversacionActual] = useState(null);
  const [cargando, setCargando] = useState(false);
  
  // Nuevos estados para integración con sensores
  const [parcelaSeleccionada, setParcelaSeleccionada] = useState(null);
  const [parcelas, setParcelas] = useState([]);
  const mensajesFinRef = useRef(null);

  // Obtener datos de navegación (si viene de dashboard con contexto)
  const location = useLocation();
  const initialMessage = location.state?.initialMessage || '';
  const initialParcelaId = location.state?.parcelaId || null;

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

  // Cargar parcelas al montar el componente
  useEffect(() => {
    const fetchParcelas = async () => {
      try {
        const response = await fetch(`${API_URL}/parcelas`);
        if (response.ok) {
          const data = await response.json();
          setParcelas(data);
        }
      } catch (error) {
        console.error('Error cargando parcelas:', error);
      }
    };
    
    fetchParcelas();
  }, []);

  // Establecer mensaje inicial y parcela si vienen en la navegación
  useEffect(() => {
    if (initialMessage) {
      setMensaje(initialMessage);
      
      // Si hay parcela seleccionada
      if (initialParcelaId) {
        setParcelaSeleccionada(initialParcelaId);
      }
    }
  }, [initialMessage, initialParcelaId]);

  // Hacer scroll automático a los mensajes más recientes
  useEffect(() => {
    if (mensajesFinRef.current) {
      mensajesFinRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensajes]);

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

const obtenerDatosParcela = async (parcelaId) => {
    try {
      const response = await fetch(`${API_URL}/parcela/${parcelaId}/datos`);
      if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error al obtener datos de parcela:", error);
      throw error;
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
    // NUEVO: Detectar si el mensaje es sobre datos de parcela
    if (mensaje.toLowerCase().includes("datos de mi parcela")) {
      // Verificar que haya una parcela seleccionada
      if (!parcelaSeleccionada) {
        throw new Error("No hay una parcela seleccionada. Por favor, selecciona una parcela primero.");
      }
      
      console.log(`Obteniendo datos para parcela ID: ${parcelaSeleccionada}`);
      setMensaje(''); // Limpiar campo de entrada

      try {
        // Llamar a la API directamente para obtener datos de parcela
        const datosParcela = await obtenerDatosParcela(parcelaSeleccionada);
        
        // Formatear los datos de manera legible
        const datosFormateados = `# Datos de la parcela: ${getParcelaNombre(parcelaSeleccionada)}\n\n` +
          Object.entries(datosParcela).map(([key, value]) => {
            // Si es un array, formatearlo como lista
            if (Array.isArray(value)) {
              return `- **${key}**: ${value.join(', ')}`;
            }
            return `- **${key}**: ${value}`;
          }).join('\n');
        
        // Crear mensaje de respuesta con los datos
        const mensajeRespuesta = {
          sender: 'assistant',
          content: datosFormateados,
          timestamp: new Date().toISOString()
        };
        
        // Guardar en el historial de la conversación si hay una activa
        if (conversacionActual) {
          await enviarMensaje(
            userId, 
            `Datos de parcela ${getParcelaNombre(parcelaSeleccionada)}`, 
            conversacionActual, 
            { tipo: "datos_parcela", parcela_id: parcelaSeleccionada }
          );
        }
        
        setMensajes(prevMensajes => [...prevMensajes, mensajeRespuesta]);
        return; // Termina aquí, no continúes con el flujo normal
      } catch (parcelaError) {
        console.error("Error obteniendo datos de parcela:", parcelaError);
        throw new Error(`No se pudieron obtener los datos. Detalles: ${parcelaError.message}`);
      }
    }
    
    // FLUJO NORMAL para otros mensajes
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
    
    // Crear objeto de contexto con parcela seleccionada
    const contextData = {
      parcela_id: parcelaSeleccionada,
      timestamp: new Date().toISOString()
    };
    
    // Añadir ubicación si está disponible (para futuras integraciones)
    // if (ubicacionActual) {
    //   contextData.ubicacion = ubicacionActual;
    // }
    
    console.log("Enviando con contexto:", contextData);
    
    // Enviar mensaje con el contexto al sistema de IA
    const respuesta = await enviarMensaje(userId, mensajeEnviado, convId, contextData);
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
 const enviarEjemplo = async (texto) => {
  if (!conversacionActual) {
    // Crea la conversación y espera a que esté lista
    const res = await nuevaConversacion(userId);
    const nuevaConv = res.data;
    setConversacionActual(nuevaConv.id);
    await cargarConversaciones();

    // Muestra el mensaje de bienvenida y el mensaje de ejemplo del usuario
    setMensajes([
      {
        sender: 'assistant',
        content: '¡Hola! Soy el asistente de EcoSmart. ¿En qué puedo ayudarte hoy?',
        timestamp: new Date().toISOString()
      },
      {
        sender: 'user',
        content: texto,
        timestamp: new Date().toISOString()
      }
    ]);

    // Envía el mensaje de ejemplo usando el ID correcto
    setTimeout(() => {
      handleEnviarMensajeEjemplo(texto, nuevaConv.id);
    }, 100);
  } else {
    // Si ya hay conversación, muestra el mensaje y envía normalmente
    setMensajes(prevMensajes => [
      ...prevMensajes,
      {
        sender: 'user',
        content: texto,
        timestamp: new Date().toISOString()
      }
    ]);
    setTimeout(() => {
      handleEnviarMensajeEjemplo(texto, conversacionActual);
    }, 0);
  }
};

// Modifica handleEnviarMensajeEjemplo para aceptar el ID de conversación
const handleEnviarMensajeEjemplo = async (texto, convIdParam) => {
  if (!texto.trim()) return;

  setCargando(true);

  try {
    let convId = convIdParam || conversacionActual;
    if (!convId) {
      const nuevaConv = await nuevaConversacion(userId);
      convId = nuevaConv.data.id;
      setConversacionActual(convId);
      await cargarConversaciones();
    }

    setMensaje(''); // Limpiar campo de entrada

    const contextData = {
      parcela_id: parcelaSeleccionada,
      timestamp: new Date().toISOString()
    };

    const respuesta = await enviarMensaje(userId, texto, convId, contextData);

    // Si la respuesta es vacía, muestra un mensaje por defecto
    const respuestaIA = (respuesta.data && respuesta.data.reply && respuesta.data.reply.trim())
      ? respuesta.data.reply
      : "No se recibió respuesta de la IA. Intenta nuevamente.";

    const mensajeRespuesta = {
      sender: 'assistant',
      content: respuestaIA,
      timestamp: new Date().toISOString()
    };

    setMensajes(prevMensajes => [...prevMensajes, mensajeRespuesta]);
  } catch (error) {
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

  const getParcelaNombre = (id) => {
    const parcela = parcelas.find(p => p.id === id);
    return parcela ? parcela.nombre : 'Parcela seleccionada';
  };

  return (
    <div className="chat-container">
      <div className="sidebar">
        <button onClick={handleNuevaConversacion}>Nueva conversación</button>
        
        {/* Selector de parcela para contextualizar */}
        <div className="chat-context-selector">
          <label htmlFor="selector-parcela">Contexto de datos:</label>
          <select 
            id="selector-parcela"
            value={parcelaSeleccionada || ''}
            onChange={(e) => setParcelaSeleccionada(e.target.value || null)}
            className="select-parcela"
          >
            <option value="">Todas las parcelas</option>
            {parcelas.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
          
          {parcelaSeleccionada && (
            <div className="parcela-seleccionada-info">
              <span>Analizando datos de: <strong>{getParcelaNombre(parcelaSeleccionada)}</strong></span>
            </div>
          )}
        </div>
        
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
              
              {parcelaSeleccionada ? (
                <div className="contexto-activo">
                  <p className="contexto-titulo">
                    <i className="fas fa-info-circle"></i> 
                    Consultando datos de parcela: <strong>{getParcelaNombre(parcelaSeleccionada)}</strong>
                  </p>
                </div>
              ) : null}
              
              <p className="ejemplos-titulo">Puedes preguntarme sobre:</p>
              <div className="ejemplos-preguntas">
                <button
                  onClick={() => enviarEjemplo("¿Cómo puedo mejorar el riego de mis cultivos?")}
                >
                  ¿Cómo puedo mejorar el riego de mis cultivos?
                </button>
                <button
                  onClick={() => enviarEjemplo("¿Qué datos muestran los sensores de humedad?")}
                >
                  ¿Qué datos muestran los sensores de humedad?
                </button>
                <button
                  onClick={() =>
                    enviarEjemplo(
                      `Recomienda acciones para mi parcela ${
                        parcelaSeleccionada ? getParcelaNombre(parcelaSeleccionada) : ""
                      }`
                    )
                  }
                >
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
              {parcelaSeleccionada && (
                <div className="contexto-mensaje">
                  <i className="fas fa-info-circle"></i> 
                  Estás consultando con datos de la parcela: <strong>{getParcelaNombre(parcelaSeleccionada)}</strong>
                </div>
              )}
              
              {mensajes.map((msg, idx) => (
                <div key={idx} className={`mensaje ${msg.sender}`}>
                  <div className="contenido">
                    {msg.sender === 'assistant'
                      ? <Markdown
                          options={{
                            forceBlock: true,
                            overrides: {
                              h1: { props: { style: { fontSize: '1.2em', margin: '8px 0 4px 0' } } },
                              h2: { props: { style: { fontSize: '1.1em', margin: '8px 0 4px 0' } } },
                              h3: { props: { style: { fontSize: '1em', margin: '8px 0 4px 0' } } },
                              ul: { props: { style: { margin: '2px 0', paddingLeft: '22px', lineHeight: '1.3' } } },
                              ol: { props: { style: { margin: '2px 0', paddingLeft: '22px', lineHeight: '1.3' } } },
                              li: { props: { style: { marginBottom: '2px', lineHeight: '1.3' } } },
                              p: { props: { style: { margin: 0, lineHeight: '1.4' } } }
                            }
                          }}
                        >
                          {msg.content}
                        </Markdown>
                      : msg.content}
                  </div>
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
              <div ref={mensajesFinRef}></div> {/* Referencia para scroll */}
            </div>
            
            <div className="entrada-mensaje">
              <input
                type="text"
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleEnviarMensaje()}
                placeholder={`Escribe un mensaje${parcelaSeleccionada ? ` sobre ${getParcelaNombre(parcelaSeleccionada)}` : ''}...`}
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