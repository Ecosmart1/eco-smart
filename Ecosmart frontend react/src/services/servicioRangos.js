const API_BASE_URL = 'http://localhost:5000/api';

export const servicioRangos = {
  // Obtener todos los rangos
  async obtenerRangos() {
    try {
      const response = await fetch(`${API_BASE_URL}/configuracion/rangos`);
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      const data = await response.json();
      return data.success ? data.rangos : [];
    } catch (error) {
      console.error('Error al obtener rangos:', error);
      throw error;
    }
  },

  // Crear o actualizar rango
  async guardarRango(rangoData) {
    try {
      const response = await fetch(`${API_BASE_URL}/configuracion/rangos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rangoData)
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Error al guardar rango');
      }
      
      return data;
    } catch (error) {
      console.error('Error al guardar rango:', error);
      throw error;
    }
  },

  // Eliminar rango
  async eliminarRango(rangoId) {
    try {
      const response = await fetch(`${API_BASE_URL}/configuracion/rangos/${rangoId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Error al eliminar rango');
      }
      
      return data;
    } catch (error) {
      console.error('Error al eliminar rango:', error);
      throw error;
    }
  },

  // Obtener cultivos disponibles
  async obtenerCultivos() {
    try {
      const response = await fetch(`${API_BASE_URL}/configuracion/rangos/cultivos`);
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      const data = await response.json();
      return data.success ? data.cultivos : [];
    } catch (error) {
      console.error('Error al obtener cultivos:', error);
      throw error;
    }
  },
// Obtener parcelas disponibles
async obtenerParcelas(user) {
  try {
    const response = await fetch(`${API_BASE_URL}/parcelas`, {
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.id,           
        'X-User-Rol': 'agronomo'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📊 Parcelas recibidas del backend:', data);
    
    return Array.isArray(data) ? data : [];
    
  } catch (error) {
    console.error('Error al obtener parcelas:', error);
    throw error;
  }
}
};