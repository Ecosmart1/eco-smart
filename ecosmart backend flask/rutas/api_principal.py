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
from modelos.models import db, Usuario, LecturaSensor , Parcela, Conversacion, Mensaje, LogAccionUsuario, DetalleCultivo
from werkzeug.security import generate_password_hash, check_password_hash
from servicios.openrouter import send_to_deepseek
from servicios.logs import registrar_log, registrar_accion
from sqlalchemy import func
from random import randint
import smtplib
from email.mime.text import MIMEText
import re



app = Flask(__name__)
# ...existing code...

CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5175", "http://127.0.0.1:5175"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "X-User-Id", "X-User-Rol", "Authorization"]
    }
})

# ...existing code... # Permite solicitudes CORS para la API

#base de datos
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:p1p3@localhost:5432/Ecosmart'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)


# ...existing code...

# Agregar este endpoint antes de la línea "if __name__ == '__main__':"

@app.route('/api/debug/database', methods=['GET'])
def debug_database():
    """Endpoint para verificar estado de la base de datos"""
    try:
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        
        # Verificar modelo DetalleCultivo
        cultivo_info = {}
        if 'cultivos' in tables:
            columns = [col['name'] for col in inspector.get_columns('cultivos')]
            cultivo_info = {
                'tabla_existe': True,
                'columnas': columns
            }
        else:
            cultivo_info = {'tabla_existe': False}
        
        return jsonify({
            'status': 'ok',
            'database_connected': True,
            'tables': tables,
            'cultivos_info': cultivo_info,
            'models_imported': {
                'DetalleCultivo': 'DetalleCultivo' in globals(),
                'Parcela': 'Parcela' in globals()
            }
        })
    
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'database_connected': False
        }), 500

# ...existing code...



# ...existing code...
@app.route('/api/parcelas/recomendaciones', methods=['GET', 'POST', 'OPTIONS'])
def recomendaciones_parcelas():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-User-Id')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response
    
    try:
        # VERSIÓN SIMPLE QUE FUNCIONA
        recomendaciones_ia = generar_recomendaciones_con_ia()
        return jsonify(recomendaciones_ia)
    
    except Exception as e:
        current_app.logger.error(f"Error en recomendaciones_parcelas: {e}")
        return jsonify([{
            "id": 1,
            "cultivo": "Error",
            "parcela": "Sistema",
            "recomendacion": f"Error: {str(e)}",
            "fecha": datetime.now().isoformat()
        }]), 500

def generar_recomendaciones_con_ia():
    """Genera recomendaciones usando IA basadas en datos de parcelas y sensores"""
    try:
        # Obtener datos de parcelas (usa tus modelos existentes)
        parcelas_data = obtener_datos_para_ia()
        recomendaciones = []
        
        for i, parcela in enumerate(parcelas_data):
            try:
                # Construir prompt específico para IA
                prompt = f"""
                Analiza esta parcela agrícola y genera UNA recomendación específica y accionable:

                PARCELA: {parcela['nombre']}
                CULTIVO: {parcela['cultivo']}
                CONDICIONES ACTUALES:
                - Humedad del suelo: {parcela.get('humedad', 'N/A')}%
                - Temperatura: {parcela.get('temperatura', 'N/A')}°C
                - pH del suelo: {parcela.get('ph', 'N/A')}
                - Estado: {parcela.get('estado', 'normal')}

                INSTRUCCIONES:
                - Genera SOLO una recomendación práctica y específica
                - Máximo 120 caracteres
                - Enfócate en la acción más importante
                - Responde SOLO con el texto, sin formato adicional
                """
                
                # Usar tu función existente de DeepSeek
                messages = [
                    {"role": "system", "content": "Eres un agrónomo experto. Responde SOLO con la recomendación práctica,no respondas preguntas que no sean del ambito agricola, sin introducción."},
                    {"role": "user", "content": prompt}
                ]
                
                recomendacion_texto = send_to_deepseek(messages)
                
                # Limpiar respuesta
                recomendacion_texto = recomendacion_texto.strip().replace('"', '').replace('\n', ' ')
                if len(recomendacion_texto) > 150:
                    recomendacion_texto = recomendacion_texto[:147] + "..."
                
            except Exception as ia_error:
                current_app.logger.error(f"Error IA para parcela {parcela['nombre']}: {ia_error}")
                # Fallback con lógica de reglas
                recomendacion_texto = generar_recomendacion_fallback(parcela)
            
            recomendaciones.append({
                "id": i + 1,
                "cultivo": parcela.get('cultivo', 'Sin cultivo'),
                "parcela": parcela.get('nombre', f'Parcela {i+1}'),
                "recomendacion": recomendacion_texto,
                "fecha": datetime.now().isoformat()
            })
        
        return recomendaciones
    
    except Exception as e:
        current_app.logger.error(f"Error general en generar_recomendaciones_con_ia: {e}")
        return generar_recomendaciones_fallback_completo()

def obtener_datos_para_ia():
    """Obtiene datos reales de parcelas y sensores"""
    try:
        # Opción 1: Si tienes modelo Parcela
        if 'Parcela' in globals():
            parcelas = Parcela.query.limit(5).all()
            datos_parcelas = []
            
            for parcela in parcelas:
                # Obtener datos de sensores actuales
                try:
                    datos_sensores = obtener_parametros_estacion()
                except:
                    datos_sensores = {}
                
                datos_parcelas.append({
                    "nombre": parcela.nombre,
                    "cultivo": getattr(parcela, 'cultivo_actual', 'Sin especificar'),
                    "estado": getattr(parcela, 'estado', 'normal'),
                    "humedad": datos_sensores.get('humedad_suelo', 50),
                    "temperatura": datos_sensores.get('temperatura', 25),
                    "ph": datos_sensores.get('ph_suelo', 7.0),
                    "area": getattr(parcela, 'area', '1 ha'),
                })
            
            return datos_parcelas
        
        # Opción 2: Datos simulados con sensores reales
        return obtener_datos_simulados_con_sensores()
        
    except Exception as e:
        current_app.logger.error(f"Error obteniendo datos para IA: {e}")
        return obtener_datos_simulados_con_sensores()

