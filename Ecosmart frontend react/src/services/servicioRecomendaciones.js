// Servicio para gestionar datos agrícolas y proporcionar contexto al asistente virtual

const API_URL = 'http://localhost:5000/api';
const PERIODO_ANALISIS_DIAS = 7;

class ServicioRecomendaciones {
  constructor() {
    this.parcelasCache = null;
    this.datosHistoricosCache = null;
    this.recomendacionesCache = null;
    this.ultimaActualizacion = null;
    this.tiempoCacheValido = 3600000; // 1 hora en milisegundos
  }

  /**
   * Obtiene recomendaciones para mostrar en el dashboard
   * @param {Boolean} forzarActualizacion - Si debe ignorar la caché y obtener datos nuevos
   * @param {Number} maxCaracteres - Longitud máxima de cada recomendación
   * @returns {Promise<Array>} - Lista de recomendaciones
   */
  async obtenerRecomendaciones(forzarActualizacion = false, maxCaracteres = 100) {
    // Si tenemos caché reciente y no se fuerza actualización, usar caché
    if (this.recomendacionesCache && !forzarActualizacion && 
        this.ultimaActualizacion && (new Date() - this.ultimaActualizacion) < this.tiempoCacheValido) {
      console.log('Usando cache de recomendaciones');
      return this.recomendacionesCache;
    }
    
    try {
      // Intentar obtener recomendaciones del backend (generadas por el asistente)
      const response = await fetch(`${API_URL}/parcelas/recomendaciones`, {
        headers: this.getAuthHeaders()
      });
      
      if (response.ok) {
        const recomendaciones = await response.json();
        this.actualizarCache(recomendaciones);
        return recomendaciones;
      }
      
      // Si no hay endpoint para recomendaciones o falló, solicitar al asistente
      const recomendacionesAsistente = await this.solicitarRecomendacionesAlAsistente(null, maxCaracteres);
      return recomendacionesAsistente;
      
    } catch (error) {
      console.error('Error al obtener recomendaciones:', error);
      return this.recomendacionesCache || this.generarRecomendacionesTemporales();
    }
  }
  
  /**
   * Obtiene datos de parcelas desde la API
   */
  async obtenerParcelas(forzarActualizacion = false) {
    // Usar caché si está disponible y es reciente
    if (this.parcelasCache && !forzarActualizacion && 
        this.ultimaActualizacion && (new Date() - this.ultimaActualizacion) < this.tiempoCacheValido) {
      return this.parcelasCache;
    }
    
    try {
      const response = await fetch(`${API_URL}/parcelas`, {
        headers: this.getAuthHeaders()
      });
      
      if (response.ok) {
        const parcelas = await response.json();
        this.parcelasCache = parcelas;
        return parcelas;
      } else if (response.status === 401) {
        throw new Error('No autorizado');
      } else {
        throw new Error(`Error del servidor: ${response.status}`);
      }
    } catch (error) {
      console.error('Error al obtener parcelas:', error);
      return this.parcelasCache || this.generarParcelasEjemplo();
    }
  }
  
