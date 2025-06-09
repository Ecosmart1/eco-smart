/**
 * Obtiene los headers con información de autenticación del usuario
 * @returns {Object} Headers con Content-Type, token de autorización y datos de usuario si existen
 */
export const getAuthHeaders = () => {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  try {
    // Obtener token del localStorage
    const token = localStorage.getItem('ecosmart_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
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
    // Manejo específico para errores de autenticación
    if (response.status === 401) {
      console.error('Error de autenticación: Token inválido o expirado');
      // Opcional: Limpiar token expirado
      localStorage.removeItem('ecosmart_token');
      
      // Puedes también disparar un evento para notificar a la app sobre el error de autenticación
      window.dispatchEvent(new CustomEvent('auth_error'));
    }
    
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Error: ${response.status}`);
  }
  
  return await response.json();
};

/**
 * Verifica si el token actual es válido
 * @returns {Promise<boolean>} true si el token es válido, false en caso contrario
 */
export const verificarToken = async (apiUrl) => {
  try {
    const token = localStorage.getItem('ecosmart_token');
    if (!token) {
      return false;
    }
    
    const response = await fetch(`${apiUrl}/verificar-token`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error al verificar token:', error);
    return false;
  }
};