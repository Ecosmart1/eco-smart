from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import os

app = Flask(__name__)

# Configura la conexión a la base de datos SQLite
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URI') or 'sqlite:///eco-smart.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  # Para evitar warnings
db = SQLAlchemy(app)
migrate = Migrate(app, db)


# Define tus modelos aquí
class Usuario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)

    def __repr__(self):
        return f'<Usuario {self.nombre}>'


class Cultivo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), nullable=False)
    tipo = db.Column(db.String(120))

    def __repr__(self):
        return f'<Cultivo {self.nombre}>'


class Sensor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    tipo = db.Column(db.String(50), nullable=False)  # temperatura, humedad, ph
    ubicacion = db.Column(db.String(255))

    def __repr__(self):
        return f'<Sensor {self.nombre}>'


class Lectura(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sensor_id = db.Column(db.Integer, db.ForeignKey('sensor.id'), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=db.func.now())  # Timestamp automático

    sensor = db.relationship('Sensor', backref=db.backref('lecturas', lazy=True))

    def __repr__(self):
        return f'<Lectura de {self.sensor.nombre} en {self.timestamp}>'


if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Crea las tablas
        print("¡Base de datos inicializada!")