def obtener_datos_simulados_con_sensores():
    """Genera datos basados en sensores reales"""
    try:
        # Usar tus datos de sensores reales
        datos_sensores = obtener_parametros_estacion()
        
        return [
            {
                "nombre": "Parcela Norte",
                "cultivo": "Tomate",
                "estado": "normal" if datos_sensores.get('humedad_suelo', 50) > 40 else "crítico",
                "humedad": datos_sensores.get('humedad_suelo', 45),
                "temperatura": datos_sensores.get('temperatura', 28),
                "ph": datos_sensores.get('ph_suelo', 6.8),
                "area": "2.5 ha"
            },
            {
                "nombre": "Parcela Sur", 
                "cultivo": "Maíz",
                "estado": "alerta" if datos_sensores.get('temperatura', 25) > 30 else "normal",
                "humedad": datos_sensores.get('humedad_suelo', 38),
                "temperatura": datos_sensores.get('temperatura', 26),
                "ph": datos_sensores.get('ph_suelo', 7.2),
                "area": "3.2 ha"
            },
            {
                "nombre": "Parcela Este",
                "cultivo": "Trigo", 
                "estado": "normal",
                "humedad": datos_sensores.get('humedad_suelo', 55),
                "temperatura": datos_sensores.get('temperatura', 24),
                "ph": datos_sensores.get('ph_suelo', 6.5),
                "area": "1.8 ha"
            }
        ]
    except Exception as e:
        current_app.logger.error(f"Error con sensores: {e}")
        return generar_datos_basicos()

def generar_recomendacion_fallback(parcela):
    """Genera recomendación con lógica de reglas si falla la IA"""
    humedad = parcela.get('humedad', 50)
    temperatura = parcela.get('temperatura', 25)
    ph = parcela.get('ph', 7.0)
    cultivo = parcela.get('cultivo', 'cultivo')
    
    # Priorizar problemas críticos
    if humedad < 30:
        return f"URGENTE: Riego inmediato para {cultivo}. Humedad crítica: {humedad}%"
    elif humedad < 45:
        return f"Incrementar riego en 25% para {cultivo}. Humedad baja: {humedad}%"
    elif temperatura > 32:
        return f"Implementar sombreado para {cultivo}. Temperatura alta: {temperatura}°C"
    elif ph < 5.5 or ph > 8.0:
        return f"Ajustar pH del suelo para {cultivo}. Valor actual: {ph}"
    else:
        return f"Monitorear desarrollo del {cultivo}. Condiciones estables."

def generar_recomendaciones_fallback_completo():
    """Fallback completo si todo falla"""
    return [
        {
            "id": 1,
            "cultivo": "Tomate",
            "parcela": "Parcela Norte",
            "recomendacion": "Verificar sistema de riego y monitorear condiciones de humedad.",
            "fecha": datetime.now().isoformat()
        },
        {
            "id": 2,
            "cultivo": "Maíz", 
            "parcela": "Parcela Sur",
            "recomendacion": "Evaluar necesidades de fertilización nitrogenada.",
            "fecha": datetime.now().isoformat()
        },
        {
            "id": 3,
            "cultivo": "Trigo",
            "parcela": "Parcela Este", 
            "recomendacion": "Monitorear desarrollo y condiciones climáticas.",
            "fecha": datetime.now().isoformat()
        }
    ]

def generar_datos_basicos():
    """Datos básicos si fallan los sensores"""
    return [
        {
            "nombre": "Parcela Norte",
            "cultivo": "Tomate",
            "estado": "normal",
            "humedad": 45,
            "temperatura": 28,
            "ph": 6.8
        },
        {
            "nombre": "Parcela Sur",
            "cultivo": "Maíz", 
            "estado": "alerta",
            "humedad": 35,
            "temperatura": 31,
            "ph": 7.2
        }
    ]

# ...existing code...


@app.errorhandler(404)
def not_found_error(error):
    return jsonify({
        "error": "Ruta no encontrada",
        "message": "La ruta solicitada no existe",
        "status": 404
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "error": "Error interno del servidor",
        "message": str(error),
        "status": 500
    }), 500


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

@app.route('/api/usuarios', methods=['GET'])
def obtener_usuarios():
    try:
        # Verificar autorización (esto debería ser mejorado con un sistema de tokens)
        user_id = request.headers.get('X-User-Id')
        user_rol = request.headers.get('X-User-Rol')
        
        if not user_id or user_rol not in ['tecnico', 'admin']:
            return jsonify({'error': 'No autorizado'}), 403
        
        # Consulta los usuarios
        usuarios = Usuario.query.all()
        
        # Convierte a JSON (sin incluir contraseñas)
        usuarios_data = [{
            'id': usuario.id,
            'nombre': usuario.nombre,
            'email': usuario.email,
            'rol': usuario.rol
        } for usuario in usuarios]
        
        return jsonify(usuarios_data)
        
    except Exception as e:
        current_app.logger.error(f"Error al listar usuarios: {str(e)}")
        return jsonify({'error': 'Error al procesar la solicitud'}), 500
@app.route('/api/login', methods=['POST'])
def login_usuario():
    try:
        if request.content_type and 'application/json' in request.content_type:
            data = request.get_json(force=True)
        else:
            try:
                content = request.data.decode('utf-8')
            except UnicodeDecodeError:
                content = request.data.decode('latin-1')
            data = json.loads(content)

        if 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Faltan credenciales'}), 400

        email = data['email'].strip().lower()
        usuario = Usuario.query.filter_by(email=email).first()

        if not usuario or not check_password_hash(usuario.password, data['password']):
            return jsonify({'error': 'Credenciales incorrectas'}), 401

        try:
            registrar_log(usuario.id, 'login', 'usuario', usuario.id)
        except Exception as log_error:
            current_app.logger.error(f"Error al registrar log de login: {log_error}")

        return jsonify({
            'id': usuario.id,
            'nombre': usuario.nombre,
            'email': usuario.email,
            'rol': usuario.rol
        })

    except Exception as e:
        current_app.logger.error(f"Error en login: {str(e)}")
        return jsonify({'error': 'Error al procesar la solicitud'}), 500


