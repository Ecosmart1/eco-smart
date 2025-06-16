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

class AlertaSensor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    parcela = db.Column(db.Integer)
    sensor_id = db.Column(db.Integer)
    tipo = db.Column(db.String)
    valor = db.Column(db.Float)
    severidad = db.Column(db.String)  # 'alerta' o 'critico'
    mensaje = db.Column(db.String)
    timestamp = db.Column(db.DateTime)
    activa = db.Column(db.Boolean, default=True)  # True si la alerta sigue activa, False si ya fue resuelta

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
    
# AGREGAR al final del archivo, después de la clase DetalleCultivo:

class RangoParametro(db.Model):
    __tablename__ = 'rangos_parametros'
    
    id = db.Column(db.Integer, primary_key=True)
    tipo_parametro = db.Column(db.String(50), nullable=False)  # 'temperatura', 'humedad', 'ph'
    cultivo = db.Column(db.String(100), nullable=True)  # null = global, específico = por cultivo
    parcela_id = db.Column(db.Integer, db.ForeignKey('parcelas.id'), nullable=True)  # null = global
    valor_minimo = db.Column(db.Float, nullable=False)
    valor_maximo = db.Column(db.Float, nullable=False)
    alerta_baja = db.Column(db.Float, nullable=True)  # Para alertas tempranas
    alerta_alta = db.Column(db.Float, nullable=True)
    critico_bajo = db.Column(db.Float, nullable=True)  # Para alertas críticas
    critico_alto = db.Column(db.Float, nullable=True)
    activo = db.Column(db.Boolean, default=True)
    fecha_creacion = db.Column(db.DateTime, default=lambda: datetime.now(UTC))
    fecha_modificacion = db.Column(db.DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
    
    # Relación con parcela
    parcela = db.relationship('Parcela', backref=db.backref('rangos_parametros', lazy=True))
    
    def __repr__(self):
        return f'<RangoParametro {self.tipo_parametro} {self.cultivo or "Global"}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'tipo_parametro': self.tipo_parametro,
            'cultivo': self.cultivo,
            'parcela_id': self.parcela_id,
            'parcela_nombre': self.parcela.nombre if self.parcela else None,
            'valor_minimo': self.valor_minimo,
            'valor_maximo': self.valor_maximo,
            'alerta_baja': self.alerta_baja,
            'alerta_alta': self.alerta_alta,
            'critico_bajo': self.critico_bajo,
            'critico_alto': self.critico_alto,
            'activo': self.activo,
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None,
            'fecha_modificacion': self.fecha_modificacion.isoformat() if self.fecha_modificacion else None
        }
    
    @staticmethod
    def obtener_rango_para_parametro(tipo_parametro, cultivo=None, parcela_id=None):
        """
        Obtiene el rango más específico para un parámetro
        Prioridad: parcela específica > cultivo específico > global
        """
        # 1. Buscar rango específico de parcela
        if parcela_id:
            rango_parcela = RangoParametro.query.filter_by(
                tipo_parametro=tipo_parametro,
                parcela_id=parcela_id,
                activo=True
            ).first()
            if rango_parcela:
                return rango_parcela
        
        # 2. Buscar rango específico de cultivo
        if cultivo:
            rango_cultivo = RangoParametro.query.filter_by(
                tipo_parametro=tipo_parametro,
                cultivo=cultivo,
                parcela_id=None,
                activo=True
            ).first()
            if rango_cultivo:
                return rango_cultivo
        
        # 3. Buscar rango global
        rango_global = RangoParametro.query.filter_by(
            tipo_parametro=tipo_parametro,
            cultivo=None,
            parcela_id=None,
            activo=True
        ).first()
        
        return rango_global
    
    def determinar_severidad(self, valor):
        """
        Determina la severidad de una anomalía basada en el valor
        """
        # Valor dentro del rango normal
        if self.valor_minimo <= valor <= self.valor_maximo:
            return None  # No hay anomalía
        
        # Valor fuera del rango crítico
        if (self.critico_bajo and valor < self.critico_bajo) or \
           (self.critico_alto and valor > self.critico_alto):
            return 'alto'
        
        # Valor fuera del rango de alerta
        if (self.alerta_baja and valor < self.alerta_baja) or \
           (self.alerta_alta and valor > self.alerta_alta):
            return 'medio'
        
        # Valor fuera del rango normal pero no en alerta
        return 'medio'
    
    def obtener_mensaje_anomalia(self, valor, tipo_parametro):
        """
        Genera el mensaje descriptivo de la anomalía
        """
        if valor < self.valor_minimo:
            diferencia = self.valor_minimo - valor
            return f"{tipo_parametro.title()} muy baja: {valor} (mín. esperado: {self.valor_minimo})"
        elif valor > self.valor_maximo:
            diferencia = valor - self.valor_maximo
            return f"{tipo_parametro.title()} muy alta: {valor} (máx. esperado: {self.valor_maximo})"
        else:
            return f"{tipo_parametro.title()} fuera de rango: {valor}"

