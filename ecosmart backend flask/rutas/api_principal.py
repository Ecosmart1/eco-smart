from flask import Flask, jsonify, request, send_file, current_app
from flask_cors import CORS
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from Sensores.Sensor import obtener_parametros_estacion, Sensor, RedSensores, SensorNutrientes
import time
from datetime import datetime, timedelta, UTC
import threading
import pandas as pd
import json
from json import JSONDecodeError
from modelos.models import db, Usuario, LecturaSensor , Parcela, Conversacion, Mensaje, LogAccionUsuario
from werkzeug.security import generate_password_hash, check_password_hash
from servicios.openrouter import send_to_deepseek
from servicios.logs import registrar_log, registrar_accion
from sqlalchemy import func
from random import randint
import smtplib
from email.mime.text import MIMEText



app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "X-User-Id", "X-User-Rol", "Authorization"]
    }
})  # Permite solicitudes CORS para la API

#base de datos
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:1313@localhost:5432/ecosmart_v2'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)


#Endpoints para la API de administración de usuarios
@app.route('/api/registro', methods=['POST'])
def registrar_usuario():
    data = request.json
    if Usuario.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'El correo ya está registrado'}), 400
    usuario = Usuario(
        nombre=data['nombre'],
        email=data['email'],
        password=generate_password_hash(data['password']),
        rol=data['rol']
    )
    db.session.add(usuario)
    db.session.commit()
    registrar_log(usuario.id, 'registro', 'usuario', usuario.id, detalles=str(data))

    return jsonify({'mensaje': 'Usuario registrado correctamente'})

#@app.route('/api/usuarios/<int:id>', methods=['GET'])
@app.route('/api/login', methods=['POST'])
def login_usuario():
    data = request.json
    usuario = Usuario.query.filter_by(email=data['email']).first()
    registrar_log(usuario.id, 'login', 'usuario', usuario.id)
    if usuario and check_password_hash(usuario.password, data['password']):
        return jsonify({
            'id': usuario.id,
            'nombre': usuario.nombre,
            'email': usuario.email,
            'rol': usuario.rol
        })
    else:
        return jsonify({'error': 'Credenciales incorrectas'}), 401
    
    




# Crear la red de sensores
red_sensores = RedSensores()


