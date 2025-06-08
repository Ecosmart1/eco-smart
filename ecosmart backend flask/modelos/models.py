from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from datetime import datetime, timezone, UTC  # Añade UTC aquí

UTC = timezone.utc  # Define UTC como la zona horaria

db = SQLAlchemy()

class LecturaSensor(db.Model):
    __tablename__ = 'lecturas_sensores'  # Verificar nombre de tabla
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(UTC))
    parcela = db.Column(db.Integer, db.ForeignKey('parcelas.id'))
    sensor_id = db.Column(db.Integer)
    tipo = db.Column(db.String(50))
    valor = db.Column(db.Text)  # Cambiar de Float a Text para soportar JSON
    unidad = db.Column(db.String(20))



class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    rol = db.Column(db.String(50), nullable=False)
    codigo_recuperacion = db.Column(db.Integer, nullable=True)
    codigo_expira = db.Column(db.DateTime, nullable=True)
# ...existing code...

class Parcela(db.Model):
    __tablename__ = 'parcelas'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    ubicacion = db.Column(db.String(200), nullable=True)
    hectareas = db.Column(db.Float, nullable=True)
    latitud = db.Column(db.Float, nullable=True)
    longitud = db.Column(db.Float, nullable=True)
    fecha_creacion = db.Column(db.DateTime, nullable=True)
    cultivo_actual = db.Column(db.String(100), nullable=True)
    fecha_siembra = db.Column(db.Date, nullable=True)
    
    # AGREGAR: Relación con cultivos
    cultivos = db.relationship('DetalleCultivo', backref='parcela', lazy=True, cascade='all, delete-orphan')
    
    def get_cultivo_activo(self):
        """Obtiene el cultivo activo actual de la parcela"""
        return DetalleCultivo.query.filter_by(parcela_id=self.id, activo=True).first()

# ...existing code...
    
class Conversacion(db.Model):
    __tablename__ = 'conversaciones'
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    # Cambiar de utcnow a now(UTC) para consistencia
    created_at = db.Column(db.DateTime, default=datetime.now(UTC))
    mensajes = db.relationship('Mensaje', backref='conversacion', lazy=True)

    def get_last_message(self):
        # Actualizar para usar timestamp en lugar de created_at
        ultimo_mensaje = Mensaje.query.filter_by(conversacion_id=self.id).order_by(Mensaje.timestamp.desc()).first()
        if ultimo_mensaje:
            return ultimo_mensaje.content
        return ""


class Mensaje(db.Model):
    __tablename__ = 'mensajes'
    id = db.Column(db.Integer, primary_key=True)
    conversacion_id = db.Column(db.Integer, db.ForeignKey('conversaciones.id'))
    sender = db.Column(db.String(20))
    content = db.Column(db.Text)
    # Cambiar created_at a timestamp
    timestamp = db.Column(db.DateTime, default=datetime.now(UTC))


class LogAccionUsuario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, nullable=False)
    accion = db.Column(db.String(100), nullable=False)  # Ej: "crear_parcela", "consulta_ia", "modificar_usuario"
    entidad = db.Column(db.String(100), nullable=True)  # Ej: "parcela", "usuario"
    entidad_id = db.Column(db.Integer, nullable=True)   # ID de la parcela/usuario/etc.
    detalles = db.Column(db.Text, nullable=True)        # JSON/string con detalles extra de la acción
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    
# ...existing code...

# ...existing code...

class DetalleCultivo(db.Model):
    __tablename__ = 'cultivos'
    id = db.Column(db.Integer, primary_key=True)
    parcela_id = db.Column(db.Integer, db.ForeignKey('parcelas.id'), nullable=False)
    nombre = db.Column(db.String(100), nullable=False)
    variedad = db.Column(db.String(100), nullable=True)
    edad = db.Column(db.Integer, nullable=True)
    etapa_desarrollo = db.Column(db.String(50), nullable=True)
    fecha_siembra = db.Column(db.DateTime, nullable=True)
    dias_cosecha_estimados = db.Column(db.Integer, nullable=True)
    activo = db.Column(db.Boolean, default=True)
    fecha_cosecha = db.Column(db.DateTime, nullable=True)
    
    def calcular_edad_dias(self):
        """Calcula la edad en días desde la siembra"""
        if self.fecha_siembra:
            from datetime import datetime, UTC
            
            # Asegurar que ambas fechas tengan la misma zona horaria
            ahora = datetime.now(UTC)
            
            # Si fecha_siembra no tiene zona horaria, agregarla
            if self.fecha_siembra.tzinfo is None:
                fecha_siembra_utc = self.fecha_siembra.replace(tzinfo=UTC)
            else:
                fecha_siembra_utc = self.fecha_siembra
            
            return (ahora - fecha_siembra_utc).days
        return 0
    
    def progreso_cosecha(self):
        """Calcula el porcentaje de progreso hacia la cosecha"""
        if self.dias_cosecha_estimados and self.fecha_siembra:
            edad = self.calcular_edad_dias()
            return min(100, (edad / self.dias_cosecha_estimados) * 100)
        return 0

# ...existing code...
# ...existing code...

class Notificacion(db.Model):
    __tablename__ = 'notificaciones'
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    titulo = db.Column(db.String(200), nullable=False)
    mensaje = db.Column(db.Text, nullable=False)
    tipo = db.Column(db.String(50), nullable=False)  # 'info', 'warning', 'error', 'success'
    leida = db.Column(db.Boolean, default=False)
    fecha_creacion = db.Column(db.DateTime, default=lambda: datetime.now(UTC))
    
    # Campos para conexión con el futuro sistema de alertas
    alerta_id = db.Column(db.Integer, nullable=True)  # ID de la alerta que generó esta notificación
    entidad_tipo = db.Column(db.String(50), nullable=True)  # 'parcela', 'cultivo', 'sensor', etc.
    entidad_id = db.Column(db.Integer, nullable=True)  # ID de la entidad relacionada
    accion = db.Column(db.String(100), nullable=True)  # 'ver_parcela', 'ajustar_riego', etc.
    metadatos = db.Column(db.Text, nullable=True)  # JSON con datos adicionales para el sistema de alertas
    
    # Relación con el usuario
    usuario = db.relationship('Usuario', backref='notificaciones')
    
    def to_dict(self):
        return {
            'id': self.id,
            'titulo': self.titulo,
            'mensaje': self.mensaje,
            'tipo': self.tipo,
            'leida': self.leida,
            'fecha': self.fecha_creacion.isoformat(),
            'entidad_tipo': self.entidad_tipo,
            'entidad_id': self.entidad_id,
            'accion': self.accion,
            'alerta_id': self.alerta_id
        }