@app.route('/api/recomendaciones/cultivo', methods=['POST', 'OPTIONS'])
def generar_recomendaciones_cultivo():
    # Manejo de CORS para solicitudes OPTIONS
    if request.method == 'OPTIONS':
        response = app.make_default_options_response()
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        return response
    
    # Procesar la solicitud POST
    try:
        if not request.is_json:
            return jsonify({"error": "El formato debe ser JSON"}), 400
            
        data = request.json
        cultivo = data.get('cultivo', 'No especificado')
        estado = data.get('estado', 'saludable')
        detalles = data.get('detalles', {})
        
        # Obtener datos de sensores si hay una parcela especificada
        datos_sensores = {}
        if 'parcela_id' in detalles:
            parcela_id = detalles['parcela_id']
            parcela = Parcela.query.get(parcela_id)
            if parcela:
                datos_sensores = obtener_datos_sensores_recientes(parcela_id)
        
        # Construir prompt para la IA
   

        # Construir prompt para la IA
        prompt = f"""Como experto agrónomo, genera exactamente 3 recomendaciones BREVES y ESPECÍFICAS para un cultivo de {cultivo} 
        que se encuentra en estado, {estado}.
        
        Datos del cultivo:
        - Tipo: {cultivo}
        - Estado actual: {estado}
        """
        
        # Añadir datos de sensores si están disponibles
        if datos_sensores:
            prompt += "\nDatos de sensores recientes:\n"
            if 'temperatura' in datos_sensores:
                prompt += f"- Temperatura: {datos_sensores['temperatura']['valor']}{datos_sensores['temperatura']['unidad']}\n"
            if 'humedad' in datos_sensores:
                prompt += f"- Humedad del suelo: {datos_sensores['humedad']['valor']}{datos_sensores['humedad']['unidad']}\n"
            if 'ph' in datos_sensores:
                prompt += f"- pH del suelo: {datos_sensores['ph']['valor']}\n"
            
        prompt += """\n
        FORMATO DE RESPUESTA:
        - Cada recomendación debe tener máximo 50 palabras
        - Usar viñetas (-)
        - Ser específica y accionable
        - Incluir cantidades o frecuencias cuando sea posible
        
        Ejemplo:
        - Regar 2-3L/m² cada 48 horas en horas de menor calor
        - Aplicar fertilizante NPK 10-10-10 a razón de 30g/m²
        - Inspeccionar hojas semanalmente buscando signos de plagas"""
        

        # Enviar a la IA
        messages = [
            {"role": "system", "content": "Eres un experto agrónomo especializado en cultivos y agricultura de precisión,solo responde preguntas del ambito agricola."},
            {"role": "user", "content": prompt}
        ]
        
        # Usar la función de envío a IA existente
        recomendaciones_text = send_to_deepseek(messages)
        
        # Procesar la respuesta para extraer recomendaciones
        # (La IA puede devolver texto con formato, así que lo convertimos a una lista)
        recomendaciones_lines = recomendaciones_text.strip().split('\n')
        recomendaciones = []
        for line in recomendaciones_lines:
            # Eliminar marcadores de lista como "1.", "-", "*" al principio de la línea
            clean_line = re.sub(r'^[\d\-\*\.]+\s*', '', line.strip())
            if clean_line and len(clean_line) > 10:  # Líneas con contenido sustancial
                recomendaciones.append(clean_line)
        
        # Si no se obtuvieron recomendaciones válidas, usar las predefinidas como respaldo
        if not recomendaciones:
            if estado == 'saludable':
                recomendaciones = [
                    f"Mantener régimen de riego para {cultivo}: 4-5L/m² cada 2-3 días según condiciones",
                    # ... más recomendaciones de respaldo
                ]
            else:
                recomendaciones = [
                    f"Aumentar frecuencia de monitoreo para {cultivo}: inspección diaria",
                    # ... más recomendaciones de respaldo
                ]
        
        # Registrar la acción
        user_id = request.headers.get('X-User-Id')
        if user_id and 'parcela_id' in detalles:
            try:
                registrar_log(user_id, 'generar_recomendaciones', 'parcela', detalles['parcela_id'])
            except Exception as log_error:
                current_app.logger.error(f"Error al registrar log: {log_error}")
        
        # Devolver recomendaciones
        return jsonify({
            "recomendaciones": recomendaciones,
            "cultivo": cultivo,
            "estado": estado,
            "generado_por_ia": True
        })
        
    except Exception as e:
        current_app.logger.error(f"Error generando recomendaciones: {str(e)}")
        return jsonify({
            "error": "Error al generar recomendaciones",
            "recomendaciones": [
                f"Para {data.get('cultivo', 'el cultivo')}: Revisar régimen de riego y drenaje",
                # ... recomendaciones de respaldo
            ],
            "generado_por_ia": False
        })







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

# ...existing code...

