from flask import Flask, jsonify, request, send_file, current_app, Blueprint
# Importa las clases y funciones necesarias de Flask para crear la aplicación web, manejar respuestas JSON, solicitudes, envío de archivos, acceso a la aplicación actual y blueprints.
from flask_cors import CORS, cross_origin
# Importa CORS para manejar las políticas de seguridad de Cross-Origin Resource Sharing, permitiendo que el frontend acceda a la API.
import os
# Importa el módulo os para interactuar con el sistema operativo, como la manipulación de rutas de archivos.
import sys
# Importa el módulo sys para interactuar con el intérprete de Python, como la modificación de la ruta de búsqueda de módulos.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
# Añade el directorio padre al sys.path. Esto permite importar módulos de directorios hermanos (como 'Sensores' y 'modelos').
from Sensores.Sensor import obtener_parametros_estacion, Sensor, RedSensores, SensorNutrientes
# Importa funciones y clases relacionadas con los sensores desde el módulo 'Sensor' dentro del paquete 'Sensores'.
import time
# Importa el módulo time para funciones relacionadas con el tiempo, como pausas (sleep).
from datetime import datetime, timedelta, UTC
# Importa clases de datetime para manejar fechas y horas, diferencias de tiempo y zonas horarias UTC.
import threading
# Importa el módulo threading para permitir la ejecución de operaciones en segundo plano (hilos).
import pandas as pd
# Importa pandas, una librería para manipulación y análisis de datos, especialmente útil para DataFrames.
import json
# Importa el módulo json para trabajar con datos en formato JSON.
from json import JSONDecodeError
# Importa JSONDecodeError para manejar errores al decodificar JSON.
from modelos.models import db, Usuario, LecturaSensor , Parcela, Conversacion, Mensaje, LogAccionUsuario, DetalleCultivo, AlertaSensor,RangoParametro
# Importa la instancia de la base de datos (db) y los modelos de SQLAlchemy definidos en 'modelos.models'.
from werkzeug.security import generate_password_hash, check_password_hash
# Importa funciones de Werkzeug para el hashing seguro de contraseñas y su verificación.
from servicios.openrouter import send_to_deepseek
# Importa la función para enviar solicitudes a la API de DeepSeek (a través de OpenRouter) desde 'servicios.openrouter'.
from servicios.logs import registrar_log, registrar_accion
# Importa funciones para registrar logs y acciones de usuario desde 'servicios.logs'.
from sqlalchemy import func
# Importa 'func' de SQLAlchemy para usar funciones de agregación de SQL.
from random import randint
# Importa randint para generar números enteros aleatorios.
import smtplib
# Importa smtplib para enviar correos electrónicos.
from email.mime.text import MIMEText
# Importa MIMEText para crear mensajes de correo electrónico de texto plano.
import re
# Importa el módulo re para expresiones regulares.
from servicios.notificaciones import enviar_correo_alerta
# Importa la función para enviar correos de alerta desde 'servicios.notificaciones'.

from servicios.detector_anomalias import detector
# Importa el objeto 'detector' del módulo 'detector_anomalias' para la detección de anomalías.
import jwt
# Importa PyJWT para trabajar con JSON Web Tokens.
from sqlalchemy import text
# Importa 'text' de SQLAlchemy para ejecutar sentencias SQL crudas.


app = Flask(__name__)
# Inicializa la aplicación Flask.

CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5175", "http://127.0.0.1:5175"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "X-User-Id", "X-User-Rol", "Authorization"]
    }
})
# Configura CORS para la aplicación Flask.
# Permite solicitudes desde los orígenes especificados (frontend de desarrollo).
# Define los métodos HTTP permitidos.
# Define los encabezados HTTP permitidos en las solicitudes.

SECRET_KEY="ecosmart"
# Define una clave secreta para la aplicación, utilizada para la firma de JWT.

#base de datos
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:ecosmart@localhost:5432/ecosmart'
# Configura la URI de conexión a la base de datos PostgreSQL.
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# Deshabilita el seguimiento de modificaciones de objetos de SQLAlchemy para ahorrar memoria.
db.init_app(app)
# Inicializa la instancia de SQLAlchemy (db) con la aplicación Flask.


@app.route('/api/debug/database', methods=['GET'])
# Define una ruta GET para '/api/debug/database'.
def debug_database():
    """Endpoint para verificar estado de la base de datos"""
    # Docstring que describe la función del endpoint.
    try:
        from sqlalchemy import inspect
        # Importa 'inspect' de SQLAlchemy para obtener información sobre la base de datos.
        inspector = inspect(db.engine)
        # Crea un inspector para el motor de la base de datos.
        tables = inspector.get_table_names()
        # Obtiene una lista de los nombres de todas las tablas en la base de datos.
        
        # Verificar modelo DetalleCultivo
        cultivo_info = {}
        # Inicializa un diccionario para almacenar información sobre la tabla 'cultivos'.
        if 'cultivos' in tables:
        # Comprueba si la tabla 'cultivos' existe en la base de datos.
            columns = [col['name'] for col in inspector.get_columns('cultivos')]
            # Obtiene los nombres de las columnas de la tabla 'cultivos'.
            cultivo_info = {
                'tabla_existe': True,
                'columnas': columns
            }
            # Almacena la información de la tabla y sus columnas.
        else:
            cultivo_info = {'tabla_existe': False}
            # Indica que la tabla 'cultivos' no existe.
        
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
        # Devuelve una respuesta JSON con el estado de la base de datos, las tablas existentes, información sobre la tabla 'cultivos' y si los modelos están importados.
    
    except Exception as e:
    # Captura cualquier excepción que ocurra durante la ejecución.
        return jsonify({
            'status': 'error',
            'error': str(e),
            'database_connected': False
        }), 500
        # Devuelve una respuesta JSON de error con el mensaje de la excepción y un código de estado 500.

@app.route('/api/asistente/recomendar', methods=['POST', 'OPTIONS'])
# Define una ruta para '/api/asistente/recomendar' que acepta métodos POST y OPTIONS.
@cross_origin()
# Aplica la configuración CORS a este endpoint.
def recomendar_asistente_clima():
    """
    Genera recomendaciones para una parcela basadas en el pronóstico del clima y datos de la parcela.
    Espera un JSON con 'parcela' y 'pronostico' en el body.
    """
    # Docstring que describe la función del endpoint.
    if request.method == 'OPTIONS':
    # Si la solicitud es de tipo OPTIONS (pre-vuelo CORS).
        response = jsonify({'status': 'ok'})
        # Crea una respuesta JSON con estado 'ok'.
        response.headers.add('Access-Control-Allow-Origin', '*')
        # Añade el encabezado 'Access-Control-Allow-Origin' para permitir cualquier origen.
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-User-Id')
        # Añade los encabezados permitidos.
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        # Añade los métodos permitidos.
        return response
        # Devuelve la respuesta de pre-vuelo.

    try:
        data = request.get_json()
        # Obtiene los datos JSON del cuerpo de la solicitud.
        parcela = data.get('parcela', {})
        # Extrae la información de la parcela del JSON, por defecto un diccionario vacío.
        pronostico = data.get('pronostico', [])
        # Extrae el pronóstico del JSON, por defecto una lista vacía.
        cultivo = parcela.get('cultivo', parcela.get('cultivo_actual', 'cultivo'))
        # Determina el nombre del cultivo, buscando en 'cultivo', luego 'cultivo_actual', o por defecto 'cultivo'.
        nombre = parcela.get('nombre', 'Parcela')
        # Determina el nombre de la parcela, por defecto 'Parcela'.
        recomendaciones = []
        # Inicializa una lista vacía para almacenar las recomendaciones.

        # Ejemplo simple de lógica basada en pronóstico
        if not pronostico or not isinstance(pronostico, list):
        # Si el pronóstico está vacío o no es una lista.
            return jsonify({"recomendaciones": ["No se pudo analizar el pronóstico del clima."]})
            # Devuelve un mensaje indicando que no se pudo analizar el pronóstico.

        # Buscar días con lluvia y temperaturas extremas
        dias_lluvia = [dia for dia in pronostico if 'lluvia' in str(dia.get('condicion', '')).lower() or float(dia.get('probabilidadLluvia', '0').replace('%', '')) > 60]
        # Filtra los días con lluvia (condición o probabilidad de lluvia > 60%).
        dias_calor = [dia for dia in pronostico if float(dia.get('maxima', 0)) > 32]
        # Filtra los días con temperatura máxima superior a 32°C.
        dias_frio = [dia for dia in pronostico if float(dia.get('minima', 100)) < 5]
        # Filtra los días con temperatura mínima inferior a 5°C.

        if dias_lluvia:
        # Si hay días con lluvia.
            recomendaciones.append(f"Se pronostica lluvia en los próximos días para {nombre}. Ajuste el riego para evitar exceso de agua en el cultivo de {cultivo}.")
            # Añade una recomendación sobre el riego.
        if dias_calor:
        # Si hay días calurosos.
            recomendaciones.append(f"Se esperan temperaturas altas. Considere sombrear o regar temprano el cultivo de {cultivo}.")
            # Añade una recomendación sobre el sombreado o riego.
        if dias_frio:
        # Si hay días fríos.
            recomendaciones.append(f"Posibles heladas. Proteja el cultivo de {cultivo} en {nombre} durante las noches frías.")
            # Añade una recomendación sobre la protección contra heladas.
        if not recomendaciones:
        # Si no se generaron recomendaciones específicas.
            recomendaciones.append(f"Condiciones climáticas estables para {nombre}. Mantenga el monitoreo regular del cultivo de {cultivo}.")
            # Añade una recomendación general de estabilidad.

        return jsonify({"recomendaciones": recomendaciones})
        # Devuelve las recomendaciones en formato JSON.

    except Exception as e:
    # Captura cualquier excepción.
        return jsonify({"recomendaciones": [f"Error generando recomendación: {str(e)}"]}), 500
        # Devuelve un mensaje de error con la excepción y un código de estado 500.
    

@app.route('/api/parcelas/recomendaciones', methods=['GET', 'POST', 'OPTIONS'])
# Define una ruta para '/api/parcelas/recomendaciones' que acepta métodos GET, POST y OPTIONS.
def recomendaciones_parcelas():
    if request.method == 'OPTIONS':
    # Si la solicitud es de tipo OPTIONS.
        response = jsonify({'status': 'ok'})
        # Crea una respuesta JSON con estado 'ok'.
        response.headers.add('Access-Control-Allow-Origin', '*')
        # Añade el encabezado 'Access-Control-Allow-Origin'.
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-User-Id')
        # Añade los encabezados permitidos.
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        # Añade los métodos permitidos.
        return response
        # Devuelve la respuesta de pre-vuelo.
    
    try:
        # VERSIÓN SIMPLE QUE FUNCIONA
        recomendaciones_ia = generar_recomendaciones_con_ia()
        # Llama a la función para generar recomendaciones con IA.
        return jsonify(recomendaciones_ia)
        # Devuelve las recomendaciones en formato JSON.
    
    except Exception as e:
    # Captura cualquier excepción.
        current_app.logger.error(f"Error en recomendaciones_parcelas: {e}")
        # Registra el error en el log de la aplicación.
        return jsonify([{
            "id": 1,
            "cultivo": "Error",
            "parcela": "Sistema",
            "recomendacion": f"Error: {str(e)}",
            "fecha": datetime.now().isoformat()
        }]), 500
        # Devuelve un mensaje de error con la excepción y un código de estado 500.

def generar_recomendaciones_con_ia():
    """Genera recomendaciones usando IA basadas en datos de parcelas y sensores"""
    # Docstring que describe la función.
    try:
        # Obtener datos de parcelas (usa tus modelos existentes)
        parcelas_data = obtener_datos_para_ia()
        # Obtiene los datos de las parcelas para la IA.
        recomendaciones = []
        # Inicializa una lista vacía para las recomendaciones.
        
        for i, parcela in enumerate(parcelas_data):
        # Itera sobre cada parcela.
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
                # Construye el prompt para la IA con los datos de la parcela.
                
                # Usar tu función existente de DeepSeek
                messages = [
                    {"role": "system", "content": "Eres un agrónomo experto. Responde SOLO con la recomendación práctica,no respondas preguntas que no sean del ambito agricola, sin introducción."},
                    {"role": "user", "content": prompt}
                ]
                # Prepara los mensajes para enviar a la IA, incluyendo un mensaje de sistema y el prompt del usuario.
                
                recomendacion_texto = send_to_deepseek(messages)
                # Envía los mensajes a la IA y obtiene la respuesta.
                
                # Limpiar respuesta
                recomendacion_texto = recomendacion_texto.strip().replace('"', '').replace('\n', ' ')
                # Limpia el texto de la recomendación, eliminando espacios extra, comillas y saltos de línea.
                if len(recomendacion_texto) > 150:
                # Si la recomendación excede los 150 caracteres.
                    recomendacion_texto = recomendacion_texto[:147] + "..."
                    # La trunca y añade puntos suspensivos.
                
            except Exception as ia_error:
            # Captura cualquier error específico de la IA.
                current_app.logger.error(f"Error IA para parcela {parcela['nombre']}: {ia_error}")
                # Registra el error de la IA.
                # Fallback con lógica de reglas
                recomendacion_texto = generar_recomendacion_fallback(parcela)
                # Genera una recomendación de respaldo usando lógica de reglas.
            
            recomendaciones.append({
                "id": i + 1,
                "cultivo": parcela.get('cultivo', 'Sin cultivo'),
                "parcela": parcela.get('nombre', f'Parcela {i+1}'),
                "recomendacion": recomendacion_texto,
                "fecha": datetime.now().isoformat()
            })
            # Añade la recomendación a la lista.
        
        return recomendaciones
        # Devuelve la lista de recomendaciones.
    
    except Exception as e:
    # Captura cualquier excepción general.
        current_app.logger.error(f"Error general en generar_recomendaciones_con_ia: {e}")
        # Registra el error general.
        return generar_recomendaciones_fallback_completo()
        # Devuelve un conjunto completo de recomendaciones de respaldo.

def obtener_datos_para_ia():
    """Obtiene datos reales de parcelas y sensores"""
    # Docstring que describe la función.
    try:
        # Opción 1: Si tienes modelo Parcela
        if 'Parcela' in globals():
        # Comprueba si el modelo 'Parcela' está disponible globalmente.
            parcelas = Parcela.query.limit(5).all()
            # Consulta las primeras 5 parcelas de la base de datos.
            datos_parcelas = []
            # Inicializa una lista para almacenar los datos de las parcelas.
            
            for parcela in parcelas:
            # Itera sobre cada parcela.
                # Obtener datos de sensores actuales
                try:
                    datos_sensores = obtener_parametros_estacion()
                    # Intenta obtener los parámetros de la estación de sensores.
                except:
                    datos_sensores = {}
                    # Si falla, usa un diccionario vacío.
                
                datos_parcelas.append({
                    "nombre": parcela.nombre,
                    "cultivo": getattr(parcela, 'cultivo_actual', 'Sin especificar'),
                    "estado": getattr(parcela, 'estado', 'normal'),
                    "humedad": datos_sensores.get('humedad_suelo', 50),
                    "temperatura": datos_sensores.get('temperatura', 25),
                    "ph": datos_sensores.get('ph_suelo', 7.0),
                    "area": getattr(parcela, 'area', '1 ha'),
                })
                # Añade los datos de la parcela y sus sensores a la lista.
            
            return datos_parcelas
            # Devuelve los datos de las parcelas.
        
        # Opción 2: Datos simulados con sensores reales
        return obtener_datos_simulados_con_sensores()
        # Si el modelo 'Parcela' no está disponible, devuelve datos simulados con sensores reales.
        
    except Exception as e:
    # Captura cualquier excepción.
        current_app.logger.error(f"Error obteniendo datos para IA: {e}")
        # Registra el error.
        return obtener_datos_simulados_con_sensores()
        # Devuelve datos simulados como fallback.

def obtener_datos_simulados_con_sensores():
    """Genera datos basados en sensores reales"""
    # Docstring que describe la función.
    try:
        # Usar tus datos de sensores reales
        datos_sensores = obtener_parametros_estacion()
        # Obtiene los parámetros de la estación de sensores.
        
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
        # Devuelve una lista de diccionarios con datos simulados de parcelas, utilizando los datos de los sensores reales.
    except Exception as e:
    # Captura cualquier excepción.
        current_app.logger.error(f"Error con sensores: {e}")
        # Registra el error.
        return generar_datos_basicos()
        # Devuelve datos básicos como fallback.

def generar_recomendacion_fallback(parcela):
    """Genera recomendación con lógica de reglas si falla la IA"""
    # Docstring que describe la función.
    humedad = parcela.get('humedad', 50)
    # Obtiene el valor de humedad de la parcela, por defecto 50.
    temperatura = parcela.get('temperatura', 25)
    # Obtiene el valor de temperatura de la parcela, por defecto 25.
    ph = parcela.get('ph', 7.0)
    # Obtiene el valor de pH de la parcela, por defecto 7.0.
    cultivo = parcela.get('cultivo', 'cultivo')
    # Obtiene el nombre del cultivo, por defecto 'cultivo'.
    
    # Priorizar problemas críticos
    if humedad < 30:
    # Si la humedad es crítica.
        return f"URGENTE: Riego inmediato para {cultivo}. Humedad crítica: {humedad}%"
        # Devuelve una recomendación de riego urgente.
    elif humedad < 45:
    # Si la humedad es baja.
        return f"Incrementar riego en 25% para {cultivo}. Humedad baja: {humedad}%"
        # Devuelve una recomendación para incrementar el riego.
    elif temperatura > 32:
    # Si la temperatura es alta.
        return f"Implementar sombreado para {cultivo}. Temperatura alta: {temperatura}°C"
        # Devuelve una recomendación para sombreado.
    elif ph < 5.5 or ph > 8.0:
    # Si el pH está fuera del rango óptimo.
        return f"Ajustar pH del suelo para {cultivo}. Valor actual: {ph}"
        # Devuelve una recomendación para ajustar el pH.
    else:
    # Si las condiciones son estables.
        return f"Monitorear desarrollo del {cultivo}. Condiciones estables."
        # Devuelve una recomendación de monitoreo general.

def generar_recomendaciones_fallback_completo():
    """Fallback completo si todo falla"""
    # Docstring que describe la función.
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
    # Devuelve una lista de recomendaciones predefinidas.

def generar_datos_basicos():
    """Datos básicos si fallan los sensores"""
    # Docstring que describe la función.
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
    # Devuelve una lista de diccionarios con datos básicos de parcelas.

# ...existing code...


@app.errorhandler(404)
# Decorador que registra una función para manejar errores 404 (No encontrado).
def not_found_error(error):
    return jsonify({
        "error": "Ruta no encontrada",
        "message": "La ruta solicitada no existe",
        "status": 404
    }), 404
    # Devuelve una respuesta JSON con un mensaje de error 404 y el código de estado 404.

@app.errorhandler(500)
# Decorador que registra una función para manejar errores 500 (Error interno del servidor).
def internal_error(error):
    return jsonify({
        "error": "Error interno del servidor",
        "message": str(error),
        "status": 500
    }), 500
    # Devuelve una respuesta JSON con un mensaje de error 500, el detalle del error y el código de estado 500.


#Endpoints para la API de administración de usuarios
@app.route('/api/registro', methods=['POST'])
# Define una ruta POST para '/api/registro'.
def registrar_usuario():
    data = request.json
    # Obtiene los datos JSON del cuerpo de la solicitud.
    if Usuario.query.filter_by(email=data['email']).first():
    # Comprueba si ya existe un usuario con el mismo correo electrónico.
        return jsonify({'error': 'El correo ya está registrado'}), 400
        # Si existe, devuelve un error 400.
    usuario = Usuario(
        nombre=data['nombre'],
        email=data['email'],
        password=generate_password_hash(data['password']),
        rol=data['rol']
    )
    # Crea una nueva instancia del modelo Usuario con los datos proporcionados y la contraseña hasheada.
    db.session.add(usuario)
    # Añade el nuevo usuario a la sesión de la base de datos.
    db.session.commit()
    # Confirma los cambios en la base de datos.
    registrar_log(usuario.id, 'registro', 'usuario', usuario.id, detalles=str(data))
    # Registra la acción de registro en el log.

    return jsonify({'mensaje': 'Usuario registrado correctamente'})
    # Devuelve un mensaje de éxito.

@app.route('/api/usuarios', methods=['GET'])
# Define una ruta GET para '/api/usuarios'.
def obtener_usuarios():
    try:
        # Verificar autorización (esto debería ser mejorado con un sistema de tokens)
        user_id = request.headers.get('X-User-Id')
        # Obtiene el ID de usuario del encabezado 'X-User-Id'.
        user_rol = request.headers.get('X-User-Rol')
        # Obtiene el rol de usuario del encabezado 'X-User-Rol'.
        
        if not user_id or user_rol not in ['tecnico', 'admin']:
        # Si no hay ID de usuario o el rol no es 'tecnico' o 'admin'.
            return jsonify({'error': 'No autorizado'}), 403
            # Devuelve un error 403 (No autorizado).
        
        # Consulta los usuarios
        usuarios = Usuario.query.all()
        # Consulta todos los usuarios de la base de datos.
        
        # Convierte a JSON (sin incluir contraseñas)
        usuarios_data = [{
            'id': usuario.id,
            'nombre': usuario.nombre,
            'email': usuario.email,
            'rol': usuario.rol
        } for usuario in usuarios]
        # Crea una lista de diccionarios con los datos de los usuarios (excluyendo la contraseña).
        
        return jsonify(usuarios_data)
        # Devuelve la lista de usuarios en formato JSON.
        
    except Exception as e:
    # Captura cualquier excepción.
        current_app.logger.error(f"Error al listar usuarios: {str(e)}")
        # Registra el error.
        return jsonify({'error': 'Error al procesar la solicitud'}), 500
        # Devuelve un error 500.


def generar_token(usuario_id):
    payload = {
        "user_id": usuario_id,
        "exp": datetime.utcnow() + timedelta(hours=1),  # expira en 1 hora
        "iat": datetime.utcnow()  # emitido en
    }
    # Crea el payload del token JWT con el ID de usuario, tiempo de expiración (1 hora) y tiempo de emisión.

    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    # Codifica el payload en un token JWT usando la clave secreta y el algoritmo HS256.
    return token
    # Devuelve el token.

@app.route('/api/login', methods=['POST'])
# Define una ruta POST para '/api/login'.
def login_usuario():
    try:
        print("🔍 DEBUG: Login iniciado")
        # Mensaje de depuración.
        
        if request.content_type and 'application/json' in request.content_type:
        # Comprueba si el tipo de contenido es JSON.
            data = request.get_json(force=True)
            # Obtiene los datos JSON.
        else:
            try:
                content = request.data.decode('utf-8')
                # Intenta decodificar el contenido como UTF-8.
            except UnicodeDecodeError:
                content = request.data.decode('latin-1')
                # Si falla, intenta decodificar como Latin-1.
            data = json.loads(content)
            # Carga el contenido como JSON.

        print(f"🔍 DEBUG: Datos recibidos: {data}")
        # Mensaje de depuración con los datos recibidos.

        if 'email' not in data or 'password' not in data:
        # Si faltan el email o la contraseña en los datos.
            return jsonify({'error': 'Faltan credenciales'}), 400
            # Devuelve un error 400.

        email = data['email'].strip()
        # Obtiene el email y elimina espacios en blanco.
        print(f"🔍 DEBUG: Buscando email: '{email}'")
        # Mensaje de depuración.
        
        usuario = Usuario.query.filter_by(email=email).first()
        # Busca un usuario por email en la base de datos.
        print(f"🔍 DEBUG: Usuario encontrado: {usuario is not None}")
        # Mensaje de depuración.
        
        if usuario:
        # Si se encontró el usuario.
            print(f"🔍 DEBUG: Usuario ID: {usuario.id}, Nombre: {usuario.nombre}, Rol: {usuario.rol}")
            # Mensaje de depuración con detalles del usuario.
            print(f"🔍 DEBUG: Verificando contraseña...")
            # Mensaje de depuración.
            
            password_valida = check_password_hash(usuario.password, data['password'])
            # Verifica si la contraseña proporcionada coincide con la contraseña hasheada del usuario.
            print(f"🔍 DEBUG: Contraseña válida: {password_valida}")
            # Mensaje de depuración.
        else:
            print("🔍 DEBUG: Usuario no encontrado en la base de datos")
            # Mensaje de depuración si el usuario no se encuentra.

        if not usuario or not check_password_hash(usuario.password, data['password']):
        # Si el usuario no se encontró o la contraseña es inválida.
            print("🔍 DEBUG: Credenciales incorrectas")
            # Mensaje de depuración.
            return jsonify({'error': 'Credenciales incorrectas'}), 401
            # Devuelve un error 401 (No autorizado).

        print(f"🔍 DEBUG: Login exitoso para {usuario.email}")
        # Mensaje de depuración.

        try:
            registrar_log(usuario.id, 'login', 'usuario', usuario.id)
            # Intenta registrar el evento de login.
        except Exception as log_error:
            current_app.logger.error(f"Error al registrar log de login: {log_error}")
            # Si falla el registro del log, lo registra como error.

        token=generar_token(usuario.id)
        # Genera un token JWT para el usuario.
        return jsonify({
            'id': usuario.id,
            'nombre': usuario.nombre,
            'email': usuario.email,
            'rol': usuario.rol,
            'token': token
        })
        # Devuelve los datos del usuario y el token en formato JSON.

    except Exception as e:
    # Captura cualquier excepción general.
        print(f"🔍 DEBUG: Error general: {str(e)}")
        # Mensaje de depuración.
        current_app.logger.error(f"Error en login: {str(e)}")
        # Registra el error.
        return jsonify({'error': 'Error al procesar la solicitud'}), 500
        # Devuelve un error 500.



