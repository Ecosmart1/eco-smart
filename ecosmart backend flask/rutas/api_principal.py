from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from Sensores.Sensor import obtener_parametros_estacion, Sensor, RedSensores, SensorNutrientes
import time
from datetime import datetime
import threading
import pandas as pd
import json
from modelos.models import db, Usuario, LecturaSensor , Parcela, Conversacion, Mensaje
from werkzeug.security import generate_password_hash, check_password_hash
from servicios.openrouter import send_to_deepseek





app = Flask(__name__)
CORS(app)  # Permite solicitudes CORS para la API

#base de datos
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:p1p3@localhost:5432/Ecosmart'
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
    return jsonify({'mensaje': 'Usuario registrado correctamente'})

#@app.route('/api/usuarios/<int:id>', methods=['GET'])
@app.route('/api/login', methods=['POST'])
def login_usuario():
    data = request.json
    usuario = Usuario.query.filter_by(email=data['email']).first()
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

def simulacion_continua():
    global ultimos_datos, simulacion_activa

    # Abre el contexto de aplicación para este hilo
    with app.app_context():
        # Calcular tiempo de finalización
        duracion_segundos = parametros_configurables["simulacion"]["duracion"] * 60  # convertir minutos a segundos
        intervalo = parametros_configurables["simulacion"]["intervalo"]  # intervalo en segundos
        tiempo_inicio = time.time()
        tiempo_fin = tiempo_inicio + duracion_segundos

        print(f"Simulación iniciada por {duracion_segundos} segundos ({parametros_configurables['simulacion']['duracion']} minutos)")
        print(f"Intervalo entre lecturas: {intervalo} segundos")
        
        while simulacion_activa and time.time() < tiempo_fin:
            ultimos_datos = red_sensores.generar_todos_datos(parametros_configurables)
            print(f"Datos generados en {time.strftime('%Y-%m-%d %H:%M:%S')}")
            # Guardar en la base de datos
            for id_sensor, dato in ultimos_datos.items():
                sensor = red_sensores.sensores[id_sensor]
                lectura = LecturaSensor(
                    timestamp=dato["timestamp"],
                    sensor_id=id_sensor,
                    tipo=sensor.tipo,
                    valor=json.dumps(dato["valor"]),  # Si es dict, como nutrientes
                    unidad=sensor.unidad
                )
                db.session.add(lectura)
            db.session.commit()
            # Calcular tiempo restante
            tiempo_restante = tiempo_fin - time.time()
            if tiempo_restante <= 0:
                break

            # Dormir hasta la próxima iteración o hasta que termine el tiempo
            tiempo_espera = min(intervalo, tiempo_restante)
            time.sleep(tiempo_espera)

        # Si terminamos por tiempo y no por cancelación manual
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
def actualizar_parametros():
    """Actualiza todos los parámetros configurables de forma centralizada"""
    global parametros_configurables
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
        print(f"Error al actualizar sensores: {e}")
        return jsonify({"error": f"Error al actualizar sensores: {str(e)}"}), 500
    
    return jsonify({
        "mensaje": "Parámetros actualizados correctamente", 
        "parametros": parametros_configurables
    })

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
        print(f"Error al actualizar sensores: {e}")
    
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
def agregar_parcela():
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
    return jsonify({'mensaje': 'Parcela agregada correctamente'})

@app.route('/api/parcelas', methods=['GET'])
def listar_parcelas():
    parcelas = Parcela.query.all()
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
        app.logger.error(f"Error en obtener_conversaciones: {str(e)}")
        return jsonify({'error': str(e)}), 500

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
    print("Endpoint /api/chat recibió:", request.json)
    data = request.json
    user_id = data.get('user_id')
    message_text = data.get('message')
    conversation_id = data.get('conversation_id')
    
    if not user_id or not message_text:
        return jsonify({'error': 'Faltan parámetros'}), 400
    
    try:
        # Si no se proporciona ID de conversación, crear una nueva
        if not conversation_id:
            conversacion = Conversacion(usuario_id=user_id)
            db.session.add(conversacion)
            db.session.commit()
            conversation_id = conversacion.id
        else:
            conversacion = Conversacion.query.get_or_404(conversation_id)
        
        # Guardar mensaje del usuario
        mensaje_usuario = Mensaje(
            conversacion_id=conversation_id,
            sender='user',
            content=message_text
        )
        db.session.add(mensaje_usuario)
        db.session.commit()
        
        # Llamar a OpenRouter (primero con un mensaje simple para probar)
        try:
            # Mensaje de sistema simple para probar
            history = [
                {"role": "system", "content": "Eres un asistente útil."},
                {"role": "user", "content": message_text}
            ]
            
            print("Enviando a OpenRouter:", history)
            reply = send_to_deepseek(history)
            print("Respuesta de OpenRouter:", reply)
            
            # Guardar respuesta
            mensaje_asistente = Mensaje(
                conversacion_id=conversation_id,
                sender='assistant',
                content=reply
            )
            db.session.add(mensaje_asistente)
            db.session.commit()
            
            return jsonify({
                'conversation_id': conversation_id,
                'reply': reply
            })
        except Exception as e:
            print("Error llamando a OpenRouter:", str(e))
            return jsonify({'error': str(e)}), 500
    except Exception as e:
        print("Error general en /api/chat:", str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/')
def home():
    return "<h2>EcoSmart Backend funcionando correctamente en el puerto 5000 🚀</h2>"

if __name__ == '__main__':
    app.run(debug=True, port=5000)