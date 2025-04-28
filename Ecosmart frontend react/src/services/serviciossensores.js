// Servicio para gestionar comunicación entre componentes de sensores

const API_URL = 'http://localhost:5000/api';

class SensorService {
  constructor() {
    this.parametros = null;
    this.suscriptores = [];
  }

  async obtenerParametros() {
    try {
      console.log("Obteniendo parámetros desde API...");
      const response = await fetch(`${API_URL}/parametros`);
      if (response.ok) {
        const data = await response.json();
        console.log("Parámetros recibidos:", data);
        this.parametros = data;
        return this.parametros;
      }
      throw new Error('Error al obtener parámetros');
    } catch (error) {
      console.error("Error al obtener parámetros:", error);
      // Si hay error, usar valores por defecto o del localStorage
      this.parametros = JSON.parse(localStorage.getItem('ecosmart_parametros')) || this.getDefaultParams();
      console.log("Usando parámetros por defecto:", this.parametros);
      return this.parametros;
    }
  }

  async guardarParametros(parametros) {
    try {
      console.log("Guardando parámetros en API:", parametros);
      const response = await fetch(`${API_URL}/parametros`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parametros),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Respuesta del servidor:", data);
        this.parametros = parametros;
        localStorage.setItem('ecosmart_parametros', JSON.stringify(parametros));
        this.notificarCambios();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error al guardar parámetros:", error);
      // Guardar en localStorage como respaldo
      this.parametros = parametros;
      localStorage.setItem('ecosmart_parametros', JSON.stringify(parametros));
      this.notificarCambios();
      return true; // Simulamos éxito para no bloquear la interfaz
    }
  }

  guardarParametrosDesdeCondicion(parametros) {
    // Similar a guardarParametros pero no envía a la API porque ya viene de ella
    this.parametros = parametros;
    localStorage.setItem('ecosmart_parametros', JSON.stringify(parametros));
    this.notificarCambios();
    return true;
  }

  suscribirse(callback) {
    this.suscriptores.push(callback);
    return () => {
      this.suscriptores = this.suscriptores.filter(cb => cb !== callback);
    };
  }

  notificarCambios() {
    this.suscriptores.forEach(callback => callback(this.parametros));
  }

  getDefaultParams() {
    return {
      temperatura: {
        min: 10,
        max: 35,
        variacion: 1.0
      },
      humedadSuelo: {
        min: 20,
        max: 80,
        variacion: 2.0
      },
      phSuelo: {
        min: 5.5,
        max: 7.5,
        variacion: 0.1
      },
      nutrientes: {
        nitrogeno: { min: 100, max: 300 },
        fosforo: { min: 20, max: 80 },
        potasio: { min: 100, max: 250 }
      },
      simulacion: {
        intervalo: 5,
        duracion: 60
      }
    };
  }
}

export default new SensorService();