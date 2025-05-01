import random
from datetime import datetime
import calendar

def obtener_parametros_estacion():
    """Determina los parámetros según la estación actual"""
    fecha_actual = datetime.now()
    mes = fecha_actual.month
    dia = fecha_actual.day
    
    # Definir estacion
    if (mes == 12 and dia >= 21) or mes <= 2 or (mes == 3 and dia <= 20):
        estacion = "verano"  # 21 dic - 20 mar
    elif (mes == 3 and dia >= 21) or mes <= 5 or (mes == 6 and dia <= 21):
        estacion = "otono"   # 21 mar - 21 jun
    elif (mes == 6 and dia >= 22) or mes <= 8 or (mes == 9 and dia <= 23):
        estacion = "invierno"  # 22 jun - 23 sep
    else:
        estacion = "primavera"  # 24 sep - 20 dic
    
    # Parámetros según estación
    parametros = {
        "verano": {
            "temperatura": [15, 35],
            "humedad": [30, 80],
            "ph": [5.5, 7.5],
            "nutrientes": [50, 300]
        },
        "otono": {
            "temperatura": [4, 20],
            "humedad": [40, 90],
            "ph": [5.0, 7.0],
            "nutrientes": [100, 250]
        },
        "invierno": {
            "temperatura": [-2, 15],
            "humedad": [50, 100],
            "ph": [4.5, 6.5],
            "nutrientes": [150, 200]
        },
        "primavera": {
            "temperatura": [8, 25],
            "humedad": [35, 85],
            "ph": [5.0, 7.0],
            "nutrientes": [100, 300]
        }
    }
    
    return parametros[estacion]

class Sensor:
    """Clase base para los sensores"""
    
    def __init__(self, tipo, unidad, id_sensor, valor_minimo, valor_maximo, frecuencia):
        self.tipo = tipo
        self.unidad = unidad
        self.id_sensor = id_sensor
        self.valor_minimo = valor_minimo
        self.valor_maximo = valor_maximo
        self.frecuencia = frecuencia
        self.historial = []
        self.max_historial = 1000
    
    def generar_dato(self):
        """Genera un nuevo valor aleatorio para el sensor"""
        valor = random.uniform(self.valor_minimo, self.valor_maximo)
        valor_redondeado = round(valor, 2)
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Guardar en historial
        if len(self.historial) >= self.max_historial:
            self.historial.pop(0)
        self.historial.append({"valor": valor_redondeado, "timestamp": timestamp})
        
        return valor_redondeado, timestamp

class SensorNutrientes(Sensor):
    """Clase especializada para sensor de nutrientes con múltiples valores"""

    def __init__(self, tipo, unidad, id_sensor, valor_minimo, valor_maximo, frecuencia):
        super().__init__(tipo, unidad, id_sensor, valor_minimo, valor_maximo, frecuencia)

    def generar_dato(self, parametros_configurables):
        """Genera valores separados para cada nutriente usando los parámetros recibidos"""
        # Generar valores separados para cada nutriente
        nitrogeno = random.uniform(
            parametros_configurables["nutrientes"]["nitrogeno"]["min"],
            parametros_configurables["nutrientes"]["nitrogeno"]["max"]
        )
        fosforo = random.uniform(
            parametros_configurables["nutrientes"]["fosforo"]["min"],
            parametros_configurables["nutrientes"]["fosforo"]["max"]
        )
        potasio = random.uniform(
            parametros_configurables["nutrientes"]["potasio"]["min"],
            parametros_configurables["nutrientes"]["potasio"]["max"]
        )

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        valor = {
            "nitrogeno": round(nitrogeno, 2),
            "fosforo": round(fosforo, 2),
            "potasio": round(potasio, 2)
        }

        # Guardar en historial
        if len(self.historial) >= self.max_historial:
            self.historial.pop(0)
        self.historial.append({"valor": valor, "timestamp": timestamp})

        return valor, timestamp

class RedSensores:
    """Gestiona una red de sensores y sus datos"""

    def __init__(self):
        self.sensores = {}

    def agregar_sensor(self, sensor):
        """Agrega un sensor a la red"""
        self.sensores[sensor.id_sensor] = sensor
        return sensor.id_sensor

    def generar_todos_datos(self, parametros_configurables):
        """Genera datos para todos los sensores en la red"""
        datos = {}
        for id_sensor, sensor in self.sensores.items():
            if isinstance(sensor, SensorNutrientes):
                valor, timestamp = sensor.generar_dato(parametros_configurables)
            else:
                valor, timestamp = sensor.generar_dato()
            datos[id_sensor] = {
                "valor": valor,
                "timestamp": timestamp
            }
        return datos
    
    def listar_sensores(self):
        """Retorna una lista con información de los sensores"""
        lista_sensores = []
        for id_sensor, sensor in self.sensores.items():
            lista_sensores.append({
                "id": id_sensor,
                "tipo": sensor.tipo,
                "unidad": sensor.unidad,
                "valor_minimo": sensor.valor_minimo,
                "valor_maximo": sensor.valor_maximo,
                "frecuencia": sensor.frecuencia
            })
        return lista_sensores
    
    def simular_heladas(self):
        """Configura los sensores para simular condiciones de heladas"""
        if 1 in self.sensores:  # Temperatura
            self.sensores[1].valor_minimo = -10
            self.sensores[1].valor_maximo = 5
        if 2 in self.sensores:  # Humedad
            self.sensores[2].valor_minimo = 10
            self.sensores[2].valor_maximo = 30
    
    def simular_sequia(self):
        """Configura los sensores para simular condiciones de sequía"""
        if 1 in self.sensores:  # Temperatura
            self.sensores[1].valor_minimo = 30
            self.sensores[1].valor_maximo = 45
        if 2 in self.sensores:  # Humedad
            self.sensores[2].valor_minimo = 5
            self.sensores[2].valor_maximo = 20
    
    def simular_lluvia_intensa(self):
        """Configura los sensores para simular condiciones de lluvia intensa"""
        if 1 in self.sensores:  # Temperatura
            self.sensores[1].valor_minimo = 10
            self.sensores[1].valor_maximo = 25
        if 2 in self.sensores:  # Humedad
            self.sensores[2].valor_minimo = 70
            self.sensores[2].valor_maximo = 100
    
    def restaurar_condiciones_normales(self):
        """Restaura los sensores a condiciones normales según la estación"""
        parametros = obtener_parametros_estacion()
        if 1 in self.sensores:  # Temperatura
            self.sensores[1].valor_minimo = parametros["temperatura"][0]
            self.sensores[1].valor_maximo = parametros["temperatura"][1]
        if 2 in self.sensores:  # Humedad
            self.sensores[2].valor_minimo = parametros["humedad"][0]
            self.sensores[2].valor_maximo = parametros["humedad"][1]
        if 3 in self.sensores:  # pH
            self.sensores[3].valor_minimo = parametros["ph"][0]
            self.sensores[3].valor_maximo = parametros["ph"][1]