# Inicializar los sensores con parámetros de la estación
parametros = obtener_parametros_estacion()
sensores_iniciales = [
    Sensor("Temperatura", "°C", 1, parametros["temperatura"][0], parametros["temperatura"][1], 5),
    Sensor("Humedad", "%", 2, parametros["humedad"][0], parametros["humedad"][1], 5),
    Sensor("pH del suelo", "", 3, parametros["ph"][0], parametros["ph"][1], 5),
    SensorNutrientes("Nutrientes", "mg/L", 4, 0, 0, 5)
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

# Crear la red de sensores
red_sensores = RedSensores()
for sensor in sensores_iniciales:
    red_sensores.agregar_sensor(sensor)

# Genera los datos iniciales
ultimos_datos = red_sensores.generar_todos_datos(parametros_configurables)

# Variable para controlar la simulación en segundo plano
simulacion_activa = False
hilo_simulacion = None

# Modifica la función simulacion_continua para asignar parcelas
def simulacion_continua():
    global ultimos_datos, simulacion_activa

    # Abre el contexto de aplicación para este hilo
    with app.app_context():
        # Obtener parcelas disponibles al inicio de la simulación
        parcelas_disponibles = Parcela.query.all()
        if not parcelas_disponibles:
            print("⚠️ No hay parcelas disponibles. Los datos se generarán sin asignar a parcelas.")
            parcela_id = None
        else:
            # Usar la primera parcela por defecto (puedes modificar esto para elegir otra)
            parcela_id = parcelas_disponibles[0].id
            print(f"✅ Los datos se asignarán a la parcela: {parcelas_disponibles[0].nombre} (ID: {parcela_id})")
        
        # Calcular tiempo de finalización
        duracion_segundos = parametros_configurables["simulacion"]["duracion"] * 60
        intervalo = parametros_configurables["simulacion"]["intervalo"]
        tiempo_inicio = time.time()
        tiempo_fin = tiempo_inicio + duracion_segundos

        print(f"Simulación iniciada por {duracion_segundos} segundos")
        
        while simulacion_activa and time.time() < tiempo_fin:
            ultimos_datos = red_sensores.generar_todos_datos(parametros_configurables)
            print(f"Datos generados en {time.strftime('%Y-%m-%d %H:%M:%S')}")
            
            # Guardar en la base de datos CON la asignación de parcela
            for id_sensor, dato in ultimos_datos.items():
                sensor = red_sensores.sensores[id_sensor]
                lectura = LecturaSensor(
                    timestamp=dato["timestamp"],
                    parcela=parcela_id,  # CAMBIO CLAVE: Asignar la parcela
                    sensor_id=id_sensor,
                    tipo=sensor.tipo,
                    valor=json.dumps(dato["valor"]) if isinstance(dato["valor"], dict) else str(dato["valor"]),
                    unidad=sensor.unidad
                )
                db.session.add(lectura)
            
            db.session.commit()
            
            # Calcular tiempo restante
            tiempo_restante = tiempo_fin - time.time()
            if tiempo_restante <= 0:
                break

            # Dormir hasta la próxima iteración
            tiempo_espera = min(intervalo, tiempo_restante)
            time.sleep(tiempo_espera)

        if time.time() >= tiempo_fin and simulacion_activa:
            print("Simulación completada: se alcanzó la duración configurada")
            simulacion_activa = False

# Fin de la simulación e exportación de datos
@app.route('/api/exportar_csv', methods=['GET'])
def exportar_csv():
    # Crear un DataFrame con todas las lecturas
    registros = []
    
    # Agrupar los datos por timestamp para tener lecturas completas en cada fila
    datos_por_timestamp = {}
    
    for sensor in red_sensores.sensores.values():
        for lectura in sensor.historial:
            timestamp = lectura["timestamp"]
            
            if timestamp not in datos_por_timestamp:
                datos_por_timestamp[timestamp] = {
                    "timestamp": timestamp,
                    "temperatura": None,
                    "humedad": None,
                    "ph": None,
                    "nitrogeno": None,
                    "fosforo": None,
                    "potasio": None
                }
            
            if sensor.id_sensor == 1:  # Temperatura
                datos_por_timestamp[timestamp]["temperatura"] = lectura["valor"]
            elif sensor.id_sensor == 2:  # Humedad
                datos_por_timestamp[timestamp]["humedad"] = lectura["valor"]
            elif sensor.id_sensor == 3:  # pH
                datos_por_timestamp[timestamp]["ph"] = lectura["valor"]
            elif sensor.id_sensor == 4:  # Nutrientes
                datos_por_timestamp[timestamp]["nitrogeno"] = lectura["valor"]["nitrogeno"]
                datos_por_timestamp[timestamp]["fosforo"] = lectura["valor"]["fosforo"]
                datos_por_timestamp[timestamp]["potasio"] = lectura["valor"]["potasio"]
    
    # Convertir el diccionario a una lista para el DataFrame
    registros = list(datos_por_timestamp.values())
    
    if not registros:
        return jsonify({"error": "No hay datos para exportar"}), 400
    
    # Crear DataFrame y exportar
    df = pd.DataFrame(registros)
    
    # Reordenar columnas para mejor legibilidad
    columnas = ["timestamp", "temperatura", "humedad", "ph", "nitrogeno", "fosforo", "potasio"]
    df = df[columnas]
    
    # Guardar el archivo
    ruta_csv = os.path.join(os.path.dirname(__file__), "datos_sensores_completo.csv")
    df.to_csv(ruta_csv, index=False)
    
    # También generar formato JSON como alternativa
    ruta_json = os.path.join(os.path.dirname(__file__), "datos_sensores.json")
    df.to_json(ruta_json, orient="records", date_format="iso")
    
    return send_file(ruta_csv, as_attachment=True)


# Endpoint para obtener los datos de los sensores
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

# Reemplaza la función para actualizar parámetros con esta versión centralizada
@app.route('/api/parametros', methods=['POST'])
@registrar_accion('actualizar_parametros', 'parametros')
def actualizar_parametros():
    """Actualiza todos los parámetros configurables de forma centralizada"""
    global parametros_configurables
    try:
        nuevos_parametros = request.json
        
        if not nuevos_parametros:
            return jsonify({"error": "No se recibieron parámetros"}), 400
        
        # Actualizar parámetros
        parametros_configurables = nuevos_parametros
        
        # Aplicar los parámetros a todos los sensores
        try:
            # Temperatura (ID 1)
            if 1 in red_sensores.sensores:
                red_sensores.sensores[1].valor_minimo = parametros_configurables["temperatura"]["min"]
                red_sensores.sensores[1].valor_maximo = parametros_configurables["temperatura"]["max"]
                # Actualizar frecuencia
                red_sensores.sensores[1].frecuencia = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
            
            # Humedad (ID 2)
            if 2 in red_sensores.sensores:
                red_sensores.sensores[2].valor_minimo = parametros_configurables["humedadSuelo"]["min"]
                red_sensores.sensores[2].valor_maximo = parametros_configurables["humedadSuelo"]["max"]
                # Actualizar frecuencia
                red_sensores.sensores[2].frecuencia = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
            
            # pH (ID 3)
            if 3 in red_sensores.sensores:
                red_sensores.sensores[3].valor_minimo = parametros_configurables["phSuelo"]["min"]
                red_sensores.sensores[3].valor_maximo = parametros_configurables["phSuelo"]["max"]
                # Actualizar frecuencia
                red_sensores.sensores[3].frecuencia = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
                
            # Nutrientes (ID 4)
            if 4 in red_sensores.sensores:
                # Solo actualizar frecuencia, ya que los rangos están en el objeto parametros_configurables
                red_sensores.sensores[4].frecuencia = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
                
        except Exception as e:
            current_app.logger.error(f"Error al actualizar sensores: {e}")
            return jsonify({"error": f"Error al actualizar sensores: {str(e)}"}), 500
            
        # Registrar log solo si existe el ID de usuario
        user_id = request.headers.get('X-User-Id')
        if user_id:
            try:
                registrar_log(user_id, 'actualizar_parametros', 'parametros', None,
                            detalles=str(nuevos_parametros))
            except Exception as e:
                current_app.logger.error(f"Error al registrar log: {e}")
                # No detener la ejecución por errores de log
                
        return jsonify({
            "mensaje": "Parámetros actualizados correctamente", 
            "parametros": parametros_configurables
        })
    except Exception as e:
        current_app.logger.error(f"Error general en actualizar_parametros: {str(e)}")
        return jsonify({"error": f"Error al actualizar parámetros: {str(e)}"}), 500

# endpoint para seleccionar parcela específica
@app.route('/api/simulacion/iniciar/<int:parcela_id>', methods=['POST'])
@registrar_accion('iniciar_simulacion', 'parcela')  # Detecta 'parcela_id' automáticamente
def iniciar_simulacion_parcela(parcela_id):
    """Inicia la simulación continua asignando datos a una parcela específica"""
    global simulacion_activa, hilo_simulacion, parametros_configurables
    
    try:
        # Verificar si ya hay una simulación activa
        if simulacion_activa:
            return jsonify({"mensaje": "La simulación ya está en ejecución"})
        
        # Verificar que la parcela exista
        parcela = Parcela.query.get(parcela_id)
        if not parcela:
            return jsonify({"error": f"No existe parcela con ID {parcela_id}"}), 404
        
        # Recibir parámetros personalizados si existen
        if request.json:
            try:
                parametros_configurables = request.json
                # Actualizar sensores con los nuevos parámetros
                if 1 in red_sensores.sensores:
                    red_sensores.sensores[1].valor_minimo = parametros_configurables.get("temperatura", {}).get("min", 10)
                    red_sensores.sensores[1].valor_maximo = parametros_configurables.get("temperatura", {}).get("max", 30)
                    red_sensores.sensores[1].frecuencia = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
                
                if 2 in red_sensores.sensores:
                    red_sensores.sensores[2].valor_minimo = parametros_configurables.get("humedadSuelo", {}).get("min", 30)
                    red_sensores.sensores[2].valor_maximo = parametros_configurables.get("humedadSuelo", {}).get("max", 70)
                    red_sensores.sensores[2].frecuencia = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
                
                if 3 in red_sensores.sensores:
                    red_sensores.sensores[3].valor_minimo = parametros_configurables.get("phSuelo", {}).get("min", 5.5)
                    red_sensores.sensores[3].valor_maximo = parametros_configurables.get("phSuelo", {}).get("max", 7.5)
                    red_sensores.sensores[3].frecuencia = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
                    
                if 4 in red_sensores.sensores:
                    red_sensores.sensores[4].frecuencia = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
            except Exception as e:
                current_app.logger.error(f"Error al actualizar parámetros: {e}")
                # Continuar con los parámetros por defecto
        
        # Guardar el ID de parcela para que la simulación lo use
        app.config['PARCELA_SIMULACION'] = parcela_id
        
        # Iniciar la simulación
        simulacion_activa = True
        hilo_simulacion = threading.Thread(target=simulacion_continua_parcela)
        hilo_simulacion.daemon = True
        hilo_simulacion.start()
        
        # Registrar log solo si hay usuario identificado
        user_id = request.headers.get('X-User-Id')
        if user_id:
            try:
                registrar_log(user_id, 'iniciar_simulacion', 'parcela', parcela_id)
            except Exception as e:
                current_app.logger.error(f"Error al registrar log: {e}")
        
        # Retornar información sobre la simulación iniciada
        duracion_minutos = parametros_configurables.get("simulacion", {}).get("duracion", 60)
        return jsonify({
            "mensaje": f"Simulación iniciada para parcela '{parcela.nombre}'. Duración: {duracion_minutos} minutos",
            "duracion_minutos": duracion_minutos,
            "parcela": {
                "id": parcela.id,
                "nombre": parcela.nombre
            }
        })
        
    except Exception as e:
        # Si hay cualquier error, asegurarse de que no quede una simulación activa
        simulacion_activa = False
        current_app.logger.error(f"Error al iniciar simulación: {str(e)}")
        return jsonify({"error": f"Error al iniciar simulación: {str(e)}"}), 500

# Función de simulación específica para parcela seleccionada
def simulacion_continua_parcela():
    global ultimos_datos, simulacion_activa

    try:
        # Abre el contexto de aplicación para este hilo
        with app.app_context():
            # Obtener la parcela seleccionada con manejo de errores
            parcela_id = app.config.get('PARCELA_SIMULACION')
            if not parcela_id:
                print("❌ Error: No se especificó parcela para la simulación")
                simulacion_activa = False
                return
                
            parcela = Parcela.query.get(parcela_id)
            if not parcela:
                print(f"❌ Error: No se encontró parcela con ID {parcela_id}")
                simulacion_activa = False
                return
                
            print(f"✅ Simulando datos para la parcela: {parcela.nombre} (ID: {parcela_id})")
            
            # Calcular tiempo de finalización
            duracion_segundos = parametros_configurables.get("simulacion", {}).get("duracion", 60) * 60
            intervalo = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
            tiempo_inicio = time.time()
            tiempo_fin = tiempo_inicio + duracion_segundos

            print(f"Simulación iniciada por {duracion_segundos} segundos para parcela {parcela.nombre}")
            
            while simulacion_activa and time.time() < tiempo_fin:
                try:
                    # Imprimir valores antes de generar
                    print(f"Sensores antes de generar datos:")
                    for id_sensor, sensor in red_sensores.sensores.items():
                        print(f"  Sensor {id_sensor} ({sensor.tipo}): min={sensor.valor_minimo}, max={sensor.valor_maximo}")
                    
                    # Generar datos
                    ultimos_datos = red_sensores.generar_todos_datos(parametros_configurables)
                    
                    # Imprimir valores generados
                    print(f"Nuevos datos generados:")
                    for id_sensor, dato in ultimos_datos.items():
                        if isinstance(dato["valor"], dict):
                            print(f"  Sensor {id_sensor}: valor={json.dumps(dato['valor'])}")
                        else:
                            print(f"  Sensor {id_sensor}: valor={dato['valor']}")
                        if not sensor:
                            continue
                            
                        sensor_actual = red_sensores.sensores.get(id_sensor)
                        if not sensor_actual:
                            print(f"❌ Sensor {id_sensor} no encontrado en la red de sensores")
                            continue
                        lectura = LecturaSensor(
                            timestamp=dato["timestamp"],
                            parcela=parcela_id,
                            sensor_id=id_sensor,
                            tipo=sensor_actual.tipo,
                            valor=json.dumps(dato["valor"]) if isinstance(dato["valor"], dict) else str(dato["valor"]),
                            unidad=sensor_actual.unidad
                        )
                        db.session.add(lectura)
                    
                    try:
                        db.session.commit()
                        print(f"✅ Datos guardados para parcela {parcela.nombre}")
                    except Exception as e:
                        db.session.rollback()
                        print(f"❌ Error al guardar datos: {e}")
                    
                    # Calcular tiempo restante
                    tiempo_restante = tiempo_fin - time.time()
                    if tiempo_restante <= 0:
                        break

                    # Dormir hasta la próxima iteración
                    tiempo_espera = min(intervalo, tiempo_restante)
                    time.sleep(tiempo_espera)
                    
                except Exception as ciclo_e:
                    print(f"Error en ciclo de simulación: {ciclo_e}")
                    time.sleep(intervalo)  # Esperar antes de intentar de nuevo

            if time.time() >= tiempo_fin and simulacion_activa:
                print(f"Simulación completada para parcela {parcela.nombre}: se alcanzó la duración configurada")
                simulacion_activa = False
                
    except Exception as e:
        print(f"❌ Error general en simulación_continua_parcela: {e}")
        # Asegurar que se desactive la simulación en caso de error
        simulacion_activa = False


@app.route('/api/simulacion/iniciar', methods=['POST'])
def iniciar_simulacion():
    """Inicia la simulación continua utilizando la actualización centralizada"""
    global simulacion_activa, hilo_simulacion, parametros_configurables
    
    if simulacion_activa:
        return jsonify({"mensaje": "La simulación ya está en ejecución"})
    
    # Recibir parámetros personalizados si existen
    if request.json:
        nuevos_parametros = request.json
        parametros_configurables = nuevos_parametros
        
        # Aplicar los parámetros a todos los sensores de manera centralizada
        try:
            # Temperatura (ID 1)
            if 1 in red_sensores.sensores:
                red_sensores.sensores[1].valor_minimo = parametros_configurables["temperatura"]["min"]
                red_sensores.sensores[1].valor_maximo = parametros_configurables["temperatura"]["max"]
                red_sensores.sensores[1].frecuencia = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
            
            # Humedad (ID 2)
            if 2 in red_sensores.sensores:
                red_sensores.sensores[2].valor_minimo = parametros_configurables["humedadSuelo"]["min"]
                red_sensores.sensores[2].valor_maximo = parametros_configurables["humedadSuelo"]["max"]
                red_sensores.sensores[2].frecuencia = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
            
            # pH (ID 3)
            if 3 in red_sensores.sensores:
                red_sensores.sensores[3].valor_minimo = parametros_configurables["phSuelo"]["min"]
                red_sensores.sensores[3].valor_maximo = parametros_configurables["phSuelo"]["max"]
                red_sensores.sensores[3].frecuencia = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
                
            # Nutrientes (ID 4)
            if 4 in red_sensores.sensores:
                red_sensores.sensores[4].frecuencia = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
        except Exception as e:
            current_app.logger.error(f"Error al actualizar sensores: {e}")
    
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
    
    # Registrar log solo si existe el ID de usuario
    user_id = request.headers.get('X-User-Id')
    if user_id:
        try:
            registrar_log(user_id, 'detener_simulacion', 'simulacion', None)
        except Exception as e:
            current_app.logger.error(f"Error al registrar log al detener simulación: {e}")
            # No detener la ejecución por errores de log
    
    simulacion_activa = False
    if hilo_simulacion and hilo_simulacion.is_alive():
        hilo_simulacion.join(timeout=2.0)
        hilo_simulacion = None
    
    return jsonify({"mensaje": "Simulación detenida"})

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
    tiempo_inicio = time.time() - (parametros_configurables["simulacion"]["intervalo"] * 5)  # Aproximado
    tiempo_restante = max(0, (tiempo_inicio + duracion_segundos) - time.time())
    
    return jsonify({
        "activa": True,
        "duracion_total_minutos": parametros_configurables["simulacion"]["duracion"],
        "tiempo_restante_segundos": int(tiempo_restante),
        "tiempo_restante_minutos": int(tiempo_restante / 60)
    })

@app.route('/api/condiciones/<condicion>', methods=['POST'])
def simular_condiciones(condicion):
    """Activa diferentes condiciones de simulación usando la actualización centralizada"""
    global parametros_configurables
    
    # Hacer una copia de los parámetros actuales para modificarlos
    nuevos_parametros = dict(parametros_configurables)
    
    if condicion == "heladas":
        # Actualizar solo los valores relevantes para esta condición
        nuevos_parametros["temperatura"]["min"] = -10
        nuevos_parametros["temperatura"]["max"] = 5
        nuevos_parametros["humedadSuelo"]["min"] = 10
        nuevos_parametros["humedadSuelo"]["max"] = 30
        mensaje = "Simulando condiciones de heladas"
        
    elif condicion == "sequia":
        nuevos_parametros["temperatura"]["min"] = 30
        nuevos_parametros["temperatura"]["max"] = 45
        nuevos_parametros["humedadSuelo"]["min"] = 5
        nuevos_parametros["humedadSuelo"]["max"] = 20
        mensaje = "Simulando condiciones de sequía"
        
    elif condicion == "lluvia":
        nuevos_parametros["temperatura"]["min"] = 10
        nuevos_parametros["temperatura"]["max"] = 25
        nuevos_parametros["humedadSuelo"]["min"] = 70
        nuevos_parametros["humedadSuelo"]["max"] = 100
        mensaje = "Simulando condiciones de lluvia intensa"
        
    elif condicion == "normal":
        parametros = obtener_parametros_estacion()
        nuevos_parametros["temperatura"]["min"] = parametros["temperatura"][0]
        nuevos_parametros["temperatura"]["max"] = parametros["temperatura"][1]
        nuevos_parametros["humedadSuelo"]["min"] = parametros["humedad"][0]
        nuevos_parametros["humedadSuelo"]["max"] = parametros["humedad"][1]
        nuevos_parametros["phSuelo"]["min"] = parametros["ph"][0]
        nuevos_parametros["phSuelo"]["max"] = parametros["ph"][1]
        mensaje = "Restaurando condiciones normales"
        
    else:
        return jsonify({"error": f"Condición '{condicion}' no reconocida"}), 400
    
    # Actualizar los parámetros globales
    parametros_configurables = nuevos_parametros
    
    # Aplicar los cambios a los sensores usando la misma lógica centralizada
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
        current_app.logger.error(f"Error al actualizar sensores: {e}")
    
    # Devolver los parámetros actualizados junto con el mensaje
    return jsonify({
        "mensaje": mensaje,
        "parametros": parametros_configurables
    })

#endpints para la API de administración usuarios
@app.route('/api/usuarios/total', methods=['GET'])
def total_usuarios():
    total = Usuario.query.count()
    return jsonify({'total': total})    

@app.route('/api/usuarios', methods=['GET'])
def listar_usuarios():
    usuarios = Usuario.query.all()
    return jsonify([
        {
            'id': u.id,
            'nombre': u.nombre,
            'email': u.email,
            'rol': u.rol
        } for u in usuarios
    ])

@app.route('/api/usuarios/<int:id>', methods=['PUT'])
def actualizar_usuario(id):
    data = request.json
    usuario = Usuario.query.get(id)
    if not usuario:
        return jsonify({'error': 'Usuario no encontrado'}), 404

    usuario.nombre = data.get('nombre', usuario.nombre)
    usuario.email = data.get('email', usuario.email)
    usuario.rol = data.get('rol', usuario.rol)

    # Cambiar contraseña si se solicita
    if data.get('newPassword'):
        # Verifica la contraseña actual antes de cambiarla
        if not data.get('password') or not check_password_hash(usuario.password, data['password']):
            return jsonify({'error': 'La contraseña actual es incorrecta'}), 400
        usuario.password = generate_password_hash(data['newPassword'])

    db.session.commit()
    return jsonify({'mensaje': 'Usuario actualizado'})

@app.route('/api/usuarios/<int:id>', methods=['DELETE'])
def eliminar_usuario(id):
    usuario = Usuario.query.get(id)
    if not usuario:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    db.session.delete(usuario)
    db.session.commit()
    return jsonify({'mensaje': 'Usuario eliminado correctamente'})

@app.route('/api/parcelas', methods=['POST'])
@registrar_accion('crear_parcela', 'parcela', lambda resultado, *args, **kwargs: resultado.get('id'))
def agregar_parcela():
    try:
        data = request.json
        parcela = Parcela(
            nombre=data['nombre'],
            ubicacion=data.get('ubicacion'),
            hectareas=data.get('hectareas'),
            latitud=data.get('latitud'),
            longitud=data.get('longitud'),
            fecha_creacion=datetime.utcnow(),
            cultivo_actual=data.get('cultivo_actual'),
            fecha_siembra=data.get('fecha_siembra')
        )
        db.session.add(parcela)
        db.session.commit()
        
        # Registrar log solo si existe el ID de usuario
        user_id = request.headers.get('X-User-Id')
        if user_id:
            try:
                registrar_log(user_id, 'crear_parcela', 'parcela', parcela.id,
                          detalles=str(data))
            except Exception as e:
                current_app.logger.error(f"Error al registrar log: {e}")
                # No detener la ejecución por errores de log
       
        return jsonify({'mensaje': 'Parcela agregada correctamente', 'id': parcela.id})
    
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error al agregar parcela: {str(e)}")
        return jsonify({'error': f"Error al crear parcela: {str(e)}"}), 500

@app.route('/api/parcelas', methods=['GET'])
def listar_parcelas():
    parcelas = Parcela.query.all()
    user_id = request.headers.get('X-User-Id')
    if user_id:  # <-- CAMBIO CLAVE: verificar que existe
        try:
            registrar_log(user_id, 'listar_parcelas', 'parcela', None)
        except Exception as e:
            current_app.logger.error(f"Error al registrar log: {e}")
            # No detener la ejecución por errores de log

    resultado = []
    for p in parcelas:
        resultado.append({
            "id": p.id,
            "nombre": p.nombre,
            "ubicacion": p.ubicacion,
            "hectareas": p.hectareas,
            "latitud": p.latitud,
            "longitud": p.longitud,
            "fecha_creacion": p.fecha_creacion.isoformat() if p.fecha_creacion else None,
            "cultivo_actual": p.cultivo_actual,
            "fecha_siembra": p.fecha_siembra.isoformat() if p.fecha_siembra else None
        })
    return jsonify(resultado)

#endoints para la API de conversaciones
# Endpoint para listar todas las conversaciones de un usuario
# Endpoint para obtener conversaciones de un usuario
@app.route('/api/conversaciones/<user_id>', methods=['GET'])
def obtener_conversaciones(user_id):
    try:
        # Verificar que el usuario exista
        usuario = Usuario.query.get_or_404(user_id)
        
        # Obtener conversaciones
        conversaciones = Conversacion.query.filter_by(usuario_id=user_id).order_by(Conversacion.created_at.desc()).all()
        
        # Construir resultado directamente sin usar get_last_message
        resultado = []
        for conv in conversaciones:
            # Buscar el último mensaje manualmente
            ultimo_mensaje = db.session.query(Mensaje).filter_by(
                conversacion_id=conv.id
            ).order_by(Mensaje.timestamp.desc()).first()
            
            resultado.append({
                'id': conv.id,
                'created_at': conv.created_at.isoformat(),
                'last_message': ultimo_mensaje.content if ultimo_mensaje else ""
            })
        
        return jsonify(resultado)
        
    except Exception as e:
        current_app.logger.error(f"Error en obtener_conversaciones: {str(e)}")
        return jsonify({'error': str(e)}), 500
#Endpoin para eliminar una parcela
@app.route('/api/parcelas/<int:id>', methods=['DELETE'])
def eliminar_parcela(id):
    try:
        parcela = Parcela.query.get(id)
        if not parcela:
            return jsonify({'error': 'Parcela no encontrada'}), 404
        
        # Primero eliminar todas las lecturas de sensores asociadas
        LecturaSensor.query.filter_by(parcela=id).delete()
        
        # Luego eliminar la parcela
        db.session.delete(parcela)
        db.session.commit()
        
        # Registrar log solo si existe el ID de usuario
        user_id = request.headers.get('X-User-Id')
        if user_id:
            try:
                registrar_log(user_id, 'eliminar_parcela', 'parcela', id)
            except Exception as e:
                current_app.logger.error(f"Error al registrar log: {e}")
                # No detenemos la ejecución por errores de log
        
        return jsonify({'mensaje': 'Parcela eliminada correctamente'})
    
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error al eliminar parcela: {str(e)}")
        return jsonify({'error': f"Error al eliminar parcela: {str(e)}"}), 500

# Endpoint para obtener una parcela específica por ID
@app.route('/api/parcelas/<int:id>', methods=['GET'])
def obtener_parcela(id):
    parcela = Parcela.query.get(id)
    if not parcela:
        return jsonify({'error': 'Parcela no encontrada'}), 404
    
    # Devolver la información de la parcela
    return jsonify({
        "id": parcela.id,
        "nombre": parcela.nombre,
        "ubicacion": parcela.ubicacion,
        "hectareas": parcela.hectareas,
        "latitud": parcela.latitud,
        "longitud": parcela.longitud,
        "fecha_creacion": parcela.fecha_creacion.isoformat() if parcela.fecha_creacion else None,
        "cultivo_actual": parcela.cultivo_actual,
        "fecha_siembra": parcela.fecha_siembra.isoformat() if parcela.fecha_siembra else None
    })

# Endpoint para actualizar una parcela existente
@app.route('/api/parcelas/<int:id>', methods=['PUT'])
def actualizar_parcela(id):
    parcela = Parcela.query.get(id)
    if not parcela:
        return jsonify({'error': 'Parcela no encontrada'}), 404
    
    # Obtener los datos de la solicitud
    data = request.json
    
    # Actualizar los campos de la parcela
    parcela.nombre = data.get('nombre', parcela.nombre)
    parcela.ubicacion = data.get('ubicacion', parcela.ubicacion)
    parcela.hectareas = data.get('hectareas', parcela.hectareas)
    parcela.latitud = data.get('latitud', parcela.latitud)
    parcela.longitud = data.get('longitud', parcela.longitud)
    parcela.cultivo_actual = data.get('cultivo_actual', parcela.cultivo_actual)
    
    # Manejar la fecha de siembra (si viene como string, convertirla)
    fecha_siembra = data.get('fecha_siembra')
    if fecha_siembra:
        try:
            from datetime import datetime
            if isinstance(fecha_siembra, str):
                # Intentar diferentes formatos
                try:
                    parcela.fecha_siembra = datetime.fromisoformat(fecha_siembra)
                except ValueError:
                    # Formato alternativo que puede venir del frontend
                    parcela.fecha_siembra = datetime.strptime(fecha_siembra, '%Y-%m-%d')
        except Exception as e:
            print(f"Error al procesar fecha: {str(e)}")
    elif fecha_siembra == '' or fecha_siembra is None:
        parcela.fecha_siembra = None
    
    # Guardar los cambios
    try:
        db.session.commit()
        user_id = request.headers.get('X-User-Id')
        registrar_log(user_id, 'actualizar_parcela', 'parcela', id, detalles=str(data))
    
        return jsonify({'mensaje': 'Parcela actualizada correctamente'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error al actualizar parcela: {str(e)}'}), 500


# Endpoint para obtener mensajes de una conversación
@app.route('/api/chat/<conv_id>', methods=['GET'])
def obtener_mensajes(conv_id):
    try:
        # Obtener el ID de usuario del request
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'User ID requerido'}), 400
            
        # Obtener la conversación
        conversacion = Conversacion.query.get_or_404(conv_id)
        
        # Verificar que el usuario es el propietario de la conversación
        if str(conversacion.usuario_id) != str(user_id):
            return jsonify({'error': 'No autorizado para ver esta conversación'}), 403
            
        # Obtener mensajes
        mensajes = Mensaje.query.filter_by(conversacion_id=conv_id).order_by(Mensaje.created_at).all()
        
        return jsonify({
            'id': conversacion.id,
            'created_at': conversacion.created_at.isoformat(),
            'messages': [{
                'sender': msg.sender,
                'content': msg.content,
                'timestamp': msg.created_at.isoformat()
            } for msg in mensajes]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Endpoint para crear nueva conversación
@app.route('/api/conversaciones', methods=['POST'])
def crear_conversacion():
    try:
        data = request.json
        user_id = data.get('user_id')
        
        # Validación explícita
        if not user_id:
            print(f"Error: user_id faltante o inválido: {user_id}")
            return jsonify({'error': 'Se requiere user_id válido'}), 400
            
        # Verificar si el usuario existe
        usuario = Usuario.query.get(user_id)
        if not usuario:
            print(f"Error: Usuario con id {user_id} no encontrado")
            return jsonify({'error': f'Usuario con id {user_id} no encontrado'}), 404
        
        print(f"Creando conversación para usuario {user_id}")
        conversacion = Conversacion(usuario_id=user_id)
        db.session.add(conversacion)
        db.session.commit()
        
        return jsonify({
            'id': conversacion.id,
            'created_at': conversacion.created_at.isoformat()
        })
    except Exception as e:
        print(f"Error al crear conversación: {str(e)}")
        db.session.rollback()
        return jsonify({'error': f'Error al crear conversación: {str(e)}'}), 500

# Endpoint para eliminar conversación
# En el backend:
@app.route('/api/conversaciones/<conv_id>', methods=['DELETE'])
def eliminar_conversacion(conv_id):
    try:
        # Verificar el usuario desde los headers
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            return jsonify({'error': 'User ID requerido'}), 400
            
        conversacion = Conversacion.query.get_or_404(conv_id)
        
        # Verificar propiedad
        if str(conversacion.usuario_id) != str(user_id):
            return jsonify({'error': 'No autorizado para eliminar esta conversación'}), 403
            
        # Eliminar mensajes relacionados
        Mensaje.query.filter_by(conversacion_id=conv_id).delete()
        
        # Eliminar la conversación
        db.session.delete(conversacion)
        db.session.commit()
        
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Endpoint para obtener mensajes de una conversación
@app.route('/api/chat/<int:conv_id>', methods=['GET'])
def obtener_conversacion(conv_id):
    conversacion = Conversacion.query.get_or_404(conv_id)
    mensajes = Mensaje.query.filter_by(conversacion_id=conv_id).order_by(Mensaje.timestamp).all()
    
    return jsonify({
        'conversation_id': conv_id,
        'messages': [{
            'sender': msg.sender,
            'content': msg.content,
            'timestamp': msg.timestamp.isoformat()
        } for msg in mensajes]
    })

# Endpoint para enviar mensaje y obtener respuesta
@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_id = data.get('user_id')
        message_text = data.get('message')
        conversation_id = data.get('conversation_id')

        # Verificar usuario
        usuario = Usuario.query.get_or_404(user_id)

        # Obtener parcelas del usuario para enriquecer contexto
        parcelas = Parcela.query.all()  # Filtra por usuario en producción si es necesario

        # NUEVO: Obtener datos de sensores recientes
        datos_sensores = {}

        # Si se especificó parcela en 'context.parcela_id'
        parcela_id = data.get('context', {}).get('parcela_id')
        if parcela_id:
            parcela_obj = Parcela.query.get(parcela_id)
            if parcela_obj:
                datos_recientes = obtener_datos_sensores_recientes(parcela_id)
                # Envolver el resultado en 'nombre' y 'datos'
                datos_sensores = {
                    'nombre': parcela_obj.nombre,
                    'datos': datos_recientes
                }
        else:
            # Obtener datos de todas las parcelas
            for p in parcelas:
                datos_recientes = obtener_datos_sensores_recientes(p.id)
                if datos_recientes:
                    datos_sensores[p.id] = {
                        'nombre': p.nombre,
                        'datos': datos_recientes
                    }
        # Crear o recuperar conversación
        if conversation_id:
            conversacion = Conversacion.query.get_or_404(conversation_id)
        else:
            conversacion = Conversacion(usuario_id=user_id)
            db.session.add(conversacion)
            db.session.commit()
            conversation_id = conversacion.id
        
        # Guardar mensaje del usuario
        mensaje_usuario = Mensaje(
            conversacion_id=conversation_id,
            sender="user",
            content=message_text
        )
        db.session.add(mensaje_usuario)
        db.session.commit()
        
        # Construir mensaje de sistema con contexto enriquecido
        sistema_mensaje = construir_mensaje_sistema_avanzado(usuario, parcelas, datos_sensores)
        
        # Obtener historial anterior (opcional, para mantener contexto)
        mensajes_previos = Mensaje.query.filter_by(
            conversacion_id=conversation_id
        ).order_by(Mensaje.timestamp.desc()).limit(5).all()  # Cambiado de created_at a timestamp
        
        # Construir historial para enviar a la API
        history = [{"role": "system", "content": sistema_mensaje}]
        
        # Añadir mensajes previos si existen
        for msg in mensajes_previos:
            role = "user" if msg.sender == "user" else "assistant"
            history.append({"role": role, "content": msg.content})
        
        # Añadir mensaje actual
        history.append({"role": "user", "content": message_text})
        
        # Enviar a OpenRouter/Deepseek
        print(f"Enviando a OpenRouter: {history}")
        reply = send_to_deepseek(history)
        
        # Guardar respuesta
        mensaje_respuesta = Mensaje(
            conversacion_id=conversation_id,
            sender="assistant",
            content=reply
        )
        db.session.add(mensaje_respuesta)
        db.session.commit()
        registrar_log(user_id, 'consulta_ia', 'conversacion', conversation_id,
                      detalles=message_text)
        return jsonify({
            'conversation_id': conversation_id,
            'reply': reply
        })
        
    except Exception as e:
        print("Error general en /api/chat:", str(e))
        return jsonify({'error': str(e)}), 500
    
# Añadir esta función para obtener datos recientes de sensores


def obtener_datos_sensores_recientes(parcela_id):
    try:
        # Usar datetime.now(UTC) en lugar de utcnow()
        desde = datetime.now(UTC) - timedelta(hours=24)
        
        # Consultar los diferentes tipos de sensores
        humedad = LecturaSensor.query.filter(
            LecturaSensor.parcela == parcela_id,
            LecturaSensor.tipo == 'Humedad',
            LecturaSensor.timestamp >= desde
        ).order_by(LecturaSensor.timestamp.desc()).first()
        
        temperatura = LecturaSensor.query.filter(
            LecturaSensor.parcela == parcela_id,
            LecturaSensor.tipo == 'Temperatura',
            LecturaSensor.timestamp >= desde
        ).order_by(LecturaSensor.timestamp.desc()).first()
        
        ph = LecturaSensor.query.filter(
            LecturaSensor.parcela == parcela_id,
            LecturaSensor.tipo == 'pH del suelo',
            LecturaSensor.timestamp >= desde
        ).order_by(LecturaSensor.timestamp.desc()).first()
        
        nutrientes = LecturaSensor.query.filter(
            LecturaSensor.parcela == parcela_id,
            LecturaSensor.tipo == 'Nutrientes',
            LecturaSensor.timestamp >= desde
        ).order_by(LecturaSensor.timestamp.desc()).first()
        
        # Construir resultado con datos disponibles
        resultado = {}
        
        # Agregar humedad si está disponible
        if humedad:
            try:
                resultado['humedad'] = {
                    'valor': float(humedad.valor),
                    'timestamp': humedad.timestamp.isoformat(),
                    'unidad': '%'
                }
            except (ValueError, TypeError) as e:
                current_app.logger.warning(f"Error al convertir valor de humedad: {e}")
        
        # Agregar temperatura si está disponible
        if temperatura:
            try:
                resultado['temperatura'] = {
                    'valor': float(temperatura.valor),
                    'timestamp': temperatura.timestamp.isoformat(),
                    'unidad': '°C'
                }
            except (ValueError, TypeError) as e:
                current_app.logger.warning(f"Error al convertir valor de temperatura: {e}")
            
        # Agregar pH si está disponible
        if ph:
            try:
                resultado['ph'] = {
                    'valor': float(ph.valor),
                    'timestamp': ph.timestamp.isoformat(),
                    'unidad': ''
                }
            except (ValueError, TypeError) as e:
                current_app.logger.warning(f"Error al convertir valor de pH: {e}")
            
        # Agregar nutrientes si está disponible
        if nutrientes:
            try:
                # Intentar parsear el valor como JSON (podría ser un diccionario serializado)
                valor_nutrientes = json.loads(nutrientes.valor)
                resultado['nutrientes'] = {
                    'valor': valor_nutrientes,
                    'timestamp': nutrientes.timestamp.isoformat(),
                    'unidad': 'mg/L'
                }
            except (JSONDecodeError, TypeError, ValueError) as e:
                current_app.logger.warning(f"Error al parsear JSON de nutrientes: {e}")
                try:
                    # Si falla el JSON, intentar como float
                    resultado['nutrientes'] = {
                        'valor': float(nutrientes.valor),
                        'timestamp': nutrientes.timestamp.isoformat(),
                        'unidad': 'mg/L'
                    }
                except (ValueError, TypeError) as e:
                    current_app.logger.warning(f"Error al convertir valor de nutrientes: {e}")
        
        return resultado
    
    except Exception as e:
        current_app.logger.error(f"Error obteniendo datos de sensores para parcela {parcela_id}: {str(e)}")
        return {}


# Añadir esta función para construir el mensaje enriquecido
# Modifica la función construir_mensaje_sistema_avanzado para manejar correctamente los datos de sensores
def construir_mensaje_sistema_avanzado(usuario, parcelas, datos_sensores):
    mensaje = f"""Eres un asistente agrícola especializado de EcoSmart, la plataforma de gestión agrícola inteligente.

DATOS DEL USUARIO:
- Nombre: {usuario.nombre}
- Rol: {usuario.rol}

PARCELAS DISPONIBLES:
"""
    # Añadir información de parcelas
    for p in parcelas[:5]:  # Limitar a 5 parcelas para no sobrecargar
        mensaje += f"""
* {p.nombre} ({p.id})
  - Cultivo actual: {p.cultivo_actual or 'Sin cultivo'}
  - Área: {p.hectareas} hectáreas
  - Fecha de siembra: {p.fecha_siembra.strftime('%d/%m/%Y') if p.fecha_siembra else 'No registrada'}
"""
    
    # Añadir datos de sensores
    mensaje += "\nDATOS RECIENTES DE SENSORES:\n"
    
    if isinstance(datos_sensores, dict) and datos_sensores:
        # CORREGIDO: Verificar estructura para evitar errores de 'nombre'
        if isinstance(datos_sensores, dict):
            # Para una sola parcela
            if 'datos' in datos_sensores:
                parcela_nombre = "Parcela seleccionada"
                # Buscar nombre de parcela si está disponible
                if 'nombre' in datos_sensores:
                    parcela_nombre = datos_sensores['nombre']
                # Si no hay nombre, intentar buscar por ID
                elif parcela_id := request.args.get('parcela_id'):
                    parcela = Parcela.query.get(parcela_id)
                    if parcela:
                        parcela_nombre = parcela.nombre
                
                mensaje += f"Parcela: {parcela_nombre}\n"
                for tipo, dato in datos_sensores.get('datos', {}).items():
                    mensaje += f"- {tipo.capitalize()}: {dato['valor']}{dato['unidad']} ({dato['timestamp']})\n"
            else:
                # Para múltiples parcelas
                for parcela_id, info in datos_sensores.items():
                    # Obtener nombre de parcela de forma segura
                    parcela_nombre = "Parcela ID " + str(parcela_id)
                    if isinstance(info, dict) and 'nombre' in info:
                        parcela_nombre = info['nombre']
                    elif not isinstance(info, dict):
                        # Si info no es dict, saltamos esta iteración
                        continue
                        
                    mensaje += f"Parcela: {parcela_nombre}\n"
                    # Asegurarse que 'datos' existe y es un diccionario
                    if isinstance(info.get('datos'), dict):
                        for tipo, dato in info['datos'].items():
                            if isinstance(dato, dict) and 'valor' in dato and 'unidad' in dato:
                                mensaje += f"- {tipo.capitalize()}: {dato['valor']}{dato['unidad']} ({dato.get('timestamp', 'N/A')})\n"
    else:
        mensaje += "No hay datos recientes disponibles de sensores.\n"
    
    mensaje += """
INSTRUCCIONES:
1. Usa los datos de sensores para dar recomendaciones precisas y específicas.
2. Si los niveles de humedad están por debajo del 30%, sugiere programar riego.
3. Si la temperatura está por encima de 30°C o por debajo de 5°C, advierte sobre riesgos para los cultivos.
4. Cuando menciones datos específicos, indica de qué parcela y sensor provienen.
5. Si no tienes datos suficientes, solicita información adicional o sugiere instalar más sensores.
6. Adapta tus recomendaciones al cultivo actual de cada parcela.

Eres un experto en agricultura de precisión y tu objetivo es ayudar al agricultor a tomar las mejores decisiones basadas en datos.
"""
    
    return mensaje

    # sensores en dashboard agricola
# CAMBIO 1: Corregir la función obtener_datos_sensores para usar el nombre correcto de campo
@app.route('/api/sensores/datos', methods=['GET'])
def obtener_datos_sensores():
    try:
        parcela_id = request.args.get('parcela')  # Usar 'parcela' como parámetro
        if not parcela_id:
            return jsonify({"error": "Falta parámetro 'parcela'"}), 400
        periodo = request.args.get('periodo', '24h')
        
        # Calcular fecha desde usando UTC
        desde = datetime.now(UTC)
        if periodo == '7d':
            desde = desde - timedelta(days=7)
        elif periodo == '30d':
            desde = desde - timedelta(days=30)
        else:  # '24h' por defecto
            desde = desde - timedelta(hours=24)
        
        # Consultar usando el nombre correcto del campo parcela
        datos_humedad = LecturaSensor.query.filter(
            LecturaSensor.parcela == parcela_id,
            LecturaSensor.tipo == 'Humedad',
            LecturaSensor.timestamp >= desde
        ).order_by(LecturaSensor.timestamp).all()
        
        datos_temperatura = LecturaSensor.query.filter(
            LecturaSensor.parcela == parcela_id,
            LecturaSensor.tipo == 'Temperatura',
            LecturaSensor.timestamp >= desde
        ).order_by(LecturaSensor.timestamp).all()

        datos_ph = LecturaSensor.query.filter(
            LecturaSensor.parcela == parcela_id,
            LecturaSensor.tipo == 'pH del suelo',
            LecturaSensor.timestamp >= desde
        ).order_by(LecturaSensor.timestamp).all()
        
        datos_nutrientes = LecturaSensor.query.filter(
            LecturaSensor.parcela == parcela_id,
            LecturaSensor.tipo == 'Nutrientes',
            LecturaSensor.timestamp >= desde
        ).order_by(LecturaSensor.timestamp).all()
        
        # Formatear resultado, convirtiendo de string a float para datos numéricos
        resultado = {
            "humedad": [],
            "temperatura": [],
            "ph": [],
            "nutrientes": []
        }

        resultado["humedad"] = [
            {"timestamp": d.timestamp.isoformat(), "valor": float(d.valor)}
            for d in datos_humedad
        ]
        resultado["temperatura"] = [
            {"timestamp": d.timestamp.isoformat(), "valor": float(d.valor)}
            for d in datos_temperatura
        ]
        resultado["ph"] = [
            {"timestamp": d.timestamp.isoformat(), "valor": float(d.valor)}
            for d in datos_ph
        ]

        # En lugar de float(d.valor), parseamos JSON:
        for d in datos_nutrientes:
            try:
                valor_obj = json.loads(d.valor)
            except (JSONDecodeError, TypeError, ValueError):
                # Si no es JSON, caemos a un número simple
                valor_obj = float(d.valor)
            resultado["nutrientes"].append({
                "timestamp": d.timestamp.isoformat(),
                "valor": valor_obj
            })

        user_id = request.headers.get('X-User-Id')
        if user_id:  # Verificar que existe antes de usar
            try:
                registrar_log(user_id, 'consulta_datos_sensores', 'parcela', 
                             parcela_id, detalles=f"periodo={periodo}")
            except Exception as e:
                current_app.logger.error(f"Error al registrar log: {e}")

        return jsonify(resultado)

    except Exception as e:
        current_app.logger.error(f"Error al obtener datos de sensores: {e}")
        return jsonify({"error": str(e)}), 500
    

@app.route('/api/diagnose/models', methods=['GET'])
def diagnose_models():
        try:
            model_info = {
                "LecturaSensor": [c.name for c in LecturaSensor.__table__.columns],
                "Mensaje": [c.name for c in Mensaje.__table__.columns],
                "Conversacion": [c.name for c in Conversacion.__table__.columns],
                "Parcela": [c.name for c in Parcela.__table__.columns]
            }
            return jsonify(model_info)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        

from sqlalchemy import func

# Endpoint para obtener logs de acciones de usuarios (para administradores)
@app.route('/api/logs', methods=['GET'])
def obtener_logs():
    # Solo permitir a administradores ver los logs
    user_id = request.headers.get('X-User-Id')
    user_rol = request.headers.get('X-User-Rol', '')
    
    if not user_id or user_rol != 'tecnico':
        return jsonify({'error': 'No autorizado para ver logs del sistema'}), 403
        
    # Parámetros de filtrado
    usuario_id = request.args.get('usuario_id')
    accion = request.args.get('accion')
    entidad = request.args.get('entidad')
    fecha_desde = request.args.get('fecha_desde')
    fecha_hasta = request.args.get('fecha_hasta')
    
    # Parámetros de paginación
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    # Construir consulta base
    from modelos.models import LogAccionUsuario
    query = db.session.query(LogAccionUsuario)
    
    # Aplicar filtros si existen
    if usuario_id:
        query = query.filter(LogAccionUsuario.usuario_id == usuario_id)
    if accion:
        query = query.filter(LogAccionUsuario.accion == accion)
    if entidad:
        query = query.filter(LogAccionUsuario.entidad == entidad)
    if fecha_desde:
        try:
            fecha_desde = datetime.fromisoformat(fecha_desde)
            query = query.filter(LogAccionUsuario.fecha >= fecha_desde)
        except ValueError:
            pass
    if fecha_hasta:
        try:
            fecha_hasta = datetime.fromisoformat(fecha_hasta)
            query = query.filter(LogAccionUsuario.fecha <= fecha_hasta)
        except ValueError:
            pass
    
    # Ordenar del más reciente al más antiguo
    query = query.order_by(LogAccionUsuario.fecha.desc())
    
    # Paginar resultados
    total = query.count()
    logs = query.offset((page - 1) * per_page).limit(per_page).all()
    
    # Formatear resultado
    resultado = {
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page,
        'logs': [{
            'id': log.id,
            'usuario_id': log.usuario_id,
            'accion': log.accion,
            'entidad': log.entidad,
            'entidad_id': log.entidad_id,
            'detalles': log.detalles,
            'fecha': log.fecha.isoformat()
        } for log in logs]
    }
    
    # Registrar esta consulta como una acción
    registrar_log(user_id, 'consulta_logs', 'logs', None, 
                 detalles=f"filtros: {request.args}")
    
    return jsonify(resultado)

# Endpoint para obtener resumen estadístico de logs
@app.route('/api/logs/resumen', methods=['GET'])
def resumen_logs():
    # Solo administradores pueden ver resúmenes
    user_id = request.headers.get('X-User-Id')
    user_rol = request.headers.get('X-User-Rol', '')
    
    if not user_id or user_rol != 'administrador':
        return jsonify({'error': 'No autorizado'}), 403
    
    # Parámetros
    dias = request.args.get('dias', 7, type=int)
    limite = request.args.get('limite', 10, type=int)
    
    # Fecha límite
    fecha_limite = datetime.now(UTC) - timedelta(days=dias)
    
    from modelos.models import LogAccionUsuario, Usuario
    
    # Consulta de conteo por usuario
    usuarios_activos = db.session.query(
        LogAccionUsuario.usuario_id,
        Usuario.nombre,
        func.count(LogAccionUsuario.id).label('total_acciones')
    ).join(
        Usuario, Usuario.id == LogAccionUsuario.usuario_id
    ).filter(
        LogAccionUsuario.fecha >= fecha_limite
    ).group_by(
        LogAccionUsuario.usuario_id, Usuario.nombre
    ).order_by(
        func.count(LogAccionUsuario.id).desc()
    ).limit(limite).all()
    
    # Consulta de acciones más comunes
    acciones_comunes = db.session.query(
        LogAccionUsuario.accion,
        func.count(LogAccionUsuario.id).label('total')
    ).filter(
        LogAccionUsuario.fecha >= fecha_limite
    ).group_by(
        LogAccionUsuario.accion
    ).order_by(
        func.count(LogAccionUsuario.id).desc()
    ).limit(limite).all()
    
    # Registrar esta consulta
    registrar_log(user_id, 'consulta_resumen_logs', 'logs', None, detalles=f"dias: {dias}")
    
    # Construir resultado
    resultado = {
        'periodo_dias': dias,
        'usuarios_activos': [{
            'usuario_id': u[0],
            'nombre': u[1],
            'acciones': u[2]
        } for u in usuarios_activos],
        'acciones_frecuentes': [{
            'accion': a[0],
            'total': a[1]
        } for a in acciones_comunes]
    }
    
    return jsonify(resultado)

#envia un correo de recuperacion de contraseña
def enviar_correo_recuperacion(destinatario, codigo):
    remitente = "ecosmartutalca@gmail.com" 
    password = "fstn dafh rtve hhvm"  # contraseña de aplicación de Gmail
    asunto = "Solicitud de recuperación de contraseña - EcoSmart"
    cuerpo = f"""
Estimado usuario,

Hemos recibido una solicitud para restablecer la contraseña de su cuenta en EcoSmart.

Su código de recuperación es: {codigo}

Si usted no solicitó este cambio, ignore este mensaje. El código expirará en 15 minutos por motivos de seguridad.

Saludos cordiales,
Equipo EcoSmart

Este es un correo generado automáticamente, por favor no responda.
Si necesita asistencia, contáctenos a través de nuestro sitio web.
"""

    msg = MIMEText(cuerpo)
    msg['Subject'] = asunto
    msg['From'] = remitente
    msg['To'] = destinatario

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(remitente, password)
            server.sendmail(remitente, destinatario, msg.as_string())
        print(f"Correo de recuperación enviado a {destinatario}")
    except Exception as e:
        print(f"Error al enviar correo: {e}")


# Endpoint para recuperar contraseña
@app.route('/api/recuperar', methods=['POST'])
def recuperar_contrasena():
    data = request.json
    email = data.get('email')
    usuario = Usuario.query.filter_by(email=email).first()
    if not usuario:
        return jsonify({'error': 'No existe una cuenta con ese correo'}), 404

    # Generar código de 6 dígitos
    codigo = f"{randint(100000, 999999)}"
    usuario.codigo_recuperacion = codigo
    usuario.codigo_expira = datetime.utcnow() + timedelta(minutes=15)
    db.session.commit()

    #envia un correo real con el codigo
    enviar_correo_recuperacion(usuario.email, codigo)

    return jsonify({'mensaje': 'Se ha enviado un código a tu correo'})


@app.route('/api/resetear', methods=['POST'])
def resetear_contrasena_codigo():
    data = request.json
    email = data.get('email')
    codigo = data.get('codigo')
    nueva_password = data.get('password')

    usuario = Usuario.query.filter_by(email=email, codigo_recuperacion=codigo).first()
    if not usuario or usuario.codigo_expira < datetime.utcnow():
        return jsonify({'error': 'Código inválido o expirado'}), 400

    # Verificar que la nueva contraseña no sea igual a la anterior
    if check_password_hash(usuario.password, nueva_password):
        return jsonify({'error': 'La nueva contraseña no puede ser igual a la anterior.'}), 400

    usuario.password = generate_password_hash(nueva_password)
    usuario.codigo_recuperacion = None
    usuario.codigo_expira = None
    db.session.commit()
    return jsonify({'mensaje': 'Contraseña actualizada correctamente'})

@app.errorhandler(Exception)
def handle_exception(e):
    from flask import current_app
    current_app.logger.error(f"Error no manejado: {str(e)}")
    return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500

@app.route('/')
def home():
    return "<h2>EcoSmart Backend funcionando correctamente en el puerto 5000 🚀</h2>"

if __name__ == '__main__':
    app.run(debug=True, port=5000)