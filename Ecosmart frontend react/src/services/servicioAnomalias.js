const API_BASE_URL = 'http://localhost:5000/api';

export const servicioAnomalias = {
  // Obtener todas las anomalías
  async obtenerAnomalias(parcelaId = null) {
    try {
      const url = parcelaId 
        ? `${API_BASE_URL}/anomalias?parcela_id=${parcelaId}`
        : `${API_BASE_URL}/anomalias`;
        
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        return data.anomalias;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error al obtener anomalías:', error);
      return [];
    }
  },

  // Obtener salud de una parcela específica
  async obtenerSaludParcela(parcelaId) {
    try {
      const response = await fetch(`${API_BASE_URL}/salud-parcela/${parcelaId}`);
      const data = await response.json();
      
      if (data.success) {
        return {
          salud: data.salud,
          estado: data.estado,
          anomaliasCount: data.anomalias_count
        };
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error al obtener salud de parcela:', error);
      return { salud: 0, estado: 'error', anomaliasCount: 0 };
    }
  },

  // 🗑️ NUEVAS FUNCIONES DE ELIMINACIÓN

  // Eliminar una anomalía específica
 // REEMPLAZAR la función eliminarAnomalia en servicioAnomalias.js:

// Eliminar una anomalía específica
async eliminarAnomalia(anomaliaId) {
  try {
    // 🔧 EXTRAER SOLO EL NÚMERO DEL ID
    let idNumerico = anomaliaId;
    
    if (typeof anomaliaId === 'string' && anomaliaId.includes('anomalia_')) {
      idNumerico = parseInt(anomaliaId.replace('anomalia_', ''));
    }
    
    console.log('🔍 ID original:', anomaliaId);
    console.log('🔢 ID numérico para API:', idNumerico);
    
    const response = await fetch(`${API_BASE_URL}/anomalias/${idNumerico}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('📦 Response data:', data);
    
    if (!data.success) {
      throw new Error(data.message || 'Error al eliminar anomalía');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error eliminando anomalía:', error);
    throw error;
  }
},

  // Eliminar múltiples anomalías por IDs
  async eliminarAnomalias(ids) {
    try {
      const response = await fetch(`${API_BASE_URL}/anomalias/eliminar-multiples`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids })
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Error al eliminar anomalías');
      }
      
      return data;
    } catch (error) {
      console.error('Error eliminando anomalías:', error);
      throw error;
    }
  },

  // Limpiar todas las anomalías detectadas
  async limpiarTodasAnomalias() {
    try {
      const response = await fetch(`${API_BASE_URL}/anomalias/limpiar-todas`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Error al limpiar anomalías');
      }
      
      return data;
    } catch (error) {
      console.error('Error limpiando anomalías:', error);
      throw error;
    }
  },

  // 🔄 FUNCIONES ADICIONALES DE UTILIDAD

  // Marcar anomalía como resuelta (alternativa a eliminar)
  async marcarComoResuelta(anomaliaId) {
    try {
      const response = await fetch(`${API_BASE_URL}/anomalias/${anomaliaId}/resolver`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          resuelta: true,
          fecha_resolucion: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Error al marcar como resuelta');
      }
      
      return data;
    } catch (error) {
      console.error('Error marcando anomalía como resuelta:', error);
      throw error;
    }
  },

  // Obtener estadísticas de anomalías
  async obtenerEstadisticas(periodo = '24h') {
    try {
      const response = await fetch(`${API_BASE_URL}/anomalias/estadisticas?periodo=${periodo}`);
      const data = await response.json();
      
      if (data.success) {
        return {
          total: data.total || 0,
          criticas: data.criticas || 0,
          moderadas: data.moderadas || 0,
          resueltas: data.resueltas || 0,
          porTipo: data.por_tipo || {},
          porParcela: data.por_parcela || {}
        };
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return {
        total: 0,
        criticas: 0,
        moderadas: 0,
        resueltas: 0,
        porTipo: {},
        porParcela: {}
      };
    }
  },

  // Exportar anomalías a CSV
  async exportarAnomalias(filtros = {}) {
    try {
      const params = new URLSearchParams(filtros).toString();
      const response = await fetch(`${API_BASE_URL}/anomalias/exportar?${params}`);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `anomalias_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return { success: true, message: 'Descarga iniciada' };
    } catch (error) {
      console.error('Error exportando anomalías:', error);
      throw error;
    }
  },

  // Obtener historial de una anomalía específica
  async obtenerHistorialAnomalia(anomaliaId) {
    try {
      const response = await fetch(`${API_BASE_URL}/anomalias/${anomaliaId}/historial`);
      const data = await response.json();
      
      if (data.success) {
        return data.historial;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error al obtener historial:', error);
      return [];
    }
  },

  // 🔧 FUNCIONES DE CONFIGURACIÓN

  // Obtener configuración de alertas
  async obtenerConfiguracionAlertas() {
    try {
      const response = await fetch(`${API_BASE_URL}/configuracion/alertas`);
      const data = await response.json();
      
      if (data.success) {
        return data.configuracion;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error al obtener configuración de alertas:', error);
      return {};
    }
  },

  // Actualizar configuración de alertas
  async actualizarConfiguracionAlertas(configuracion) {
    try {
      const response = await fetch(`${API_BASE_URL}/configuracion/alertas`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configuracion)
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Error al actualizar configuración');
      }
      
      return data;
    } catch (error) {
      console.error('Error actualizando configuración:', error);
      throw error;
    }
  }
};