@app.route('/api/parcelas', methods=['GET'])
def listar_parcelas():
    """Listar todas las parcelas con su cultivo único"""
    try:
        parcelas = Parcela.query.all()
        parcelas_data = []
        
        for parcela in parcelas:
            # Obtener el cultivo único de la parcela
            cultivo = DetalleCultivo.query.filter_by(parcela_id=parcela.id, activo=True).first()
            
            parcela_info = {
                'id': parcela.id,
                'nombre': parcela.nombre,
                'ubicacion': parcela.ubicacion,
                'hectareas': parcela.hectareas,
                'latitud': parcela.latitud,
                'longitud': parcela.longitud,
                'fecha_creacion': parcela.fecha_creacion,
                'cultivo_actual': parcela.cultivo_actual,
                'fecha_siembra': parcela.fecha_siembra,
                
                # NUEVO: Información detallada del cultivo único
                'cultivo': None
            }
            
            # Agregar detalles del cultivo si existe
            if cultivo:
                parcela_info['cultivo'] = {
                    'id': cultivo.id,
                    'nombre': cultivo.nombre,
                    'variedad': cultivo.variedad,
                    'etapa_desarrollo': cultivo.etapa_desarrollo,
                    'fecha_siembra': cultivo.fecha_siembra,
                    'dias_cosecha_estimados': cultivo.dias_cosecha_estimados,
                    'edad_dias': cultivo.calcular_edad_dias(),
                    'progreso_cosecha': round(cultivo.progreso_cosecha(), 1),
                    'activo': cultivo.activo,
                    'fecha_cosecha': cultivo.fecha_cosecha
                }
                
                # Actualizar datos de la parcela con info del cultivo
                if not parcela.cultivo_actual and cultivo.nombre:
                    parcela_info['cultivo_actual'] = cultivo.nombre
                if not parcela.fecha_siembra and cultivo.fecha_siembra:
                    parcela_info['fecha_siembra'] = cultivo.fecha_siembra.date()
            
            parcelas_data.append(parcela_info)
        
        # Registrar log
        user_id = request.headers.get('X-User-Id')
        if user_id:
            try:
                registrar_log(user_id, 'listar_parcelas', 'parcela', None)
            except Exception as e:
                current_app.logger.error(f"Error al registrar log: {e}")
        
        return jsonify(parcelas_data)
    
    except Exception as e:
        current_app.logger.error(f"Error al listar parcelas: {str(e)}")
        return jsonify({'error': f"Error al obtener parcelas: {str(e)}"}), 500

# ...existing code...
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

# ...existing code...

# ...existing code...

@app.route('/api/parcelas', methods=['POST'])
def agregar_parcela():
    """Agregar una nueva parcela con su cultivo único"""
    try:
        data = request.json
        
        # Crear parcela
        nueva_parcela = Parcela(
            nombre=data['nombre'],
            ubicacion=data.get('ubicacion'),
            hectareas=data.get('hectareas'),
            latitud=data.get('latitud'),
            longitud=data.get('longitud'),
            fecha_creacion=datetime.now(UTC)
        )
        
        db.session.add(nueva_parcela)
        db.session.flush()  # Para obtener el ID de la parcela
        
        # Crear cultivo único si se proporcionan datos
        cultivo_creado = None
        if 'cultivo' in data and data['cultivo']:
            cultivo_data = data['cultivo']
            
            # IMPORTANTE: Asegurar que solo hay un cultivo activo por parcela
            # Desactivar cualquier cultivo previo (por si acaso)
            DetalleCultivo.query.filter_by(parcela_id=nueva_parcela.id).update({'activo': False})
            
            # CORREGIR: Manejar la fecha de siembra con timezone
            fecha_siembra = None
            if cultivo_data.get('fecha_siembra'):
                try:
                    # Parsear la fecha y asegurar que tenga timezone UTC
                    fecha_siembra = datetime.fromisoformat(cultivo_data['fecha_siembra'])
                    if fecha_siembra.tzinfo is None:
                        fecha_siembra = fecha_siembra.replace(tzinfo=UTC)
                except ValueError:
                    fecha_siembra = datetime.now(UTC)
            else:
                fecha_siembra = datetime.now(UTC)
            
            # Crear el cultivo único
            nuevo_cultivo = DetalleCultivo(
                parcela_id=nueva_parcela.id,
                nombre=cultivo_data['nombre'],
                variedad=cultivo_data.get('variedad'),
                etapa_desarrollo=cultivo_data.get('etapa_desarrollo', 'siembra'),
                fecha_siembra=fecha_siembra,
                dias_cosecha_estimados=cultivo_data.get('dias_cosecha_estimados'),
                activo=True  # Este es el único cultivo activo
            )
            
            db.session.add(nuevo_cultivo)
            db.session.flush()  # Para calcular la edad
            
            # Calcular edad DESPUÉS de hacer flush
            nuevo_cultivo.edad = nuevo_cultivo.calcular_edad_dias()
            
            # Actualizar parcela con datos del cultivo
            nueva_parcela.cultivo_actual = nuevo_cultivo.nombre
            if nuevo_cultivo.fecha_siembra:
                nueva_parcela.fecha_siembra = nuevo_cultivo.fecha_siembra.date()
            
            cultivo_creado = {
                'id': nuevo_cultivo.id,
                'nombre': nuevo_cultivo.nombre,
                'variedad': nuevo_cultivo.variedad,
                'etapa_desarrollo': nuevo_cultivo.etapa_desarrollo,
                'edad_dias': nuevo_cultivo.calcular_edad_dias(),
                'progreso_cosecha': round(nuevo_cultivo.progreso_cosecha(), 1)
            }
        
        db.session.commit()
        
        # Registrar log
        user_id = request.headers.get('X-User-Id')
        if user_id:
            detalles = {
                'parcela': data,
                'cultivo_creado': bool(cultivo_creado)
            }
            registrar_log(user_id, 'crear_parcela', 'parcela', nueva_parcela.id, detalles=str(detalles))
        
        return jsonify({
            'mensaje': 'Parcela creada correctamente',
            'parcela': {
                'id': nueva_parcela.id,
                'nombre': nueva_parcela.nombre,
                'ubicacion': nueva_parcela.ubicacion,
                'hectareas': nueva_parcela.hectareas,
                'cultivo_actual': nueva_parcela.cultivo_actual
            },
            'cultivo': cultivo_creado
        })
    
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error al crear parcela: {str(e)}")
        return jsonify({'error': f"Error al crear parcela: {str(e)}"}), 500

# ...existing code...
# ...existing code...
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

