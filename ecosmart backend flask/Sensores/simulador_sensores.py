from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import os
import sys
import time
from datetime import datetime
import threading
import pandas as pd
from Sensor import obtener_parametros_estacion
import json

# Agregar el directorio de sensores al path
from Sensor import Sensor, RedSensores  

app = Flask(__name__)
CORS(app)  # Permitir solicitudes CORS para la API

# Crear la red de sensores
red_sensores = RedSensores()
ultimos_datos= {}

# Inicializar sensores predefinidos
parametros = obtener_parametros_estacion()
sensores_iniciales = [
    Sensor("Temperatura", "°C", 1, parametros["temperatura"][0], parametros["temperatura"][1], 5),
    Sensor("Humedad", "%", 2, parametros["humedad"][0], parametros["humedad"][1], 5),
    Sensor("pH del suelo", "", 3, parametros["ph"][0], parametros["ph"][1], 10),
    Sensor("Nutrientes", "mg/L", 4, parametros["nutrientes"][0], parametros["nutrientes"][1], 10)
]

# Parámetros configurables (inicialmente con valores predeterminados)
parametros_configurables = {
    "temperatura": {
        "min": parametros["temperatura"][0],
        "max": parametros["temperatura"][1],
        "variacion": 1.0
    },
    "humedadSuelo": {
        "min": parametros["humedad"][0],
        "max": parametros["humedad"][1],
        "variacion": 2.0
    },
    "phSuelo": {
        "min": parametros["ph"][0],
        "max": parametros["ph"][1],
        "variacion": 0.1
    },
    "nutrientes": {
        "nitrogeno": {"min": 100, "max": 300},
        "fosforo": {"min": 20, "max": 80},
        "potasio": {"min": 100, "max": 250}
    },
    "simulacion": {
        "intervalo": 5,
        "duracion": 60
    }
}

# Agrega cada sensor a la red de sensores
for sensor in sensores_iniciales:
    red_sensores.agregar_sensor(sensor)

# Genera los datos iniciales
ultimos_datos = red_sensores.generar_todos_datos()

# Variable para controlar la simulación en segundo plano
simulacion_activa = False
hilo_simulacion = None

def simulacion_continua():
    """Función para ejecutar en un hilo separado que genera datos continuamente"""
    global ultimos_datos, simulacion_activa
    
    # Calcular tiempo de finalización
    duracion_segundos = parametros_configurables["simulacion"]["duracion"] * 60  # convertir minutos a segundos
    tiempo_inicio = time.time()
    tiempo_fin = tiempo_inicio + duracion_segundos
    
    print(f"Simulación iniciada por {duracion_segundos} segundos ({parametros_configurables['simulacion']['duracion']} minutos)")
    
    while simulacion_activa and time.time() < tiempo_fin:
        ultimos_datos = red_sensores.generar_todos_datos()
        print(f"Datos generados: {ultimos_datos}")
        
        # Calcular tiempo restante
        tiempo_restante = tiempo_fin - time.time()
        if tiempo_restante <= 0:
            break
            
        # Dormir hasta la próxima iteración o hasta que termine el tiempo
        tiempo_espera = min(parametros_configurables["simulacion"]["intervalo"], tiempo_restante)
        time.sleep(tiempo_espera)
    
    # Si terminamos por tiempo y no por cancelación manual
    if time.time() >= tiempo_fin and simulacion_activa:
        print("Simulación completada: se alcanzó la duración configurada")
        simulacion_activa = False

@app.route('/api/exportar_csv', methods=['GET'])
def exportar_csv():
    # Junta los datos de todos los sensores en una lista de diccionarios
    datos = []
    for sensor in red_sensores.sensores.values():
        for lectura in sensor.historial:
            datos.append({
                "id_sensor": sensor.id_sensor,
                "tipo": sensor.tipo,
                "valor": lectura["valor"],
                "unidad": sensor.unidad,
                "timestamp": lectura["timestamp"]
            })
    if not datos:
        return jsonify({"error": "No hay datos para exportar"}), 400

    # Crea un DataFrame y exprta a CSV
    df = pd.DataFrame(datos)
    ruta_csv = os.path.join(os.path.dirname(__file__), "datos_sensores.csv")
    df.to_csv(ruta_csv, index=False)
    return send_file(ruta_csv, as_attachment=True)


@app.route('/api/sensores', methods=['GET'])
def obtener_sensores():
    """Devuelve la lista de todos los sensores"""
    return jsonify(red_sensores.listar_sensores())

@app.route('/api/datos', methods=['GET'])
def obtener_datos():
    global ultimos_datos
    # Solo devuelve el último dato, nunca genera uno nuevo aquí
    if ultimos_datos:
        return jsonify(ultimos_datos)
    else:
        return jsonify({"error": "No hay datos disponibles"}), 404

@app.route('/api/parametros', methods=['GET'])
def obtener_parametros_config():
    """Devuelve los parámetros configurables actuales"""
    return jsonify(parametros_configurables)

@app.route('/api/parametros', methods=['POST'])
def actualizar_parametros():
    """Actualiza los parámetros configurables"""
    global parametros_configurables
    nuevos_parametros = request.json
    
    if not nuevos_parametros:
        return jsonify({"error": "No se recibieron parámetros"}), 400
    
    # Actualizar parámetros
    parametros_configurables = nuevos_parametros
    
    # Actualizar rangos de los sensores si están activos
    try:
        # Temperatura (ID 1)
        if 1 in red_sensores.sensores:
            red_sensores.sensores[1].valor_minimo = parametros_configurables["temperatura"]["min"]
            red_sensores.sensores[1].valor_maximo = parametros_configurables["temperatura"]["max"]
        
        # Humedad (ID 2)
        if 2 in red_sensores.sensores:
            red_sensores.sensores[2].valor_minimo = parametros_configurables["humedadSuelo"]["min"]
            red_sensores.sensores[2].valor_maximo = parametros_configurables["humedadSuelo"]["max"]
        
        # pH (ID 3)
        if 3 in red_sensores.sensores:
            red_sensores.sensores[3].valor_minimo = parametros_configurables["phSuelo"]["min"]
            red_sensores.sensores[3].valor_maximo = parametros_configurables["phSuelo"]["max"]
    except Exception as e:
        print(f"Error al actualizar sensores: {e}")
    
    return jsonify({"mensaje": "Parámetros actualizados correctamente", "parametros": parametros_configurables})

