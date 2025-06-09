from flask import Flask
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

# Prueba que las variables estén cargadas
@app.route("/")

def home():
    return f"DEBUG: {app.config['DEBUG']}, SECRET_KEY: {app.config['SECRET_KEY']},"
    
    
if __name__ == "__main__":
    app.run(port=Config.PORT, debug=Config.DEBUG)