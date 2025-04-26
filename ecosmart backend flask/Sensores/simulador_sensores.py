from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import os
import sys
import time
import threading
import pandas as pd

# Agregar el directorio de sensores al path
from Sensor import Sensor, RedSensores  

app = Flask(__name__)
CORS(app)  # Permitir solicitudes CORS para la API

# Crear la red de sensores
red_sensores = RedSensores()
ultimos_datos= {}

# Inicializar sensores predefinidos
sensores_iniciales = [
    Sensor("Temperatura", "°C", 1, 4, 20, 5),
    Sensor("Humedad", "%", 2, 40, 90, 5),
    Sensor("pH del suelo", "", 3, 3, 9, 5),
    Sensor("Nutrientes", "mg/L", 4, 0, 50, 5)
]



for sensor in sensores_iniciales:
    red_sensores.agregar_sensor(sensor)

# Variable para controlar la simulación en segundo plano
simulacion_activa = False
hilo_simulacion = None

def simulacion_continua():
    """Función para ejecutar en un hilo separado que genera datos continuamente"""
    global ultimos_datos
    while simulacion_activa:
        ultimos_datos = red_sensores.generar_todos_datos()
        print(f"Datos generados: {ultimos_datos}")
        time.sleep(5)  # Pausa de 5 segundo entre lecturas

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

@app.route('/api/sensores/<int:id_sensor>', methods=['GET'])
def obtener_sensor(id_sensor):
    """Devuelve información de un sensor específico"""
    sensor = red_sensores.obtener_sensor(id_sensor)
    if sensor:
        return jsonify(sensor.to_dict())
    return jsonify({"error": "Sensor no encontrado"}), 404

@app.route('/api/sensores/<int:id_sensor>', methods=['PUT'])
def actualizar_sensor(id_sensor):
    """Actualiza los parámetros de un sensor"""
    sensor = red_sensores.obtener_sensor(id_sensor)
    if not sensor:
        return jsonify({"error": "Sensor no encontrado"}), 404
    
    datos = request.json
    if 'valor_minimo' in datos:
        sensor.valor_minimo = datos['valor_minimo']
    if 'valor_maximo' in datos:
        sensor.valor_maximo = datos['valor_maximo']
    if 'frecuencia' in datos:
        sensor.frecuencia = datos['frecuencia']
    
    return jsonify(sensor.to_dict())

@app.route('/api/datos', methods=['GET'])
def obtener_datos():
    global ultimos_datos
    # Solo devuelve el último dato, nunca genera uno nuevo aquí
    if ultimos_datos:
        return jsonify(ultimos_datos)
    else:
        return jsonify({"error": "No hay datos disponibles"}), 404

@app.route('/api/simulacion/iniciar', methods=['POST'])
def iniciar_simulacion():
    """Inicia la simulación continua en segundo plano"""
    global simulacion_activa, hilo_simulacion
    
    if simulacion_activa:
        return jsonify({"mensaje": "La simulación ya está en ejecución"})
    
    simulacion_activa = True
    hilo_simulacion = threading.Thread(target=simulacion_continua)
    hilo_simulacion.daemon = True
    hilo_simulacion.start()
    
    return jsonify({"mensaje": "Simulación iniciada"})

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
    if condicion == "heladas":
        red_sensores.simular_heladas()
        mensaje = "Simulando condiciones de heladas"
    elif condicion == "sequia":
        red_sensores.simular_sequia()
        mensaje = "Simulando condiciones de sequía"
    elif condicion == "lluvia":
        red_sensores.simular_lluvia_intensa()
        mensaje = "Simulando condiciones de lluvia intensa"
    elif condicion == "normal":
        red_sensores.restaurar_condiciones_normales()
        mensaje = "Restaurando condiciones normales"
    else:
        return jsonify({"error": f"Condición '{condicion}' no reconocida"}), 400
    
    return jsonify({"mensaje": mensaje})


@app.route('/')
def home():
    return "<h2>EcoSmart Backend funcionando correctamente en el puerto 5000 🚀</h2>"

if __name__ == '__main__':
    app.run(debug=True, port=5000)