@app.route('/api/debug/sensores/<int:parcela_id>', methods=['GET'])
def debug_sensores_parcela(parcela_id):
    """Endpoint de depuración para verificar datos de sensores de una parcela"""
    try:
        # Obtener datos de sensores
        datos = obtener_ultimas_lecturas_sensores(parcela_id)
        
        # Obtener información de la parcela
        parcela = Parcela.query.get_or_404(parcela_id)
        
        # Obtener lecturas recientes directamente de la base de datos
        fecha_limite = datetime.now() - timedelta(days=7)
        lecturas_recientes = LecturaSensor.query.filter(
            LecturaSensor.parcela == parcela_id,
            LecturaSensor.timestamp >= fecha_limite
        ).order_by(LecturaSensor.timestamp.desc()).all()
        
        # Formatear lecturas para la respuesta
        lecturas_formateadas = []
        for lec in lecturas_recientes[:20]:  # Limitar a 20 para no sobrecargar
            lecturas_formateadas.append({
                'id': lec.id,
                'timestamp': lec.timestamp.isoformat() if lec.timestamp else None,
                'tipo': lec.tipo,
                'valor': lec.valor,
                'unidad': lec.unidad
            })
            
        return jsonify({
            'parcela': {
                'id': parcela.id,
                'nombre': parcela.nombre,
                'cultivo': parcela.cultivo_actual
            },
            'datos_procesados': datos,
            'lecturas_recientes': lecturas_formateadas,
            'total_lecturas': len(lecturas_recientes)
        })
        
    except Exception as e:
        return jsonify({'error': f'Error depurando datos de sensores: {str(e)}'}), 500



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
    
# Add this endpoint near the other parcelas endpoints

# Add these imports if not already present
from datetime import datetime, timedelta, UTC
import random

# Add this endpoint near your other parcela endpoints
@app.route('/api/parcelas/recomendaciones', methods=['GET'])
def obtener_recomendaciones_parcelas():
    """Devuelve recomendaciones para las parcelas basadas en los datos de los sensores"""
    try:
        # Get user_id from headers for logging
        user_id = request.headers.get('X-User-Id')
        
        # Get optional parameters
        parcela_id = request.args.get('parcela_id')
        max_caracteres = request.args.get('max_caracteres', type=int, default=300)
        
        # Query all parcels or filter by ID
        if parcela_id:
            parcelas = Parcela.query.filter_by(id=parcela_id).all()
        else:
            parcelas = Parcela.query.all()
            
        if not parcelas:
            return jsonify({"mensaje": "No hay parcelas disponibles"}), 404
            
        recomendaciones = []
        
        # For each parcela, get sensor data and generate recommendations
        for parcela in parcelas:
            # Get the latest sensor readings for this parcel
            ultimas_lecturas = obtener_ultimas_lecturas_sensores(parcela.id)
            
            # Generate recommendations based on parcel info and sensor data
            recomendaciones_parcela = generar_recomendaciones_parcela(
                parcela, 
                ultimas_lecturas, 
                max_caracteres
            )
            recomendaciones.extend(recomendaciones_parcela)
            
        # Log this action if user_id is available
        if user_id:
            try:
                registrar_accion(user_id, 'consulta_recomendaciones', 'parcela', 
                               parcela_id if parcela_id else None)
            except Exception as e:
                current_app.logger.error(f"Error al registrar acción: {e}")
                
        return jsonify(recomendaciones)
        
    except Exception as e:
        current_app.logger.error(f"Error al obtener recomendaciones: {e}")
        return jsonify({"error": str(e)}), 500

def obtener_ultimas_lecturas_sensores(parcela_id):
    """Obtiene las últimas lecturas de sensores para una parcela"""
    try:
        # Get readings from the last 7 days
        fecha_limite = datetime.now() - timedelta(days=7)
        
        # Debug log to check parcela_id
        current_app.logger.info(f"Buscando lecturas para parcela ID: {parcela_id}")
        
        # Query for readings related to this parcel - FIXED FIELD NAMES
        lecturas = LecturaSensor.query.filter(
            LecturaSensor.parcela == parcela_id,  # Using correct field name 'parcela'
            LecturaSensor.timestamp >= fecha_limite  # Using correct field name 'timestamp'
        ).order_by(LecturaSensor.timestamp.desc()).all()
        
        # Debug log to check results
        current_app.logger.info(f"Se encontraron {len(lecturas)} lecturas para parcela {parcela_id}")
        
        if not lecturas:
            # If no DB data, try to get from the sensor network directly
            try:
                # Try to get live data from the RedSensores if available
                sensor_data = red_sensores.obtener_datos_parcela(parcela_id)
                if sensor_data:
                    current_app.logger.info(f"Usando datos en vivo de red_sensores para parcela {parcela_id}")
                    return sensor_data
            except Exception as e:
                current_app.logger.warning(f"No se pudo obtener datos en vivo: {e}")
            
            # If still no data, return empty dict
            current_app.logger.warning(f"No hay datos disponibles para parcela {parcela_id}")
            return {}
        
        # Group readings by sensor type
        lecturas_agrupadas = {}
        for lectura in lecturas:
            if lectura.tipo not in lecturas_agrupadas:
                lecturas_agrupadas[lectura.tipo] = []
            lecturas_agrupadas[lectura.tipo].append({
                'valor': lectura.valor,
                'fecha': lectura.timestamp  # Using correct field name 'timestamp'
            })
        
        # Get the latest reading of each type
        ultimas_lecturas = {}
        for tipo, lecturas_tipo in lecturas_agrupadas.items():
            # Sort by date descending and take the first one
            lecturas_tipo.sort(key=lambda x: x['fecha'], reverse=True)
            ultimas_lecturas[tipo] = {
                'valor': lecturas_tipo[0]['valor'],
                'fecha': lecturas_tipo[0]['fecha']
            }
            
            # Calculate trends if more than one reading
            if len(lecturas_tipo) > 1:
                # Get first and last reading
                primera = None
                ultima = None
                
                # Parse values to float for comparison
                try:
                    ultima_str = lecturas_tipo[0]['valor']
                    primera_str = lecturas_tipo[-1]['valor']
                    
                    # Handle both simple values and JSON strings
                    try:
                        ultima = float(ultima_str)
                        primera = float(primera_str)
                    except ValueError:
                        # Try to parse as JSON
                        try:
                            ultima_json = json.loads(ultima_str)
                            primera_json = json.loads(primera_str)
                            
                            # For nutrientes, get an average
                            if isinstance(ultima_json, dict) and isinstance(primera_json, dict):
                                ultima_vals = [float(v) for v in ultima_json.values() if isinstance(v, (int, float, str))]
                                primera_vals = [float(v) for v in primera_json.values() if isinstance(v, (int, float, str))]
                                if ultima_vals and primera_vals:
                                    ultima = sum(ultima_vals) / len(ultima_vals)
                                    primera = sum(primera_vals) / len(primera_vals)
                        except (ValueError, json.JSONDecodeError):
                            pass
                    
                    # Calculate change percentage
                    if primera is not None and ultima is not None and primera != 0:
                        cambio_porcentual = ((ultima - primera) / abs(primera)) * 100
                        
                        # Determine trend
                        if cambio_porcentual > 10:
                            tendencia = 'ascendente'
                        elif cambio_porcentual < -10:
                            tendencia = 'descendente'
                        else:
                            tendencia = 'estable'
                            
                        ultimas_lecturas[tipo]['tendencia'] = tendencia
                        ultimas_lecturas[tipo]['cambio_porcentual'] = round(cambio_porcentual, 1)
                except Exception as e:
                    current_app.logger.warning(f"Error al calcular tendencia para {tipo}: {e}")
        
        # Debug log to check what's being returned
        current_app.logger.info(f"Datos recopilados para parcela {parcela_id}: {ultimas_lecturas.keys()}")
        return ultimas_lecturas
        
    except Exception as e:
        current_app.logger.error(f"Error al obtener lecturas de sensores: {e}")
        return {}

