from modelos.models import db, Notificacion, Usuario
from datetime import datetime, UTC
import json

def crear_notificacion(usuario_id, titulo, mensaje, tipo='info', entidad_tipo=None, 
                      entidad_id=None, accion=None, alerta_id=None, metadatos=None):
    """
    Crea una notificación para un usuario
    
    Args:
        usuario_id: ID del usuario destinatario
        titulo: Título de la notificación
        mensaje: Contenido detallado
        tipo: Tipo de notificación ('info', 'warning', 'error', 'success')
        entidad_tipo: Tipo de entidad relacionada (ej: 'parcela')
        entidad_id: ID de la entidad relacionada
        accion: Acción sugerida (ej: 'ver_parcela')
        alerta_id: ID de la alerta que generó esta notificación (para el sistema futuro)
        metadatos: Dict con datos adicionales (será convertido a JSON)
    """
    try:
        # Convertir metadatos a JSON si es necesario
        metadatos_json = None
        if metadatos:
            if isinstance(metadatos, dict):
                metadatos_json = json.dumps(metadatos)
            else:
                metadatos_json = str(metadatos)
        
        notificacion = Notificacion(
            usuario_id=usuario_id,
            titulo=titulo,
            mensaje=mensaje,
            tipo=tipo,
            entidad_tipo=entidad_tipo,
            entidad_id=entidad_id,
            accion=accion,
            alerta_id=alerta_id,
            metadatos=metadatos_json
        )
        
        db.session.add(notificacion)
        db.session.commit()
        
        # Aquí es donde se conectaría con un sistema de WebSockets 
        # para notificaciones en tiempo real (futura implementación)
        
        return True, notificacion.id
    except Exception as e:
        db.session.rollback()
        print(f"Error al crear notificación: {str(e)}")
        return False, None

def notificar_por_rol(rol, titulo, mensaje, tipo='info', entidad_tipo=None, 
                    entidad_id=None, accion=None, alerta_id=None, metadatos=None):
    """Envía la misma notificación a todos los usuarios con un rol específico"""
    try:
        usuarios = Usuario.query.filter_by(rol=rol).all()
        count = 0
        
        for usuario in usuarios:
            crear_notificacion(
                usuario.id, titulo, mensaje, tipo, 
                entidad_tipo, entidad_id, accion,
                alerta_id, metadatos
            )
            count += 1
            
        return True, count
    except Exception as e:
        print(f"Error al enviar notificación grupal: {str(e)}")
        return False, 0

def notificar_sistema_alertas(alerta_id, alerta_datos):
    """
    Punto de conexión futuro con el sistema de alertas
    
    Esta función será llamada por el sistema de alertas cuando se genere una nueva alerta
    """
    try:
        # Este es un ejemplo de cómo se procesaría una alerta
        # El sistema de alertas proporcionaría estos datos
        destinatarios = alerta_datos.get('destinatarios', [])
        tipo_alerta = alerta_datos.get('tipo', 'warning')
        entidad_tipo = alerta_datos.get('entidad_tipo')
        entidad_id = alerta_datos.get('entidad_id')
        titulo = alerta_datos.get('titulo', 'Alerta del sistema')
        mensaje = alerta_datos.get('mensaje', 'Se ha detectado un evento que requiere atención')
        accion = alerta_datos.get('accion')
        
        # Si hay destinatarios específicos
        if destinatarios:
            for usuario_id in destinatarios:
                crear_notificacion(
                    usuario_id, titulo, mensaje, tipo_alerta,
                    entidad_tipo, entidad_id, accion, alerta_id, 
                    alerta_datos.get('metadatos')
                )
        # Si hay roles destinatarios
        elif alerta_datos.get('roles'):
            for rol in alerta_datos.get('roles'):
                notificar_por_rol(
                    rol, titulo, mensaje, tipo_alerta,
                    entidad_tipo, entidad_id, accion, alerta_id,
                    alerta_datos.get('metadatos')
                )
        
        return True
    except Exception as e:
        print(f"Error al procesar alerta: {str(e)}")
        return False