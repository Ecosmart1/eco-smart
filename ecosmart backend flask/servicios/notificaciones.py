import smtplib
import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

# Crear directorio logs si no existe
logs_dir = "logs"
if not os.path.exists(logs_dir):
    os.makedirs(logs_dir)
    print(f"Directorio '{logs_dir}' creado correctamente")

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(logs_dir, "notificaciones.log")),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('servicio_notificaciones')

# Credenciales para enviar correos (mismos que se usan en recuperación de contraseña)
SMTP_CONFIG = {
    'remitente': "ecosmartutalca@gmail.com",
    'password': "fstn dafh rtve hhvm",  # contraseña de aplicación de Gmail
    'smtp_server': "smtp.gmail.com",
    'smtp_port': 465
}

def enviar_correo_alerta(destinatario, alerta, datos_parcela=None):
    """
    Envía una notificación por correo electrónico sobre una alerta detectada
    
    Args:
        destinatario (str): Correo electrónico del destinatario
        alerta (dict): Datos de la alerta detectada
        datos_parcela (dict, opcional): Datos adicionales de la parcela
        
    Returns:
        bool: True si el envío fue exitoso, False en caso contrario
    """
    try:
        logger.info(f"Preparando correo de alerta para {destinatario}")
        logger.info(f"Datos de alerta: {alerta}")
        
        # Obtener tipo de alerta y severidad
        tipo_alerta = alerta.get('tipo', 'Sistema')
        severidad = alerta.get('severidad', 'alerta')
        
        # Configurar asunto según severidad
        if severidad == 'critico':
            asunto = f"🚨 ALERTA CRÍTICA: {tipo_alerta} - EcoSmart"
            color_titulo = "#FF0000"  # Rojo
        else:
            asunto = f"⚠️ Alerta: {tipo_alerta} - EcoSmart"
            color_titulo = "#FFA500"  # Naranja
            
        # Obtener nombre de la parcela
        parcela_nombre = "Sin especificar"
        if datos_parcela and 'nombre' in datos_parcela:
            parcela_nombre = datos_parcela['nombre']
        elif 'parcela_nombre' in alerta:
            parcela_nombre = alerta['parcela_nombre']
            
        # Formatear fecha para mostrar en el correo
        fecha_alerta = datetime.now().strftime("%d/%m/%Y %H:%M")
        if 'timestamp' in alerta:
            try:
                fecha_obj = datetime.fromisoformat(alerta['timestamp'].replace('Z', '+00:00'))
                fecha_alerta = fecha_obj.strftime("%d/%m/%Y %H:%M")
            except Exception as e:
                logger.warning(f"Error al formatear timestamp: {e}")
                
        # Crear cuerpo HTML del correo
        cuerpo_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{asunto}</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: {color_titulo}; padding: 10px 20px; color: white; border-radius: 5px 5px 0 0; }}
                .content {{ border: 1px solid #ddd; border-top: none; padding: 20px; border-radius: 0 0 5px 5px; }}
                .footer {{ margin-top: 20px; font-size: 12px; color: #777; text-align: center; }}
                .btn {{ display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; 
                       text-decoration: none; border-radius: 5px; margin-top: 15px; }}
                .alerta-info {{ margin: 15px 0; padding: 15px; background-color: #f9f9f9; 
                              border-left: 4px solid {color_titulo}; }}
                .alerta-valor {{ font-weight: bold; font-size: 18px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>{asunto}</h2>
                </div>
                <div class="content">
                    <p>Estimado usuario:</p>
                    
                    <p>El sistema EcoSmart ha detectado una <strong>{severidad.upper()}</strong> 
                    en la parcela <strong>{parcela_nombre}</strong> que requiere su atención inmediata:</p>
                    
                    <div class="alerta-info">
                        <p><strong>Tipo:</strong> {alerta.get('tipo', 'No especificado')}</p>
                        <p><strong>Mensaje:</strong> {alerta.get('mensaje', 'No disponible')}</p>
                        <p><strong>Valor detectado:</strong> <span class="alerta-valor">{alerta.get('valor', 'N/A')}</span></p>
                        <p><strong>Fecha y hora:</strong> {fecha_alerta}</p>
                    </div>
                    
                    <p>Te recomendamos revisar de inmediato esta situación y tomar las medidas correctivas necesarias.</p>
                    
                    <a href="http://localhost:5173/dashboard/agricultor/alertas" class="btn">Ver detalles en el sistema</a>
                    
                    <p style="margin-top: 20px;"><small>Si necesitas ayuda, puedes consultar al asistente virtual en la aplicación.</small></p>
                </div>
                <div class="footer">
                    <p>Este es un mensaje automático del sistema EcoSmart. Por favor, no respondas a este correo.</p>
                    <p>&copy; {datetime.now().year} EcoSmart - Sistema de gestión inteligente para agricultura</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Crear versión texto plano del correo para clientes que no soportan HTML
        cuerpo_texto = f"""
ALERTA {severidad.upper()}: {tipo_alerta}

Estimado usuario:

El sistema EcoSmart ha detectado una {severidad.upper()} en la parcela {parcela_nombre} que requiere su atención inmediata:

- Tipo: {alerta.get('tipo', 'No especificado')}
- Mensaje: {alerta.get('mensaje', 'No disponible')}
- Valor detectado: {alerta.get('valor', 'N/A')}
- Fecha y hora: {fecha_alerta}

Te recomendamos revisar de inmediato esta situación y tomar las medidas correctivas necesarias.

Para ver más detalles, accede a EcoSmart en: http://localhost:5173/dashboard/agricultor/alertas

Este es un mensaje automático del sistema EcoSmart. Por favor, no respondas a este correo.
        """
        
        # Configurar mensaje con versión HTML y texto plano
        msg = MIMEMultipart('alternative')
        msg['Subject'] = asunto
        msg['From'] = f"EcoSmart Alertas <{SMTP_CONFIG['remitente']}>"
        msg['To'] = destinatario
        
        # Adjuntar ambas versiones (texto primero, luego HTML)
        msg.attach(MIMEText(cuerpo_texto, 'plain'))
        msg.attach(MIMEText(cuerpo_html, 'html'))
        
        # Enviar correo usando SSL
        logger.info("Conectando al servidor SMTP...")
        with smtplib.SMTP_SSL(SMTP_CONFIG['smtp_server'], SMTP_CONFIG['smtp_port']) as server:
            logger.info("Iniciando sesión en el servidor SMTP...")
            server.login(SMTP_CONFIG['remitente'], SMTP_CONFIG['password'])
            logger.info(f"Enviando correo desde {SMTP_CONFIG['remitente']} a {destinatario}")
            server.sendmail(SMTP_CONFIG['remitente'], destinatario, msg.as_string())
            
        logger.info(f"✅ Notificación de alerta enviada correctamente a {destinatario}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error al enviar correo de alerta: {e}", exc_info=True)
        return False


# Código para probar el envío de correos directamente
if __name__ == "__main__":
    # Este código solo se ejecuta si ejecutas este archivo directamente
    print("=" * 50)
    print("PRUEBA DEL SERVICIO DE NOTIFICACIONES POR CORREO")
    print("=" * 50)
    
    # Solicitar correo de destino para la prueba
    email_destino = input("Ingresa un correo para recibir la prueba: ")
    
    # Crear datos de prueba para simular una alerta
    alerta_prueba = {
        'tipo': 'Humedad',
        'valor': '15%',
        'severidad': 'critico',
        'mensaje': 'Nivel de humedad crítico detectado - PRUEBA',
        'timestamp': datetime.now().isoformat()
    }
    
    datos_parcela = {
        'nombre': 'Parcela de Prueba',
        'cultivo': 'Tomate',
        'id': 1
    }
    
    print(f"\nEnviando correo de prueba a {email_destino}...")
    resultado = enviar_correo_alerta(email_destino, alerta_prueba, datos_parcela)
    
    if resultado:
        print("\n✅ PRUEBA EXITOSA: Correo enviado correctamente.")
        print("Revisa la bandeja de entrada (o spam) para verificar la llegada del correo.")
    else:
        print("\n❌ ERROR: No se pudo enviar el correo de prueba.")
        print("Verifica las credenciales SMTP y la conexión a Internet.")
    
    print("\nRevisa el archivo logs/notificaciones.log para más detalles.")