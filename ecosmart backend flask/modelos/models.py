from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class LecturaSensor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.String, nullable=False)
    sensor_id = db.Column(db.Integer, nullable=False)
    tipo = db.Column(db.String, nullable=False)
    valor = db.Column(db.String, nullable=False)  # Puede ser JSON string
    unidad = db.Column(db.String, nullable=False)



class Usuario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    rol = db.Column(db.String(50), nullable=False)