@app.route('/api/recomendaciones/cultivo', methods=['POST', 'OPTIONS'])
# Define una ruta para '/api/recomendaciones/cultivo' que acepta métodos POST y OPTIONS.
def generar_recomendaciones_cultivo():
    # Manejo de CORS para solicitudes OPTIONS
    if request.method == 'OPTIONS':
    # Si la solicitud es de tipo OPTIONS.
        response = app.make_default_options_response()
        # Crea una respuesta OPTIONS por defecto.
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        # Añade los encabezados permitidos.
        return response
        # Devuelve la respuesta de pre-vuelo.
    
    # Procesar la solicitud POST
    try:
        if not request.is_json:
        # Si el tipo de contenido de la solicitud no es JSON.
            return jsonify({"error": "El formato debe ser JSON"}), 400
            # Devuelve un error 400.
            
        data = request.json
        # Obtiene los datos JSON del cuerpo de la solicitud.
        cultivo = data.get('cultivo', 'No especificado')
        # Obtiene el tipo de cultivo, por defecto 'No especificado'.
        estado = data.get('estado', 'saludable')
        # Obtiene el estado del cultivo, por defecto 'saludable'.
        detalles = data.get('detalles', {})
        # Obtiene detalles adicionales, por defecto un diccionario vacío.
        
        # Obtener datos de sensores si hay una parcela especificada
        datos_sensores = {}
        # Inicializa un diccionario para los datos de los sensores.
        if 'parcela_id' in detalles:
        # Si se especifica un 'parcela_id' en los detalles.
            parcela_id = detalles['parcela_id']
            # Obtiene el ID de la parcela.
            parcela = Parcela.query.get(parcela_id)
            # Busca la parcela por su ID.
            if parcela:
            # Si la parcela existe.
                datos_sensores = obtener_datos_sensores_recientes(parcela_id)
                # Obtiene los datos recientes de los sensores para esa parcela.
        
        # Construir prompt para la IA
   

        # Construir prompt para la IA
        prompt = f"""Como experto agrónomo, genera exactamente 3 recomendaciones BREVES y ESPECÍFICAS para un cultivo de {cultivo} 
        que se encuentra en estado, {estado}.
        
        Datos del cultivo:
        - Tipo: {cultivo}
        - Estado actual: {estado}
        """
        # Construye la parte inicial del prompt para la IA.
        
        # Añadir datos de sensores si están disponibles
        if datos_sensores:
        # Si hay datos de sensores.
            prompt += "\nDatos de sensores recientes:\n"
            # Añade un encabezado al prompt.
            if 'temperatura' in datos_sensores:
                prompt += f"- Temperatura: {datos_sensores['temperatura']['valor']}{datos_sensores['temperatura']['unidad']}\n"
                # Añade la temperatura al prompt.
            if 'humedad' in datos_sensores:
                prompt += f"- Humedad del suelo: {datos_sensores['humedad']['valor']}{datos_sensores['humedad']['unidad']}\n"
                # Añade la humedad del suelo al prompt.
            if 'ph' in datos_sensores:
                prompt += f"- pH del suelo: {datos_sensores['ph']['valor']}\n"
                # Añade el pH del suelo al prompt.
            
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
        # Añade las instrucciones de formato y un ejemplo al prompt.
        

        # Enviar a la IA
        messages = [
            {"role": "system", "content": "Eres un experto agrónomo especializado en cultivos y agricultura de precisión,solo responde preguntas del ambito agricola."},
            {"role": "user", "content": prompt}
        ]
        # Prepara los mensajes para enviar a la IA.
        
        # Usar la función de envío a IA existente
        recomendaciones_text = send_to_deepseek(messages)
        # Envía los mensajes a la IA y obtiene la respuesta.
        
        # Procesar la respuesta para extraer recomendaciones
        # (La IA puede devolver texto con formato, así que lo convertimos a una lista)
        recomendaciones_lines = recomendaciones_text.strip().split('\n')
        # Divide la respuesta de la IA en líneas.
        recomendaciones = []
        # Inicializa una lista para las recomendaciones limpias.
        for line in recomendaciones_lines:
        # Itera sobre cada línea.
            # Eliminar marcadores de lista como "1.", "-", "*" al principio de la línea
            clean_line = re.sub(r'^[\d\-\*\.]+\s*', '', line.strip())
            # Limpia la línea de marcadores de lista y espacios.
            if clean_line and len(clean_line) > 10:  # Líneas con contenido sustancial
            # Si la línea limpia tiene contenido sustancial.
                recomendaciones.append(clean_line)
                # Añade la línea limpia a la lista de recomendaciones.
        
        # Si no se obtuvieron recomendaciones válidas, usar las predefinidas como respaldo
        if not recomendaciones:
        # Si no se generaron recomendaciones.
            if estado == 'saludable':
            # Si el estado es 'saludable'.
                recomendaciones = [
                    f"Mantener régimen de riego para {cultivo}: 4-5L/m² cada 2-3 días según condiciones",
                    # ... más recomendaciones de respaldo
                ]
                # Asigna recomendaciones de respaldo para estado saludable.
            else:
                recomendaciones = [
                    f"Aumentar frecuencia de monitoreo para {cultivo}: inspección diaria",
                    # ... más recomendaciones de respaldo
                ]
                # Asigna recomendaciones de respaldo para otros estados.
        
        # Registrar la acción
        user_id = request.headers.get('X-User-Id')
        # Obtiene el ID de usuario del encabezado.
        if user_id and 'parcela_id' in detalles:
        # Si hay un ID de usuario y un ID de parcela en los detalles.
            try:
                registrar_log(user_id, 'generar_recomendaciones', 'parcela', detalles['parcela_id'])
                # Intenta registrar la acción de generar recomendaciones.
            except Exception as log_error:
                current_app.logger.error(f"Error al registrar log: {log_error}")
                # Si falla el registro del log, lo registra como error.
        
        # Devolver recomendaciones
        return jsonify({
            "recomendaciones": recomendaciones,
            "cultivo": cultivo,
            "estado": estado,
            "generado_por_ia": True
        })
        # Devuelve las recomendaciones, el cultivo, el estado y un indicador de si fue generado por IA.
        
    except Exception as e:
    # Captura cualquier excepción.
        current_app.logger.error(f"Error generando recomendaciones: {str(e)}")
        # Registra el error.
        return jsonify({
            "error": "Error al generar recomendaciones",
            "recomendaciones": [
                f"Para {data.get('cultivo', 'el cultivo')}: Revisar régimen de riego y drenaje",
                # ... recomendaciones de respaldo
            ],
            "generado_por_ia": False
        })
        # Devuelve un mensaje de error y recomendaciones de respaldo.


# Crear la red de sensores
red_sensores = RedSensores()
# Crea una instancia de la clase RedSensores.

# Inicializar los sensores con parámetros de la estación
parametros = obtener_parametros_estacion()
# Obtiene los parámetros de la estación de sensores.
sensores_iniciales = [
    Sensor("Temperatura", "°C", 1, parametros["temperatura"][0], parametros["temperatura"][1], 5),
    Sensor("Humedad", "%", 2, parametros["humedad"][0], parametros["humedad"][1], 5),
    Sensor("pH del suelo", "", 3, parametros["ph"][0], parametros["ph"][1], 5),
    SensorNutrientes("Nutrientes", "mg/L", 4, 0, 0, 5)
]
# Crea una lista de objetos Sensor y SensorNutrientes con sus respectivos parámetros.

# Parámetros configurables (inicialmente con valores predeterminados)
parametros_configurables = {
    "temperatura": {
        "min": parametros["temperatura"][0],
        "max": parametros["temperatura"][1],
        "alerta_baja": 5,    # Alerta si < 5°C
        "alerta_alta": 38,   # Alerta si > 38°C
        "critico_bajo": 0,   # Crítico si < 0°C
        "critico_alto": 42,  # Crítico si > 42°C
        "variacion": 1.0
    },
    "humedadSuelo": {
        "min": parametros["humedad"][0],
        "max": parametros["humedad"][1],
        "alerta_baja": 25,
        "alerta_alta": 75,
        "critico_bajo": 15,
        "critico_alto": 90,
        "variacion": 2.0
    },
    "phSuelo": {
        "min": parametros["ph"][0],
        "max": parametros["ph"][1],
        "alerta_baja": 5.0,   # Alerta si < 5.0
        "alerta_alta": 8.0,   # Alerta si > 8.0
        "critico_bajo": 4.5,  # Crítico si < 4.5
        "critico_alto": 8.5,  # Crítico si > 8.5
        "variacion": 0.1
    },
    "nutrientes": {
        "nitrogeno": {"min": 100, 
                      "max": 300,
                    "alerta_baja": 130,
                    "alerta_alta": 270,   
                    "critico_bajo": 110,   
                    "critico_alto": 290  }, 
        "fosforo": {"min": 20, "max": 80,
                    "alerta_baja": 25,    
                    "alerta_alta": 70,    
                    "critico_bajo": 22,   
                    "critico_alto": 78   },
        "potasio": {"min": 100, 
                    "max": 250,
                    "alerta_baja": 120,    
                    "alerta_alta": 230,    
                    "critico_bajo": 110,   
                    "critico_alto": 240    
                    }
    },
    "simulacion": {
        "intervalo": 5,
        "duracion": 60
    }
}
# Define un diccionario con parámetros configurables para los sensores y la simulación, incluyendo umbrales de alerta y críticos.

# Crear la red de sensores
red_sensores = RedSensores()
# Re-crea la instancia de RedSensores (redundante si ya se hizo arriba, pero asegura que esté vacía).
for sensor in sensores_iniciales:
# Itera sobre la lista de sensores iniciales.
    red_sensores.agregar_sensor(sensor)
    # Añade cada sensor a la red de sensores.

# Genera los datos iniciales
ultimos_datos = red_sensores.generar_todos_datos(parametros_configurables)
# Genera un conjunto inicial de datos para todos los sensores usando los parámetros configurables.

# Variable para controlar la simulación en segundo plano
simulacion_activa = False
# Bandera booleana para controlar si la simulación está activa.
hilo_simulacion = None
# Variable para almacenar la instancia del hilo de simulación.

# Modifica la función simulacion_continua para asignar parcelas
def simulacion_continua():
    global ultimos_datos, simulacion_activa
    # Declara que se usarán las variables globales ultimos_datos y simulacion_activa.

    # Abre el contexto de aplicación para este hilo
    with app.app_context():
    # Entra en el contexto de la aplicación Flask, necesario para interactuar con la base de datos.
        # Obtener parcelas disponibles al inicio de la simulación
        parcelas_disponibles = Parcela.query.all()
        # Consulta todas las parcelas disponibles en la base de datos.
        if not parcelas_disponibles:
        # Si no hay parcelas disponibles.
            print("⚠️ No hay parcelas disponibles. Los datos se generarán sin asignar a parcelas.")
            # Imprime una advertencia.
            parcela_id = None
            # Establece parcela_id a None.
        else:
            # Usar la primera parcela por defecto (puedes modificar esto para elegir otra)
            parcela_id = parcelas_disponibles[0].id
            # Asigna el ID de la primera parcela disponible.
            print(f"✅ Los datos se asignarán a la parcela: {parcelas_disponibles[0].nombre} (ID: {parcela_id})")
            # Imprime un mensaje de confirmación.
        
        # Calcular tiempo de finalización
        duracion_segundos = parametros_configurables["simulacion"]["duracion"] * 60
        # Calcula la duración total de la simulación en segundos.
        intervalo = parametros_configurables["simulacion"]["intervalo"]
        # Obtiene el intervalo de generación de datos.
        tiempo_inicio = time.time()
        # Registra el tiempo de inicio de la simulación.
        tiempo_fin = tiempo_inicio + duracion_segundos
        # Calcula el tiempo de finalización.

        print(f"Simulación iniciada por {duracion_segundos} segundos")
        # Imprime un mensaje de inicio de simulación.
        
        while simulacion_activa and time.time() < tiempo_fin:
        # Bucle principal de la simulación: mientras esté activa y no haya terminado el tiempo.
            ultimos_datos = red_sensores.generar_todos_datos(parametros_configurables)
            # Genera nuevos datos para todos los sensores.
            print(f"Datos generados en {time.strftime('%Y-%m-%d %H:%M:%S')}")
            # Imprime la hora de generación de datos.
            
            # Guardar en la base de datos CON la asignación de parcela
            for id_sensor, dato in ultimos_datos.items():
            # Itera sobre los últimos datos generados.
                sensor = red_sensores.sensores[id_sensor]
                # Obtiene el objeto sensor correspondiente.
                lectura = LecturaSensor(
                    timestamp=dato["timestamp"],
                    parcela=parcela_id,  # CAMBIO CLAVE: Asignar la parcela
                    sensor_id=id_sensor,
                    tipo=sensor.tipo,
                    valor=json.dumps(dato["valor"]) if isinstance(dato["valor"], dict) else str(dato["valor"]),
                    unidad=sensor.unidad
                )
                # Crea una nueva instancia de LecturaSensor con los datos generados y el ID de la parcela.
                db.session.add(lectura)
                # Añade la lectura a la sesión de la base de datos.
            
            db.session.commit()
            # Confirma los cambios en la base de datos.
            
            # Calcular tiempo restante
            tiempo_restante = tiempo_fin - time.time()
            # Calcula el tiempo restante de la simulación.
            if tiempo_restante <= 0:
            # Si no queda tiempo.
                break
                # Sale del bucle.

            # Dormir hasta la próxima iteración
            tiempo_espera = min(intervalo, tiempo_restante)
            # Calcula el tiempo de espera, tomando el mínimo entre el intervalo y el tiempo restante.
            time.sleep(tiempo_espera)
            # Pausa la ejecución por el tiempo calculado.

        if time.time() >= tiempo_fin and simulacion_activa:
        # Si la simulación terminó por tiempo y aún estaba activa.
            print("Simulación completada: se alcanzó la duración configurada")
            # Imprime un mensaje de finalización.
            simulacion_activa = False
            # Desactiva la bandera de simulación.
            # Guardar alertas al finalizar
            parcela_id = None
            # Reinicia parcela_id a None.
            parcelas_disponibles = Parcela.query.all()
            # Consulta todas las parcelas disponibles.
            if parcelas_disponibles:
            # Si hay parcelas.
                parcela_id = parcelas_disponibles[0].id
                # Asigna el ID de la primera parcela.
            guardar_alertas_finales(parcela_id, ultimos_datos, parametros_configurables)
            # Guarda las alertas finales.

# Fin de la simulación e exportación de datos
@app.route('/api/exportar_csv', methods=['GET'])
# Define una ruta GET para '/api/exportar_csv'.
def exportar_csv():
    # Crear un DataFrame con todas las lecturas
    registros = []
    # Inicializa una lista vacía para los registros.
    
    # Agrupar los datos por timestamp para tener lecturas completas en cada fila
    datos_por_timestamp = {}
    # Inicializa un diccionario para agrupar datos por timestamp.
    
    for sensor in red_sensores.sensores.values():
    # Itera sobre los sensores en la red de sensores.
        for lectura in sensor.historial:
        # Itera sobre el historial de lecturas de cada sensor.
            timestamp = lectura["timestamp"]
            # Obtiene el timestamp de la lectura.
            
            if timestamp not in datos_por_timestamp:
            # Si el timestamp no está en el diccionario.
                datos_por_timestamp[timestamp] = {
                    "timestamp": timestamp,
                    "temperatura": None,
                    "humedad": None,
                    "ph": None,
                    "nitrogeno": None,
                    "fosforo": None,
                    "potasio": None
                }
                # Inicializa una entrada para ese timestamp.
            
            if sensor.id_sensor == 1:  # Temperatura
                datos_por_timestamp[timestamp]["temperatura"] = lectura["valor"]
                # Asigna el valor de temperatura.
            elif sensor.id_sensor == 2:  # Humedad
                datos_por_timestamp[timestamp]["humedad"] = lectura["valor"]
                # Asigna el valor de humedad.
            elif sensor.id_sensor == 3:  # pH
                datos_por_timestamp[timestamp]["ph"] = lectura["valor"]
                # Asigna el valor de pH.
            elif sensor.id_sensor == 4:  # Nutrientes
                datos_por_timestamp[timestamp]["nitrogeno"] = lectura["valor"]["nitrogeno"]
                # Asigna el valor de nitrógeno.
                datos_por_timestamp[timestamp]["fosforo"] = lectura["valor"]["fosforo"]
                # Asigna el valor de fósforo.
                datos_por_timestamp[timestamp]["potasio"] = lectura["valor"]["potasio"]
                # Asigna el valor de potasio.
    
    # Convertir el diccionario a una lista para el DataFrame
    registros = list(datos_por_timestamp.values())
    # Convierte el diccionario de datos agrupados en una lista de valores.
    
    if not registros:
    # Si no hay registros.
        return jsonify({"error": "No hay datos para exportar"}), 400
        # Devuelve un error 400.
    
    # Crear DataFrame y exportar
    df = pd.DataFrame(registros)
    # Crea un DataFrame de pandas a partir de los registros.
    
    # Reordenar columnas para mejor legibilidad
    columnas = ["timestamp", "temperatura", "humedad", "ph", "nitrogeno", "fosforo", "potasio"]
    # Define el orden de las columnas.
    df = df[columnas]
    # Reordena las columnas del DataFrame.
    
    # Guardar el archivo
    ruta_csv = os.path.join(os.path.dirname(__file__), "datos_sensores_completo.csv")
    # Define la ruta para el archivo CSV.
    df.to_csv(ruta_csv, index=False)
    # Guarda el DataFrame en un archivo CSV.
    
    # También generar formato JSON como alternativa
    ruta_json = os.path.join(os.path.dirname(__file__), "datos_sensores.json")
    # Define la ruta para el archivo JSON.
    df.to_json(ruta_json, orient="records", date_format="iso")
    # Guarda el DataFrame en un archivo JSON.
    
    return send_file(ruta_csv, as_attachment=True)
    # Envía el archivo CSV como adjunto.

# ...existing code...

@app.route('/api/parcelas', methods=['GET'])
# Define una ruta GET para '/api/parcelas'.
def listar_parcelas():
    user_id = request.headers.get('X-User-Id')
    # Obtiene el ID de usuario del encabezado.
    user = Usuario.query.get(user_id)
    # Busca el usuario por su ID.
    if user and user.rol == 'agronomo':
    # Si el usuario existe y su rol es 'agronomo'.
        parcelas = Parcela.query.all()
        # Consulta todas las parcelas.
    else:
        parcelas = Parcela.query.filter_by(usuario_id=user_id).all()
        # Consulta las parcelas asociadas al ID de usuario.
    parcelas_data = []
    # Inicializa una lista para los datos de las parcelas.
    
    for parcela in parcelas:
    # Itera sobre cada parcela.
        # Obtener el cultivo único de la parcela
        cultivo = DetalleCultivo.query.filter_by(parcela_id=parcela.id, activo=True).first()
        # Busca el cultivo activo asociado a la parcela.
        usuario_dueno = Usuario.query.get(parcela.usuario_id) if parcela.usuario_id else None
        # Busca el usuario propietario de la parcela.
        
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
            'usuario_id': parcela.usuario_id,
            # NUEVO:
            'usuario_nombre': usuario_dueno.nombre if usuario_dueno else None,
            'usuario_email': usuario_dueno.email if usuario_dueno else None,
            # NUEVO: Información detallada del cultivo único
            'cultivo': None
        }
        # Crea un diccionario con la información de la parcela.
        
        # Agregar detalles del cultivo si existe
        if cultivo:
        # Si existe un cultivo.
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
            # Añade los detalles del cultivo a la información de la parcela.
            
            # Actualizar datos de la parcela con info del cultivo
            if not parcela.cultivo_actual and cultivo.nombre:
            # Si la parcela no tiene cultivo actual y el cultivo tiene nombre.
                parcela_info['cultivo_actual'] = cultivo.nombre
                # Actualiza el cultivo actual de la parcela.
            if not parcela.fecha_siembra and cultivo.fecha_siembra:
            # Si la parcela no tiene fecha de siembra y el cultivo sí.
                parcela_info['fecha_siembra'] = cultivo.fecha_siembra.date()
                # Actualiza la fecha de siembra de la parcela.
        
        parcelas_data.append(parcela_info)
        # Añade la información de la parcela a la lista.
    
    # Registrar log
    user_id = request.headers.get('X-User-Id')
    # Obtiene el ID de usuario del encabezado.
    if user_id:
    # Si hay un ID de usuario.
        try:
            registrar_log(user_id, 'listar_parcelas', 'parcela', None)
            # Intenta registrar la acción de listar parcelas.
        except Exception as e:
            current_app.logger.error(f"Error al registrar log: {e}")
            # Si falla el registro del log, lo registra como error.
    
    return jsonify(parcelas_data)
    # Devuelve la lista de datos de parcelas en formato JSON.
    
@app.route('/api/sensores', methods=['GET'])
# Define una ruta GET para '/api/sensores'.
def obtener_sensores():
    """Devuelve la lista de todos los sensores"""
    # Docstring que describe la función.
    return jsonify(red_sensores.listar_sensores())
    # Devuelve la lista de sensores de la red de sensores en formato JSON.

@app.route('/api/datos', methods=['GET'])
# Define una ruta GET para '/api/datos'.
def obtener_datos():
    global ultimos_datos
    # Declara que se usará la variable global ultimos_datos.
    # Solo devuelve el último dato, nunca genera uno nuevo aquí
    if ultimos_datos:
    # Si hay últimos datos disponibles.
        return jsonify(ultimos_datos)
        # Devuelve los últimos datos en formato JSON.
    else:
        return jsonify({"error": "No hay datos disponibles"}), 404
        # Si no hay datos, devuelve un error 404.

@app.route('/api/parametros', methods=['GET'])
# Define una ruta GET para '/api/parametros'.
def obtener_parametros_config():
    """Devuelve los parámetros configurables actuales"""
    # Docstring que describe la función.
    return jsonify(parametros_configurables)
    # Devuelve los parámetros configurables actuales en formato JSON.

# Reemplaza la función para actualizar parámetros con esta versión centralizada
@app.route('/api/parametros', methods=['POST'])
# Define una ruta POST para '/api/parametros'.
@registrar_accion('actualizar_parametros', 'parametros')
# Aplica el decorador para registrar la acción de actualizar parámetros.
def actualizar_parametros():
    """Actualiza todos los parámetros configurables de forma centralizada"""
    # Docstring que describe la función.
    global parametros_configurables
    # Declara que se usará la variable global parametros_configurables.
    try:
        nuevos_parametros = request.json
        # Obtiene los nuevos parámetros JSON del cuerpo de la solicitud.
        
        if not nuevos_parametros:
        # Si no se recibieron nuevos parámetros.
            return jsonify({"error": "No se recibieron parámetros"}), 400
            # Devuelve un error 400.
        
        # Actualizar parámetros
        parametros_configurables = nuevos_parametros
        # Actualiza los parámetros configurables globales con los nuevos valores.
        
        # Aplicar los parámetros a todos los sensores
        try:
            # Temperatura (ID 1)
            if 1 in red_sensores.sensores:
            # Si el sensor de temperatura (ID 1) existe en la red.
                red_sensores.sensores[1].valor_minimo = parametros_configurables["temperatura"]["min"]
                # Actualiza el valor mínimo del sensor de temperatura.
                red_sensores.sensores[1].valor_maximo = parametros_configurables["temperatura"]["max"]
                # Actualiza el valor máximo del sensor de temperatura.
                # Actualizar frecuencia
                red_sensores.sensores[1].frecuencia = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
                # Actualiza la frecuencia del sensor de temperatura.
            
            # Humedad (ID 2)
            if 2 in red_sensores.sensores:
            # Si el sensor de humedad (ID 2) existe en la red.
                red_sensores.sensores[2].valor_minimo = parametros_configurables["humedadSuelo"]["min"]
                # Actualiza el valor mínimo del sensor de humedad.
                red_sensores.sensores[2].valor_maximo = parametros_configurables["humedadSuelo"]["max"]
                # Actualiza el valor máximo del sensor de humedad.
                # Actualizar frecuencia
                red_sensores.sensores[2].frecuencia = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
                # Actualiza la frecuencia del sensor de humedad.
            
            # pH (ID 3)
            if 3 in red_sensores.sensores:
            # Si el sensor de pH (ID 3) existe en la red.
                red_sensores.sensores[3].valor_minimo = parametros_configurables["phSuelo"]["min"]
                # Actualiza el valor mínimo del sensor de pH.
                red_sensores.sensores[3].valor_maximo = parametros_configurables["phSuelo"]["max"]
                # Actualiza el valor máximo del sensor de pH.
                # Actualizar frecuencia
                red_sensores.sensores[3].frecuencia = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
                # Actualiza la frecuencia del sensor de pH.
                
            # Nutrientes (ID 4)
            if 4 in red_sensores.sensores:
            # Si el sensor de nutrientes (ID 4) existe en la red.
                # Solo actualizar frecuencia, ya que los rangos están en el objeto parametros_configurables
                red_sensores.sensores[4].frecuencia = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
                # Actualiza la frecuencia del sensor de nutrientes.
                
        except Exception as e:
        # Captura cualquier excepción al actualizar los sensores.
            current_app.logger.error(f"Error al actualizar sensores: {e}")
            # Registra el error.
            return jsonify({"error": f"Error al actualizar sensores: {str(e)}"}), 500
            # Devuelve un error 500.
            
        # Registrar log solo si existe el ID de usuario
        user_id = request.headers.get('X-User-Id')
        # Obtiene el ID de usuario del encabezado.
        if user_id:
        # Si hay un ID de usuario.
            try:
                registrar_log(user_id, 'actualizar_parametros', 'parametros', None,
                            detalles=str(nuevos_parametros))
                # Intenta registrar la acción de actualizar parámetros.
            except Exception as e:
                current_app.logger.error(f"Error al registrar log: {e}")
                # No detener la ejecución por errores de log
                # Si falla el registro del log, lo registra como error.
                
        return jsonify({
            "mensaje": "Parámetros actualizados correctamente", 
            "parametros": parametros_configurables
        })
        # Devuelve un mensaje de éxito y los parámetros actualizados.
    except Exception as e:
    # Captura cualquier excepción general.
        current_app.logger.error(f"Error general en actualizar_parametros: {str(e)}")
        # Registra el error.
        return jsonify({"error": f"Error al actualizar parámetros: {str(e)}"}), 500
        # Devuelve un error 500.

