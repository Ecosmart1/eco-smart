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



def registrar_accion(accion, entidad, extractor_id=None):
    def decorador(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            resultado = func(*args, **kwargs)
            try:
                user_id = request.headers.get('X-User-Id')
                if user_id:
                    entidad_id = None
                    
                    # Extraer el ID de la entidad según el tipo de respuesta
                    if extractor_id:
                        # Usar la función extractora personalizada
                        try:
                            entidad_id = extractor_id(resultado, *args, **kwargs)
                        except Exception as e:
                            current_app.logger.error(f"❌ Error usando extractor_id: {e}")
                    elif isinstance(resultado, tuple) and len(resultado) > 0:
                        # Es una tupla (respuesta, código)
                        resp_data = resultado[0]
                        if hasattr(resp_data, 'get_json'):
                            # Es un objeto Response
                            json_data = resp_data.get_json()
                            entidad_id = json_data.get('id')
                    elif hasattr(resultado, 'get_json'):
                        # Es un objeto Response directo
                        json_data = resultado.get_json()
                        if isinstance(json_data, dict):
                            entidad_id = json_data.get('id')
                    
                    # Si no se ha encontrado un ID y hay un parámetro 'id' en la ruta
                    if entidad_id is None and 'id' in kwargs:
                        entidad_id = kwargs['id']
                    
                    # Registrar la acción
                    registrar_log(user_id, accion, entidad, entidad_id)
            except Exception as e:
                app.logger.error(f"❌ Error al registrar acción: {str(e)}")
            
            return resultado
        return wrapper
    return decorador