@app.route('/api/simulacion/iniciar', methods=['POST'])
def iniciar_simulacion():
    """Inicia la simulación continua en segundo plano"""
    global simulacion_activa, hilo_simulacion, parametros_configurables
    
    if simulacion_activa:
        return jsonify({"mensaje": "La simulación ya está en ejecución"})
    
    # Recibir parámetros personalizados si existen
    if request.json:
        nuevos_parametros = request.json
        parametros_configurables = nuevos_parametros
        
        # Actualizar rangos de sensores (código existente)
        try:
            # Código de actualización existente...
            pass
        except Exception as e:
            print(f"Error al actualizar sensores: {e}")
    
    simulacion_activa = True
    hilo_simulacion = threading.Thread(target=simulacion_continua)
    hilo_simulacion.daemon = True
    hilo_simulacion.start()
    
    duracion_minutos = parametros_configurables["simulacion"]["duracion"]
    return jsonify({
        "mensaje": f"Simulación iniciada. Duración: {duracion_minutos} minutos",
        "duracion_minutos": duracion_minutos
    })
    

@app.route('/api/simulacion/detener', methods=['POST'])
def detener_simulacion():
    """Detiene la simulación en segundo plano"""
    global simulacion_activa, hilo_simulacion
    
    if not simulacion_activa:
        return jsonify({"mensaje": "La simulación no está en ejecución"})
    
    simulacion_activa = False
    if hilo_simulacion and hilo_simulacion.is_alive():
        hilo_simulacion.join(timeout=2.0)
        hilo_simulacion = None
    
    return jsonify({"mensaje": "Simulación detenida"})

@app.route('/api/condiciones/<condicion>', methods=['POST'])
def simular_condiciones(condicion):
    """Activa diferentes condiciones de simulación"""
    global parametros_configurables
    
    if condicion == "heladas":
        red_sensores.simular_heladas()
        # Actualizar parámetros configurables para heladas
        parametros_configurables["temperatura"]["min"] = -10
        parametros_configurables["temperatura"]["max"] = 5
        parametros_configurables["humedadSuelo"]["min"] = 10
        parametros_configurables["humedadSuelo"]["max"] = 30
        mensaje = "Simulando condiciones de heladas"
        
    elif condicion == "sequia":
        red_sensores.simular_sequia()
        # Actualizar parámetros configurables para sequía
        parametros_configurables["temperatura"]["min"] = 30
        parametros_configurables["temperatura"]["max"] = 45
        parametros_configurables["humedadSuelo"]["min"] = 5
        parametros_configurables["humedadSuelo"]["max"] = 20
        mensaje = "Simulando condiciones de sequía"
        
    elif condicion == "lluvia":
        red_sensores.simular_lluvia_intensa()
        # Actualizar parámetros configurables para lluvia
        parametros_configurables["temperatura"]["min"] = 10
        parametros_configurables["temperatura"]["max"] = 25
        parametros_configurables["humedadSuelo"]["min"] = 70
        parametros_configurables["humedadSuelo"]["max"] = 100
        mensaje = "Simulando condiciones de lluvia intensa"
        
    elif condicion == "normal":
        red_sensores.restaurar_condiciones_normales()
        # Restaurar a valores normales
        parametros_configurables["temperatura"]["min"] = parametros["temperatura"][0]
        parametros_configurables["temperatura"]["max"] = parametros["temperatura"][1]
        parametros_configurables["humedadSuelo"]["min"] = parametros["humedad"][0]
        parametros_configurables["humedadSuelo"]["max"] = parametros["humedad"][1]
        parametros_configurables["phSuelo"]["min"] = parametros["ph"][0]
        parametros_configurables["phSuelo"]["max"] = parametros["ph"][1]
        mensaje = "Restaurando condiciones normales"
        
    else:
        return jsonify({"error": f"Condición '{condicion}' no reconocida"}), 400
    
    # Devolver los parámetros actualizados junto con el mensaje
    return jsonify({
        "mensaje": mensaje,
        "parametros": parametros_configurables
    })

@app.route('/api/simulacion/estado', methods=['GET'])
def estado_simulacion():
    """Devuelve el estado actual de la simulación"""
    if not simulacion_activa:
        return jsonify({
            "activa": False,
            "mensaje": "No hay simulación activa"
        })
    
    # Calcular tiempo restante
    duracion_segundos = parametros_configurables["simulacion"]["duracion"] * 60
    tiempo_inicio = hilo_simulacion.tiempo_inicio if hasattr(hilo_simulacion, 'tiempo_inicio') else time.time()
    tiempo_restante = max(0, (tiempo_inicio + duracion_segundos) - time.time())
    
    return jsonify({
        "activa": True,
        "duracion_total_minutos": parametros_configurables["simulacion"]["duracion"],
        "tiempo_restante_segundos": int(tiempo_restante),
        "tiempo_restante_minutos": int(tiempo_restante / 60)
    })

@app.route('/')
def home():
    return "<h2>EcoSmart Backend funcionando correctamente en el puerto 5000 🚀</h2>"

if __name__ == '__main__':
    app.run(debug=True, port=5000)