# endpoint para seleccionar parcela específica
@app.route('/api/simulacion/iniciar/<int:parcela_id>', methods=['POST'])
# Define una ruta POST para '/api/simulacion/iniciar/<parcela_id>'.
@registrar_accion('iniciar_simulacion', 'parcela')  # Detecta 'parcela_id' automáticamente
# Aplica el decorador para registrar la acción de iniciar simulación.
def iniciar_simulacion_parcela(parcela_id):
    """Inicia la simulación continua asignando datos a una parcela específica"""
    # Docstring que describe la función.
    global simulacion_activa, hilo_simulacion, parametros_configurables
    # Declara que se usarán las variables globales.
    
    try:
        # Verificar si ya hay una simulación activa
        if simulacion_activa:
        # Si la simulación ya está activa.
            return jsonify({"mensaje": "La simulación ya está en ejecución"})
            # Devuelve un mensaje indicando que ya está en ejecución.
        
        # Verificar que la parcela exista
        parcela = Parcela.query.get(parcela_id)
        # Busca la parcela por su ID.
        if not parcela:
        # Si la parcela no existe.
            return jsonify({"error": f"No existe parcela con ID {parcela_id}"}), 404
            # Devuelve un error 404.
        
        # Recibir parámetros personalizados si existen
        if request.json:
        # Si la solicitud contiene datos JSON.
            try:
                parametros_configurables = request.json
                # Actualiza los parámetros configurables globales.
                # Actualizar sensores con los nuevos parámetros
                if 1 in red_sensores.sensores:
                # Si el sensor de temperatura (ID 1) existe.
                    red_sensores.sensores[1].valor_minimo = parametros_configurables.get("temperatura", {}).get("min", 10)
                    # Actualiza el valor mínimo de temperatura.
                    red_sensores.sensores[1].valor_maximo = parametros_configurables.get("temperatura", {}).get("max", 30)
                    # Actualiza el valor máximo de temperatura.
                    red_sensores.sensores[1].frecuencia = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
                    # Actualiza la frecuencia de temperatura.
                
                if 2 in red_sensores.sensores:
                # Si el sensor de humedad (ID 2) existe.
                    red_sensores.sensores[2].valor_minimo = parametros_configurables.get("humedadSuelo", {}).get("min", 30)
                    # Actualiza el valor mínimo de humedad.
                    red_sensores.sensores[2].valor_maximo = parametros_configurables.get("humedadSuelo", {}).get("max", 70)
                    # Actualiza el valor máximo de humedad.
                    red_sensores.sensores[2].frecuencia = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
                    # Actualiza la frecuencia de humedad.
                
                if 3 in red_sensores.sensores:
                # Si el sensor de pH (ID 3) existe.
                    red_sensores.sensores[3].valor_minimo = parametros_configurables.get("phSuelo", {}).get("min", 5.5)
                    # Actualiza el valor mínimo de pH.
                    red_sensores.sensores[3].valor_maximo = parametros_configurables.get("phSuelo", {}).get("max", 7.5)
                    # Actualiza el valor máximo de pH.
                    red_sensores.sensores[3].frecuencia = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
                    # Actualiza la frecuencia de pH.
                    
                if 4 in red_sensores.sensores:
                # Si el sensor de nutrientes (ID 4) existe.
                    red_sensores.sensores[4].frecuencia = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
                    # Actualiza la frecuencia de nutrientes.
            except Exception as e:
                current_app.logger.error(f"Error al actualizar parámetros: {e}")
                # Continuar con los parámetros por defecto
                # Registra el error.
        
        # Guardar el ID de parcela para que la simulación lo use
        app.config['PARCELA_SIMULACION'] = parcela_id
        # Almacena el ID de la parcela en la configuración de la aplicación.
        
        # Iniciar la simulación
        simulacion_activa = True
        # Activa la bandera de simulación.
        hilo_simulacion = threading.Thread(target=simulacion_continua_parcela)
        # Crea un nuevo hilo para ejecutar la función simulacion_continua_parcela.
        hilo_simulacion.daemon = True
        # Establece el hilo como un demonio (se cerrará cuando el programa principal termine).
        hilo_simulacion.start()
        # Inicia la ejecución del hilo.
        
        # Registrar log solo si hay usuario identificado
        user_id = request.headers.get('X-User-Id')
        # Obtiene el ID de usuario del encabezado.
        if user_id:
        # Si hay un ID de usuario.
            try:
                registrar_log(user_id, 'iniciar_simulacion', 'parcela', parcela_id)
                # Intenta registrar la acción de iniciar simulación.
            except Exception as e:
                current_app.logger.error(f"Error al registrar log: {e}")
                # Registra el error.
        
        # Retornar información sobre la simulación iniciada
        duracion_minutos = parametros_configurables.get("simulacion", {}).get("duracion", 60)
        # Obtiene la duración de la simulación en minutos.
        return jsonify({
            "mensaje": f"Simulación iniciada para parcela '{parcela.nombre}'. Duración: {duracion_minutos} minutos",
            "duracion_minutos": duracion_minutos,
            "parcela": {
                "id": parcela.id,
                "nombre": parcela.nombre
            }
        })
        # Devuelve un mensaje de éxito y detalles de la simulación.
        
    except Exception as e:
    # Captura cualquier excepción.
        # Si hay cualquier error, asegurarse de que no quede una simulación activa
        simulacion_activa = False
        # Desactiva la bandera de simulación.
        current_app.logger.error(f"Error al iniciar simulación: {str(e)}")
        # Registra el error.
        return jsonify({"error": f"Error al iniciar simulación: {str(e)}"}), 500
        # Devuelve un error 500.

# Función de simulación específica para parcela seleccionada
def simulacion_continua_parcela():
    global ultimos_datos, simulacion_activa
    # Declara que se usarán las variables globales.

    try:
        # Abre el contexto de aplicación para este hilo
        with app.app_context():
        # Entra en el contexto de la aplicación Flask.
            parcela_id = app.config.get('PARCELA_SIMULACION')
            # Obtiene el ID de la parcela de la configuración de la aplicación.
            if not parcela_id:
            # Si no se especificó un ID de parcela.
                print("❌ Error: No se especificó parcela para la simulación")
                # Imprime un mensaje de error.
                simulacion_activa = False
                # Desactiva la simulación.
                return
                # Sale de la función.
                
            parcela = Parcela.query.get(parcela_id)
            # Busca la parcela por su ID.
            if not parcela:
            # Si la parcela no se encuentra.
                print(f"❌ Error: No se encontró parcela con ID {parcela_id}")
                # Imprime un mensaje de error.
                simulacion_activa = False
                # Desactiva la simulación.
                return
                # Sale de la función.
                
            print(f"✅ Simulando datos para la parcela: {parcela.nombre} (ID: {parcela_id})")
            # Imprime un mensaje de confirmación.
            
            # Calcular tiempo de finalización
            duracion_segundos = parametros_configurables.get("simulacion", {}).get("duracion", 60) * 60
            # Calcula la duración total de la simulación en segundos.
            intervalo = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
            # Obtiene el intervalo de generación de datos.
            tiempo_inicio = time.time()
            # Registra el tiempo de inicio.
            tiempo_fin = tiempo_inicio + duracion_segundos
            # Calcula el tiempo de finalización.

            print(f"Simulación iniciada por {duracion_segundos} segundos para parcela {parcela.nombre}")
            # Imprime un mensaje de inicio de simulación.
            
            while simulacion_activa and time.time() < tiempo_fin:
            # Bucle principal de la simulación.
                try:
                    # Imprimir valores antes de generar
                    print(f"Sensores antes de generar datos:")
                    # Mensaje de depuración.
                    for id_sensor, sensor in red_sensores.sensores.items():
                    # Itera sobre los sensores en la red.
                        print(f"  Sensor {id_sensor} ({sensor.tipo}): min={sensor.valor_minimo}, max={sensor.valor_maximo}")
                        # Imprime los rangos de los sensores.
                    
                    # Generar datos
                    ultimos_datos = red_sensores.generar_todos_datos(parametros_configurables)
                    # Genera nuevos datos para todos los sensores.
                    
                    # Imprimir valores generados
                    print(f"Nuevos datos generados:")
                    # Mensaje de depuración.
                    for id_sensor, dato in ultimos_datos.items():
                    # Itera sobre los datos generados.
                        if isinstance(dato["valor"], dict):
                        # Si el valor es un diccionario (ej. nutrientes).
                            print(f"  Sensor {id_sensor}: valor={json.dumps(dato['valor'])}")
                            # Imprime el valor como JSON.
                        else:
                            print(f"  Sensor {id_sensor}: valor={dato['valor']}")
                            # Imprime el valor directamente.
                        if not sensor:
                            continue
                            # Si el sensor no existe, salta a la siguiente iteración.
                            
                        sensor_actual = red_sensores.sensores.get(id_sensor)
                        # Obtiene el objeto sensor actual.
                        if not sensor_actual:
                        # Si el sensor actual no se encuentra.
                            print(f"❌ Sensor {id_sensor} no encontrado en la red de sensores")
                            # Imprime un mensaje de error.
                            continue
                            # Salta a la siguiente iteración.
                        lectura = LecturaSensor(
                            timestamp=dato["timestamp"],
                            parcela=parcela_id,
                            sensor_id=id_sensor,
                            tipo=sensor_actual.tipo,
                            valor=json.dumps(dato["valor"]) if isinstance(dato["valor"], dict) else str(dato["valor"]),
                            unidad=sensor_actual.unidad
                        )
                        # Crea una nueva instancia de LecturaSensor.
                        db.session.add(lectura)
                        # Añade la lectura a la sesión de la base de datos.
                    
                    try:
                        db.session.commit()
                        # Confirma los cambios en la base de datos.
                        print(f"✅ Datos guardados para parcela {parcela.nombre}")
                        # Mensaje de éxito.
                    except Exception as e:
                        db.session.rollback()
                        # Si hay un error, revierte la transacción.
                        print(f"❌ Error al guardar datos: {e}")
                        # Imprime el error.
                    
                    # Calcular tiempo restante
                    tiempo_restante = tiempo_fin - time.time()
                    # Calcula el tiempo restante.
                    if tiempo_restante <= 0:
                    # Si no queda tiempo.
                        break
                        # Sale del bucle.

                    # Dormir hasta la próxima iteración
                    tiempo_espera = min(intervalo, tiempo_restante)
                    # Calcula el tiempo de espera.
                    time.sleep(tiempo_espera)
                    # Pausa la ejecución.
                    
                except Exception as ciclo_e:
                # Captura cualquier excepción dentro del ciclo de simulación.
                    print(f"Error en ciclo de simulación: {ciclo_e}")
                    # Imprime el error.
                    time.sleep(intervalo)  # Esperar antes de intentar de nuevo
                    # Espera antes de intentar de nuevo.

            if time.time() >= tiempo_fin and simulacion_activa:
            # Si la simulación terminó por tiempo y aún estaba activa.
                print(f"Simulación completada para parcela {parcela.nombre}: se alcanzó la duración configurada")
                # Imprime un mensaje de finalización.
                simulacion_activa = False
                # Desactiva la simulación.
                # Guardar alertas al finalizar
                guardar_alertas_finales(parcela_id, ultimos_datos, parametros_configurables)
                # Guarda las alertas finales.
                
    except Exception as e:
    # Captura cualquier excepción general en la función.
        print(f"❌ Error general en simulacion_continua_parcela: {e}")
        # Imprime el error.
        # Asegurar que se desactive la simulación en caso de error
        simulacion_activa = False
        # Desactiva la simulación.


#endpoint para asignar un usuario a todas las parcelas sin usuario asignado
@app.route('/api/debug/asignar_usuario_parcelas', methods=['GET'])
# Define una ruta GET para '/api/debug/asignar_usuario_parcelas'.
def asignar_usuario_parcelas():
    try:
        # Buscar un usuario activo (o usar ID específico)
        usuario = Usuario.query.first()
        # Busca el primer usuario en la base de datos.
        if not usuario:
        # Si no hay usuarios registrados.
            return jsonify({"error": "No hay usuarios registrados"}), 404
            # Devuelve un error 404.
            
        # Obtener parcelas sin usuario asignado
        parcelas_sin_usuario = Parcela.query.filter(
            (Parcela.usuario_id == None) | 
            (Parcela.usuario_id == 0)
        ).all()
        # Consulta las parcelas que no tienen un usuario asignado (usuario_id es None o 0).
        
        # Asignar el usuario a todas estas parcelas
        for parcela in parcelas_sin_usuario:
        # Itera sobre las parcelas sin usuario.
            parcela.usuario_id = usuario.id
            # Asigna el ID del usuario a la parcela.
            print(f"Asignando usuario {usuario.id} a parcela {parcela.id}")
            # Imprime un mensaje de depuración.
            
        db.session.commit()
        # Confirma los cambios en la base de datos.
        
        return jsonify({
            "mensaje": f"Se asignó el usuario {usuario.nombre} (ID: {usuario.id}) a {len(parcelas_sin_usuario)} parcelas",
            "parcelas_actualizadas": [p.id for p in parcelas_sin_usuario]
        })
        # Devuelve un mensaje de éxito y la lista de IDs de parcelas actualizadas.
    except Exception as e:
    # Captura cualquier excepción.
        db.session.rollback()
        # Revierte la transacción.
        return jsonify({"error": str(e)}), 500
        # Devuelve un error 500.

def guardar_alertas_finales(parcela_id, datos, parametros):
    """
    Guarda alertas críticas y moderadas en la base de datos al finalizar la simulación,
    según los valores críticos y de alerta definidos en los parámetros configurables.
    También envía notificaciones por correo para alertas críticas.
    """
    # Docstring que describe la función.
    try:
        if not parcela_id or not datos:
        # Si no hay ID de parcela o datos.
            return
            # Sale de la función.

        now = datetime.now(UTC)
        # Obtiene la hora actual en UTC.
        
        # Lista para almacenar las alertas creadas que deberán notificarse
        alertas_a_notificar = []
        # Inicializa una lista para las alertas que necesitan notificación.

        # Temperatura
        temp = datos.get(1, {}).get("valor")
        # Obtiene el valor de temperatura del sensor 1.
        if temp is not None:
        # Si el valor de temperatura no es nulo.
            if temp <= parametros["temperatura"]["critico_bajo"]:
            # Si la temperatura es críticamente baja.
                severidad = "critico"
                mensaje = f"Temperatura extremadamente baja: {temp}°C"
                # Define la severidad y el mensaje.
            elif temp < parametros["temperatura"]["alerta_baja"]:
            # Si la temperatura es baja (alerta).
                severidad = "moderado"
                mensaje = f"Temperatura baja: {temp}°C"
                # Define la severidad y el mensaje.
            elif temp > parametros["temperatura"]["critico_alto"]:
            # Si la temperatura es críticamente alta.
                severidad = "critico"
                mensaje = f"Temperatura extremadamente alta: {temp}°C"
                # Define la severidad y el mensaje.
            elif temp > parametros["temperatura"]["alerta_alta"]:
            # Si la temperatura es alta (alerta).
                severidad = "moderado"
                mensaje = f"Temperatura alta: {temp}°C"
                # Define la severidad y el mensaje.
            else:
                severidad = None
                # Si no hay alerta, la severidad es None.

            if severidad:
            # Si se determinó una severidad.
                alerta = AlertaSensor(
                    parcela=parcela_id,
                    sensor_id=1,
                    tipo="Temperatura",
                    valor=float(temp),
                    severidad=severidad,
                    mensaje=mensaje,
                    timestamp=now,
                    activa=True
                )
                # Crea una nueva instancia de AlertaSensor.
                db.session.add(alerta)
                # Añade la alerta a la sesión de la base de datos.
                db.session.flush()  # Para obtener el ID generado
                # Fuerza la escritura a la base de datos para obtener el ID de la alerta.
                
                # Si es crítica, añadir a la lista de alertas a notificar
                if severidad == "critico":
                # Si la severidad es crítica.
                    alertas_a_notificar.append({
                        'id': alerta.id,
                        'tipo': alerta.tipo,
                        'valor': alerta.valor,
                        'severidad': alerta.severidad,
                        'mensaje': alerta.mensaje,
                        'timestamp': alerta.timestamp.isoformat()
                    })
                    # Añade la alerta a la lista de notificación.

        # Humedad
        humedad = datos.get(2, {}).get("valor")
        # Obtiene el valor de humedad del sensor 2.
        if humedad is not None:
        # Si el valor de humedad no es nulo.
            if humedad < parametros["humedadSuelo"]["critico_bajo"]:
            # Si la humedad es críticamente baja.
                severidad = "critico"
                mensaje = f"Humedad del suelo extremadamente baja: {humedad}%"
                # Define la severidad y el mensaje.
            elif humedad < parametros["humedadSuelo"]["alerta_baja"]:
            # Si la humedad es baja (alerta).
                severidad = "moderado"
                mensaje = f"Humedad del suelo baja: {humedad}%"
                # Define la severidad y el mensaje.
            elif humedad > parametros["humedadSuelo"]["critico_alto"]:
            # Si la humedad es críticamente alta.
                severidad = "critico"
                mensaje = f"Humedad del suelo extremadamente alta: {humedad}%"
                # Define la severidad y el mensaje.
            elif humedad > parametros["humedadSuelo"]["alerta_alta"]:
            # Si la humedad es alta (alerta).
                severidad = "moderado"
                mensaje = f"Humedad del suelo alta: {humedad}%"
                # Define la severidad y el mensaje.
            else:
                severidad = None
                # Si no hay alerta, la severidad es None.

            if severidad:
            # Si se determinó una severidad.
                alerta = AlertaSensor(
                    parcela=parcela_id,
                    sensor_id=2,
                    tipo="Humedad",
                    valor=float(humedad),
                    severidad=severidad,
                    mensaje=mensaje,
                    timestamp=now,
                    activa=True
                )
                # Crea una nueva instancia de AlertaSensor.
                db.session.add(alerta)
                # Añade la alerta a la sesión de la base de datos.
                db.session.flush()  # Para obtener el ID generado
                # Fuerza la escritura a la base de datos para obtener el ID de la alerta.
                
                # Si es crítica, añadir a la lista de alertas a notificar
                if severidad == "critico":
                # Si la severidad es crítica.
                    alertas_a_notificar.append({
                        'id': alerta.id,
                        'tipo': alerta.tipo,
                        'valor': alerta.valor,
                        'severidad': alerta.severidad,
                        'mensaje': alerta.mensaje,
                        'timestamp': alerta.timestamp.isoformat()
                    })
                    # Añade la alerta a la lista de notificación.

        # pH
        ph = datos.get(3, {}).get("valor")
        # Obtiene el valor de pH del sensor 3.
        if ph is not None:
        # Si el valor de pH no es nulo.
            if ph < parametros["phSuelo"]["critico_bajo"]:
            # Si el pH es críticamente bajo.
                severidad = "critico"
                mensaje = f"pH del suelo demasiado bajo: {ph}"
                # Define la severidad y el mensaje.
            elif ph < parametros["phSuelo"]["alerta_baja"]:
            # Si el pH es bajo (alerta).
                severidad = "moderado"
                mensaje = f"pH del suelo bajo: {ph}"
                # Define la severidad y el mensaje.
            elif ph > parametros["phSuelo"]["critico_alto"]:
            # Si el pH es críticamente alto.
                severidad = "critico"
                mensaje = f"pH del suelo demasiado alto: {ph}"
                # Define la severidad y el mensaje.
            elif ph > parametros["phSuelo"]["alerta_alta"]:
            # Si el pH es alto (alerta).
                severidad = "moderado"
                mensaje = f"pH del suelo alto: {ph}"
                # Define la severidad y el mensaje.
            else:
                severidad = None
                # Si no hay alerta, la severidad es None.

            if severidad:
            # Si se determinó una severidad.
                alerta = AlertaSensor(
                    parcela=parcela_id,
                    sensor_id=3,
                    tipo="pH del suelo",
                    valor=float(ph),
                    severidad=severidad,
                    mensaje=mensaje,
                    timestamp=now,
                    activa=True
                )
                # Crea una nueva instancia de AlertaSensor.
                db.session.add(alerta)
                # Añade la alerta a la sesión de la base de datos.
                db.session.flush()  # Para obtener el ID generado
                # Fuerza la escritura a la base de datos para obtener el ID de la alerta.
                
                # Si es crítica, añadir a la lista de alertas a notificar
                if severidad == "critico":
                # Si la severidad es crítica.
                    alertas_a_notificar.append({
                        'id': alerta.id,
                        'tipo': alerta.tipo,
                        'valor': alerta.valor,
                        'severidad': alerta.severidad,
                        'mensaje': alerta.mensaje,
                        'timestamp': alerta.timestamp.isoformat()
                    })
                    # Añade la alerta a la lista de notificación.

        # Nutrientes (si existen)
        nutrientes = datos.get(4, {}).get("valor")
        # Obtiene el valor de nutrientes del sensor 4.
        if isinstance(nutrientes, dict):
        # Si el valor de nutrientes es un diccionario.
            for nutriente, valor in nutrientes.items():
            # Itera sobre cada nutriente y su valor.
                critico_bajo = parametros["nutrientes"].get(nutriente, {}).get("critico_bajo")
                # Obtiene el umbral crítico bajo para el nutriente.
                alerta_baja = parametros["nutrientes"].get(nutriente, {}).get("alerta_baja")
                # Obtiene el umbral de alerta baja para el nutriente.
                alerta_alta = parametros["nutrientes"].get(nutriente, {}).get("alerta_alta")
                # Obtiene el umbral de alerta alta para el nutriente.
                critico_alto = parametros["nutrientes"].get(nutriente, {}).get("critico_alto")
                # Obtiene el umbral crítico alto para el nutriente.
                sensor_id = 4
                # Define el ID del sensor.

                severidad = None
                mensaje = ""
                if critico_bajo is not None and valor < critico_bajo:
                # Si el nutriente es críticamente bajo.
                    severidad = "critico"
                    mensaje = f"{nutriente.capitalize()} muy bajo: {valor} mg/L"
                    # Define la severidad y el mensaje.
                elif alerta_baja is not None and valor < alerta_baja:
                # Si el nutriente es bajo (alerta).
                    severidad = "moderado"
                    mensaje = f"{nutriente.capitalize()} bajo: {valor} mg/L"
                    # Define la severidad y el mensaje.
                elif critico_alto is not None and valor > critico_alto:
                # Si el nutriente es críticamente alto.
                    severidad = "critico"
                    mensaje = f"{nutriente.capitalize()} muy alto: {valor} mg/L"
                    # Define la severidad y el mensaje.
                elif alerta_alta is not None and valor > alerta_alta:
                # Si el nutriente es alto (alerta).
                    severidad = "moderado"
                    mensaje = f"{nutriente.capitalize()} alto: {valor} mg/L"
                    # Define la severidad y el mensaje.

                if severidad:
                # Si se determinó una severidad.
                    alerta = AlertaSensor(
                        parcela=parcela_id,
                        sensor_id=sensor_id,
                        tipo=f"Nutriente {nutriente}",
                        valor=float(valor),
                        severidad=severidad,
                        mensaje=mensaje,
                        timestamp=now,
                        activa=True
                    )
                    # Crea una nueva instancia de AlertaSensor.
                    db.session.add(alerta)
                    # Añade la alerta a la sesión de la base de datos.
                    db.session.flush()  # Para obtener el ID generado
                    # Fuerza la escritura a la base de datos para obtener el ID de la alerta.
                    
                    # Si es crítica, añadir a la lista de alertas a notificar
                    if severidad == "critico":
                    # Si la severidad es crítica.
                        alertas_a_notificar.append({
                            'id': alerta.id,
                            'tipo': alerta.tipo,
                            'valor': alerta.valor,
                            'severidad': alerta.severidad,
                            'mensaje': alerta.mensaje,
                            'timestamp': alerta.timestamp.isoformat()
                        })
                        # Añade la alerta a la lista de notificación.

        # Guardar todos los cambios en la base de datos
        db.session.commit()
        # Confirma todos los cambios en la base de datos.
        
        # ENVIAR NOTIFICACIONES POR CORREO PARA ALERTAS CRÍTICAS
        # Solo si hay alertas críticas que notificar
        if alertas_a_notificar:
        # Si hay alertas para notificar.
            try:
                # Obtener la parcela para incluir detalles en el correo
                parcela = Parcela.query.get(parcela_id)
                # Busca la parcela por su ID.
                if parcela:
                # Si la parcela existe.
                    print(f"DEBUG: Parcela encontrada: {parcela.id} - {parcela.nombre}")
                    # Mensaje de depuración.
                    
                    # Preparar datos de la parcela para las notificaciones
                    datos_parcela = {
                        'nombre': parcela.nombre,
                        'cultivo': parcela.cultivo_actual if hasattr(parcela, 'cultivo_actual') else '',
                        'id': parcela.id
                    }
                    # Prepara un diccionario con los datos de la parcela.
                    
                    # Importar la función para enviar correos
                    from servicios.notificaciones import enviar_correo_alerta
                    # Importa la función para enviar correos de alerta.
                    
                   
                # Obtener solo el usuario asociado a la parcela
                usuario_id = parcela.usuario_id if hasattr(parcela, 'usuario_id') else None
                # Obtiene el ID de usuario de la parcela.
                if usuario_id:
                # Si hay un ID de usuario.
                    usuario = Usuario.query.get(usuario_id)
                    # Busca el usuario por su ID.
                    if usuario and usuario.email:
                    # Si el usuario existe y tiene un email.
                        print(f"DEBUG: Enviando alertas solo a {usuario.email}")
                        # Mensaje de depuración.
                        for alerta_data in alertas_a_notificar:
                        # Itera sobre las alertas a notificar.
                            try:
                                resultado = enviar_correo_alerta(usuario.email, alerta_data, datos_parcela)
                                # Intenta enviar el correo de alerta.
                                if resultado:
                                # Si el envío fue exitoso.
                                    print(f"✅ Alerta {alerta_data['id']} enviada a {usuario.email}")
                                    # Mensaje de éxito.
                                else:
                                    print(f"❌ Error al enviar alerta {alerta_data['id']} a {usuario.email}")
                                    # Mensaje de error.
                            except Exception as e:
                                print(f"Error al enviar correo individual: {str(e)}")
                                # Imprime el error al enviar un correo individual.
                    else:
                        print("DEBUG: Usuario asociado a la parcela no tiene email configurado")
                        # Mensaje de depuración.
                else:
                    print("DEBUG: No se encontró usuario asociado a la parcela")
                    # Mensaje de depuración.
                        
            except Exception as email_error:
            # Captura cualquier excepción al enviar correos.
                import traceback
                # Importa traceback para imprimir la pila de llamadas.
                print(f"ERROR AL NOTIFICAR: {str(email_error)}")
                # Imprime el error.
                traceback.print_exc()
                # Imprime la pila de llamadas.
                current_app.logger.error(f"Error al enviar notificaciones por correo: {email_error}")
                # Registra el error.
            
    except Exception as e:
    # Captura cualquier excepción general.
        db.session.rollback()
        # Revierte la transacción.
        current_app.logger.error(f"Error al guardar alertas finales: {e}")
        # Registra el error.

