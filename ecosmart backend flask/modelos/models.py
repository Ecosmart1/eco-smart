from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from datetime import datetime, timezone, UTC  # Añade UTC aquí

UTC = timezone.utc  # Define UTC como la zona horaria

db = SQLAlchemy()

class LecturaSensor(db.Model):
    __tablename__ = 'lectura_sensor'  # Verificar nombre de tabla
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.now(UTC))
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

