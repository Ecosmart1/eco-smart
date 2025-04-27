import random
import time
from datetime import datetime


def obtener_parametros_estacion():
    hoy = datetime.now()
    mes = hoy.month
    dia = hoy.day

    # Verano: 21 dic - 20 mar
    if (mes == 12 and dia >= 21) or (mes in [1, 2]) or (mes == 3 and dia <= 20):
        estacion = "verano"
        temp_min, temp_max = 15, 35
        hum_min, hum_max = 30, 80
    # Otoño: 21 mar - 21 jun
    elif (mes == 3 and dia >= 21) or (mes in [4, 5]) or (mes == 6 and dia <= 21):
        estacion = "otoño"
        temp_min, temp_max = 4, 20
        hum_min, hum_max = 40, 90
    # Invierno: 22 jun - 23 sep
    elif (mes == 6 and dia >= 22) or (mes in [7, 8]) or (mes == 9 and dia <= 23):
        estacion = "invierno"
        temp_min, temp_max = -2, 15
        hum_min, hum_max = 50, 100
    # Primavera: 24 sep - 20 dic
    else:
        estacion = "primavera"
        temp_min, temp_max = 8, 25
        hum_min, hum_max = 35, 85

    return {
        "estacion": estacion,
        "temperatura": (temp_min, temp_max),
        "humedad": (hum_min, hum_max),
        "ph": (3, 9),
        "nutrientes": (0, 50)
    }

class Sensor:
    def __init__(self, tipo, unidad, id_sensor, valor_minimo, valor_maximo, frecuencia):
        self.tipo = tipo
        self.unidad = unidad
        self.id_sensor = id_sensor
        self.valor_minimo = valor_minimo
        self.valor_maximo = valor_maximo
        self.frecuencia = frecuencia
       
        self.ultima_lectura = None
        self.historial = []
    


    

    def generar_dato(self):
        if self.ultima_lectura is None:
            # Primera medición: valor aleatorio dentro del rango
            valor = round(random.uniform(self.valor_minimo, self.valor_maximo), 2)
        else:
            anterior = self.ultima_lectura["valor"]
            if self.tipo == "Temperatura":
                # Cambios suaves: +/- 0.2 a 0.8 grados por medición
                cambio = random.uniform(-0.2, 0.2)
            elif self.tipo == "Humedad":
                    cambio = random.uniform(-1, 1)
            elif self.tipo == "pH del suelo":
                    cambio = random.uniform(-0.02, 0.02)
            elif self.tipo == "Nutrientes":
                    cambio = random.uniform(-0.3, 0.3)
            else:
                    cambio = random.uniform(-1, 1)
            valor = anterior + cambio
            valor = max(self.valor_minimo, min(self.valor_maximo, valor))
            valor = round(valor, 2)
        timestamp = datetime.now().isoformat()
        self.ultima_lectura = {"valor": valor, "timestamp": timestamp}
        self.historial.append(self.ultima_lectura)
        if len(self.historial) > 100:
            self.historial.pop(0)
        return valor
    
    def to_dict(self):
        return {
            "id": self.id_sensor,
            "tipo": self.tipo,
            "unidad": self.unidad,
            "valor_minimo": self.valor_minimo,
            "valor_maximo": self.valor_maximo,
            "frecuencia": self.frecuencia,
            "ultima_lectura": self.ultima_lectura
        }


class RedSensores:
    def __init__(self):
        self.sensores = {}
        self.condicion_actual = "normal"
    
    def agregar_sensor(self, sensor):
        self.sensores[sensor.id_sensor] = sensor
        return sensor.id_sensor
    
    def obtener_sensor(self, id_sensor):
        return self.sensores.get(id_sensor)
    
    def listar_sensores(self):
        return [sensor.to_dict() for sensor in self.sensores.values()]
    
    def generar_todos_datos(self):
        resultados = {}
        for id_sensor, sensor in self.sensores.items():
            valor = sensor.generar_dato()
            resultados[id_sensor] = {
                "tipo": sensor.tipo, 
                "valor": valor, 
                "unidad": sensor.unidad
            }
        return resultados
    
    # Simulación de condiciones adversas
    def simular_heladas(self):
        self.condicion_actual = "heladas"
        for sensor in self.sensores.values():
            if sensor.tipo == "Temperatura":
                sensor.valor_minimo = -5
                sensor.valor_maximo = 3
            elif sensor.tipo == "Humedad":
                sensor.valor_minimo = 60
                sensor.valor_maximo = 80
    
    def simular_sequia(self):
        self.condicion_actual = "sequía"
        for sensor in self.sensores.values():
            if sensor.tipo == "Temperatura":
                sensor.valor_minimo = 30
                sensor.valor_maximo = 45
            elif sensor.tipo == "Humedad":
                sensor.valor_minimo = 5
                sensor.valor_maximo = 10
    
    def simular_lluvia_intensa(self):
        self.condicion_actual = "lluvia intensa"
        for sensor in self.sensores.values():
            if sensor.tipo == "Humedad":
                sensor.valor_minimo = 90
                sensor.valor_maximo = 100
    
    def restaurar_condiciones_normales(self):
        self.condicion_actual = "normal"
        parametros = obtener_parametros_estacion()
        for sensor in self.sensores.values():
            if sensor.tipo == "Temperatura":
                sensor.valor_minimo = parametros["temperatura"][0]
                sensor.valor_maximo = parametros["temperatura"][1]
            elif sensor.tipo == "Humedad":
                sensor.valor_minimo = parametros["humedad"][0]
                sensor.valor_maximo = parametros["humedad"][1]
            elif sensor.tipo == "pH del suelo":
                sensor.valor_minimo = parametros["ph"][0]
                sensor.valor_maximo = parametros["ph"][1]
            elif sensor.tipo == "Nutrientes":
                sensor.valor_minimo = parametros["nutrientes"][0]
                sensor.valor_maximo = parametros["nutrientes"][1]