@app.route('/api/simulacion/iniciar', methods=['POST'])
# Define una ruta POST para '/api/simulacion/iniciar'.
def iniciar_simulacion():
    """Inicia la simulación continua utilizando la actualización centralizada"""
    # Docstring que describe la función.
    global simulacion_activa, hilo_simulacion, parametros_configurables
    # Declara que se usarán las variables globales.
    
    if simulacion_activa:
    # Si la simulación ya está activa.
        return jsonify({"mensaje": "La simulación ya está en ejecución"})
        # Devuelve un mensaje indicando que ya está en ejecución.
    
    # Recibir parámetros personalizados si existen
    if request.json:
    # Si la solicitud contiene datos JSON.
        nuevos_parametros = request.json
        # Obtiene los nuevos parámetros.
        parametros_configurables = nuevos_parametros
        # Actualiza los parámetros configurables globales.
        
        # Aplicar los parámetros a todos los sensores de manera centralizada
        try:
            # Temperatura (ID 1)
            if 1 in red_sensores.sensores:
            # Si el sensor de temperatura (ID 1) existe.
                red_sensores.sensores[1].valor_minimo = parametros_configurables["temperatura"]["min"]
                # Actualiza el valor mínimo de temperatura.
                red_sensores.sensores[1].valor_maximo = parametros_configurables["temperatura"]["max"]
                # Actualiza el valor máximo de temperatura.
                red_sensores.sensores[1].frecuencia = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
                # Actualiza la frecuencia de temperatura.
            
            # Humedad (ID 2)
            if 2 in red_sensores.sensores:
            # Si el sensor de humedad (ID 2) existe.
                red_sensores.sensores[2].valor_minimo = parametros_configurables["humedadSuelo"]["min"]
                # Actualiza el valor mínimo de humedad.
                red_sensores.sensores[2].valor_maximo = parametros_configurables["humedadSuelo"]["max"]
                # Actualiza el valor máximo de humedad.
                red_sensores.sensores[2].frecuencia = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
                # Actualiza la frecuencia de humedad.
            
            # pH (ID 3)
            if 3 in red_sensores.sensores:
            # Si el sensor de pH (ID 3) existe.
                red_sensores.sensores[3].valor_minimo = parametros_configurables["phSuelo"]["min"]
                # Actualiza el valor mínimo de pH.
                red_sensores.sensores[3].valor_maximo = parametros_configurables["phSuelo"]["max"]
                # Actualiza el valor máximo de pH.
                red_sensores.sensores[3].frecuencia = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
                # Actualiza la frecuencia de pH.
                
            # Nutrientes (ID 4)
            if 4 in red_sensores.sensores:
            # Si el sensor de nutrientes (ID 4) existe.
                red_sensores.sensores[4].frecuencia = parametros_configurables.get("simulacion", {}).get("intervalo", 5)
                # Actualiza la frecuencia de nutrientes.
        except Exception as e:
            current_app.logger.error(f"Error al actualizar sensores: {e}")
            # Registra el error.
    
    simulacion_activa = True
    # Activa la bandera de simulación.
    hilo_simulacion = threading.Thread(target=simulacion_continua)
    # Crea un nuevo hilo para ejecutar la función simulacion_continua.
    hilo_simulacion.daemon = True
    # Establece el hilo como un demonio.
    hilo_simulacion.start()
    # Inicia la ejecución del hilo.
    
    duracion_minutos = parametros_configurables["simulacion"]["duracion"]
    # Obtiene la duración de la simulación en minutos.
    return jsonify({
        "mensaje": f"Simulación iniciada. Duración: {duracion_minutos} minutos",
        "duracion_minutos": duracion_minutos
    })
    # Devuelve un mensaje de éxito y la duración de la simulación.


@app.route('/api/simulacion/detener', methods=['POST'])
# Define una ruta POST para '/api/simulacion/detener'.
def detener_simulacion():
    """Detiene la simulación en segundo plano y genera alertas finales"""
    # Docstring que describe la función.
    global simulacion_activa, hilo_simulacion, ultimos_datos, parametros_configurables
    # Declara que se usarán las variables globales.

    if not simulacion_activa:
    # Si la simulación no está activa.
        return jsonify({"mensaje": "La simulación no está en ejecución"})
        # Devuelve un mensaje indicando que no está en ejecución.

    # Registrar log solo si existe el ID de usuario
    user_id = request.headers.get('X-User-Id')
    # Obtiene el ID de usuario del encabezado.
    if user_id:
    # Si hay un ID de usuario.
        try:
            registrar_log(user_id, 'detener_simulacion', 'simulacion', None)
            # Intenta registrar la acción de detener simulación.
        except Exception as e:
            current_app.logger.error(f"Error al registrar log al detener simulación: {e}")
            # Registra el error.

    simulacion_activa = False
    # Desactiva la bandera de simulación.
    if hilo_simulacion and hilo_simulacion.is_alive():
    # Si el hilo de simulación existe y está vivo.
        hilo_simulacion.join(timeout=2.0)
        # Espera a que el hilo termine por un máximo de 2 segundos.
        hilo_simulacion = None
        # Establece el hilo a None.

    # --- NUEVO: Generar alertas finales al detener manualmente ---
    try:
        # Obtener la parcela de simulación si existe
        parcela_id = app.config.get('PARCELA_SIMULACION', None)
        # Obtiene el ID de la parcela de la configuración de la aplicación.
        # Si no hay una parcela específica, intenta usar la primera disponible
        if not parcela_id:
        # Si no hay ID de parcela.
            parcelas_disponibles = Parcela.query.all()
            # Consulta todas las parcelas disponibles.
            if parcelas_disponibles:
            # Si hay parcelas.
                parcela_id = parcelas_disponibles[0].id
                # Asigna el ID de la primera parcela.
        # Solo si hay datos y parcela, guardar alertas
        if parcela_id and ultimos_datos:
        # Si hay ID de parcela y últimos datos.
            guardar_alertas_finales(parcela_id, ultimos_datos, parametros_configurables)
            # Guarda las alertas finales.
    except Exception as e:
        current_app.logger.error(f"Error generando alertas al detener simulación: {e}")
        # Registra el error.
    # ------------------------------------------------------------

    return jsonify({"mensaje": "Simulación detenida"})
    # Devuelve un mensaje de éxito.

@app.route('/api/simulacion/estado', methods=['GET'])
# Define una ruta GET para '/api/simulacion/estado'.
def estado_simulacion():
    """Devuelve el estado actual de la simulación"""
    # Docstring que describe la función.
    if not simulacion_activa:
    # Si la simulación no está activa.
        return jsonify({
            "activa": False,
            "mensaje": "No hay simulación activa"
        })
        # Devuelve un estado inactivo.
    
    # Calcular tiempo restante
    duracion_segundos = parametros_configurables["simulacion"]["duracion"] * 60
    # Calcula la duración total en segundos.
    tiempo_inicio = time.time() - (parametros_configurables["simulacion"]["intervalo"] * 5)  # Aproximado
    # Calcula un tiempo de inicio aproximado.
    tiempo_restante = max(0, (tiempo_inicio + duracion_segundos) - time.time())
    # Calcula el tiempo restante.
    
    return jsonify({
        "activa": True,
        "duracion_total_minutos": parametros_configurables["simulacion"]["duracion"],
        "tiempo_restante_segundos": int(tiempo_restante),
        "tiempo_restante_minutos": int(tiempo_restante / 60)
    })
    # Devuelve un estado activo con detalles de la duración y el tiempo restante.

@app.route('/api/condiciones/<condicion>', methods=['POST'])
# Define una ruta POST para '/api/condiciones/<condicion>'.
def simular_condiciones(condicion):
    """Activa diferentes condiciones de simulación usando la actualización centralizada"""
    # Docstring que describe la función.
    global parametros_configurables
    # Declara que se usará la variable global.
    
    # Hacer una copia de los parámetros actuales para modificarlos
    nuevos_parametros = dict(parametros_configurables)
    # Crea una copia de los parámetros configurables.
    
    if condicion == "heladas":
    # Si la condición es "heladas".
        # Actualizar solo los valores relevantes para esta condición
        nuevos_parametros["temperatura"]["min"] = -10
        # Establece la temperatura mínima.
        nuevos_parametros["temperatura"]["max"] = 5
        # Establece la temperatura máxima.
        nuevos_parametros["humedadSuelo"]["min"] = 10
        # Establece la humedad mínima.
        nuevos_parametros["humedadSuelo"]["max"] = 30
        # Establece la humedad máxima.
        mensaje = "Simulando condiciones de heladas"
        # Define el mensaje.
        
    elif condicion == "sequia":
    # Si la condición es "sequia".
        nuevos_parametros["temperatura"]["min"] = 30
        # Establece la temperatura mínima.
        nuevos_parametros["temperatura"]["max"] = 45
        # Establece la temperatura máxima.
        nuevos_parametros["humedadSuelo"]["min"] = 5
        # Establece la humedad mínima.
        nuevos_parametros["humedadSuelo"]["max"] = 20
        # Establece la humedad máxima.
        mensaje = "Simulando condiciones de sequía"
        # Define el mensaje.
        
    elif condicion == "lluvia":
    # Si la condición es "lluvia".
        nuevos_parametros["temperatura"]["min"] = 10
        # Establece la temperatura mínima.
        nuevos_parametros["temperatura"]["max"] = 25
        # Establece la temperatura máxima.
        nuevos_parametros["humedadSuelo"]["min"] = 70
        # Establece la humedad mínima.
        nuevos_parametros["humedadSuelo"]["max"] = 100
        # Establece la humedad máxima.
        mensaje = "Simulando condiciones de lluvia intensa"
        # Define el mensaje.
        
    elif condicion == "normal":
    # Si la condición es "normal".
        parametros = obtener_parametros_estacion()
        # Obtiene los parámetros de la estación.
        nuevos_parametros["temperatura"]["min"] = parametros["temperatura"][0]
        # Restaura la temperatura mínima.
        nuevos_parametros["temperatura"]["max"] = parametros["temperatura"][1]
        # Restaura la temperatura máxima.
        nuevos_parametros["humedadSuelo"]["min"] = parametros["humedad"][0]
        # Restaura la humedad mínima.
        nuevos_parametros["humedadSuelo"]["max"] = parametros["humedad"][1]
        # Restaura la humedad máxima.
        nuevos_parametros["phSuelo"]["min"] = parametros["ph"][0]
        # Restaura el pH mínimo.
        nuevos_parametros["phSuelo"]["max"] = parametros["ph"][1]
        # Restaura el pH máximo.
        mensaje = "Restaurando condiciones normales"
        # Define el mensaje.
        
    else:
        return jsonify({"error": f"Condición '{condicion}' no reconocida"}), 400
        # Si la condición no es reconocida, devuelve un error 400.
    
    # Actualizar los parámetros globales
    parametros_configurables = nuevos_parametros
    # Actualiza los parámetros configurables globales.
    
    # Aplicar los cambios a los sensores usando la misma lógica centralizada
    try:
        # Temperatura (ID 1)
        if 1 in red_sensores.sensores:
        # Si el sensor de temperatura (ID 1) existe.
            red_sensores.sensores[1].valor_minimo = parametros_configurables["temperatura"]["min"]
            # Actualiza el valor mínimo de temperatura.
            red_sensores.sensores[1].valor_maximo = parametros_configurables["temperatura"]["max"]
            # Actualiza el valor máximo de temperatura.
        
        # Humedad (ID 2)
        if 2 in red_sensores.sensores:
        # Si el sensor de humedad (ID 2) existe.
            red_sensores.sensores[2].valor_minimo = parametros_configurables["humedadSuelo"]["min"]
            # Actualiza el valor mínimo de humedad.
            red_sensores.sensores[2].valor_maximo = parametros_configurables["humedadSuelo"]["max"]
            # Actualiza el valor máximo de humedad.
        
        # pH (ID 3)
        if 3 in red_sensores.sensores:
        # Si el sensor de pH (ID 3) existe.
            red_sensores.sensores[3].valor_minimo = parametros_configurables["phSuelo"]["min"]
            # Actualiza el valor mínimo de pH.
            red_sensores.sensores[3].valor_maximo = parametros_configurables["phSuelo"]["max"]
            # Actualiza el valor máximo de pH.
    except Exception as e:
        current_app.logger.error(f"Error al actualizar sensores: {e}")
        # Registra el error.
    
    # Devolver los parámetros actualizados junto con el mensaje
    return jsonify({
        "mensaje": mensaje,
        "parametros": parametros_configurables
    })
    # Devuelve el mensaje y los parámetros actualizados.

#endpints para la API de administración usuarios
@app.route('/api/usuarios/total', methods=['GET'])
# Define una ruta GET para '/api/usuarios/total'.
def total_usuarios():
    total = Usuario.query.count()
    # Cuenta el número total de usuarios.
    return jsonify({'total': total})    
    # Devuelve el total de usuarios en formato JSON.

@app.route('/api/usuarios', methods=['GET'])
# Define una ruta GET para '/api/usuarios'.
def listar_usuarios():
    usuarios = Usuario.query.all()
    # Consulta todos los usuarios.
    return jsonify([
        {
            'id': u.id,
            'nombre': u.nombre,
            'email': u.email,
            'rol': u.rol
        } for u in usuarios
    ])
    # Devuelve una lista de diccionarios con los datos de los usuarios.

@app.route('/api/usuarios/<int:id>', methods=['PUT'])
# Define una ruta PUT para '/api/usuarios/<id>'.
def actualizar_usuario(id):
    data = request.json
    # Obtiene los datos JSON.
    usuario = Usuario.query.get(id)
    # Busca el usuario por su ID.
    if not usuario:
    # Si el usuario no se encuentra.
        return jsonify({'error': 'Usuario no encontrado'}), 404
        # Devuelve un error 404.

    usuario.nombre = data.get('nombre', usuario.nombre)
    # Actualiza el nombre del usuario si se proporciona.
    usuario.email = data.get('email', usuario.email)
    # Actualiza el email del usuario si se proporciona.
    usuario.rol = data.get('rol', usuario.rol)
    # Actualiza el rol del usuario si se proporciona.

    # Cambiar contraseña si se solicita
    if data.get('newPassword'):
    # Si se proporciona una nueva contraseña.
        # Verifica la contraseña actual antes de cambiarla
        if not data.get('password') or not check_password_hash(usuario.password, data['password']):
        # Si no se proporciona la contraseña actual o es incorrecta.
            return jsonify({'error': 'La contraseña actual es incorrecta'}), 400
            # Devuelve un error 400.
        usuario.password = generate_password_hash(data['newPassword'])
        # Hashea y actualiza la nueva contraseña.

    db.session.commit()
    # Confirma los cambios en la base de datos.
    return jsonify({'mensaje': 'Usuario actualizado'})
    # Devuelve un mensaje de éxito.

@app.route('/api/usuarios/<int:id>', methods=['DELETE'])
# Define una ruta DELETE para '/api/usuarios/<id>'.
def eliminar_usuario(id):
    usuario = Usuario.query.get(id)
    # Busca el usuario por su ID.
    if not usuario:
    # Si el usuario no se encuentra.
        return jsonify({'error': 'Usuario no encontrado'}), 404
        # Devuelve un error 404.
    db.session.delete(usuario)
    # Elimina el usuario de la sesión de la base de datos.
    db.session.commit()
    # Confirma los cambios.
    return jsonify({'mensaje': 'Usuario eliminado correctamente'})
    # Devuelve un mensaje de éxito.

# ...existing code...

# ...existing code...

@app.route('/api/parcelas', methods=['POST'])
# Define una ruta POST para '/api/parcelas'.
def agregar_parcela():
    """Agregar una nueva parcela con su cultivo único"""
    # Docstring que describe la función.
    try:
        data = request.json
        # Obtiene los datos JSON.
        user_id = request.headers.get('X-User-Id')
        # Obtiene el ID de usuario del encabezado.
        if not user_id:
        # Si no hay ID de usuario.
            return jsonify({'error': 'No autorizado, falta X-User-Id'}), 403
            # Devuelve un error 403.

        # Crear parcela y asignar usuario_id
        nueva_parcela = Parcela(
            nombre=data['nombre'],
            ubicacion=data.get('ubicacion'),
            hectareas=data.get('hectareas'),
            latitud=data.get('latitud'),
            longitud=data.get('longitud'),
            fecha_creacion=datetime.now(UTC),
            usuario_id=user_id  # Asignar usuario activo
        )
        # Crea una nueva instancia de Parcela.
        
        db.session.add(nueva_parcela)
        # Añade la nueva parcela a la sesión.
        db.session.flush()  # Para obtener el ID de la parcela
        # Fuerza la escritura para obtener el ID de la parcela.
        
        # Crear cultivo único si se proporcionan datos
        cultivo_creado = None
        # Inicializa cultivo_creado a None.
        if 'cultivo' in data and data['cultivo']:
        # Si se proporcionan datos de cultivo.
            cultivo_data = data['cultivo']
            # Obtiene los datos del cultivo.
            
            # IMPORTANTE: Asegurar que solo hay un cultivo activo por parcela
            # Desactivar cualquier cultivo previo (por si acaso)
            DetalleCultivo.query.filter_by(parcela_id=nueva_parcela.id).update({'activo': False})
            # Desactiva cualquier cultivo previo para la misma parcela.
            
            # CORREGIR: Manejar la fecha de siembra con timezone
            fecha_siembra = None
            # Inicializa fecha_siembra a None.
            if cultivo_data.get('fecha_siembra'):
            # Si se proporciona una fecha de siembra.
                try:
                    # Parsear la fecha y asegurar que tenga timezone UTC
                    fecha_siembra = datetime.fromisoformat(cultivo_data['fecha_siembra'])
                    # Parsea la fecha de siembra.
                    if fecha_siembra.tzinfo is None:
                    # Si la fecha no tiene información de zona horaria.
                        fecha_siembra = fecha_siembra.replace(tzinfo=UTC)
                        # Asigna la zona horaria UTC.
                except ValueError:
                    fecha_siembra = datetime.now(UTC)
                    # Si hay un error de valor, usa la fecha y hora actual en UTC.
            else:
                fecha_siembra = datetime.now(UTC)
                # Si no se proporciona fecha de siembra, usa la fecha y hora actual en UTC.
            
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
            # Crea una nueva instancia de DetalleCultivo.
            
            db.session.add(nuevo_cultivo)
            # Añade el nuevo cultivo a la sesión.
            db.session.flush()  # Para calcular la edad
            # Fuerza la escritura para calcular la edad.
            
            # Calcular edad DESPUÉS de hacer flush
            nuevo_cultivo.edad = nuevo_cultivo.calcular_edad_dias()
            # Calcula la edad del cultivo.
            
            # Actualizar parcela con datos del cultivo
            nueva_parcela.cultivo_actual = nuevo_cultivo.nombre
            # Actualiza el cultivo actual de la parcela.
            if nuevo_cultivo.fecha_siembra:
            # Si el nuevo cultivo tiene fecha de siembra.
                nueva_parcela.fecha_siembra = nuevo_cultivo.fecha_siembra.date()
                # Actualiza la fecha de siembra de la parcela.
            
            cultivo_creado = {
                'id': nuevo_cultivo.id,
                'nombre': nuevo_cultivo.nombre,
                'variedad': nuevo_cultivo.variedad,
                'etapa_desarrollo': nuevo_cultivo.etapa_desarrollo,
                'edad_dias': nuevo_cultivo.calcular_edad_dias(),
                'progreso_cosecha': round(nuevo_cultivo.progreso_cosecha(), 1)
            }
            # Prepara un diccionario con los datos del cultivo creado.
        
        db.session.commit()
        # Confirma los cambios en la base de datos.
        
        # Registrar log
        user_id = request.headers.get('X-User-Id')
        # Obtiene el ID de usuario del encabezado.
        if user_id:
        # Si hay un ID de usuario.
            detalles = {
                'parcela': data,
                'cultivo_creado': bool(cultivo_creado)
            }
            registrar_log(user_id, 'crear_parcela', 'parcela', nueva_parcela.id, detalles=str(detalles))
            # Registra la acción de crear parcela.
        
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
        # Devuelve un mensaje de éxito y los datos de la parcela y el cultivo.
    
    except Exception as e:
    # Captura cualquier excepción.
        db.session.rollback()
        # Revierte la transacción.
        current_app.logger.error(f"Error al crear parcela: {str(e)}")
        # Registra el error.
        return jsonify({'error': f"Error al crear parcela: {str(e)}"}), 500
        # Devuelve un error 500.

@app.route('/api/parcelas/<int:id>', methods=['GET'])
# Define una ruta GET para '/api/parcelas/<id>'.
def obtener_parcela(id):
    parcela = Parcela.query.get_or_404(id)
    # Busca la parcela por su ID o devuelve un error 404 si no se encuentra.
    usuario = Usuario.query.get(parcela.usuario_id) if parcela.usuario_id else None
    # Busca el usuario propietario de la parcela.
    cultivo = DetalleCultivo.query.filter_by(parcela_id=parcela.id, activo=True).first()
    # Busca el cultivo activo asociado a la parcela.
    return jsonify({
        'id': parcela.id,
        'nombre': parcela.nombre,
        'ubicacion': parcela.ubicacion,
        'hectareas': parcela.hectareas,
        'latitud': parcela.latitud,
        'longitud': parcela.longitud,
        'fecha_creacion': parcela.fecha_creacion,
        'cultivo_actual': parcela.cultivo_actual,
        'fecha_siembra': parcela.fecha_siembra,
        'usuario_id': parcela.usuario_id,
        'usuario_nombre': usuario.nombre if usuario else None,
        'usuario_email': usuario.email if usuario else None,
        # NUEVO: detalles del cultivo activo
        'variedad': cultivo.variedad if cultivo else None,
        'cultivo': {
            'id': cultivo.id if cultivo else None,
            'nombre': cultivo.nombre if cultivo else None,
            'variedad': cultivo.variedad if cultivo else None,
            'etapa_desarrollo': cultivo.etapa_desarrollo if cultivo else None,
            'edad_dias': cultivo.calcular_edad_dias() if cultivo else None,
            'progreso_cosecha': round(cultivo.progreso_cosecha(), 1) if cultivo else None,
            'activo': cultivo.activo,
            'fecha_cosecha': cultivo.fecha_cosecha.isoformat() if cultivo.fecha_cosecha else None
        } if cultivo else None
    })
    # Devuelve los datos de la parcela y su cultivo en formato JSON.
@app.route('/api/parcelas/<int:id>', methods=['PUT'])
# Define una ruta PUT para '/api/parcelas/<id>'.
def actualizar_parcela(id):
    user_id = request.headers.get('X-User-Id')
    # Obtiene el ID de usuario del encabezado.
    if not user_id:
    # Si no hay ID de usuario.
        return jsonify({'error': 'No autorizado, falta X-User-Id'}), 403
        # Devuelve un error 403.
    user_rol = request.headers.get('X-User-Rol', '')
    # Obtiene el rol de usuario del encabezado.

    if user_rol == 'agronomo':
    # Si el rol es 'agronomo'.
        # Agrónomo puede editar cualquier parcela
        parcela = Parcela.query.filter_by(id=id).first()
        # Busca la parcela por su ID.
    else:
        # Otros roles solo pueden editar sus propias parcelas
        parcela = Parcela.query.filter_by(id=id, usuario_id=user_id).first()
        # Busca la parcela por su ID y el ID de usuario.

    if not parcela:
    # Si la parcela no se encuentra.
        return jsonify({'error': 'Parcela no encontrada'}), 404
        # Devuelve un error 404.
    
    # Obtener los datos de la solicitud
    data = request.get_json()
    # Obtiene los datos JSON.
    
    # Actualizar los campos de la parcela
    parcela.nombre = data.get('nombre', parcela.nombre)
    # Actualiza el nombre de la parcela.
    parcela.ubicacion = data.get('ubicacion', parcela.ubicacion)
    # Actualiza la ubicación de la parcela.
    parcela.hectareas = data.get('hectareas', parcela.hectareas)
    # Actualiza las hectáreas de la parcela.
    parcela.latitud = data.get('latitud', parcela.latitud)
    # Actualiza la latitud de la parcela.
    parcela.longitud = data.get('longitud', parcela.longitud)
    # Actualiza la longitud de la parcela.

    # Manejar la fecha de siembra (si viene como string, convertirla)
    fecha_siembra = data.get('fecha_siembra')
    # Obtiene la fecha de siembra.
    if fecha_siembra:
    # Si se proporciona una fecha de siembra.
        try:
            from datetime import datetime
            # Importa datetime.
            if isinstance(fecha_siembra, str):
            # Si la fecha de siembra es una cadena.
                try:
                    parcela.fecha_siembra = datetime.fromisoformat(fecha_siembra)
                    # Intenta parsear la fecha desde formato ISO.
                except ValueError:
                    parcela.fecha_siembra = datetime.strptime(fecha_siembra, '%Y-%m-%d')
                    # Si falla, intenta parsear desde formato YYYY-MM-DD.
        except Exception as e:
            print(f"Error al procesar fecha: {str(e)}")
            # Imprime el error.
    elif fecha_siembra == '' or fecha_siembra is None:
    # Si la fecha de siembra es una cadena vacía o None.
        parcela.fecha_siembra = None
        # Establece la fecha de siembra a None.

    tiene_cultivo = data.get('tiene_cultivo', False)
    # Obtiene el indicador 'tiene_cultivo'.
    cultivo_data = data.get('cultivo')
    # Obtiene los datos del cultivo.

    if not tiene_cultivo:
    # Si la parcela no tiene cultivo.
        # Eliminar el cultivo activo asociado a la parcela
        cultivo_activo = DetalleCultivo.query.filter_by(parcela_id=parcela.id, activo=True).first()
        # Busca el cultivo activo.
        if cultivo_activo:
        # Si hay un cultivo activo.
            db.session.delete(cultivo_activo)
            # Lo elimina.
        parcela.cultivo_actual = None
        # Establece el cultivo actual de la parcela a None.
        parcela.fecha_siembra = None
        # Establece la fecha de siembra de la parcela a None.
    else:
        if cultivo_data:
        # Si se proporcionan datos de cultivo.
            from datetime import datetime
            # Importa datetime.
            cultivo = DetalleCultivo.query.filter_by(parcela_id=parcela.id, activo=True).first()
            # Busca el cultivo activo.
            fecha_siembra_cultivo = None
            # Inicializa fecha_siembra_cultivo a None.
            if cultivo_data.get('fecha_siembra'):
            # Si se proporciona una fecha de siembra para el cultivo.
                try:
                    fecha_siembra_cultivo = datetime.fromisoformat(cultivo_data['fecha_siembra'])
                    # Intenta parsear la fecha.
                except Exception:
                    fecha_siembra_cultivo = datetime.now()
                    # Si falla, usa la fecha y hora actual.
            if cultivo:
            # Si ya existe un cultivo activo.
                cultivo.nombre = cultivo_data.get('nombre', cultivo.nombre)
                # Actualiza el nombre del cultivo.
                cultivo.variedad = cultivo_data.get('variedad', cultivo.variedad)
                # Actualiza la variedad del cultivo.
                cultivo.etapa_desarrollo = cultivo_data.get('etapa_desarrollo', cultivo.etapa_desarrollo)
                # Actualiza la etapa de desarrollo.
                cultivo.fecha_siembra = fecha_siembra_cultivo or cultivo.fecha_siembra
                # Actualiza la fecha de siembra.
                cultivo.dias_cosecha_estimados = cultivo_data.get('dias_cosecha_estimados', cultivo.dias_cosecha_estimados)
                # Actualiza los días de cosecha estimados.
                parcela.cultivo_actual = cultivo.nombre
                # Actualiza el cultivo actual de la parcela.
            else:
                nuevo_cultivo = DetalleCultivo(
                    parcela_id=parcela.id,
                    nombre=cultivo_data.get('nombre'),
                    variedad=cultivo_data.get('variedad'),
                    etapa_desarrollo=cultivo_data.get('etapa_desarrollo', 'siembra'),
                    fecha_siembra=fecha_siembra_cultivo or datetime.now(),
                    dias_cosecha_estimados=cultivo_data.get('dias_cosecha_estimados'),
                    activo=True
                )
                # Crea un nuevo cultivo.
                db.session.add(nuevo_cultivo)
                # Lo añade a la sesión.
                parcela.cultivo_actual = nuevo_cultivo.nombre
                # Actualiza el cultivo actual de la parcela.
                if nuevo_cultivo.fecha_siembra:
                # Si el nuevo cultivo tiene fecha de siembra.
                    parcela.fecha_siembra = nuevo_cultivo.fecha_siembra.date()
                    # Actualiza la fecha de siembra de la parcela.

    try:
        db.session.commit()
        # Confirma los cambios.
        user_id = request.headers.get('X-User-Id')
        # Obtiene el ID de usuario.
        registrar_log(user_id, 'actualizar_parcela', 'parcela', id, detalles=str(data))
        # Registra la acción de actualizar parcela.
        cultivo = DetalleCultivo.query.filter_by(parcela_id=parcela.id, activo=True).first()
        # Busca el cultivo activo.
        return jsonify({
            'mensaje': 'Parcela actualizada correctamente',
            'parcela': {
                'id': parcela.id,
                'nombre': parcela.nombre,
                'ubicacion': parcela.ubicacion,
                'hectareas': parcela.hectareas,
                'latitud': parcela.latitud,
                'longitud': parcela.longitud,
                'cultivo_actual': parcela.cultivo_actual,
                'fecha_siembra': parcela.fecha_siembra,
                'cultivo': {
                    'id': cultivo.id if cultivo else None,
                    'nombre': cultivo.nombre if cultivo else None,
                    'variedad': cultivo.variedad if cultivo else None,
                    'etapa_desarrollo': cultivo.etapa_desarrollo if cultivo else None,
                    'fecha_siembra': cultivo.fecha_siembra if cultivo else None,
                    'dias_cosecha_estimados': cultivo.dias_cosecha_estimados if cultivo else None,
                    'activo': cultivo.activo if cultivo else None
                } if cultivo else None
            }
        })
        # Devuelve un mensaje de éxito y los datos actualizados de la parcela y el cultivo.
    except Exception as e:
    # Captura cualquier excepción.
        db.session.rollback()
        # Revierte la transacción.
        return jsonify({'error': f'Error al actualizar parcela: {str(e)}'}), 500
        # Devuelve un error 500.


