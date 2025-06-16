// src/services/servicioMeteo.js

// Reemplaza esta API_KEY con tu clave de OpenWeatherMap
const API_KEY = '1b6ee1662a615e3930de913f12f852be';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Lista de iconos para mapear las condiciones climáticas
const iconosClima = {
  '01d': 'sun',
  '01n': 'moon',
  '02d': 'cloud-sun',
  '02n': 'cloud-moon',
  '03d': 'cloud',
  '03n': 'cloud',
  '04d': 'cloud',
  '04n': 'cloud',
  '09d': 'cloud-showers-heavy',
  '09n': 'cloud-showers-heavy',
  '10d': 'cloud-sun-rain',
  '10n': 'cloud-moon-rain',
  '11d': 'bolt',
  '11n': 'bolt',
  '13d': 'snowflake',
  '13n': 'snowflake',
  '50d': 'smog',
  '50n': 'smog'
};

// Traducir condiciones climáticas del inglés al español
const traducirCondicion = (condicion) => {
  const traducciones = {
    'clear sky': 'Cielo despejado',
    'few clouds': 'Pocas nubes',
    'scattered clouds': 'Nubes dispersas',
    'broken clouds': 'Nublado parcial',
    'overcast clouds': 'Nublado',
    'light rain': 'Lluvia ligera',
    'moderate rain': 'Lluvia moderada',
    'heavy intensity rain': 'Lluvia intensa',
    'thunderstorm': 'Tormenta eléctrica',
    'snow': 'Nieve',
    'mist': 'Neblina',
    'fog': 'Niebla'
  };
  
  return traducciones[condicion.toLowerCase()] || condicion;
};

// Obtener la dirección del viento como texto
const obtenerDireccionViento = (grados) => {
  const direcciones = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO', 'N'];
  return direcciones[Math.round(grados / 45)];
};

// Formatear el timestamp a un formato de hora legible
const formatearHora = (timestamp) => {
  const fecha = new Date(timestamp * 1000);
  return fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Formatear el timestamp a un formato de día de la semana
const formatearDiaSemana = (timestamp) => {
  const fecha = new Date(timestamp * 1000);
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return diasSemana[fecha.getDay()];
};

// Servicio principal con métodos para obtener datos meteorológicos
const servicioMeteo = {
  // Obtener coordenadas de una ubicación por nombre
  obtenerCoordenadas: async (ciudad) => {
    try {
      const respuesta = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(ciudad)}&limit=1&appid=${API_KEY}`);
      const datos = await respuesta.json();
      
      if (!datos || datos.length === 0) {
        throw new Error('No se encontró la ubicación');
      }
      
      return {
        lat: datos[0].lat,
        lon: datos[0].lon,
        nombre: datos[0].name,
        pais: datos[0].country
      };
    } catch (error) {
      console.error('Error al obtener coordenadas:', error);
      throw error;
    }
  },
  
  // Obtener pronóstico actual y de 5 días
  obtenerPronostico: async (lat, lon) => {
    try {
      // Obtener datos actuales
      const respuestaActual = await fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&lang=es&appid=${API_KEY}`);
      const datosActuales = await respuestaActual.json();
      
      // Obtener pronóstico de 5 días
      const respuestaPronostico = await fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&lang=es&appid=${API_KEY}`);
      const datosPronostico = await respuestaPronostico.json();
      
      // Procesar datos actuales
      const actual = {
        temperatura: Math.round(datosActuales.main.temp),
        condicion: traducirCondicion(datosActuales.weather[0].description),
        icono: iconosClima[datosActuales.weather[0].icon] || 'cloud',
        humedad: datosActuales.main.humidity,
        presion: datosActuales.main.pressure,
        viento: {
          velocidad: Math.round(datosActuales.wind.speed * 3.6), 
          direccion: obtenerDireccionViento(datosActuales.wind.deg)
        },
        precipitacion: datosActuales.rain ? `${datosActuales.rain['1h']} mm` : '0 mm',
        amanecer: formatearHora(datosActuales.sys.sunrise),
        anochecer: formatearHora(datosActuales.sys.sunset),
        ubicacion: `${datosActuales.name}, ${datosActuales.sys.country}`
      };
      
      // Procesar pronóstico de 5 días
      // Agrupar por día y obtener máximos y mínimos
      const diasPronostico = {};
      
      datosPronostico.list.forEach(item => {
        const fecha = new Date(item.dt * 1000);
        const dia = fecha.toISOString().split('T')[0];
        
        if (!diasPronostico[dia]) {
          diasPronostico[dia] = {
            maxima: -100,
            minima: 100,
            icono: '',
            condicion: '',
            probabilidadLluvia: 0
          };
        }
        
        // Actualizar temperaturas máxima y mínima
        if (item.main.temp_max > diasPronostico[dia].maxima) {
          diasPronostico[dia].maxima = item.main.temp_max;
        }
        if (item.main.temp_min < diasPronostico[dia].minima) {
          diasPronostico[dia].minima = item.main.temp_min;
        }
        
        // Para simplificar, usamos el icono del mediodía para representar el día
        if (fecha.getHours() >= 12 && fecha.getHours() <= 15 || !diasPronostico[dia].icono) {
          diasPronostico[dia].icono = iconosClima[item.weather[0].icon] || 'cloud';
          diasPronostico[dia].condicion = traducirCondicion(item.weather[0].description);
        }
        
        // Actualizar probabilidad de lluvia
        if (item.pop && item.pop > diasPronostico[dia].probabilidadLluvia) {
          diasPronostico[dia].probabilidadLluvia = item.pop;
        }
      });
      
      // Convertir a array y formatear
      const pronostico = Object.keys(diasPronostico).map(dia => {
        const fecha = new Date(dia);
        return {
          dia: fecha.getDate() === new Date().getDate() ? 'Hoy' : formatearDiaSemana(fecha.getTime() / 1000),
          fecha: dia,
          maxima: Math.round(diasPronostico[dia].maxima),
          minima: Math.round(diasPronostico[dia].minima),
          icono: diasPronostico[dia].icono,
          condicion: diasPronostico[dia].condicion,
          probabilidadLluvia: `${Math.round(diasPronostico[dia].probabilidadLluvia * 100)}%`,
          viento: Math.round(datosActuales.wind.speed * 3.6) + ' km/h'
        };
      }).slice(0, 5); // Limitar a 5 días
      
      return { actual, pronostico };
    } catch (error) {
      console.error('Error al obtener pronóstico:', error);
      throw error;
    }
  },
  
  // Obtener datos meteorológicos completos (incluyendo datos por hora)
  obtenerDatosCompletos: async (lat, lon) => {
    try {
      const respuesta = await fetch(`${BASE_URL}/onecall?lat=${lat}&lon=${lon}&units=metric&exclude=minutely&lang=es&appid=${API_KEY}`);
      const datos = await respuesta.json();
      
      // Este método devuelve los datos sin procesar para uso más detallado
      return datos;
    } catch (error) {
      console.error('Error al obtener datos completos:', error);
      throw error;
    }
  },
  
  // Obtener pronóstico por ciudad
  obtenerPronosticoPorCiudad: async (ciudad) => {
    try {
      const coordenadas = await servicioMeteo.obtenerCoordenadas(ciudad);
      return await servicioMeteo.obtenerPronostico(coordenadas.lat, coordenadas.lon);
    } catch (error) {
      console.error('Error al obtener pronóstico por ciudad:', error);
      throw error;
    }
  }
};

export default servicioMeteo;