def generar_recomendaciones_parcela(parcela, datos_sensor, max_caracteres=300):
    """Genera recomendaciones para una parcela basadas en datos de sensores"""
    # Start with an empty list of recommendations
    recomendaciones = []
    
    try:
        # Check if we got any sensor data at all
        if not datos_sensor:
            current_app.logger.warning(f"No hay datos de sensores para parcela {parcela.id}, generando recomendación genérica")
            # If no sensor data found, recommend installing sensors
            recomendacion = {
                "id": f"rec_{parcela.id}_1",
                "parcela": parcela.nombre,
                "cultivo": parcela.cultivo_actual or "Sin cultivo",
                "recomendacion": "Instale sensores en esta parcela para obtener recomendaciones personalizadas.",
                "fecha": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            recomendaciones.append(recomendacion)
            return recomendaciones
        
        # IMPORTANT: Log the sensor data we received to debug
        current_app.logger.info(f"Datos de sensores para parcela {parcela.id}: {datos_sensor}")
        
        # Get the cultivo name for context-specific recommendations
        cultivo = (parcela.cultivo_actual or "").lower()
        
        # Create case-insensitive lookup dictionary
        datos_sensor_norm = {k.lower(): v for k, v in datos_sensor.items()}
        
        # Check humidity levels - USING CASE-INSENSITIVE KEY
        if 'humedad' in datos_sensor_norm:
            humedad_data = datos_sensor_norm['humedad']
            try:
                # Try to parse the value safely
                valor_humedad = float(humedad_data['valor'])
                
                # Different thresholds based on crop type
                umbral_bajo = 30  # default
                umbral_alto = 70  # default
                
                if cultivo == 'tomate':
                    umbral_bajo = 40
                    umbral_alto = 80
                elif cultivo == 'maíz' or cultivo == 'maiz':
                    umbral_bajo = 35
                    umbral_alto = 75
                elif cultivo == 'trigo':
                    umbral_bajo = 30
                    umbral_alto = 70
                elif cultivo == 'papaya':
                    umbral_bajo = 45
                    umbral_alto = 85
                    
                # Generate recommendation based on humidity value
                if valor_humedad < umbral_bajo:
                    recomendacion = {
                        "id": f"rec_{parcela.id}_hum_bajo",
                        "parcela": parcela.nombre,
                        "cultivo": parcela.cultivo_actual,
                        "recomendacion": f"Aumente el riego. La humedad actual ({valor_humedad}%) está por debajo del nivel óptimo para {parcela.cultivo_actual}.",
                        "fecha": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }
                    recomendaciones.append(recomendacion)
                    
                elif valor_humedad > umbral_alto:
                    recomendacion = {
                        "id": f"rec_{parcela.id}_hum_alto",
                        "parcela": parcela.nombre,
                        "cultivo": parcela.cultivo_actual,
                        "recomendacion": f"Reduzca el riego. La humedad actual ({valor_humedad}%) está por encima del nivel óptimo para {parcela.cultivo_actual}.",
                        "fecha": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }
                    recomendaciones.append(recomendacion)
                
                # Add trend-based recommendation if available
                if 'tendencia' in humedad_data and humedad_data['tendencia'] == 'descendente':
                    recomendacion = {
                        "id": f"rec_{parcela.id}_hum_trend",
                        "parcela": parcela.nombre,
                        "cultivo": parcela.cultivo_actual,
                        "recomendacion": f"Programar riego preventivo. Se detecta tendencia descendente en niveles de humedad ({humedad_data['cambio_porcentual']}%).",
                        "fecha": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }
                    recomendaciones.append(recomendacion)
            except (ValueError, TypeError) as e:
                current_app.logger.warning(f"Error al procesar valor de humedad para parcela {parcela.id}: {e}")
        
        # Check temperature - USING CASE-INSENSITIVE KEY
        if 'temperatura' in datos_sensor_norm:
            temp_data = datos_sensor_norm['temperatura']
            try:
                valor_temp = float(temp_data['valor'])
                
                # Different thresholds based on crop type
                umbral_bajo = 10  # default
                umbral_alto = 30  # default
                
                if cultivo == 'tomate':
                    umbral_bajo = 15
                    umbral_alto = 30
                elif cultivo == 'maíz' or cultivo == 'maiz':
                    umbral_bajo = 10
                    umbral_alto = 35
                elif cultivo == 'trigo':
                    umbral_bajo = 5
                    umbral_alto = 28
                elif cultivo == 'papaya':
                    umbral_bajo = 20
                    umbral_alto = 35
                    
                # Generate recommendation based on temperature value
                if valor_temp > umbral_alto:
                    recomendacion = {
                        "id": f"rec_{parcela.id}_temp_alto",
                        "parcela": parcela.nombre,
                        "cultivo": parcela.cultivo_actual,
                        "recomendacion": f"Considerar sombreado parcial. La temperatura actual ({valor_temp}°C) está por encima del rango óptimo para {parcela.cultivo_actual}.",
                        "fecha": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }
                    recomendaciones.append(recomendacion)
                    
                elif valor_temp < umbral_bajo:
                    recomendacion = {
                        "id": f"rec_{parcela.id}_temp_bajo",
                        "parcela": parcela.nombre,
                        "cultivo": parcela.cultivo_actual,
                        "recomendacion": f"Considerar protección contra el frío. La temperatura actual ({valor_temp}°C) está por debajo del rango óptimo para {parcela.cultivo_actual}.",
                        "fecha": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }
                    recomendaciones.append(recomendacion)
            except (ValueError, TypeError) as e:
                current_app.logger.warning(f"Error al procesar valor de temperatura para parcela {parcela.id}: {e}")
        
        # Check pH levels - USING CASE-INSENSITIVE KEY
        if 'ph' in datos_sensor_norm:
            ph_data = datos_sensor_norm['ph']
            try:
                valor_ph = float(ph_data['valor'])
                
                # Different thresholds based on crop type
                umbral_bajo = 5.5  # default
                umbral_alto = 7.5  # default
                
                if cultivo == 'tomate':
                    umbral_bajo = 5.5
                    umbral_alto = 7.0
                elif cultivo == 'maíz' or cultivo == 'maiz':
                    umbral_bajo = 5.5
                    umbral_alto = 7.0
                elif cultivo == 'trigo':
                    umbral_bajo = 5.5
                    umbral_alto = 7.0
                elif cultivo == 'papaya':
                    umbral_bajo = 5.5
                    umbral_alto = 6.5
                    
                # Generate recommendation based on pH value
                if valor_ph < umbral_bajo:
                    recomendacion = {
                        "id": f"rec_{parcela.id}_ph_bajo",
                        "parcela": parcela.nombre,
                        "cultivo": parcela.cultivo_actual,
                        "recomendacion": f"Aplicar cal agrícola para elevar el pH del suelo (actual: {valor_ph}).",
                        "fecha": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }
                    recomendaciones.append(recomendacion)
                    
                elif valor_ph > umbral_alto:
                    recomendacion = {
                        "id": f"rec_{parcela.id}_ph_alto",
                        "parcela": parcela.nombre,
                        "cultivo": parcela.cultivo_actual,
                        "recomendacion": f"Aplicar azufre o sulfato de amonio para reducir el pH del suelo (actual: {valor_ph}).",
                        "fecha": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }
                    recomendaciones.append(recomendacion)
            except (ValueError, TypeError) as e:
                current_app.logger.warning(f"Error al procesar valor de pH para parcela {parcela.id}: {e}")
        
        # If no specific recommendations were generated, add a default one
        if not recomendaciones:
            recomendacion = {
                "id": f"rec_{parcela.id}_default",
                "parcela": parcela.nombre,
                "cultivo": parcela.cultivo_actual,
                "recomendacion": f"Mantenga las condiciones actuales de cultivo. Los parámetros monitoreados están dentro de rangos normales para {parcela.cultivo_actual}.",
                "fecha": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            recomendaciones.append(recomendacion)
            
        # Truncate recommendations if needed
        if max_caracteres > 0:
            for rec in recomendaciones:
                if len(rec['recomendacion']) > max_caracteres:
                    rec['recomendacion'] = rec['recomendacion'][:max_caracteres-3] + '...'
    
        return recomendaciones
        
    except Exception as e:
        current_app.logger.error(f"Error generando recomendaciones: {e}")
        # Return a fallback recommendation
        return [{
            "id": f"rec_{parcela.id}_error",
            "parcela": parcela.nombre,
            "cultivo": parcela.cultivo_actual or "Sin cultivo",
            "recomendacion": "No se pudieron generar recomendaciones específicas. Verifique el estado de los sensores.",
            "fecha": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }]


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

# Endpoint para recomendaciones de cultivo (sin jwt_required)

# Endpoint para guardar análisis de parcela
@app.route('/api/parcelas/<int:parcela_id>/analisis', methods=['POST', 'OPTIONS'])
def guardar_analisis_parcela(parcela_id):
    # Manejo de CORS para solicitudes OPTIONS
    if request.method == 'OPTIONS':
        response = app.make_default_options_response()
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        return response
    
    try:
        # Verificar que la parcela exista
        parcela = Parcela.query.get(parcela_id)
        if not parcela:
            return jsonify({"error": "Parcela no encontrada"}), 404
            
        if not request.is_json:
            return jsonify({"error": "El formato debe ser JSON"}), 400
            
        data = request.json
        tipo = data.get('tipo')
        resultado = data.get('resultado')
        analisis_formateado = data.get('analisis_formateado')
        fecha = data.get('fecha')
        
        if not tipo or not resultado:
            return jsonify({"error": "Se requiere tipo y resultado"}), 400
        
        # Obtener usuario_id desde el header o usar un valor predeterminado
        usuario_id = request.headers.get('X-User-Id', 1)
        
        # Simular el guardado del análisis (en un entorno real, guardarlo en BD)
        current_app.logger.info(f"Análisis guardado para parcela {parcela_id}, tipo: {tipo}")
        
        # Registrar la acción si tenemos un usuario identificado
        try:
            if usuario_id:
                registrar_log(usuario_id, 'guardar_analisis', 'parcela', parcela_id,
                          detalles=f"tipo: {tipo}")
        except Exception as log_error:
            current_app.logger.warning(f"Error al registrar log: {log_error}")
        
        return jsonify({
            "success": True,
            "mensaje": "Análisis guardado correctamente",
            "analisis_id": randint(1000, 9999)  # ID simulado
        })
        
    except Exception as e:
        current_app.logger.error(f"Error guardando análisis: {str(e)}")
        return jsonify({"error": "Error al guardar el análisis", "details": str(e)}), 500


@app.route('/')
def home():
    return "<h2>EcoSmart Backend funcionando correctamente en el puerto 5000 🚀</h2>"
# ...existing code...

# Agregar endpoint de debug para ver rutas
@app.route('/api/debug/routes', methods=['GET'])
def debug_routes():
    """Endpoint para debug - listar todas las rutas registradas"""
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append({
            'endpoint': rule.endpoint,
            'methods': list(rule.methods),
            'url': str(rule)
        })
    return jsonify({
        "total_routes": len(routes),
        "routes": routes
    })
    
    
    # ...existing code...

@app.route('/api/cultivos', methods=['GET'])
def listar_cultivos():
    """Listar todos los cultivos disponibles"""
    try:
        # Verificar autorización
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token requerido'}), 401
        
        # Consultar todos los cultivos
        cultivos = DetalleCultivo.query.all()
        
        cultivos_data = []
        for cultivo in cultivos:
            cultivos_data.append({
                'id': cultivo.id,
                'parcela_id': cultivo.parcela_id,
                'nombre': cultivo.nombre,
                'variedad': cultivo.variedad,
                'etapa_desarrollo': cultivo.etapa_desarrollo,
                'fecha_siembra': cultivo.fecha_siembra.isoformat() if cultivo.fecha_siembra else None,
                'dias_cosecha_estimados': cultivo.dias_cosecha_estimados,
                'edad_dias': cultivo.calcular_edad_dias() if hasattr(cultivo, 'calcular_edad_dias') else None,
                'progreso_cosecha': round(cultivo.progreso_cosecha(), 1) if hasattr(cultivo, 'progreso_cosecha') else None,
                'activo': cultivo.activo,
                'fecha_cosecha': cultivo.fecha_cosecha.isoformat() if cultivo.fecha_cosecha else None
            })
        
        return jsonify(cultivos_data)
    
    except Exception as e:
        current_app.logger.error(f"Error al listar cultivos: {str(e)}")
        return jsonify({'error': f"Error al obtener cultivos: {str(e)}"}), 500

@app.route('/api/cultivos/<int:cultivo_id>', methods=['GET'])
def obtener_cultivo(cultivo_id):
    """Obtener un cultivo específico por ID"""
    try:
        cultivo = DetalleCultivo.query.get(cultivo_id)
        if not cultivo:
            return jsonify({'error': 'Cultivo no encontrado'}), 404
        
        cultivo_data = {
            'id': cultivo.id,
            'parcela_id': cultivo.parcela_id,
            'nombre': cultivo.nombre,
            'variedad': cultivo.variedad,
            'etapa_desarrollo': cultivo.etapa_desarrollo,
            'fecha_siembra': cultivo.fecha_siembra.isoformat() if cultivo.fecha_siembra else None,
            'dias_cosecha_estimados': cultivo.dias_cosecha_estimados,
            'edad_dias': cultivo.calcular_edad_dias() if hasattr(cultivo, 'calcular_edad_dias') else None,
            'progreso_cosecha': round(cultivo.progreso_cosecha(), 1) if hasattr(cultivo, 'progreso_cosecha') else None,
            'activo': cultivo.activo,
            'fecha_cosecha': cultivo.fecha_cosecha.isoformat() if cultivo.fecha_cosecha else None
        }
        
        return jsonify(cultivo_data)
    
    except Exception as e:
        current_app.logger.error(f"Error al obtener cultivo: {str(e)}")
        return jsonify({'error': f"Error al obtener cultivo: {str(e)}"}), 500

@app.route('/api/parcelas/<int:parcela_id>/cultivo', methods=['GET'])
def obtener_cultivo_por_parcela(parcela_id):
    """Obtener el cultivo activo de una parcela específica"""
    try:
        # Buscar el cultivo activo de la parcela
        cultivo = DetalleCultivo.query.filter_by(
            parcela_id=parcela_id, 
            activo=True
        ).first()
        
        if not cultivo:
            return jsonify({'error': 'No hay cultivo activo en esta parcela'}), 404
        
        cultivo_data = {
            'id': cultivo.id,
            'parcela_id': cultivo.parcela_id,
            'nombre': cultivo.nombre,
            'variedad': cultivo.variedad,
            'etapa_desarrollo': cultivo.etapa_desarrollo,
            'fecha_siembra': cultivo.fecha_siembra.isoformat() if cultivo.fecha_siembra else None,
            'dias_cosecha_estimados': cultivo.dias_cosecha_estimados,
            'edad_dias': cultivo.calcular_edad_dias() if hasattr(cultivo, 'calcular_edad_dias') else None,
            'progreso_cosecha': round(cultivo.progreso_cosecha(), 1) if hasattr(cultivo, 'progreso_cosecha') else None,
            'activo': cultivo.activo,
            'fecha_cosecha': cultivo.fecha_cosecha.isoformat() if cultivo.fecha_cosecha else None
        }
        
        return jsonify(cultivo_data)
    
    except Exception as e:
        current_app.logger.error(f"Error al obtener cultivo de parcela: {str(e)}")
        return jsonify({'error': f"Error al obtener cultivo: {str(e)}"}), 500

# ...existing code...
    
    
    
    
    
    
    
    

# ...existing code...

if __name__ == '__main__':
    app.run(debug=True, port=5000)