@app.route('/api/parcelas/<int:id>', methods=['DELETE'])
# Define una ruta DELETE para '/api/parcelas/<id>'.
def eliminar_parcela(id):
    try:
        user_id = request.headers.get('X-User-Id')
        # Obtiene el ID de usuario del encabezado.
        print(f"🔍 DEBUG: Eliminando parcela {id}, usuario: {user_id}")
        # Mensaje de depuración.
        
        if not user_id:
        # Si no hay ID de usuario.
            return jsonify({'error': 'No autorizado, falta X-User-Id'}), 403
            # Devuelve un error 403.
        
        # Verificar usuario (corregir warning SQLAlchemy)
        usuario = db.session.get(Usuario, user_id)
        # Busca el usuario por su ID.
        if not usuario:
        # Si el usuario no se encuentra.
            return jsonify({'error': 'Usuario no encontrado'}), 403
            # Devuelve un error 403.
        
        # Buscar parcela (corregir warning SQLAlchemy)
        parcela = db.session.get(Parcela, id)
        # Busca la parcela por su ID.
        if not parcela:
        # Si la parcela no se encuentra.
            return jsonify({'error': 'Parcela no encontrada'}), 404
            # Devuelve un error 404.
        
        # Verificar permisos
        if usuario.rol != 'agronomo' and parcela.usuario_id != int(user_id):
        # Si el usuario no es 'agronomo' y no es el propietario de la parcela.
            return jsonify({'error': 'Sin permisos para eliminar esta parcela'}), 403
            # Devuelve un error 403.
        
        print(f"🔍 DEBUG: Eliminando parcela '{parcela.nombre}'")
        # Mensaje de depuración.
        
        # ELIMINACIÓN USANDO LA ESTRUCTURA REAL DE TU BD
        datos_eliminados = {}
        # Inicializa un diccionario para los datos eliminados.
        
        try:
            # 1. Eliminar lecturas de sensores
            # Tabla real: lecturas_sensores
            lecturas_eliminadas = LecturaSensor.query.filter_by(parcela=id).delete()
            # Elimina las lecturas de sensores asociadas a la parcela.
            datos_eliminados['lecturas_sensores'] = lecturas_eliminadas
            # Registra el número de lecturas eliminadas.
            print(f"✅ DEBUG: {lecturas_eliminadas} lecturas de sensores eliminadas")
            # Mensaje de depuración.
            
            # 2. 🔧 ELIMINAR ALERTAS - Tabla real: alerta_sensor
            try:
                alertas_eliminadas = AlertaSensor.query.filter_by(parcela=id).delete()
                # Elimina las alertas asociadas a la parcela.
                datos_eliminados['alerta_sensor'] = alertas_eliminadas
                # Registra el número de alertas eliminadas.
                print(f"✅ DEBUG: {alertas_eliminadas} alertas eliminadas")
                # Mensaje de depuración.
            except Exception as e:
                print(f"⚠️ DEBUG: Error eliminando alertas: {e}")
                # Imprime el error.
                datos_eliminados['alerta_sensor'] = f"Error: {e}"
                # Registra el error.
            
            # 3. Eliminar cultivos - Tabla real: cultivos
            try:
                cultivos_eliminados = DetalleCultivo.query.filter_by(parcela_id=id).delete()
                # Elimina los cultivos asociados a la parcela.
                datos_eliminados['cultivos'] = cultivos_eliminados
                # Registra el número de cultivos eliminados.
                print(f"✅ DEBUG: {cultivos_eliminados} cultivos eliminados")
                # Mensaje de depuración.
            except Exception as e:
                print(f"⚠️ DEBUG: Error eliminando cultivos: {e}")
                # Imprime el error.
                datos_eliminados['cultivos'] = f"Error: {e}"
                # Registra el error.
            
            # 4. Eliminar rangos - Tabla real: rangos_parametros
            try:
                rangos_eliminados = RangoParametro.query.filter_by(parcela_id=id).delete()
                # Elimina los rangos de parámetros asociados a la parcela.
                datos_eliminados['rangos_parametros'] = rangos_eliminados
                # Registra el número de rangos eliminados.
                print(f"✅ DEBUG: {rangos_eliminados} rangos eliminados")
                # Mensaje de depuración.
            except Exception as e:
                print(f"⚠️ DEBUG: Error eliminando rangos: {e}")
                # Imprime el error.
                datos_eliminados['rangos_parametros'] = f"Error: {e}"
                # Registra el error.
            
            # 5. Eliminar logs (verificar si tiene las columnas correctas)
            try:
                # Tu modelo LogAccionUsuario no tiene entidad_tipo/entidad_id
                # Solo tiene 'entidad' y 'entidad_id'
                logs_eliminados = LogAccionUsuario.query.filter_by(
                    entidad='parcela', 
                    entidad_id=id
                ).delete()
                # Elimina los logs de acciones de usuario asociados a la parcela.
                datos_eliminados['logs'] = logs_eliminados
                # Registra el número de logs eliminados.
                print(f"✅ DEBUG: {logs_eliminados} logs eliminados")
                # Mensaje de depuración.
            except Exception as e:
                print(f"⚠️ DEBUG: Error eliminando logs: {e}")
                # Imprime el error.
                datos_eliminados['logs'] = f"Error: {e}"
                # Registra el error.
            
            # 6. FINALMENTE eliminar la parcela
            db.session.delete(parcela)
            # Elimina la parcela.
            datos_eliminados['parcela'] = 1
            # Registra que la parcela fue eliminada.
            
            # COMMIT TODO JUNTO
            db.session.commit()
            # Confirma todos los cambios en la base de datos.
            
            print(f"✅ DEBUG: Parcela {id} eliminada exitosamente")
            # Mensaje de éxito.
            print(f"📊 DEBUG: Resumen eliminación: {datos_eliminados}")
            # Imprime un resumen de los datos eliminados.
            
            return jsonify({
                'mensaje': 'Parcela y TODAS sus alertas eliminadas correctamente',
                'parcela_id': id,
                'parcela_nombre': parcela.nombre,
                'datos_eliminados': datos_eliminados
            })
            # Devuelve un mensaje de éxito y un resumen de la eliminación.
            
        except Exception as e:
            db.session.rollback()
            # Revierte la transacción.
            print(f"❌ ERROR en eliminación: {e}")
            # Imprime el error.
            return jsonify({'error': f'Error al eliminar parcela: {str(e)}'}), 500
            # Devuelve un error 500.
            
    except Exception as e:
    # Captura cualquier excepción general.
        print(f"❌ ERROR general: {e}")
        # Imprime el error.
        return jsonify({'error': 'Error en el servidor'}), 500
        # Devuelve un error 500.





@app.route('/api/debug/sensores/<int:parcela_id>', methods=['GET'])
# Define una ruta GET para '/api/debug/sensores/<parcela_id>'.
def debug_sensores_parcela(parcela_id):
    """Endpoint de depuración para verificar datos de sensores de una parcela"""
    # Docstring que describe la función.
    try:
        # Obtener datos de sensores
        datos = obtener_ultimas_lecturas_sensores(parcela_id)
        # Obtiene las últimas lecturas de sensores para la parcela.
        
        # Obtener información de la parcela
        parcela = Parcela.query.get_or_404(parcela_id)
        # Busca la parcela por su ID o devuelve un error 404.
        
        # Obtener lecturas recientes directamente de la base de datos
        fecha_limite = datetime.now() - timedelta(days=7)
        # Define la fecha límite (últimos 7 días).
        lecturas_recientes = LecturaSensor.query.filter(
            LecturaSensor.parcela == parcela_id,
            LecturaSensor.timestamp >= fecha_limite
        ).order_by(LecturaSensor.timestamp.desc()).all()
        # Consulta las lecturas recientes de sensores para la parcela.
        
        # Formatear lecturas para la respuesta
        lecturas_formateadas = []
        # Inicializa una lista para las lecturas formateadas.
        for lec in lecturas_recientes[:20]:  # Limitar a 20 para no sobrecargar
        # Itera sobre las primeras 20 lecturas recientes.
            lecturas_formateadas.append({
                'id': lec.id,
                'timestamp': lec.timestamp.isoformat() if lec.timestamp else None,
                'tipo': lec.tipo,
                'valor': lec.valor,
                'unidad': lec.unidad
            })
            # Añade la lectura formateada a la lista.
            
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
        # Devuelve los datos de la parcela, los datos procesados, las lecturas recientes y el total de lecturas.
        
    except Exception as e:
    # Captura cualquier excepción.
        return jsonify({'error': f'Error depurando datos de sensores: {str(e)}'}), 500
        # Devuelve un error 500.



# Endpoint para obtener mensajes de una conversación
@app.route('/api/chat/<conv_id>', methods=['GET'])
# Define una ruta GET para '/api/chat/<conv_id>'.
def obtener_mensajes(conv_id):
    try:
        # Obtener el ID de usuario del request
        user_id = request.args.get('user_id')
        # Obtiene el ID de usuario de los argumentos de la solicitud.
        if not user_id:
        # Si no hay ID de usuario.
            return jsonify({'error': 'User ID requerido'}), 400
            # Devuelve un error 400.
            
        # Obtener la conversación
        conversacion = Conversacion.query.get_or_404(conv_id)
        # Busca la conversación por su ID o devuelve un error 404.
        
        # Verificar que el usuario es el propietario de la conversación
        if str(conversacion.usuario_id) != str(user_id):
        # Si el ID de usuario de la conversación no coincide con el ID de usuario de la solicitud.
            return jsonify({'error': 'No autorizado para ver esta conversación'}), 403
            # Devuelve un error 403.
            
        # Obtener mensajes
        mensajes = Mensaje.query.filter_by(conversacion_id=conv_id).order_by(Mensaje.created_at).all()
        # Consulta los mensajes de la conversación, ordenados por fecha de creación.
        
        return jsonify({
            'id': conversacion.id,
            'created_at': conversacion.created_at.isoformat(),
            'last_message': ultimo_mensaje.content if ultimo_mensaje else ""
        })
        # Devuelve el ID de la conversación, la fecha de creación y el contenido del último mensaje.
    except Exception as e:
    # Captura cualquier excepción.
        return jsonify({'error': str(e)}), 500
        # Devuelve un error 500.

# Endpoint para crear nueva conversación
@app.route('/api/conversaciones', methods=['POST'])
# Define una ruta POST para '/api/conversaciones'.
def crear_conversacion():
    try:
        data = request.json
        # Obtiene los datos JSON.
        user_id = data.get('user_id')
        # Obtiene el ID de usuario.
        
        # Validación explícita
        if not user_id:
        # Si no hay ID de usuario.
            print(f"Error: user_id faltante o inválido: {user_id}")
            # Imprime un mensaje de error.
            return jsonify({'error': 'Se requiere user_id válido'}), 400
            # Devuelve un error 400.
            
        # Verificar si el usuario existe
        usuario = Usuario.query.get(user_id)
        # Busca el usuario por su ID.
        if not usuario:
        # Si el usuario no se encuentra.
            print(f"Error: Usuario con id {user_id} no encontrado")
            # Imprime un mensaje de error.
            return jsonify({'error': f'Usuario con id {user_id} no encontrado'}), 404
            # Devuelve un error 404.
        
        print(f"Creando conversación para usuario {user_id}")
        # Mensaje de depuración.
        conversacion = Conversacion(usuario_id=user_id)
        # Crea una nueva instancia de Conversacion.
        db.session.add(conversacion)
        # Añade la conversación a la sesión.
        db.session.commit()
        # Confirma los cambios.
        
        return jsonify({
            'id': conversacion.id,
            'created_at': conversacion.created_at.isoformat()
        })
        # Devuelve el ID de la conversación y la fecha de creación.
    except Exception as e:
    # Captura cualquier excepción.
        print(f"Error al crear conversación: {str(e)}")
        # Imprime el error.
        db.session.rollback()
        # Revierte la transacción.
        return jsonify({'error': f'Error al crear conversación: {str(e)}'}), 500
        # Devuelve un error 500.

# Endpoint para eliminar conversación
# En el backend:
@app.route('/api/conversaciones/<conv_id>', methods=['DELETE'])
# Define una ruta DELETE para '/api/conversaciones/<conv_id>'.
def eliminar_conversacion(conv_id):
    try:
        # Verificar el usuario desde los headers
        user_id = request.headers.get('X-User-Id')
        # Obtiene el ID de usuario del encabezado.
        if not user_id:
        # Si no hay ID de usuario.
            return jsonify({'error': 'User ID requerido'}), 400
            # Devuelve un error 400.
            
        conversacion = Conversacion.query.get_or_404(conv_id)
        # Busca la conversación por su ID o devuelve un error 404.
        
        # Verificar propiedad
        if str(conversacion.usuario_id) != str(user_id):
        # Si el ID de usuario de la conversación no coincide con el ID de usuario de la solicitud.
            return jsonify({'error': 'No autorizado para eliminar esta conversación'}), 403
            # Devuelve un error 403.
            
        # Eliminar mensajes relacionados
        Mensaje.query.filter_by(conversacion_id=conv_id).delete()
        # Elimina todos los mensajes asociados a la conversación.
        
        # Eliminar la conversación
        db.session.delete(conversacion)
        # Elimina la conversación.
        db.session.commit()
        # Confirma los cambios.
        
        return jsonify({'success': True})
        # Devuelve un mensaje de éxito.
    except Exception as e:
    # Captura cualquier excepción.
        db.session.rollback()
        # Revierte la transacción.
        return jsonify({'error': str(e)}), 500
        # Devuelve un error 500.

# Endpoint para obtener mensajes de una conversación
@app.route('/api/chat/<int:conv_id>', methods=['GET'])
# Define una ruta GET para '/api/chat/<conv_id>'.
def obtener_conversacion(conv_id):
    conversacion = Conversacion.query.get_or_404(conv_id)
    # Busca la conversación por su ID o devuelve un error 404.
    mensajes = Mensaje.query.filter_by(conversacion_id=conv_id).order_by(Mensaje.timestamp).all()
    # Consulta los mensajes de la conversación, ordenados por timestamp.
    
    return jsonify({
        'conversation_id': conv_id,
        'messages': [{
            'sender': msg.sender,
            'content': msg.content,
            'timestamp': msg.timestamp.isoformat()
        } for msg in mensajes]
    })
    # Devuelve el ID de la conversación y una lista de mensajes.

# Endpoint para enviar mensaje y obtener respuesta
@app.route('/api/chat', methods=['POST'])
# Define una ruta POST para '/api/chat'.
def chat():
    try:
        data = request.json
        # Obtiene los datos JSON.
        user_id = data.get('user_id')
        # Obtiene el ID de usuario.
        message_text = data.get('message')
        # Obtiene el texto del mensaje.
        conversation_id = data.get('conversation_id')
        # Obtiene el ID de la conversación.

        # Verificar usuario
        usuario = Usuario.query.get_or_404(user_id)
        # Busca el usuario por su ID o devuelve un error 404.

        # Obtener parcelas del usuario para enriquecer contexto
        parcelas = Parcela.query.all()  # Filtra por usuario en producción si es necesario
        # Consulta todas las parcelas (en un entorno de producción, se filtraría por usuario).

        # NUEVO: Obtener datos de sensores recientes
        datos_sensores = {}
        # Inicializa un diccionario para los datos de los sensores.

        # Si se especificó parcela en 'context.parcela_id'
        parcela_id = data.get('context', {}).get('parcela_id')
        # Obtiene el ID de la parcela del contexto.
        if parcela_id:
        # Si se especificó un ID de parcela.
            parcela_obj = Parcela.query.get(parcela_id)
            # Busca el objeto parcela.
            if parcela_obj:
            # Si la parcela existe.
                datos_recientes = obtener_datos_sensores_recientes(parcela_id)
                # Obtiene los datos recientes de los sensores para esa parcela.
                # Envolver el resultado en 'nombre' y 'datos'
                datos_sensores = {
                    'nombre': parcela_obj.nombre,
                    'datos': datos_recientes
                }
                # Envuelve los datos de los sensores con el nombre de la parcela.
        else:
            # Obtener datos de todas las parcelas
            for p in parcelas:
            # Itera sobre todas las parcelas.
                datos_recientes = obtener_datos_sensores_recientes(p.id)
                # Obtiene los datos recientes de los sensores para cada parcela.
                if datos_recientes:
                # Si hay datos recientes.
                    datos_sensores[p.id] = {
                        'nombre': p.nombre,
                        'datos': datos_recientes
                    }
                    # Almacena los datos de los sensores por ID de parcela.
        # Crear o recuperar conversación
        if conversation_id:
        # Si se proporciona un ID de conversación.
            conversacion = Conversacion.query.get_or_404(conversation_id)
            # Busca la conversación por su ID o devuelve un error 404.
        else:
            conversacion = Conversacion(usuario_id=user_id)
            # Crea una nueva conversación.
            db.session.add(conversacion)
            # La añade a la sesión.
            db.session.commit()
            # Confirma los cambios.
            conversation_id = conversacion.id
            # Obtiene el ID de la nueva conversación.
        
        # Guardar mensaje del usuario
        mensaje_usuario = Mensaje(
            conversacion_id=conversation_id,
            sender="user",
            content=message_text
        )
        # Crea un nuevo mensaje del usuario.
        db.session.add(mensaje_usuario)
        # Lo añade a la sesión.
        db.session.commit()
        # Confirma los cambios.
        
        # Construir mensaje de sistema con contexto enriquecido
        sistema_mensaje = construir_mensaje_sistema_avanzado(usuario, parcelas, datos_sensores)
        # Construye el mensaje de sistema con el contexto enriquecido.
        
        # Obtener historial anterior (opcional, para mantener contexto)
        mensajes_previos = Mensaje.query.filter_by(
            conversacion_id=conversation_id
        ).order_by(Mensaje.timestamp.desc()).limit(5).all()  # Cambiado de created_at a timestamp
        # Consulta los últimos 5 mensajes de la conversación.
        
        # Construir historial para enviar a la API
        history = [{"role": "system", "content": sistema_mensaje}]
        # Inicializa el historial con el mensaje de sistema.
        
        # Añadir mensajes previos si existen
        for msg in mensajes_previos:
        # Itera sobre los mensajes previos.
            role = "user" if msg.sender == "user" else "assistant"
            # Determina el rol del remitente.
            history.append({"role": role, "content": msg.content})
            # Añade el mensaje al historial.
        
        # Añadir mensaje actual
        history.append({"role": "user", "content": message_text})
        # Añade el mensaje actual del usuario al historial.
        
        # Enviar a OpenRouter/Deepseek
        print(f"Enviando a OpenRouter: {history}")
        # Mensaje de depuración.
        reply = send_to_deepseek(history)
        # Envía el historial a la IA y obtiene la respuesta.
        
        # Guardar respuesta
        mensaje_respuesta = Mensaje(
            conversacion_id=conversation_id,
            sender="assistant",
            content=reply
        )
        # Crea un nuevo mensaje con la respuesta de la IA.
        db.session.add(mensaje_respuesta)
        # Lo añade a la sesión.
        db.session.commit()
        # Confirma los cambios.
        registrar_log(user_id, 'consulta_ia', 'conversacion', conversation_id,
                      detalles=message_text)
        # Registra la consulta a la IA.
        return jsonify({
            'conversation_id': conversation_id,
            'reply': reply
        })
        # Devuelve el ID de la conversación y la respuesta de la IA.
        
    except Exception as e:
    # Captura cualquier excepción.
        print("Error general en /api/chat:", str(e))
        # Imprime el error.
        return jsonify({'error': str(e)}), 500
        # Devuelve un error 500.
    
# Add this endpoint near the other parcelas endpoints

# Add these imports if not already present
from datetime import datetime, timedelta, UTC
import random

# Add this endpoint near your other parcela endpoints
@app.route('/api/parcelas/recomendaciones', methods=['GET'])
# Define una ruta GET para '/api/parcelas/recomendaciones'.
def obtener_recomendaciones_parcelas():
    """Devuelve recomendaciones para las parcelas basadas en los datos de los sensores"""
    # Docstring que describe la función.
    try:
        # Get user_id from headers
        user_id = request.headers.get('X-User-Id')
        # Obtiene el ID de usuario del encabezado.
        
        # Get optional parameters
        parcela_id = request.args.get('parcela_id')
        # Obtiene el ID de la parcela de los argumentos de la solicitud.
        max_caracteres = request.args.get('max_caracteres', type=int, default=300)
        # Obtiene el número máximo de caracteres para las recomendaciones.
        
        # Query all parcels or filter by ID
        if parcela_id:
        # Si se proporciona un ID de parcela.
            parcelas = Parcela.query.filter_by(id=parcela_id).all()
            # Consulta las parcelas por su ID.
        else:
            parcelas = Parcela.query.all()
            # Consulta todas las parcelas.
            
        if not parcelas:
        # Si no hay parcelas disponibles.
            return jsonify({"mensaje": "No hay parcelas disponibles"}), 404
            # Devuelve un mensaje de que no hay parcelas.
            
        recomendaciones = []
        # Inicializa una lista para las recomendaciones.
        
        # For each parcela, get sensor data and generate recommendations
        for parcela in parcelas:
        # Itera sobre cada parcela.
            # Get the latest sensor readings for this parcel
            ultimas_lecturas = obtener_ultimas_lecturas_sensores(parcela.id)
            # Obtiene las últimas lecturas de sensores para la parcela.
            
            # Generate recommendations based on parcel info and sensor data
            recomendaciones_parcela = generar_recomendaciones_parcela(
                parcela, 
                ultimas_lecturas, 
                max_caracteres
            )
            # Genera recomendaciones para la parcela.
            recomendaciones.extend(recomendaciones_parcela)
            # Añade las recomendaciones generadas a la lista principal.
            
        # Log this action if user_id is available
        if user_id:
        # Si hay un ID de usuario.
            try:
                registrar_accion(user_id, 'consulta_recomendaciones', 'parcela', 
                               parcela_id if parcela_id else None)
                # Intenta registrar la acción de consulta de recomendaciones.
            except Exception as e:
                current_app.logger.error(f"Error al registrar acción: {e}")
                # Registra el error.
                
        return jsonify(recomendaciones)
        # Devuelve las recomendaciones en formato JSON.
        
    except Exception as e:
    # Captura cualquier excepción.
        current_app.logger.error(f"Error al obtener recomendaciones: {e}")
        # Registra el error.
        return jsonify({"error": str(e)}), 500
        # Devuelve un error 500.