  /**
   * Obtiene datos históricos de sensores desde la API
   */
  async obtenerDatosHistoricos(forzarActualizacion = false) {
    // Usar caché si está disponible y es reciente
    if (this.datosHistoricosCache && !forzarActualizacion && 
        this.ultimaActualizacion && (new Date() - this.ultimaActualizacion) < this.tiempoCacheValido) {
      return this.datosHistoricosCache;
    }
    
    try {
      // Obtener fecha de hace N días
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - PERIODO_ANALISIS_DIAS);
      const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
      
      const response = await fetch(`${API_URL}/parcelas/historico?desde=${fechaInicioStr}`, {
        headers: this.getAuthHeaders()
      });
      
      if (response.ok) {
        const datosHistoricos = await response.json();
        this.datosHistoricosCache = datosHistoricos;
        return datosHistoricos;
      }
      
      throw new Error(`Error obteniendo datos históricos: ${response.status}`);
    } catch (error) {
      console.error('Error al obtener datos históricos:', error);
      return this.datosHistoricosCache || this.generarDatosHistoricosDummy();
    }
  }
  
  /**
   * Genera datos históricos simulados para cuando no hay conexión a API
   */
  generarDatosHistoricosDummy() {
    const resultados = {};
    const parcelas = this.generarParcelasEjemplo();
    
    // Generar datos aleatorios para cada parcela para los últimos 7 días
    parcelas.forEach(parcela => {
      const datosUltimos7Dias = [];
      
      for (let i = 0; i < PERIODO_ANALISIS_DIAS; i++) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - i);
        
        // Generar valores según estado de parcela y tipo de cultivo
        let temperatura, humedad, ph;
        
        switch (parcela.estado) {
          case 'crítico':
            temperatura = 32 + Math.random() * 5;
            humedad = 20 + Math.random() * 10;
            ph = 4.5 + Math.random() * 0.5;
            break;
          case 'alerta':
            temperatura = 28 + Math.random() * 4;
            humedad = 35 + Math.random() * 10;
            ph = 5.0 + Math.random() * 0.5;
            break;
          default: // óptimo
            temperatura = 22 + Math.random() * 4;
            humedad = 60 + Math.random() * 15;
            ph = 6.0 + Math.random() * 1.0;
        }
        
        datosUltimos7Dias.push({
          fecha: fecha.toISOString().split('T')[0],
          temperatura: temperatura.toFixed(1),
          humedad: humedad.toFixed(1),
          ph: ph.toFixed(1),
          luminosidad: (70 + Math.random() * 20).toFixed(1),
          nitrogeno: (150 + Math.random() * 100).toFixed(0),
          fosforo: (50 + Math.random() * 30).toFixed(0),
          potasio: (120 + Math.random() * 80).toFixed(0)
        });
      }
      
      resultados[parcela.id] = {
        parcela_id: parcela.id,
        nombre: parcela.nombre,
        cultivo: parcela.cultivo_actual,
        datos: datosUltimos7Dias
      };
    });
    
    return resultados;
  }
  
  /**
   * Genera recomendaciones temporales básicas antes de que el asistente proporcione las suyas
   * Esta función solo es un fallback temporal y debe ser reemplazada por recomendaciones
   * generadas por el asistente virtual
   */
  generarRecomendacionesTemporales() {
    // Este método solo devuelve recomendaciones genéricas como fallback
    // No implementa la lógica completa, ya que eso lo hará el asistente virtual
    return [
      {
        id: 1,
        cultivo: 'Tomate',
        parcela: 'Viñedo Sur',
        recomendacion: 'Implementar riego por goteo y monitorear plagas específicas del tomate.'
      },
      {
        id: 2,
        cultivo: 'Maíz',
        parcela: 'Campo Norte',
        recomendacion: 'Aplicar fertilización nitrogenada según etapa fenológica.'
      },
      {
        id: 3,
        cultivo: 'Trigo',
        parcela: 'Huerto Oeste',
        recomendacion: 'Evaluar problemas de riego y monitorear condiciones de humedad.'
      }
    ];
  }
  
  /**
   * Genera datos de parcela de ejemplo cuando hay error al obtener datos reales
   */
  generarParcelasEjemplo() {
    return [
      { 
        id: 1, 
        nombre: 'Viñedo Sur', 
        cultivo_actual: 'Tomate', 
        variedad: 'Roma',
        estado: 'óptimo',
        edad: '45 días' 
      },
      { 
        id: 2, 
        nombre: 'Campo Norte', 
        cultivo_actual: 'Maíz', 
        variedad: 'Híbrido',
        estado: 'alerta',
        edad: '60 días' 
      },
      { 
        id: 3, 
        nombre: 'Huerto Oeste', 
        cultivo_actual: 'Trigo', 
        variedad: 'Triticum aestivum',
        estado: 'crítico',
        edad: '90 días' 
      }
    ];
  }
  
  /**
   * Actualiza la caché local
   */
  actualizarCache(recomendaciones) {
    this.recomendacionesCache = recomendaciones;
    this.ultimaActualizacion = new Date();
  }
  
  /**
   * Obtiene headers para autenticación en las llamadas API
   */
  getAuthHeaders() {
    const token = localStorage.getItem('ecosmart_token');
    const userId = localStorage.getItem('ecosmart_user_id');
    
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-User-Id': userId || ''
    };
  }
  
  /**
   * Prepara el contexto completo para el asistente virtual
   * Este método es clave para que el asistente tenga todos los datos necesarios
   * para generar recomendaciones precisas
   * @returns {Promise<Object>} - Datos completos para análisis del asistente
   */
  async prepararContextoParaAsistente() {
    try {
      // Obtener datos actualizados
      const parcelas = await this.obtenerParcelas(true); // forzar actualización
      const datosHistoricos = await this.obtenerDatosHistoricos(true);
      
      // Preparar análisis básico de datos históricos
      const parcelasConAnalisis = parcelas.map(parcela => {
        const datosHistoricosParcela = datosHistoricos && datosHistoricos[parcela.id] ? 
          datosHistoricos[parcela.id].datos : [];
          
        // Crear análisis básico si hay datos disponibles
        let analisis = null;
        if (datosHistoricosParcela && datosHistoricosParcela.length > 0) {
          analisis = this.analizarDatosHistoricos(datosHistoricosParcela);
        }
          
        return {
          ...parcela,
          analisis_historico: analisis
        };
      });
      
      // Estructurar todo el contexto para el asistente
      return {
        timestamp: new Date().toISOString(),
        parcelas: parcelasConAnalisis,
        periodo_analisis: `${PERIODO_ANALISIS_DIAS} días`,
        fuente_datos: this.datosHistoricosCache ? 'sensores_reales' : 'datos_simulados',
        datos_historicos_completos: datosHistoricos,
        metadatos: {
          total_parcelas: parcelas.length,
          parcelas_criticas: parcelas.filter(p => p.estado === 'crítico').length,
          parcelas_en_alerta: parcelas.filter(p => p.estado === 'alerta').length,
          parcelas_optimas: parcelas.filter(p => p.estado === 'óptimo').length,
          tipos_cultivos: [...new Set(parcelas.map(p => p.cultivo_actual))],
          version_api: '1.0'
        }
      };
    } catch (error) {
      console.error('Error preparando contexto para asistente:', error);
      return {
        error: 'No se pudo preparar el contexto completo',
        timestamp: new Date().toISOString(),
        parcelas_disponibles: this.parcelasCache || this.generarParcelasEjemplo(),
        datos_simulados: true
      };
    }
  }
  
  /**
   * Analiza datos históricos para detectar tendencias y promedios
   * @param {Array} datosHistoricos - Datos históricos de una parcela
   * @returns {Object} - Análisis de tendencias y valores promedio
   */
  analizarDatosHistoricos(datosHistoricos) {
    if (!datosHistoricos || datosHistoricos.length === 0) {
      return null;
    }
    
    try {
      // Calcular promedios
      const promedios = {
        temperatura: 0,
        humedad: 0,
        ph: 0,
        luminosidad: 0
      };
      
      // Sumar valores
      datosHistoricos.forEach(dato => {
        promedios.temperatura += parseFloat(dato.temperatura || 0);
        promedios.humedad += parseFloat(dato.humedad || 0);
        promedios.ph += parseFloat(dato.ph || 0);
        promedios.luminosidad += parseFloat(dato.luminosidad || 0);
      });
      
      // Calcular promedios
      Object.keys(promedios).forEach(key => {
        promedios[key] = (promedios[key] / datosHistoricos.length).toFixed(1);
      });
      
      // Analizar tendencias (comparando primer y último día)
      const tendencias = {};
      
      if (datosHistoricos.length > 1) {
        // Obtener primer y último registro (considerando que están ordenados por fecha)
        const primero = datosHistoricos[datosHistoricos.length - 1];
        const ultimo = datosHistoricos[0];
        
        // Calcular tendencias
        tendencias.temperatura = this.calcularTendencia(
          parseFloat(primero.temperatura), 
          parseFloat(ultimo.temperatura),
          2 // umbral de cambio significativo
        );
        
        tendencias.humedad = this.calcularTendencia(
          parseFloat(primero.humedad), 
          parseFloat(ultimo.humedad),
          5 // umbral de cambio significativo
        );
        
        tendencias.ph = this.calcularTendencia(
          parseFloat(primero.ph || 0), 
          parseFloat(ultimo.ph || 0),
          0.5 // umbral de cambio significativo
        );
      }
      
      return {
        promedios,
        tendencias,
        ultimo_registro: datosHistoricos[0],
        primer_registro: datosHistoricos[datosHistoricos.length - 1],
        dias_analizados: datosHistoricos.length
      };
      
    } catch (error) {
      console.error('Error analizando datos históricos:', error);
      return {
        error: 'No se pudieron analizar los datos históricos',
        dias_analizados: datosHistoricos.length
      };
    }
  }
  
  /**
   * Calcula la tendencia entre dos valores
   * @param {Number} valorInicial - Valor al inicio del período
   * @param {Number} valorFinal - Valor al final del período
   * @param {Number} umbral - Diferencia mínima para considerar un cambio significativo
   * @returns {String} - 'ascendente', 'descendente' o 'estable'
   */
  calcularTendencia(valorInicial, valorFinal, umbral) {
    if (valorFinal > valorInicial + umbral) {
      return 'ascendente';
    } else if (valorFinal < valorInicial - umbral) {
      return 'descendente';
    } else {
      return 'estable';
    }
  }
  
  /**
   * Envía una solicitud al asistente virtual para generar recomendaciones
   * @param {Object} contexto - Contexto completo con datos de parcelas y sensores
   * @param {Number} maxCaracteres - Longitud máxima por recomendación
   * @returns {Promise<Array>} - Recomendaciones generadas por el asistente
   */
  async solicitarRecomendacionesAlAsistente(contexto = null, maxCaracteres = 100) {
    try {
      // Si no se proporciona contexto, obtenerlo
      const datosContexto = contexto || await this.prepararContextoParaAsistente();
      
      // Preparar el prompt para el asistente incluyendo instrucciones de longitud
      const prompt = `Basándote en los datos de las parcelas y sensores, genera recomendaciones precisas para optimizar el manejo de cada cultivo. 
      Enfócate especialmente en las parcelas con estado crítico o de alerta.
      
      IMPORTANTE: Cada recomendación debe tener un máximo de ${maxCaracteres} caracteres. 
      Sé conciso y directo en tus recomendaciones, priorizando la información más relevante y accionable.`;
      
      // Enviar solicitud al endpoint del asistente
      const response = await fetch(`${API_URL}/asistente/recomendar`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          prompt: prompt,
          contexto: datosContexto,
          configuracion: {
            max_caracteres_por_recomendacion: maxCaracteres,
            formato: 'conciso'
          }
        })
      });
      
      if (response.ok) {
        const respuestaAsistente = await response.json();
        
        // Si la respuesta incluye recomendaciones, guardarlas en caché
        if (respuestaAsistente.recomendaciones && respuestaAsistente.recomendaciones.length > 0) {
          this.actualizarCache(respuestaAsistente.recomendaciones);
          return respuestaAsistente.recomendaciones;
        }
        
        throw new Error('El asistente no generó recomendaciones válidas');
      }
      
      throw new Error(`Error del servidor: ${response.status}`);
      
    } catch (error) {
      console.error('Error solicitando recomendaciones al asistente:', error);
      // Devolver fallback temporal
      return this.recomendacionesCache || this.generarRecomendacionesTemporales();
    }
  }
}

export default new ServicioRecomendaciones();