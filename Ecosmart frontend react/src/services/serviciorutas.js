/**
 * Utilidades para autenticación
 */

/**
 * Obtiene los headers con información de autenticación del usuario
 * @returns {Object} Headers con Content-Type y datos de usuario si existe
 */
export const getAuthHeaders = () => {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  try {
    // Obtener usuario del localStorage
    const usuarioStr = localStorage.getItem('ecosmart_user');
    if (usuarioStr) {
      const usuario = JSON.parse(usuarioStr);
      if (usuario && usuario.id) {
        headers['X-User-Id'] = usuario.id.toString();
        headers['X-User-Rol'] = usuario.rol;
      }
    }
  } catch (error) {
    console.error('Error al obtener headers de autenticación:', error);
  }
  
  return headers;
};


export const apiRequest = async (url, options = {}) => {
  const authHeaders = getAuthHeaders();
  
  const config = {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers
    }
  };
  
  console.log('Realizando petición con headers:', config.headers);
  
  const response = await fetch(url, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error: ${response.status}`);
  }
  
  return await response.json();
};