def obtener_ultimas_lecturas_sensores(parcela_id):
    """Obtiene las últimas lecturas de sensores para una parcela"""
    # Docstring que describe la función.
    try:
        # Get readings from the last 7 days
        fecha_limite = datetime.now() - timedelta(days=7)
        # Define la fecha límite (últimos 7 días).
        
        # Debug log to check parcela_id
        current_app.logger.info(f"Buscando lecturas para parcela ID: {parcela_id}")
        # Mensaje de depuración.
        
        # Query for readings related to this parcel - FIXED FIELD NAMES
        lecturas = LecturaSensor.query.filter(
            LecturaSensor.parcela == parcela_id,  # Using correct field name 'parcela'
            LecturaSensor.timestamp >= fecha_limite  # Using correct field name 'timestamp'
        ).order_by(LecturaSensor.timestamp.desc()).all()
        # Consulta las lecturas de sensores para la parcela dentro del período.
        
        # Debug log to check results
        current_app.logger.info(f"Se encontraron {len(lecturas)} lecturas para parcela {parcela_id}")
        # Mensaje de depuración.
        
        if not lecturas:
        # Si no se encontraron lecturas en la base de datos.
            # If no DB data, try to get from the sensor network directly
            try:
                # Try to get live data from the RedSensores if available
                sensor_data = red_sensores.obtener_datos_parcela(parcela_id)
                # Intenta obtener datos en vivo de la red de sensores.
                if sensor_data:
                # Si se obtuvieron datos.
                    current_app.logger.info(f"Usando datos en vivo de red_sensores para parcela {parcela_id}")
                    # Mensaje de depuración.
                    return sensor_data
                    # Devuelve los datos en vivo.
            except Exception as e:
                current_app.logger.warning(f"No se pudo obtener datos en vivo: {e}")
                # Registra una advertencia.
            
            # If still no data, return empty dict
            current_app.logger.warning(f"No hay datos disponibles para parcela {parcela_id}")
            # Registra una advertencia.
            return {}
            # Devuelve un diccionario vacío.
        
        # Group readings by sensor type
        lecturas_agrupadas = {}
        # Inicializa un diccionario para agrupar lecturas por tipo de sensor.
        for lectura in lecturas:
        # Itera sobre cada lectura.
            if lectura.tipo not in lecturas_agrupadas:
            # Si el tipo de sensor no está en el diccionario.
                lecturas_agrupadas[lectura.tipo] = []
                # Crea una nueva lista para ese tipo de sensor.
            lecturas_agrupadas[lectura.tipo].append({
                'valor': lectura.valor,
                'fecha': lectura.timestamp  # Using correct field name 'timestamp'
            })
            # Añade la lectura a la lista correspondiente.
        
        # Get the latest reading of each type
        ultimas_lecturas = {}
        # Inicializa un diccionario para las últimas lecturas.
        for tipo, lecturas_tipo in lecturas_agrupadas.items():
        # Itera sobre cada tipo de sensor y sus lecturas.
            # Sort by date descending and take the first one
            lecturas_tipo.sort(key=lambda x: x['fecha'], reverse=True)
            # Ordena las lecturas por fecha descendente.
            ultimas_lecturas[tipo] = {
                'valor': lecturas_tipo[0]['valor'],
                'fecha': lecturas_tipo[0]['fecha']
            }
            # Almacena la última lectura para cada tipo de sensor.
            
            # Calculate trends if more than one reading
            if len(lecturas_tipo) > 1:
            # Si hay más de una lectura para el tipo de sensor.
                # Get first and last reading
                primera = None
                ultima = None
                
                # Parse values to float for comparison
                try:
                    ultima_str = lecturas_tipo[0]['valor']
                    # Obtiene el valor de la última lectura como cadena.
                    primera_str = lecturas_tipo[-1]['valor']
                    # Obtiene el valor de la primera lectura como cadena.
                    
                    # Handle both simple values and JSON strings
                    try:
                        ultima = float(ultima_str)
                        # Intenta convertir la última lectura a flotante.
                        primera = float(primera_str)
                        # Intenta convertir la primera lectura a flotante.
                    except ValueError:
                        # Try to parse as JSON
                        try:
                            ultima_json = json.loads(ultima_str)
                            # Intenta parsear la última lectura como JSON.
                            primera_json = json.loads(primera_str)
                            # Intenta parsear la primera lectura como JSON.
                            
                            # For nutrientes, get an average
                            if isinstance(ultima_json, dict) and isinstance(primera_json, dict):
                            # Si ambos son diccionarios (ej. nutrientes).
                                ultima_vals = [float(v) for v in ultima_json.values() if isinstance(v, (int, float, str))]
                                # Obtiene los valores numéricos de la última lectura.
                                primera_vals = [float(v) for v in primera_json.values() if isinstance(v, (int, float, str))]
                                # Obtiene los valores numéricos de la primera lectura.
                                if ultima_vals and primera_vals:
                                # Si hay valores numéricos.
                                    ultima = sum(ultima_vals) / len(ultima_vals)
                                    # Calcula el promedio de la última lectura.
                                    primera = sum(primera_vals) / len(primera_vals)
                                    # Calcula el promedio de la primera lectura.
                        except (ValueError, json.JSONDecodeError):
                            pass
                            # Ignora errores de valor o JSON.
                    
                    # Calculate change percentage
                    if primera is not None and ultima is not None and primera != 0:
                    # Si se pudieron obtener valores numéricos y la primera no es cero.
                        cambio_porcentual = ((ultima - primera) / abs(primera)) * 100
                        # Calcula el cambio porcentual.
                        
                        # Determine trend
                        if cambio_porcentual > 10:
                            tendencia = 'ascendente'
                            # Tendencia ascendente.
                        elif cambio_porcentual < -10:
                            tendencia = 'descendente'
                            # Tendencia descendente.
                        else:
                            tendencia = 'estable'
                            # Tendencia estable.
                            
                        ultimas_lecturas[tipo]['tendencia'] = tendencia
                        # Almacena la tendencia.
                        ultimas_lecturas[tipo]['cambio_porcentual'] = round(cambio_porcentual, 1)
                        # Almacena el cambio porcentual.
                except Exception as e:
                    current_app.logger.warning(f"Error al calcular tendencia para {tipo}: {e}")
                    # Registra una advertencia.
        
        # Debug log to check what's being returned
        current_app.logger.info(f"Datos recopilados para parcela {parcela_id}: {ultimas_lecturas.keys()}")
        # Mensaje de depuración.
        return ultimas_lecturas
        # Devuelve las últimas lecturas con tendencias.
        
    except Exception as e:
    # Captura cualquier excepción.
        current_app.logger.error(f"Error al obtener lecturas de sensores: {e}")
        # Registra el error.
        return {}
        # Devuelve un diccionario vacío.

