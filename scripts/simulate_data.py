import random
import time
import datetime
import json

def generar_dato(tipo, minimo, maximo):
    valor = random.uniform(minimo, maximo)
    return {"tipo": tipo, "valor": round(valor, 2), "timestamp": datetime.datetime.now().isoformat()}

def simular_sensores(num_lecturas):
    datos = []
    for _ in range(num_lecturas):
        datos.append(generar_dato("temperatura", 15, 35))
        datos.append(generar_dato("humedad", 40, 80))
        datos.append(generar_dato("ph", 6.0, 7.5))
    return datos

if __name__ == '__main__':
    num_lecturas = 10
    datos_simulados = simular_sensores(num_lecturas)
    print(json.dumps(datos_simulados, indent=2))
