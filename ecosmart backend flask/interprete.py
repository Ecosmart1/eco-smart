from rutas.api_principal import app                                                 
from modelos.models import db                                                                                                              
with app.app_context():
        db.create_all()