def generar_recomendaciones_parcela(parcela, datos_sensor, max_caracteres=300):
    """Genera recomendaciones para una parcela basadas en datos de sensores"""
    # Docstring que describe la función.
    # Start with an empty list of recommendations
    recomendaciones = []
    # Inicializa una lista para las recomendaciones.
    
    try:
        # Check if we got any sensor data at all
        if not datos_sensor:
        # Si no hay datos de sensores.
            current_app.logger.warning(f"No hay datos de sensores para parcela {parcela.id}, generando recomendación genérica")
            # Registra una advertencia.
            # If no sensor data found, recommend installing sensors
            recomendacion = {
                "id": f"rec_{parcela.id}_1",
                "parcela": parcela.nombre,
                "cultivo": parcela.cultivo_actual or "Sin cultivo",
                "recomendacion": "Instale sensores en esta parcela para obtener recomendaciones personalizadas.",
                "fecha": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            # Crea una recomendación genérica.
            recomendaciones.append(recomendacion)
            # La añade a la lista.
            return recomendaciones
            # Devuelve la recomendación genérica.
        
        # IMPORTANT: Log the sensor data we received to debug
        current_app.logger.info(f"Datos de sensores para parcela {parcela.id}: {datos_sensor}")
        # Mensaje de depuración.
        
        # Get the cultivo name for context-specific recommendations
        cultivo = (parcela.cultivo_actual or "").lower()
        # Obtiene el nombre del cultivo en minúsculas.
        
        # Create case-insensitive lookup dictionary
        datos_sensor_norm = {k.lower(): v for k, v in datos_sensor.items()}
        # Crea un diccionario de datos de sensores con claves en minúsculas.
        
        # Check humidity levels - USING CASE-INSENSITIVE KEY
        if 'humedad' in datos_sensor_norm:
        # Si hay datos de humedad.
            humedad_data = datos_sensor_norm['humedad']
            # Obtiene los datos de humedad.
            try:
                # Try to parse the value safely
                valor_humedad = float(humedad_data['valor'])
                # Convierte el valor de humedad a flotante.
                
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
                    # Define umbrales de humedad específicos para diferentes cultivos.
                    
                # Generate recommendation based on humidity value
                if valor_humedad < umbral_bajo:
                # Si la humedad está por debajo del umbral bajo.
                    recomendacion = {
                        "id": f"rec_{parcela.id}_hum_bajo",
                        "parcela": parcela.nombre,
                        "cultivo": parcela.cultivo_actual,
                        "recomendacion": f"Aumente el riego. La humedad actual ({valor_humedad}%) está por debajo del nivel óptimo para {parcela.cultivo_actual}.",
                        "fecha": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }
                    # Crea una recomendación de aumentar el riego.
                    recomendaciones.append(recomendacion)
                    # La añade a la lista.
                    
                elif valor_humedad > umbral_alto:
                # Si la humedad está por encima del umbral alto.
                    recomendacion = {
                        "id": f"rec_{parcela.id}_hum_alto",
                        "parcela": parcela.nombre,
                        "cultivo": parcela.cultivo_actual,
                        "recomendacion": f"Reduzca el riego. La humedad actual ({valor_humedad}%) está por encima del nivel óptimo para {parcela.cultivo_actual}.",
                        "fecha": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }
                    # Crea una recomendación de reducir el riego.
                    recomendaciones.append(recomendacion)
                    # La añade a la lista.
                
                # Add trend-based recommendation if available
                if 'tendencia' in humedad_data and humedad_data['tendencia'] == 'descendente':
                # Si hay una tendencia descendente en la humedad.
                    recomendacion = {
                        "id": f"rec_{parcela.id}_hum_trend",
                        "parcela": parcela.nombre,
                        "cultivo": parcela.cultivo_actual,
                        "recomendacion": f"Programar riego preventivo. Se detecta tendencia descendente en niveles de humedad ({humedad_data['cambio_porcentual']}%).",
                        "fecha": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }
                    # Crea una recomendación de riego preventivo.
                    recomendaciones.append(recomendacion)
                    # La añade a la lista.
            except (ValueError, TypeError) as e:
                current_app.logger.warning(f"Error al procesar valor de humedad para parcela {parcela.id}: {e}")
                # Registra una advertencia.
        
        # Check temperature - USING CASE-INSENSITIVE KEY
        if 'temperatura' in datos_sensor_norm:
        # Si hay datos de temperatura.
            temp_data = datos_sensor_norm['temperatura']
            # Obtiene los datos de temperatura.
            try:
                valor_temp = float(temp_data['valor'])
                # Convierte el valor de temperatura a flotante.
                
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
                    # Define umbrales de temperatura específicos para diferentes cultivos.
                    
                # Generate recommendation based on temperature value
                if valor_temp > umbral_alto:
                # Si la temperatura está por encima del umbral alto.
                    recomendacion = {
                        "id": f"rec_{parcela.id}_temp_alto",
                        "parcela": parcela.nombre,
                        "cultivo": parcela.cultivo_actual,
                        "recomendacion": f"Considerar sombreado parcial. La temperatura actual ({valor_temp}°C) está por encima del rango óptimo para {parcela.cultivo_actual}.",
                        "fecha": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }
                    # Crea una recomendación de sombreado.
                    recomendaciones.append(recomendacion)
                    # La añade a la lista.
                    
                elif valor_temp < umbral_bajo:
                # Si la temperatura está por debajo del umbral bajo.
                    recomendacion = {
                        "id": f"rec_{parcela.id}_temp_bajo",
                        "parcela": parcela.nombre,
                        "cultivo": parcela.cultivo_actual,
                        "recomendacion": f"Considerar protección contra el frío. La temperatura actual ({valor_temp}°C) está por debajo del rango óptimo para {parcela.cultivo_actual}.",
                        "fecha": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }
                    # Crea una recomendación de protección contra el frío.
                    recomendaciones.append(recomendacion)
                    # La añade a la lista.
            except (ValueError, TypeError) as e:
                current_app.logger.warning(f"Error al procesar valor de temperatura para parcela {parcela.id}: {e}")
                # Registra una advertencia.
        
        # Check pH levels - USING CASE-INSENSITIVE KEY
        if 'ph' in datos_sensor_norm:
        # Si hay datos de pH.
            ph_data = datos_sensor_norm['ph']
            # Obtiene los datos de pH.
            try:
                valor_ph = float(ph_data['valor'])
                # Convierte el valor de pH a flotante.
                
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
                    # Define umbrales de pH específicos para diferentes cultivos.
                    
                # Generate recommendation based on pH value
                if valor_ph < umbral_bajo:
                # Si el pH está por debajo del umbral bajo.
                    recomendacion = {
                        "id": f"rec_{parcela.id}_ph_bajo",
                        "parcela": parcela.nombre,
                        "cultivo": parcela.cultivo_actual,
                        "recomendacion": f"Aplicar cal agrícola para elevar el pH del suelo (actual: {valor_ph}).",
                        "fecha": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }
                    # Crea una recomendación para elevar el pH.
                    recomendaciones.append(recomendacion)
                    # La añade a la lista.
                    
                elif valor_ph > umbral_alto:
                # Si el pH está por encima del umbral alto.
                    recomendacion = {
                        "id": f"rec_{parcela.id}_ph_alto",
                        "parcela": parcela.nombre,
                        "cultivo": parcela.cultivo_actual,
                        "recomendacion": f"Aplicar azufre o sulfato de amonio para reducir el pH del suelo (actual: {valor_ph}).",
                        "fecha": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }
                    # Crea una recomendación para reducir el pH.
                    recomendaciones.append(recomendacion)
                    # La añade a la lista.
            except (ValueError, TypeError) as e:
                current_app.logger.warning(f"Error al procesar valor de pH para parcela {parcela.id}: {e}")
                # Registra una advertencia.
        
        # If no specific recommendations were generated, add a default one
        if not recomendaciones:
        # Si no se generaron recomendaciones específicas.
            recomendacion = {
                "id": f"rec_{parcela.id}_default",
                "parcela": parcela.nombre,
                "cultivo": parcela.cultivo_actual,
                "recomendacion": f"Mantenga las condiciones actuales de cultivo. Los parámetros monitoreados están dentro de rangos normales para {parcela.cultivo_actual}.",
                "fecha": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            # Crea una recomendación por defecto.
            recomendaciones.append(recomendacion)
            # La añade a la lista.
            
        # Truncate recommendations if needed
        if max_caracteres > 0:
        # Si se especifica un número máximo de caracteres.
            for rec in recomendaciones:
            # Itera sobre cada recomendación.
                if len(rec['recomendacion']) > max_caracteres:
                # Si la recomendación excede el máximo de caracteres.
                    rec['recomendacion'] = rec['recomendacion'][:max_caracteres-3] + '...'
                    # La trunca y añade puntos suspensivos.
    
        return recomendaciones
        # Devuelve la lista de recomendaciones.
        
    except Exception as e:
    # Captura cualquier excepción.
        current_app.logger.error(f"Error generando recomendaciones: {e}")
        # Registra el error.
        # Return a fallback recommendation
        return [{
            "id": f"rec_{parcela.id}_error",
            "parcela": parcela.nombre,
            "cultivo": parcela.cultivo_actual or "Sin cultivo",
            "recomendacion": "No se pudieron generar recomendaciones específicas. Verifique el estado de los sensores.",
            "fecha": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }]
        # Devuelve una recomendación de fallback en caso de error.


# Añadir esta función para obtener datos recientes de sensores


def obtener_datos_sensores_recientes(parcela_id):
    try:
        # Usar datetime.now(UTC) en lugar de utcnow()
        desde = datetime.now(UTC) - timedelta(hours=24)
        # Define el período de tiempo (últimas 24 horas).
        
        # Consultar los diferentes tipos de sensores
        humedad = LecturaSensor.query.filter(
            LecturaSensor.parcela == parcela_id,
            LecturaSensor.tipo == 'Humedad',
            LecturaSensor.timestamp >= desde
        ).order_by(LecturaSensor.timestamp.desc()).first()
        # Consulta la última lectura de humedad para la parcela.
        
        temperatura = LecturaSensor.query.filter(
            LecturaSensor.parcela == parcela_id,
            LecturaSensor.tipo == 'Temperatura',
            LecturaSensor.timestamp >= desde
        ).order_by(LecturaSensor.timestamp.desc()).first()
        # Consulta la última lectura de temperatura para la parcela.

        ph = LecturaSensor.query.filter(
            LecturaSensor.parcela == parcela_id,
            LecturaSensor.tipo == 'pH del suelo',
            LecturaSensor.timestamp >= desde
        ).order_by(LecturaSensor.timestamp.desc()).first()
        # Consulta la última lectura de pH para la parcela.
        
        nutrientes = LecturaSensor.query.filter(
            LecturaSensor.parcela == parcela_id,
            LecturaSensor.tipo == 'Nutrientes',
            LecturaSensor.timestamp >= desde
        ).order_by(LecturaSensor.timestamp.desc()).first()
        # Consulta la última lectura de nutrientes para la parcela.
        
        # Construir resultado con datos disponibles
        resultado = {}
        # Inicializa un diccionario para el resultado.
        
        # Agregar humedad si está disponible
        if humedad:
        # Si hay datos de humedad.
            try:
                resultado['humedad'] = {
                    'valor': float(humedad.valor),
                    'timestamp': humedad.timestamp.isoformat(),
                    'unidad': '%'
                }
                # Añade los datos de humedad al resultado.
            except (ValueError, TypeError) as e:
                current_app.logger.warning(f"Error al convertir valor de humedad: {e}")
                # Registra una advertencia.
        
        # Agregar temperatura si está disponible
        if temperatura:
        # Si hay datos de temperatura.
            try:
                resultado['temperatura'] = {
                    'valor': float(temperatura.valor),
                    'timestamp': temperatura.timestamp.isoformat(),
                    'unidad': '°C'
                }
                # Añade los datos de temperatura al resultado.
            except (ValueError, TypeError) as e:
                current_app.logger.warning(f"Error al convertir valor de temperatura: {e}")
                # Registra una advertencia.
            
        # Agregar pH si está disponible
        if ph:
        # Si hay datos de pH.
            try:
                resultado['ph'] = {
                    'valor': float(ph.valor),
                    'timestamp': ph.timestamp.isoformat(),
                    'unidad': ''
                }
                # Añade los datos de pH al resultado.
            except (ValueError, TypeError) as e:
                current_app.logger.warning(f"Error al convertir valor de pH: {e}")
                # Registra una advertencia.
            
        # Agregar nutrientes si está disponible
        if nutrientes:
        # Si hay datos de nutrientes.
            try:
                # Intentar parsear el valor como JSON (podría ser un diccionario serializado)
                valor_nutrientes = json.loads(nutrientes.valor)
                # Intenta parsear el valor de nutrientes como JSON.
                resultado['nutrientes'] = {
                    'valor': valor_nutrientes,
                    'timestamp': nutrientes.timestamp.isoformat(),
                    'unidad': 'mg/L'
                }
                # Añade los datos de nutrientes al resultado.
            except (JSONDecodeError, TypeError, ValueError) as e:
                current_app.logger.warning(f"Error al parsear JSON de nutrientes: {e}")
                # Registra una advertencia.
                try:
                    # Si falla el JSON, intentar como float
                    resultado['nutrientes'] = {
                        'valor': float(nutrientes.valor),
                        'timestamp': nutrientes.timestamp.isoformat(),
                        'unidad': 'mg/L'
                    }
                    # Intenta convertir el valor a flotante.
                except (ValueError, TypeError) as e:
                    current_app.logger.warning(f"Error al convertir valor de nutrientes: {e}")
                    # Registra una advertencia.
        
        return resultado
        # Devuelve el diccionario con los datos de los sensores.
    
    except Exception as e:
    # Captura cualquier excepción.
        current_app.logger.error(f"Error obteniendo datos de sensores para parcela {parcela_id}: {str(e)}")
        # Registra el error.
        return {}
        # Devuelve un diccionario vacío.


# Añadir esta función para construir el mensaje enriquecido
# Modifica la función construir_mensaje_sistema_avanzado para manejar correctamente los datos de sensores
def construir_mensaje_sistema_avanzado(usuario, parcelas, datos_sensores):
    mensaje = f"""Eres un asistente agrícola especializado de EcoSmart, la plataforma de gestión agrícola inteligente.

DATOS DEL USUARIO:
- Nombre: {usuario.nombre}
- Rol: {usuario.rol}

PARCELAS DISPONIBLES:
"""
    # Construye la parte inicial del mensaje de sistema con datos del usuario.
    # Añadir información de parcelas
    for p in parcelas[:5]:  # Limitar a 5 parcelas para no sobrecargar
    # Itera sobre las primeras 5 parcelas.
        mensaje += f"""
* {p.nombre} ({p.id})
  - Cultivo actual: {p.cultivo_actual or 'Sin cultivo'}
  - Área: {p.hectareas} hectáreas
  - Fecha de siembra: {p.fecha_siembra.strftime('%d/%m/%Y') if p.fecha_siembra else 'No registrada'}
"""
        # Añade la información de cada parcela al mensaje.
    
    # Añadir datos de sensores
    mensaje += "\nDATOS RECIENTES DE SENSORES:\n"
    # Añade un encabezado para los datos de los sensores.
    
    if isinstance(datos_sensores, dict) and datos_sensores:
    # Si datos_sensores es un diccionario y no está vacío.
        # CORREGIDO: Verificar estructura para evitar errores de 'nombre'
        if isinstance(datos_sensores, dict):
        # Si datos_sensores es un diccionario.
            # Para una sola parcela
            if 'datos' in datos_sensores:
            # Si contiene la clave 'datos' (indicando una sola parcela).
                parcela_nombre = "Parcela seleccionada"
                # Nombre por defecto.
                # Buscar nombre de parcela si está disponible
                if 'nombre' in datos_sensores:
                    parcela_nombre = datos_sensores['nombre']
                    # Usa el nombre si está disponible.
                # Si no hay nombre, intentar buscar por ID
                elif parcela_id := request.args.get('parcela_id'):
                # Si se obtiene un ID de parcela de los argumentos de la solicitud.
                    parcela = Parcela.query.get(parcela_id)
                    # Busca la parcela.
                    if parcela:
                        parcela_nombre = parcela.nombre
                        # Usa el nombre de la parcela si se encuentra.
                
                mensaje += f"Parcela: {parcela_nombre}\n"
                # Añade el nombre de la parcela al mensaje.
                for tipo, dato in datos_sensores.get('datos', {}).items():
                # Itera sobre los tipos de datos y sus valores.
                    mensaje += f"- {tipo.capitalize()}: {dato['valor']}{dato['unidad']} ({dato['timestamp']})\n"
                    # Añade los datos del sensor al mensaje.
            else:
                # Para múltiples parcelas
                for parcela_id, info in datos_sensores.items():
                # Itera sobre los IDs de parcela y su información.
                    # Obtener nombre de parcela de forma segura
                    parcela_nombre = "Parcela ID " + str(parcela_id)
                    # Nombre por defecto.
                    if isinstance(info, dict) and 'nombre' in info:
                        parcela_nombre = info['nombre']
                        # Usa el nombre si está disponible.
                    elif not isinstance(info, dict):
                        # Si info no es dict, saltamos esta iteración
                        continue
                        # Si la información no es un diccionario, salta a la siguiente iteración.
                        
                    mensaje += f"Parcela: {parcela_nombre}\n"
                    # Añade el nombre de la parcela al mensaje.
                    # Asegurarse que 'datos' existe y es un diccionario
                    if isinstance(info.get('datos'), dict):
                    # Si la información contiene 'datos' y es un diccionario.
                        for tipo, dato in info['datos'].items():
                        # Itera sobre los tipos de datos y sus valores.
                            if isinstance(dato, dict) and 'valor' in dato and 'unidad' in dato:
                            # Si el dato es un diccionario y contiene 'valor' y 'unidad'.
                                mensaje += f"- {tipo.capitalize()}: {dato['valor']}{dato['unidad']} ({dato.get('timestamp', 'N/A')})\n"
                                # Añade los datos del sensor al mensaje.
    else:
        mensaje += "No hay datos recientes disponibles de sensores.\n"
        # Si no hay datos de sensores, añade un mensaje indicándolo.
    
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
    # Añade las instrucciones para la IA al mensaje.
    
    return mensaje
    # Devuelve el mensaje de sistema construido.

    # sensores en dashboard agricola
# CAMBIO 1: Corregir la función obtener_datos_sensores para usar el nombre correcto de campo
@app.route('/api/sensores/datos', methods=['GET'])
# Define una ruta GET para '/api/sensores/datos'.
def obtener_datos_sensores():
    try:
        parcela_id = request.args.get('parcela')  # Usar 'parcela' como parámetro
        # Obtiene el ID de la parcela de los argumentos de la solicitud.
        if not parcela_id:
        # Si no se proporciona un ID de parcela.
            return jsonify({"error": "Falta parámetro 'parcela'"}), 400
            # Devuelve un error 400.
        periodo = request.args.get('periodo', '24h')
        # Obtiene el período de tiempo, por defecto '24h'.
        
        # Calcular fecha desde usando UTC
        desde = datetime.now(UTC) - timedelta(hours=24)
        # Define la fecha de inicio para las últimas 24 horas.
        if periodo == '7d':
        # Si el período es '7d'.
            desde = desde - timedelta(days=7)
            # Ajusta la fecha de inicio para los últimos 7 días.
        elif periodo == '30d':
        # Si el período es '30d'.
            desde = desde - timedelta(days=30)
            # Ajusta la fecha de inicio para los últimos 30 días.
        else:  # '24h' por defecto
            desde = desde - timedelta(hours=24)
            # Mantiene la fecha de inicio para las últimas 24 horas.
        
        # Consultar todos los tipos de sensores
        tipos_sensores = ['Temperatura', 'Humedad', 'pH del suelo', 'Nutrientes']
        # Define los tipos de sensores a consultar.
        resultado = {}
        # Inicializa un diccionario para el resultado.
        
        for tipo in tipos_sensores:
        # Itera sobre cada tipo de sensor.
            datos = LecturaSensor.query.filter(
                LecturaSensor.parcela == parcela_id,
                LecturaSensor.tipo == tipo,
                LecturaSensor.timestamp >= desde
            ).order_by(LecturaSensor.timestamp).all()
            # Consulta las lecturas de sensores para la parcela, tipo y período.
            
            # Formatear datos según el tipo
            if tipo == 'Nutrientes':
            # Si el tipo de sensor es 'Nutrientes'.
                datos_formateados = []
                # Inicializa una lista para los datos formateados.
                for d in datos:
                # Itera sobre cada dato.
                    try:
                        valor_obj = json.loads(d.valor)
                        # Intenta parsear el valor como JSON.
                        datos_formateados.append({
                            "timestamp": d.timestamp.isoformat(),
                            "valor": valor_obj
                        })
                        # Añade el timestamp y el objeto valor.
                    except (JSONDecodeError, TypeError, ValueError):
                        try:
                            # Si falla el JSON, intentar como float
                            datos_formateados.append({
                                "timestamp": d.timestamp.isoformat(),
                                "valor": float(d.valor)
                            })
                            # Intenta convertir el valor a flotante.
                        except:
                            continue
                            # Si falla, salta a la siguiente iteración.
            else:
                datos_formateados = []
                # Inicializa una lista para los datos formateados.
                for d in datos:
                # Itera sobre cada dato.
                    try:
                        datos_formateados.append({
                            "timestamp": d.timestamp.isoformat(),
                            "valor": float(d.valor)
                        })
                        # Añade el timestamp y el valor flotante.
                    except (ValueError, TypeError):
                        continue
                        # Si falla, salta a la siguiente iteración.
            
            # Mapear nombres para compatibilidad
            if tipo == 'Temperatura':
                resultado['temperatura'] = datos_formateados
                # Asigna los datos formateados a la clave 'temperatura'.
            elif tipo == 'Humedad':
                resultado['humedad'] = datos_formateados
                # Asigna los datos formateados a la clave 'humedad'.
            elif tipo == 'pH del suelo':
                resultado['ph'] = datos_formateados
                # Asigna los datos formateados a la clave 'ph'.
            elif tipo == 'Nutrientes':
                resultado['nutrientes'] = datos_formateados
                # Asigna los datos formateados a la clave 'nutrientes'.
        
        # Registrar log
        user_id = request.headers.get('X-User-Id')
        # Obtiene el ID de usuario del encabezado.
        if user_id:
        # Si hay un ID de usuario.
            try:
                registrar_log(user_id, 'consulta_datos_sensores', 'parcela', 
                             parcela_id, detalles=f"periodo={periodo}")
                # Intenta registrar la acción de consulta de datos de sensores.
            except Exception as e:
                current_app.logger.error(f"Error al registrar log: {e}")
                # Registra el error.

        return jsonify(resultado)
        # Devuelve el resultado en formato JSON.

    except Exception as e:
    # Captura cualquier excepción.
        current_app.logger.error(f"Error al obtener datos de sensores: {e}")
        # Registra el error.
        return jsonify({"error": str(e)}), 500
        # Devuelve un error 500.
    

@app.route('/api/diagnose/models', methods=['GET'])
# Define una ruta GET para '/api/diagnose/models'.
def diagnose_models():
        try:
            model_info = {
                "LecturaSensor": [c.name for c in LecturaSensor.__table__.columns],
                "Mensaje": [c.name for c in Mensaje.__table__.columns],
                "Conversacion": [c.name for c in Conversacion.__table__.columns],
                "Parcela": [c.name for c in Parcela.__table__.columns]
            }
            # Crea un diccionario con los nombres de las columnas de los modelos especificados.
            return jsonify(model_info)
            # Devuelve la información del modelo en formato JSON.
        except Exception as e:
            return jsonify({"error": str(e)}), 500
            # Devuelve un error 500.
        

from sqlalchemy import func

# Endpoint para obtener logs de acciones de usuarios (para administradores)
@app.route('/api/logs', methods=['GET'])
# Define una ruta GET para '/api/logs'.
def obtener_logs():
    # Solo permitir a administradores ver los logs
    user_id = request.headers.get('X-User-Id')
    # Obtiene el ID de usuario del encabezado.
    user_rol = request.headers.get('X-User-Rol', '')
    # Obtiene el rol de usuario del encabezado.
    
    if not user_id or user_rol != 'tecnico':
    # Si no hay ID de usuario o el rol no es 'tecnico'.
        return jsonify({'error': 'No autorizado para ver logs del sistema'}), 403
        # Devuelve un error 403.
        
    # Parámetros de filtrado
    usuario_id = request.args.get('usuario_id')
    # Obtiene el ID de usuario para filtrar.
    accion = request.args.get('accion')
    # Obtiene la acción para filtrar.
    entidad = request.args.get('entidad')
    # Obtiene la entidad para filtrar.
    fecha_desde = request.args.get('fecha_desde')
    # Obtiene la fecha de inicio para filtrar.
    fecha_hasta = request.args.get('fecha_hasta')
    # Obtiene la fecha de fin para filtrar.
    
    # Parámetros de paginación
    page = request.args.get('page', 1, type=int)
    # Obtiene el número de página, por defecto 1.
    per_page = request.args.get('per_page', 50, type=int)
    # Obtiene el número de elementos por página, por defecto 50.
    
    # Construir consulta base
    from modelos.models import LogAccionUsuario
    # Importa el modelo LogAccionUsuario.
    query = db.session.query(LogAccionUsuario)
    # Crea una consulta base para LogAccionUsuario.
    
    # Aplicar filtros si existen
    if usuario_id:
        query = query.filter(LogAccionUsuario.usuario_id == usuario_id)
        # Aplica filtro por ID de usuario.
    if accion:
        query = query.filter(LogAccionUsuario.accion == accion)
        # Aplica filtro por acción.
    if entidad:
        query = query.filter(LogAccionUsuario.entidad == entidad)
        # Aplica filtro por entidad.
    if fecha_desde:
        try:
            fecha_desde = datetime.fromisoformat(fecha_desde)
            # Parsea la fecha de inicio.
            query = query.filter(LogAccionUsuario.fecha >= fecha_desde)
            # Aplica filtro por fecha de inicio.
        except ValueError:
            pass
            # Ignora errores de valor.
    if fecha_hasta:
        try:
            fecha_hasta = datetime.fromisoformat(fecha_hasta)
            # Parsea la fecha de fin.
            query = query.filter(LogAccionUsuario.fecha <= fecha_hasta)
            # Aplica filtro por fecha de fin.
        except ValueError:
            pass
            # Ignora errores de valor.
    
    # Ordenar del más reciente al más antiguo
    query = query.order_by(LogAccionUsuario.fecha.desc())
    # Ordena los logs por fecha descendente.
    
    # Paginar resultados
    total = query.count()
    # Cuenta el número total de logs.
    logs = query.offset((page - 1) * per_page).limit(per_page).all()
    # Aplica paginación y obtiene los logs.
    
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
    # Formatea el resultado con metadatos de paginación y la lista de logs.
    
    # Registrar esta consulta como una acción
    registrar_log(user_id, 'consulta_logs', 'logs', None, 
                 detalles=f"filtros: {request.args}")
    # Registra la acción de consulta de logs.
    
    return jsonify(resultado)
    # Devuelve el resultado en formato JSON.

# Endpoint para obtener resumen estadístico de logs
@app.route('/api/logs/resumen', methods=['GET'])
# Define una ruta GET para '/api/logs/resumen'.
def resumen_logs():
    # Solo administradores pueden ver resúmenes
    user_id = request.headers.get('X-User-Id')
    # Obtiene el ID de usuario del encabezado.
    user_rol = request.headers.get('X-User-Rol', '')
    # Obtiene el rol de usuario del encabezado.
    
    if not user_id or user_rol != 'administrador':
    # Si no hay ID de usuario o el rol no es 'administrador'.
        return jsonify({'error': 'No autorizado'}), 403
        # Devuelve un error 403.
    
    # Parámetros
    dias = request.args.get('dias', 7, type=int)
    # Obtiene el número de días para el resumen, por defecto 7.
    limite = request.args.get('limite', 10, type=int)
    # Obtiene el límite de resultados, por defecto 10.
    
    # Fecha límite
    fecha_limite = datetime.now(UTC) - timedelta(days=dias)
    # Calcula la fecha límite.
    
    from modelos.models import LogAccionUsuario, Usuario
    # Importa los modelos LogAccionUsuario y Usuario.
    
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
    # Consulta los usuarios más activos en el período, contando sus acciones.
    
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
    # Consulta las acciones más comunes en el período.
    
    # Registrar esta consulta
    registrar_log(user_id, 'consulta_resumen_logs', 'logs', None, detalles=f"dias: {dias}")
    # Registra la acción de consulta de resumen de logs.
    
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
    # Formatea el resultado con los usuarios activos y las acciones frecuentes.
    
    return jsonify(resultado)
    # Devuelve el resultado en formato JSON.

#envia un correo de recuperacion de contraseña
def enviar_correo_recuperacion(destinatario, codigo):
    remitente = "ecosmartutalca@gmail.com" 
    # Define la dirección de correo del remitente.
    password = "fstn dafh rtve hhvm"  # contraseña de aplicación de Gmail
    # Define la contraseña de la aplicación de Gmail.
    asunto = "Solicitud de recuperación de contraseña - EcoSmart"
    # Define el asunto del correo.
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
    # Define el cuerpo del correo.

    msg = MIMEText(cuerpo)
    # Crea un objeto MIMEText con el cuerpo del correo.
    msg['Subject'] = asunto
    # Establece el asunto del correo.
    msg['From'] = remitente
    # Establece el remitente del correo.
    msg['To'] = destinatario
    # Establece el destinatario del correo.

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
        # Establece una conexión segura SMTP con Gmail.
            server.login(remitente, password)
            # Inicia sesión en el servidor SMTP.
            server.sendmail(remitente, destinatario, msg.as_string())
            # Envía el correo.
        print(f"Correo de recuperación enviado a {destinatario}")
        # Imprime un mensaje de éxito.
    except Exception as e:
        print(f"Error al enviar correo: {e}")
        # Imprime el error.


# Endpoint para recuperar contraseña
@app.route('/api/recuperar', methods=['POST'])
# Define una ruta POST para '/api/recuperar'.
def recuperar_contrasena():
    data = request.json
    # Obtiene los datos JSON.
    email = data.get('email')
    # Obtiene el email.
    usuario = Usuario.query.filter_by(email=email).first()
    # Busca el usuario por email.
    if not usuario:
    # Si el usuario no se encuentra.
        return jsonify({'error': 'No existe una cuenta con ese correo'}), 404
        # Devuelve un error 404.

    # Generar código de 6 dígitos
    codigo = f"{randint(100000, 999999)}"
    # Genera un código de 6 dígitos aleatorio.
    usuario.codigo_recuperacion = codigo
    # Asigna el código de recuperación al usuario.
    usuario.codigo_expira = datetime.utcnow() + timedelta(minutes=15)
    # Establece la fecha de expiración del código (15 minutos).
    db.session.commit()
    # Confirma los cambios.

    #envia un correo real con el codigo
    enviar_correo_recuperacion(usuario.email, codigo)
    # Envía el correo de recuperación.

    return jsonify({'mensaje': 'Se ha enviado un código a tu correo'})
    # Devuelve un mensaje de éxito.


@app.route('/api/resetear', methods=['POST'])
# Define una ruta POST para '/api/resetear'.
def resetear_contrasena_codigo():
    data = request.json
    # Obtiene los datos JSON.
    email = data.get('email')
    # Obtiene el email.
    codigo = data.get('codigo')
    # Obtiene el código de recuperación.
    nueva_password = data.get('password')
    # Obtiene la nueva contraseña.

    usuario = Usuario.query.filter_by(email=email, codigo_recuperacion=codigo).first()
    # Busca el usuario por email y código de recuperación.
    if not usuario or usuario.codigo_expira < datetime.utcnow():
    # Si el usuario no se encuentra o el código ha expirado.
        return jsonify({'error': 'Código inválido o expirado'}), 400
        # Devuelve un error 400.

    # Verificar que la nueva contraseña no sea igual a la anterior
    if check_password_hash(usuario.password, nueva_password):
    # Si la nueva contraseña es igual a la anterior.
        return jsonify({'error': 'La nueva contraseña no puede ser igual a la anterior.'}), 400
        # Devuelve un error 400.

    usuario.password = generate_password_hash(nueva_password)
    # Hashea y actualiza la nueva contraseña.
    usuario.codigo_recuperacion = None
    # Elimina el código de recuperación.
    usuario.codigo_expira = None
    # Elimina la fecha de expiración del código.
    db.session.commit()
    # Confirma los cambios.
    return jsonify({'mensaje': 'Contraseña actualizada correctamente'})
    # Devuelve un mensaje de éxito.

@app.errorhandler(Exception)
# Decorador que registra una función para manejar cualquier excepción no capturada.
def handle_exception(e):
    from flask import current_app
    # Importa current_app.
    current_app.logger.error(f"Error no manejado: {str(e)}")
    # Registra el error no manejado.
    return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500
    # Devuelve un error 500.

# Endpoint para recomendaciones de cultivo (sin jwt_required)

# Endpoint para guardar análisis de parcela
@app.route('/api/parcelas/<int:parcela_id>/analisis', methods=['POST', 'OPTIONS'])
# Define una ruta POST y OPTIONS para '/api/parcelas/<parcela_id>/analisis'.
def guardar_analisis_parcela(parcela_id):
    # Manejo de CORS para solicitudes OPTIONS
    if request.method == 'OPTIONS':
    # Si la solicitud es de tipo OPTIONS.
        response = app.make_default_options_response()
        # Crea una respuesta OPTIONS por defecto.
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        # Añade los encabezados permitidos.
        return response
        # Devuelve la respuesta de pre-vuelo.
    
    try:
        # Verificar que la parcela exista
        parcela = Parcela.query.get(parcela_id)
        # Busca la parcela por su ID.
        if not parcela:
        # Si la parcela no se encuentra.
            return jsonify({"error": "Parcela no encontrada"}), 404
            # Devuelve un error 404.
            
        if not request.is_json:
        # Si el tipo de contenido no es JSON.
            return jsonify({"error": "El formato debe ser JSON"}), 400
            # Devuelve un error 400.
            
        data = request.json
        # Obtiene los datos JSON.
        tipo = data.get('tipo')
        # Obtiene el tipo de análisis.
        resultado = data.get('resultado')
        # Obtiene el resultado del análisis.
        analisis_formateado = data.get('analisis_formateado')
        # Obtiene el análisis formateado.
        fecha = data.get('fecha')
        # Obtiene la fecha.
        
        if not tipo or not resultado:
        # Si faltan el tipo o el resultado.
            return jsonify({"error": "Se requiere tipo y resultado"}), 400
            # Devuelve un error 400.
        
        # Obtener usuario_id desde el header o usar un valor predeterminado
        usuario_id = request.headers.get('X-User-Id', 1)
        # Obtiene el ID de usuario del encabezado o usa 1 por defecto.
        
        # Simular el guardado del análisis (en un entorno real, guardarlo en BD)
        current_app.logger.info(f"Análisis guardado para parcela {parcela_id}, tipo: {tipo}")
        # Registra un mensaje de información.
        
        # Registrar la acción si tenemos un usuario identificado
        try:
            if usuario_id:
            # Si hay un ID de usuario.
                registrar_log(usuario_id, 'guardar_analisis', 'parcela', parcela_id,
                          detalles=f"tipo: {tipo}")
                # Intenta registrar la acción de guardar análisis.
        except Exception as log_error:
            current_app.logger.warning(f"Error al registrar log: {log_error}")
            # Registra una advertencia.
        
        return jsonify({
            "success": True,
            "mensaje": "Análisis guardado correctamente",
            "analisis_id": randint(1000, 9999)  # ID simulado
        })
        # Devuelve un mensaje de éxito y un ID simulado.
        
    except Exception as e:
    # Captura cualquier excepción.
        current_app.logger.error(f"Error guardando análisis: {str(e)}")
        # Registra el error.
        return jsonify({"error": "Error al guardar el análisis", "details": str(e)}), 500
        # Devuelve un error 500.

@app.route('/api/alertas', methods=['GET'])
# Define una ruta GET para '/api/alertas'.
def obtener_alertas():
    user_id = request.args.get('user_id')
    # Obtiene el ID de usuario de los argumentos de la solicitud.
    inactivas = request.args.get('inactivas')
    # Obtiene el parámetro 'inactivas'.
    query = AlertaSensor.query
    # Crea una consulta base para AlertaSensor.

    if user_id:
    # Si se proporciona un ID de usuario.
        parcelas_usuario = Parcela.query.filter_by(usuario_id=user_id).all()
        # Consulta las parcelas del usuario.
        parcelas_ids = [p.id for p in parcelas_usuario]
        # Obtiene los IDs de las parcelas.
        query = query.filter(AlertaSensor.parcela.in_(parcelas_ids))
        # Filtra las alertas por los IDs de las parcelas del usuario.
    if inactivas == "1":
    # Si se solicita ver las alertas inactivas.
        query = query.filter(AlertaSensor.activa == False)
        # Filtra las alertas inactivas.
    else:
        query = query.filter(AlertaSensor.activa == True)
        # Por defecto, filtra las alertas activas.

    alertas = query.order_by(AlertaSensor.timestamp.desc()).limit(20).all()
    # Consulta las últimas 20 alertas, ordenadas por timestamp descendente.

    resultado = []
    # Inicializa una lista para el resultado.
    for alerta in alertas:
    # Itera sobre cada alerta.
        parcela = Parcela.query.get(alerta.parcela)
        # Busca la parcela asociada a la alerta.

        # --- Lógica para decodificar valor ---
        valor = alerta.valor
        # Obtiene el valor de la alerta.
        if isinstance(valor, str):
        # Si el valor es una cadena.
            try:
                valor_json = json.loads(valor)
                # Intenta parsear el valor como JSON.
                # Si es un dict, extrae el campo relevante (ejemplo: para nutrientes)
                if isinstance(valor_json, dict):
                    # Si es pH, humedad o temperatura, probablemente no sea dict
                    # Si tiene solo un valor, extrae ese valor
                    if len(valor_json) == 1:
                        valor = list(valor_json.values())[0]
                        # Extrae el único valor del diccionario.
                    else:
                        valor = valor_json
                        # Mantiene el diccionario si tiene múltiples valores.
                else:
                    valor = valor_json
                    # Usa el valor JSON si no es un diccionario.
            except Exception:
                pass  # Si falla, deja el valor original
                # Si falla el parseo JSON, mantiene el valor original.
        # -------------------------------------

        resultado.append({
            "id": alerta.id,
            "mensaje": alerta.mensaje,
            "timestamp": alerta.timestamp.strftime("%d/%m/%Y %H:%M"),
            "parcela": parcela.nombre if parcela else "Desconocida",
            "tipo": alerta.tipo,
            "severidad": alerta.severidad,
            "valor": valor,  # <-- valor ya procesado
        })
        # Añade la alerta formateada al resultado.
    return jsonify(resultado)
    # Devuelve el resultado en formato JSON.

@app.route('/api/alertas/<int:alerta_id>/revisada', methods=['PUT'])
# Define una ruta PUT para '/api/alertas/<alerta_id>/revisada'.
def marcar_alerta_como_revisada(alerta_id):
    alerta = AlertaSensor.query.get(alerta_id)
    # Busca la alerta por su ID.
    if not alerta:
    # Si la alerta no se encuentra.
        return jsonify({'error': 'Alerta no encontrada'}), 404
        # Devuelve un error 404.
    alerta.activa = False
    # Marca la alerta como inactiva.
    db.session.commit()
    # Confirma los cambios.
    return jsonify({'mensaje': 'Alerta marcada como revisada'})
    # Devuelve un mensaje de éxito.

@app.route('/api/alertas/<int:alerta_id>', methods=['DELETE'])
# Define una ruta DELETE para '/api/alertas/<alerta_id>'.
def eliminar_alerta(alerta_id):
    alerta = AlertaSensor.query.get(alerta_id)
    # Busca la alerta por su ID.
    if not alerta:
    # Si la alerta no se encuentra.
        return jsonify({'error': 'Alerta no encontrada'}), 404
        # Devuelve un error 404.
    db.session.delete(alerta)
    # Elimina la alerta.
    db.session.commit()
    # Confirma los cambios.
    return jsonify({'mensaje': 'Alerta eliminada correctamente'})
    # Devuelve un mensaje de éxito.

@app.route('/api/alertas', methods=['POST'])
# Define una ruta POST para '/api/alertas'.
def crear_alerta():
    try:
        data = request.json
        # Obtiene los datos JSON.
        
        # Validar datos
        parcela_id = data.get('parcela')
        # Obtiene el ID de la parcela.
        if not parcela_id:
        # Si no se proporciona un ID de parcela.
            return jsonify({'error': 'Se requiere ID de parcela'}), 400
            # Devuelve un error 400.
            
        # Buscar la parcela
        parcela = Parcela.query.get(parcela_id)
        # Busca la parcela por su ID.
        if not parcela:
        # Si la parcela no se encuentra.
            return jsonify({'error': 'Parcela no encontrada'}), 404
            # Devuelve un error 404.
            
        # Crear nueva alerta
        nueva_alerta = AlertaSensor(
            parcela=parcela_id,
            sensor_id=data.get('sensor_id'),
            tipo=data.get('tipo', 'Sistema'),
            valor=data.get('valor'),
            severidad=data.get('severidad', 'alerta'),
            mensaje=data.get('mensaje', 'Alerta del sistema'),
            timestamp=datetime.now(UTC),
            activa=True
        )
        # Crea una nueva instancia de AlertaSensor.
        
        # Guardar en base de datos
        db.session.add(nueva_alerta)
        # Añade la nueva alerta a la sesión.
        db.session.commit()
        # Confirma los cambios.
        
        # ENVIAR CORREO AUTOMÁTICAMENTE AL USUARIO ASOCIADO A LA PARCELA
        try:
            # Obtener usuario asociado a la parcela
            usuario_id = parcela.usuario_id
            # Obtiene el ID de usuario de la parcela.
            if usuario_id:
            # Si hay un ID de usuario.
                usuario = Usuario.query.get(usuario_id)
                # Busca el usuario.
                
                if usuario and usuario.email:
                # Si el usuario existe y tiene un email.
                    # Preparar datos para la notificación
                    datos_parcela = {
                        'nombre': parcela.nombre,
                        'cultivo': parcela.cultivo_actual if hasattr(parcela, 'cultivo_actual') else '',
                        'id': parcela.id
                    }
                    # Prepara los datos de la parcela.
                    
                    alerta_data = {
                        'id': nueva_alerta.id,
                        'tipo': nueva_alerta.tipo,
                        'valor': nueva_alerta.valor,
                        'severidad': nueva_alerta.severidad,
                        'mensaje': nueva_alerta.mensaje,
                        'timestamp': nueva_alerta.timestamp.isoformat()
                    }
                    # Prepara los datos de la alerta.
                    
                    # Enviar correo de notificación
                    enviar_correo_alerta(usuario.email, alerta_data, datos_parcela)
                    # Envía el correo de alerta.
                    print(f"Correo de alerta enviado a {usuario.email}")
                    # Imprime un mensaje de éxito.
        except Exception as email_error:
            # Si hay error al enviar el correo, solo lo registramos pero continuamos
            print(f"Error al enviar correo de notificación: {str(email_error)}")
            # Imprime el error.
        
        # Devolvemos respuesta exitosa
        return jsonify({
            'mensaje': 'Alerta creada correctamente',
            'alerta': {
                'id': nueva_alerta.id,
                'tipo': nueva_alerta.tipo,
                'severidad': nueva_alerta.severidad,
                'mensaje': nueva_alerta.mensaje
            }
        }), 201
        # Devuelve un mensaje de éxito y los datos de la alerta con código 201.
            
    except Exception as e:
    # Captura cualquier excepción.
        db.session.rollback()
        # Revierte la transacción.
        current_app.logger.error(f"Error al crear alerta: {str(e)}")
        # Registra el error.
        return jsonify({'error': f"Error al crear alerta: {str(e)}"}), 500
        # Devuelve un error 500.


@app.route('/')
# Define la ruta raíz.
def home():
    return "<h2>EcoSmart Backend funcionando correctamente en el puerto 5000 🚀</h2>"
    # Devuelve un mensaje HTML indicando que el backend está funcionando.
# ...existing code...

# Agregar endpoint de debug para ver rutas
@app.route('/api/debug/routes', methods=['GET'])
# Define una ruta GET para '/api/debug/routes'.
def debug_routes():
    """Endpoint para debug - listar todas las rutas registradas"""
    # Docstring que describe la función.
    routes = []
    # Inicializa una lista para las rutas.
    for rule in app.url_map.iter_rules():
    # Itera sobre todas las reglas de URL de la aplicación.
        routes.append({
            'endpoint': rule.endpoint,
            'methods': list(rule.methods),
            'url': str(rule)
        })
        # Añade la información de la ruta a la lista.
    return jsonify({
        "total_routes": len(routes),
        "routes": routes
    })
    # Devuelve el número total de rutas y la lista de rutas en formato JSON.
    
    
    # ...existing code...

@app.route('/api/cultivos', methods=['GET'])
# Define una ruta GET para '/api/cultivos'.
def listar_cultivos():
    """Listar todos los cultivos disponibles"""
    # Docstring que describe la función.
    try:
        # Verificar autorización
        token = request.headers.get('Authorization')
        # Obtiene el token de autorización del encabezado.
        if not token:
        # Si no hay token.
            return jsonify({'error': 'Token requerido'}), 401
            # Devuelve un error 401.
        
        # Consultar todos los cultivos
        cultivos = DetalleCultivo.query.all()
        # Consulta todos los cultivos.
        
        cultivos_data = []
        # Inicializa una lista para los datos de los cultivos.
        for cultivo in cultivos:
        # Itera sobre cada cultivo.
            cultivos_data.append({
                'id': cultivo.id,
                'parcela_id': cultivo.parcela_id,
                'nombre': cultivo.nombre,
                'variedad': cultivo.variedad,
                'etapa_desarrollo': cultivo.etapa_desarrollo,
                'fecha_siembra': cultivo.fecha_siembra.isoformat() if cultivo.fecha_siembra else None,
                'dias_cosecha_estimados': cultivo.dias_cosecha_estimados,
                'edad_dias': cultivo.calcular_edad_dias() if hasattr(cultivo, 'calcular_edad_dias') else None,
                'fecha_siembra': cultivo.fecha_siembra.isoformat() if cultivo.fecha_siembra else None,
                'dias_cosecha_estimados': cultivo.dias_cosecha_estimados,
                'edad_dias': cultivo.calcular_edad_dias() if hasattr(cultivo, 'calcular_edad_dias') else None,
                'progreso_cosecha': round(cultivo.progreso_cosecha(), 1) if hasattr(cultivo, 'progreso_cosecha') else None,
                'activo': cultivo.activo,
                'fecha_cosecha': cultivo.fecha_cosecha.isoformat() if cultivo.fecha_cosecha else None
            })
            # Añade los datos del cultivo a la lista.
        
        return jsonify(cultivos_data)
        # Devuelve la lista de datos de cultivos en formato JSON.
    
    except Exception as e:
    # Captura cualquier excepción.
        current_app.logger.error(f"Error al listar cultivos: {str(e)}")
        # Registra el error.
        return jsonify({'error': f"Error al obtener cultivos: {str(e)}"}), 500
        # Devuelve un error 500.

@app.route('/api/cultivos/<int:cultivo_id>', methods=['GET'])
# Define una ruta GET para '/api/cultivos/<cultivo_id>'.
def obtener_cultivo(cultivo_id):
    """Obtener un cultivo específico por ID"""
    # Docstring que describe la función.
    try:
        cultivo = DetalleCultivo.query.get(cultivo_id)
        # Busca el cultivo por su ID.
        if not cultivo:
        # Si el cultivo no se encuentra.
            return jsonify({'error': 'Cultivo no encontrado'}), 404
            # Devuelve un error 404.
        
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
        # Prepara un diccionario con los datos del cultivo.
        
        return jsonify(cultivo_data)
        # Devuelve los datos del cultivo en formato JSON.
    
    except Exception as e:
    # Captura cualquier excepción.
        current_app.logger.error(f"Error al obtener cultivo: {str(e)}")
        # Registra el error.
        return jsonify({'error': f"Error al obtener cultivo: {str(e)}"}), 500
        # Devuelve un error 500.

@app.route('/api/parcelas/<int:parcela_id>/cultivo', methods=['GET'])
# Define una ruta GET para '/api/parcelas/<parcela_id>/cultivo'.
def obtener_cultivo_por_parcela(parcela_id):
    """Obtener el cultivo activo de una parcela específica"""
    # Docstring que describe la función.
    try:
        # Buscar el cultivo activo de la parcela
        cultivo = DetalleCultivo.query.filter_by(
            parcela_id=parcela_id, 
            activo=True
        ).first()
        # Busca el cultivo activo para la parcela.
        
        if not cultivo:
        # Si no hay cultivo activo.
            return jsonify({'error': 'No hay cultivo activo en esta parcela'}), 404
            # Devuelve un error 404.
        
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
        # Prepara un diccionario con los datos del cultivo.
        
        return jsonify(cultivo_data)
        # Devuelve los datos del cultivo en formato JSON.
    
    except Exception as e:
    # Captura cualquier excepción.
        current_app.logger.error(f"Error al obtener cultivo de parcela: {str(e)}")
        # Registra el error.
        return jsonify({'error': f"Error al obtener cultivo: {str(e)}"}), 500
        # Devuelve un error 500.

#endpoints informes
# Agregar estos endpoints al final del archivo, antes de if __name__ == '__main__':


@app.route('/api/informes/resumen', methods=['GET'])
# Define una ruta GET para '/api/informes/resumen'.
def obtener_resumen_informes():
    """Endpoint específico para obtener resumen de métricas"""
    # Docstring que describe la función.
    try:
        parcela_id = request.args.get('parcela_id')
        # Obtiene el ID de la parcela.
        periodo = request.args.get('periodo', '24h')
        # Obtiene el período, por defecto '24h'.
        
        # Calcular fecha desde
        desde = datetime.now(UTC)
        # Inicializa la fecha de inicio.
        if periodo == '7d':
            desde = desde - timedelta(days=7)
            # Ajusta para 7 días.
        elif periodo == '30d':
            desde = desde - timedelta(days=30)
            # Ajusta para 30 días.
        else:  # '24h' por defecto
            desde = desde - timedelta(hours=24)
            # Ajusta para 24 horas.
        
        # Construir consulta base
        query_base = LecturaSensor.query.filter(
            LecturaSensor.timestamp >= desde
        )
        # Crea una consulta base para LecturaSensor.
        
        if parcela_id:
            query_base = query_base.filter(LecturaSensor.parcela == parcela_id)
            # Filtra por ID de parcela si se proporciona.
        
        # Obtener promedios por tipo de sensor
        temp_data = query_base.filter(LecturaSensor.tipo == 'Temperatura').all()
        # Consulta los datos de temperatura.
        humedad_data = query_base.filter(LecturaSensor.tipo == 'Humedad').all()
        # Consulta los datos de humedad.
        temperatura_promedio=0
        humedad_promedio = 0
        
        if temp_data:
            valores_temp = [float(d.valor) for d in temp_data if d.valor]
            # Extrae los valores de temperatura.
            temperatura_promedio = round(sum(valores_temp) / len(valores_temp), 1) if valores_temp else 0
            # Calcula el promedio de temperatura.
        
        
        # Obtener promedios por tipo de sensor
        temp_data = query_base.filter(LecturaSensor.tipo == 'Temperatura').all()
        # Consulta los datos de temperatura.
        humedad_data = query_base.filter(LecturaSensor.tipo == 'Humedad').all()
        # Consulta los datos de humedad.
        temperatura_promedio=0
        humedad_promedio = 0
        
        if temp_data:
            valores_temp = [float(d.valor) for d in temp_data if d.valor]
            # Extrae los valores de temperatura.
            temperatura_promedio = round(sum(valores_temp) / len(valores_temp), 1) if valores_temp else 0
            # Calcula el promedio de temperatura.
        
        if humedad_data:
            valores_humedad = [float(d.valor) for d in humedad_data if d.valor]
            # Extrae los valores de humedad.
            humedad_promedio = round(sum(valores_humedad) / len(valores_humedad), 1) if valores_humedad else 0
            # Calcula el promedio de humedad.
        
        # Contar alertas por severidad
        alertas_query = AlertaSensor.query.filter(AlertaSensor.timestamp >= desde)
        # Crea una consulta para alertas.
        if parcela_id:
            alertas_query = alertas_query.filter(AlertaSensor.parcela == parcela_id)
            # Filtra por ID de parcela si se proporciona.
        
        alertas_criticas = alertas_query.filter(AlertaSensor.severidad == 'critico').count()
        # Cuenta las alertas críticas.
        alertas_moderadas = alertas_query.filter(
            (AlertaSensor.severidad == 'moderado') | (AlertaSensor.severidad == 'alerta')
        ).count()
        # Cuenta las alertas moderadas.
        alertas_bajas = alertas_query.filter(AlertaSensor.severidad == 'baja').count()
        # Cuenta las alertas bajas.
        
        # Contar parcelas
        parcelas_total = Parcela.query.count()
        # Cuenta el número total de parcelas.
        
        resumen = {
            'temperatura_promedio': temperatura_promedio,
            'humedad_promedio': humedad_promedio,
            'parcelas_monitoreadas': parcelas_total,
            'alertas_criticas': alertas_criticas,
            'alertas_moderadas': alertas_moderadas,
            'alertas_bajas': alertas_bajas,
            'alertas_totales': alertas_criticas + alertas_moderadas + alertas_bajas,
            'periodo': periodo,
            'fecha_desde': desde.isoformat(),
            'fecha_hasta': datetime.now(UTC).isoformat()
        }
        # Prepara el diccionario de resumen.
        
        # Registrar log
        user_id = request.headers.get('X-User-Id')
        # Obtiene el ID de usuario.
        if user_id:
        # Si hay un ID de usuario.
            try:
                registrar_log(user_id, 'consulta_resumen', 'informes', None,
                             detalles=f"periodo={periodo}, parcela={parcela_id}")
                # Intenta registrar la acción de consulta de resumen.
            except Exception as e:
                current_app.logger.error(f"Error al registrar log: {e}")
                # Registra el error.
        
        return jsonify(resumen)
        # Devuelve el resumen en formato JSON.
        
    except Exception as e:
    # Captura cualquier excepción.
        current_app.logger.error(f"Error al obtener resumen: {e}")
        # Registra el error.
        return jsonify({'error': str(e)}), 500
        # Devuelve un error 500.

@app.route('/api/sensores/datos/completos', methods=['GET'])
# Define una ruta GET para '/api/sensores/datos/completos'.
def obtener_datos_sensores_completos():
    """Obtener datos completos de todos los sensores para gráficos"""
    # Docstring que describe la función.
    try:
        parcela_id = request.args.get('parcela')
        # Obtiene el ID de la parcela.
        if not parcela_id:
        # Si no se proporciona un ID de parcela.
            return jsonify({"error": "Falta parámetro 'parcela'"}), 400
            # Devuelve un error 400.
            
        periodo = request.args.get('periodo', '24h')
        # Obtiene el período, por defecto '24h'.
        
        # Calcular fecha desde
        desde = datetime.now(UTC)
        # Inicializa la fecha de inicio.
        if periodo == '7d':
            desde = desde - timedelta(days=7)
            # Ajusta para 7 días.
        elif periodo == '30d':
            desde = desde - timedelta(days=30)
            # Ajusta para 30 días.
        else:  # '24h' por defecto
            desde = desde - timedelta(hours=24)
            # Ajusta para 24 horas.
        
        # Consultar todos los tipos de sensores
        tipos_sensores = ['Temperatura', 'Humedad', 'pH del suelo', 'Nutrientes']
        # Define los tipos de sensores.
        resultado = {}
        # Inicializa un diccionario para el resultado.
        
        for tipo in tipos_sensores:
        # Itera sobre cada tipo de sensor.
            datos = LecturaSensor.query.filter(
                LecturaSensor.parcela == parcela_id,
                LecturaSensor.tipo == tipo,
                LecturaSensor.timestamp >= desde
            ).order_by(LecturaSensor.timestamp).all()
            # Consulta las lecturas de sensores.
            
            # Formatear datos según el tipo
            if tipo == 'Nutrientes':
            # Si el tipo es 'Nutrientes'.
                datos_formateados = []
                # Inicializa una lista para los datos formateados.
                for d in datos:
                # Itera sobre cada dato.
                    try:
                        valor_obj = json.loads(d.valor)
                        # Intenta parsear el valor como JSON.
                        datos_formateados.append({
                            "timestamp": d.timestamp.isoformat(),
                            "valor": valor_obj
                        })
                        # Añade el timestamp y el objeto valor.
                    except (JSONDecodeError, TypeError, ValueError):
                        try:
                            datos_formateados.append({
                                "timestamp": d.timestamp.isoformat(),
                                "valor": float(d.valor)
                            })
                            # Intenta convertir el valor a flotante.
                        except:
                            continue
                            # Si falla, salta a la siguiente iteración.
            else:
                datos_formateados = []
                # Inicializa una lista para los datos formateados.
                for d in datos:
                # Itera sobre cada dato.
                    try:
                        datos_formateados.append({
                            "timestamp": d.timestamp.isoformat(),
                            "valor": float(d.valor)
                        })
                        # Añade el timestamp y el valor flotante.
                    except (ValueError, TypeError):
                        continue
                        # Si falla, salta a la siguiente iteración.
            
            # Mapear nombres para compatibilidad
            if tipo == 'Temperatura':
                resultado['temperatura'] = datos_formateados
                # Asigna los datos a la clave 'temperatura'.
            elif tipo == 'Humedad':
                resultado['humedad'] = datos_formateados
                # Asigna los datos a la clave 'humedad'.
            elif tipo == 'pH del suelo':
                resultado['ph'] = datos_formateados
                # Asigna los datos a la clave 'ph'.
            elif tipo == 'Nutrientes':
                resultado['nutrientes'] = datos_formateados
                # Asigna los datos a la clave 'nutrientes'.
        
        # Registrar log
        user_id = request.headers.get('X-User-Id')
        # Obtiene el ID de usuario.
        if user_id:
        # Si hay un ID de usuario.
            try:
                registrar_log(user_id, 'consulta_datos_completos', 'sensores', parcela_id,
                             detalles=f"periodo={periodo}")
                # Intenta registrar la acción de consulta de datos completos.
            except Exception as e:
                current_app.logger.error(f"Error al registrar log: {e}")
                # Registra el error.
        
        return jsonify(resultado)
        # Devuelve el resultado en formato JSON.
        
    except Exception as e:
    # Captura cualquier excepción.
        current_app.logger.error(f"Error al obtener datos completos: {e}")
        # Registra el error.
        return jsonify({"error": str(e)}), 500
        # Devuelve un error 500.

# REEMPLAZA el endpoint anterior con este nuevo nombre:

@app.route('/api/informes/alertas', methods=['GET'])
# Define una ruta GET para '/api/informes/alertas'.
def obtener_alertas_para_informes():
    """Obtener historial completo de alertas específicamente para informes interactivos"""
    # Docstring que describe la función.
    try:
        # Parámetros de filtrado
        parcela_id = request.args.get('parcela_id')
        # Obtiene el ID de la parcela.
        severidad = request.args.get('severidad')
        # Obtiene la severidad.
        activas_solo = request.args.get('activas_solo', 'false').lower() == 'true'
        # Obtiene el parámetro 'activas_solo'.
        limite = request.args.get('limite', 100, type=int)
        # Obtiene el límite de resultados.
        offset = request.args.get('offset', 0, type=int)
        # Obtiene el offset para paginación.
        fecha_desde = request.args.get('fecha_desde')
        # Obtiene la fecha de inicio.
        fecha_hasta = request.args.get('fecha_hasta')
        # Obtiene la fecha de fin.
        
        # Construir consulta base
        query = AlertaSensor.query
        # Crea una consulta base para AlertaSensor.
        
        # Filtro por parcela específica
        if parcela_id:
            query = query.filter(AlertaSensor.parcela == parcela_id)
            # Filtra por ID de parcela.
        
        # Filtro por severidad
        if severidad and severidad != 'todas':
        # Si se proporciona una severidad y no es 'todas'.
            # Normalizar severidad
            if severidad == 'alerta':
                severidad = 'moderado'
                # Normaliza 'alerta' a 'moderado'.
            elif severidad == 'critico':
                severidad = 'critico'
                # Mantiene 'critico'.
            elif severidad == 'baja':
                severidad = 'baja'
                # Mantiene 'baja'.
            query = query.filter(AlertaSensor.severidad == severidad)
            # Filtra por severidad.
        
        # Filtro por estado activo/inactivo
        if activas_solo:
            query = query.filter(AlertaSensor.activa == True)
            # Filtra por alertas activas.
        
        # Filtros por fecha
        if fecha_desde:
            try:
                fecha_desde_dt = datetime.fromisoformat(fecha_desde.replace('Z', '+00:00'))
                # Parsea la fecha de inicio.
                query = query.filter(AlertaSensor.timestamp >= fecha_desde_dt)
                # Filtra por fecha de inicio.
            except ValueError:
                current_app.logger.warning(f"Formato de fecha_desde inválido: {fecha_desde}")
                # Registra una advertencia.
        
        if fecha_hasta:
            try:
                fecha_hasta_dt = datetime.fromisoformat(fecha_hasta.replace('Z', '+00:00'))
                # Parsea la fecha de fin.
                query = query.filter(AlertaSensor.timestamp <= fecha_hasta_dt)
                # Filtra por fecha de fin.
            except ValueError:
                current_app.logger.warning(f"Formato de fecha_hasta inválido: {fecha_hasta}")
                # Registra una advertencia.
        
        # Contar total para paginación
        total_alertas = query.count()
        # Cuenta el número total de alertas.
        
        # Ordenar por fecha más reciente y aplicar paginación
        alertas = query.order_by(AlertaSensor.timestamp.desc()).offset(offset).limit(limite).all()
        # Ordena y pagina las alertas.
        
        # Formatear resultado
        alertas_data = []
        # Inicializa una lista para los datos de las alertas.
        for alerta in alertas:
        # Itera sobre cada alerta.
            # Obtener nombre de parcela
            parcela = Parcela.query.get(alerta.parcela)
            # Busca la parcela.
            parcela_nombre = parcela.nombre if parcela else f"Parcela {alerta.parcela}"
            # Obtiene el nombre de la parcela.
            
            # Formatear fecha para compatibilidad
            fecha_formateada = alerta.timestamp.strftime("%d/%m/%Y %H:%M") if alerta.timestamp else "Fecha no disponible"
            # Formatea la fecha.
            
            alerta_item = {
                'id': alerta.id,
                'parcela': parcela_nombre,
                'tipo': alerta.tipo,
                'severidad': alerta.severidad,
                'mensaje': alerta.mensaje,
                'valor': alerta.valor,
                'timestamp': alerta.timestamp.isoformat() if alerta.timestamp else None,
                'fecha_formateada': fecha_formateada,
                'activa': getattr(alerta, 'activa', True),
                'sensor_id': getattr(alerta, 'sensor_id', None)
            }
            # Prepara un diccionario con los datos de la alerta.
            alertas_data.append(alerta_item)
            # Añade la alerta a la lista.
        
        # Registrar log
        user_id_header = request.headers.get('X-User-Id')
        # Obtiene el ID de usuario del encabezado.
        if user_id_header:
        # Si hay un ID de usuario.
            try:
                filtros_log = {
                    'parcela_id': parcela_id,
                    'severidad': severidad,
                    'activas_solo': activas_solo,
                    'total_encontradas': len(alertas_data)
                }
                registrar_log(user_id_header, 'consulta_alertas_informes', 'alertas', None,
                             detalles=str(filtros_log))
                # Intenta registrar la acción de consulta de alertas para informes.
            except Exception as e:
                current_app.logger.error(f"Error al registrar log: {e}")
                # Registra el error.
        
        # Respuesta con metadatos de paginación
        respuesta = {
            'alertas': alertas_data,
            'total': total_alertas,
            'limite': limite,
            'offset': offset,
            'tiene_mas': (offset + limite) < total_alertas
        }
        # Prepara la respuesta con los datos de las alertas y metadatos de paginación.
        
        return jsonify(respuesta)
        # Devuelve la respuesta en formato JSON.
        
    except Exception as e:
    # Captura cualquier excepción.
        current_app.logger.error(f"Error al obtener alertas para informes: {e}")
        # Registra el error.
        return jsonify({'error': str(e)}), 500
        # Devuelve un error 500.

# Endpoint adicional específico para estadísticas de alertas en informes
@app.route('/api/informes/alertas/estadisticas', methods=['GET'])
# Define una ruta GET para '/api/informes/alertas/estadisticas'.
def obtener_estadisticas_alertas_informes():
    """Obtener estadísticas de alertas específicamente para informes"""
    # Docstring que describe la función, indicando que se obtienen estadísticas de alertas para informes.
    try:
        parcela_id = request.args.get('parcela_id')
        # Obtiene el ID de la parcela de los argumentos de la solicitud.
        periodo_dias = request.args.get('periodo_dias', 30, type=int)
        # Obtiene el número de días para el período, por defecto 30.

        # Calcular fecha desde
        desde = datetime.now(UTC) - timedelta(days=periodo_dias)
        # Calcula la fecha de inicio restando el número de días del período actual.

        # Construir consulta base
        query = AlertaSensor.query.filter(AlertaSensor.timestamp >= desde)
        # Crea una consulta base para obtener alertas que ocurrieron desde la fecha calculada.

        if parcela_id:
            query = query.filter(AlertaSensor.parcela == parcela_id)
            # Si se proporciona un ID de parcela, filtra la consulta para incluir solo alertas de esa parcela.

        # Estadísticas por severidad
        criticas = query.filter(AlertaSensor.severidad == 'critico').count()
        # Cuenta el número de alertas críticas.
        moderadas = query.filter(
            (AlertaSensor.severidad == 'moderado') | (AlertaSensor.severidad == 'alerta')
        ).count()
        # Cuenta el número de alertas moderadas o de alerta.
        bajas = query.filter(AlertaSensor.severidad == 'baja').count()
        # Cuenta el número de alertas bajas.

        # Estadísticas por tipo
        tipos_query = query.with_entities(
            AlertaSensor.tipo,
            func.count(AlertaSensor.id).label('total')
        ).group_by(AlertaSensor.tipo).all()
        # Consulta el número total de alertas agrupadas por tipo.

        tipos_estadisticas = [{'tipo': tipo, 'total': total} for tipo, total in tipos_query]
        # Crea una lista de diccionarios con el tipo de alerta y su total.

        # Alertas activas vs resueltas
        activas = query.filter(AlertaSensor.activa == True).count()
        # Cuenta el número de alertas activas.
        resueltas = query.filter(AlertaSensor.activa == False).count()
        # Cuenta el número de alertas resueltas.

        # Tendencia por días (últimos 7 días)
        tendencia = []
        # Inicializa una lista para almacenar la tendencia de alertas.
        for i in range(7):
            fecha_dia = datetime.now(UTC) - timedelta(days=i)
            # Calcula la fecha de cada uno de los últimos 7 días.
            fecha_inicio = fecha_dia.replace(hour=0, minute=0, second=0, microsecond=0)
            # Establece la hora de inicio del día.
            fecha_fin = fecha_inicio + timedelta(days=1)
            # Establece la hora de fin del día.

            alertas_dia = AlertaSensor.query.filter(
                AlertaSensor.timestamp >= fecha_inicio,
                AlertaSensor.timestamp < fecha_fin
            )
            # Consulta las alertas que ocurrieron en el día.

            if parcela_id:
                alertas_dia = alertas_dia.filter(AlertaSensor.parcela == parcela_id)
                # Si se proporciona un ID de parcela, filtra las alertas para esa parcela.

            total_dia = alertas_dia.count()
            # Cuenta el total de alertas para el día.
            tendencia.append({
                'fecha': fecha_inicio.strftime('%Y-%m-%d'),
                'total': total_dia
            })
            # Añade la fecha y el total de alertas del día a la lista de tendencia.

        estadisticas = {
            'periodo_dias': periodo_dias,
            'total_alertas': criticas + moderadas + bajas,
            'por_severidad': {
                'criticas': criticas,
                'moderadas': moderadas,
                'bajas': bajas
            },
            'por_estado': {
                'activas': activas,
                'resueltas': resueltas
            },
            'por_tipo': tipos_estadisticas,
            'tendencia_7_dias': list(reversed(tendencia))
        }
        # Prepara un diccionario con las estadísticas recopiladas.

        return jsonify(estadisticas)
        # Devuelve las estadísticas en formato JSON.

    except Exception as e:
        current_app.logger.error(f"Error al obtener estadísticas de alertas para informes: {e}")
        # Registra el error en el log.
        return jsonify({'error': str(e)}), 500
        # Devuelve un error 500.

# Endpoint para acciones específicas de alertas en informes
@app.route('/api/informes/alertas/<int:alerta_id>/revisada', methods=['PUT'])
def marcar_alerta_revisada_informes(alerta_id):
    """Marcar una alerta específica como revisada desde informes"""
    # Docstring que describe la función, indicando que se marca una alerta como revisada.
    try:
        alerta = AlertaSensor.query.get(alerta_id)
        # Busca la alerta por su ID.
        if not alerta:
            return jsonify({'error': 'Alerta no encontrada'}), 404
            # Si la alerta no se encuentra, devuelve un error 404.

        alerta.activa = False
        # Marca la alerta como inactiva.
        db.session.commit()
        # Confirma los cambios.

        # Registrar log
        user_id = request.headers.get('X-User -Id')
        if user_id:
            try:
                registrar_log(user_id, 'marcar_alerta_revisada_informe', 'alertas', alerta_id,
                             detalles=f"alerta_id: {alerta_id}")
                # Intenta registrar la acción de marcar la alerta como revisada.
            except Exception as e:
                current_app.logger.error(f"Error al registrar log: {e}")
                # Registra el error.

        return jsonify({
            'mensaje': 'Alerta marcada como revisada',
            'alerta_id': alerta_id
        })
        # Devuelve un mensaje de éxito y el ID de la alerta.

    except Exception as e:
        db.session.rollback()
        # Revierte la transacción en caso de error.
        current_app.logger.error(f"Error al marcar alerta como revisada: {e}")
        # Registra el error.
        return jsonify({'error': str(e)}), 500
        # Devuelve un error 500.

@app.route('/api/informes/alertas/<int:alerta_id>', methods=['DELETE'])
def eliminar_alerta_informes(alerta_id):
    """Eliminar una alerta específica desde informes"""
    # Docstring que describe la función, indicando que se elimina una alerta específica.
    try:
        alerta = AlertaSensor.query.get(alerta_id)
        # Busca la alerta por su ID.
        if not alerta:
            return jsonify({'error': 'Alerta no encontrada'}), 404
            # Si la alerta no se encuentra, devuelve un error 404.

        db.session.delete(alerta)
        # Elimina la alerta de la sesión de la base de datos.
        db.session.commit()
        # Confirma los cambios.

        # Registrar log
        user_id = request.headers.get('X-User -Id')
        if user_id:
            try:
                registrar_log(user_id, 'eliminar_alerta_informe', 'alertas', alerta_id,
                             detalles=f"alerta_id: {alerta_id}")
                # Intenta registrar la acción de eliminar la alerta.
            except Exception as e:
                current_app.logger.error(f"Error al registrar log: {e}")
                # Registra el error.

        return jsonify({
            'mensaje': 'Alerta eliminada correctamente',
            'alerta_id': alerta_id
        })
        # Devuelve un mensaje de éxito y el ID de la alerta.

    except Exception as e:
        db.session.rollback()
        # Revierte la transacción en caso de error.
        current_app.logger.error(f"Error al eliminar alerta: {e}")
        # Registra el error.
        return jsonify({'error': str(e)}), 500
        # Devuelve un error 500.

@app.route('/api/informes/alertas/marcar_multiples', methods=['PUT'])
def marcar_multiples_alertas_informes():
    """Marcar múltiples alertas como revisadas desde informes"""
    # Docstring que describe la función, indicando que se marcan múltiples alertas como revisadas.
    try:
        data = request.json
        alertas_ids = data.get('alertas_ids', [])
        # Obtiene la lista de IDs de alertas del cuerpo de la solicitud.

        if not alertas_ids:
            return jsonify({'error': 'Se requiere lista de IDs de alertas'}), 400
            # Si no se proporciona una lista de IDs, devuelve un error 400.

        # Actualizar alertas
        alertas_actualizadas = AlertaSensor.query.filter(
            AlertaSensor.id.in_(alertas_ids)
        ).update(
            {AlertaSensor.activa: False},
            synchronize_session=False
        )
        # Marca las alertas como inactivas en la base de datos.

        db.session.commit()
        # Confirma los cambios.

        # Registrar log
        user_id = request.headers.get('X-User-Id')
        if user_id:
            try:
                registrar_log(user_id, 'marcar_multiples_alertas_informe', 'alertas', None,
                             detalles=f"alertas_ids: {alertas_ids}")
                # Intenta registrar la acción de marcar múltiples alertas como revisadas.
            except Exception as e:
                current_app.logger.error(f"Error al registrar log: {e}")
                # Registra el error.

        return jsonify({
            'mensaje': f'{alertas_actualizadas} alertas marcadas como revisadas',
            'alertas_actualizadas': alertas_actualizadas
        })
        # Devuelve un mensaje de éxito y el número de alertas actualizadas.

    except Exception as e:
        db.session.rollback()
        # Revierte la transacción en caso de error.
        current_app.logger.error(f"Error al marcar múltiples alertas: {e}")
        # Registra el error.
        return jsonify({'error': str(e)}), 500
        # Devuelve un error 500.
