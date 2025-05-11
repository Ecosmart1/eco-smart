const API_URL = 'http://localhost:5000/api';

// Obtener todas las conversaciones de un usuario
// Obtener todas las conversaciones de un usuario
export const getConversaciones = async (userId) => {
  try {
    const response = await fetch(`${API_URL}/conversaciones/${userId}`);
    
    if (!response.ok) {
      if (response.status === 500) {
        console.error('Error 500 en servidor - Retornando lista vacía');
        return { data: [] }; // Devuelve lista vacía en caso de error 500
      }
      throw new Error('Error al obtener conversaciones');
    }
    
    return { data: await response.json() };
  } catch (error) {
    console.error('Error en getConversaciones:', error);
    return { data: [] }; // Devuelve lista vacía en caso de cualquier error
  }
};

// Obtener mensajes de una conversación específica
// Ajustar la función getConversacion para incluir el userId
export const getConversacion = async (convId, userId) => {
  try {
    const response = await fetch(`${API_URL}/chat/${convId}?user_id=${userId}`);
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('No tienes permiso para ver esta conversación');
      }
      throw new Error(`Error ${response.status}`);
    }
    
    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('Error en getConversacion:', error);
    throw error;
  }
};

// Enviar nuevo mensaje y obtener respuesta
// Enviar nuevo mensaje y obtener respuesta
// Modificar la función enviarMensaje para aceptar datos de contexto

export const enviarMensaje = async (userId, mensaje, convId = null, contextData = {}) => {
  console.log('Enviando mensaje con contexto:', { userId, mensaje, convId, contextData });
  
  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        message: mensaje,
        conversation_id: convId,
        context: contextData  // Datos de contexto (parcela seleccionada, etc.)
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Error en la respuesta: ${response.status}`, errorData);
      throw new Error(`Error ${response.status}: ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('Error en enviarMensaje:', error);
    throw error;
  }
};

// Crear una nueva conversación
export const nuevaConversacion = async (userId) => {
  console.log(`Intentando crear conversación para usuario: ${userId}`);
  
  try {
    const response = await fetch(`${API_URL}/conversaciones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user_id: userId })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error del servidor: ${response.status} - ${errorText}`);
      throw new Error(`Error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Conversación creada exitosamente:', data);
    return { data };
  } catch (error) {
    console.error('Error en nuevaConversacion:', error);
    throw error;
  }
};

// Eliminar una conversación

export const eliminarConversacion = async (convId, userId) => {
  const response = await fetch(`${API_URL}/conversaciones/${convId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
  
  return await response.json();
};


