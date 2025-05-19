from modelos.models import db, LogAccionUsuario
from functools import wraps
from flask import request, current_app

def registrar_log(usuario_id, accion, entidad, entidad_id, detalles=None):
    """
    Registra una acción realizada por un usuario en el sistema.
    
    Args:
        usuario_id: ID del usuario que realiza la acción
        accion: Tipo de acción (crear_parcela, actualizar_parametros, etc.)
        entidad: Entidad sobre la que se realiza la acción (parcela, parametros, etc.)
        entidad_id: ID de la entidad (puede ser None)
        detalles: Información adicional sobre la acción
    """
    from modelos.models import LogAccionUsuario, db
    
    try:
        # Convertir usuario_id a entero para evitar problemas
        try:
            usuario_id = int(usuario_id)
        except (ValueError, TypeError):
            print(f"Error: usuario_id inválido: {usuario_id}")
            return
        
        # Crear la entrada en el log
        log = LogAccionUsuario(
            usuario_id=usuario_id,
            accion=accion,
            entidad=entidad,
            entidad_id=entidad_id,
            detalles=str(detalles) if detalles else None
        )
        
        # Imprimir para debugging
        print(f"Registrando acción: {accion} por usuario {usuario_id} en {entidad}")
        
        # Guardar en la base de datos
        db.session.add(log)
        db.session.commit()
        
        print(f"✅ Log guardado correctamente: ID {log.id}")
        return log
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error al registrar log: {str(e)}")
        # Re-lanzar la excepción para que pueda ser capturada y manejada por el caller
        raise


def registrar_accion(accion, entidad, obtener_entidad_id=None):
    """
    Decorador que registra automáticamente una acción al llamar a un endpoint.
    
    Args:
        accion: El tipo de acción (crear_parcela, consultar_datos, etc.)
        entidad: La entidad afectada (parcela, usuario, etc.)
        obtener_entidad_id: Función opcional que extrae el ID de la entidad del resultado
        
    Ejemplo de uso:
        @app.route('/api/parcelas', methods=['POST'])
        @registrar_accion('crear_parcela', 'parcela', lambda resultado, *args, **kwargs: resultado.get('id'))
        def agregar_parcela():
            # ...
    """
    def decorador(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Ejecutar la función original
            resultado = f(*args, **kwargs)
            
            try:
                # Obtener el ID de usuario del header
                user_id = request.headers.get('X-User-Id')
                
                if not user_id:
                    print(f"⚠️ No se encontró X-User-Id para {accion} en {entidad}")
                    return resultado
                
                # Determinar el ID de la entidad
                entidad_id = None
                
                # Si hay una función para obtener el ID
                if obtener_entidad_id:
                    try:
                        entidad_id = obtener_entidad_id(resultado, *args, **kwargs)
                    except Exception as e:
                        print(f"❌ Error obteniendo entidad_id: {e}")
                
                # Si hay un ID en los kwargs (común en rutas como /parcela/<id>)
                elif 'id' in kwargs:
                    entidad_id = kwargs['id']
                elif 'parcela_id' in kwargs:
                    entidad_id = kwargs['parcela_id']
                
                # Obtener detalles de la petición
                detalles = None
                if request.method in ['POST', 'PUT'] and request.is_json:
                    detalles = request.json
                
                # Registrar la acción
                registrar_log(user_id, accion, entidad, entidad_id, detalles)
                
            except Exception as e:
                print(f"❌ Error al registrar log desde decorador: {e}")
                # No interrumpir el flujo normal
                
            return resultado
        return decorated_function
    return decorador