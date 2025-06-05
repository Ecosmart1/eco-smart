import os
import requests
import hashlib
import json
from functools import lru_cache
# Definir la clave API y la URL base - CORREGIR LA URL

OPENROUTER_KEY = ' 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'
API_URL = 'https://openrouter.ai/api/v1/chat/completions'  # URL CORREGIDA

# Caché para respuestas (usar lru_cache para limitar tamaño)
@lru_cache(maxsize=100)
def get_cached_response(query_hash):
    # Esta función simplemente sirve como caché en memoria
    # El decorador lru_cache se encarga de almacenar y recuperar valores
    pass


def send_to_deepseek(history_messages, fast_mode=False):
    """
    Envía mensajes a DeepSeek a través de OpenRouter
    history_messages: lista de dicts {role: 'user'|'system'|'assistant', content: str}
    """
    
    
    #Limitar el historial a los ultimos n mensajes
    if len(history_messages) > 6:
        system_messages = [msg for msg in history_messages if msg.get('role') == 'system']
        user_assistant_messages = [msg for msg in history_messages if msg.get('role') != 'system']
        
        # Tomar solo los últimos mensajes
        limited_messages = system_messages + user_assistant_messages[-5:]
        history_messages = limited_messages
    
    headers = {
    'Authorization': f'Bearer {OPENROUTER_KEY.strip()}',  # Asegurarse de eliminar espacios
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://ecosmart.com',
    'X-Title': 'EcoSmart Asistente'
}
    
   # Seleccionar el modelo basado en fast_mode
    if fast_mode:
        # Modelos rápidos: gpt-3.5-turbo o llamadas similares
        model = "gpt-3.5-turbo:openai"
        max_tokens = 300  # Respuestas más cortas para mayor velocidad
        temperature = 0.5  # Más determinista
    else:
        # Modelo estándar actual
        model = "deepseek/deepseek-r1:free"
        max_tokens = 2000
        temperature = 0.7   
    

    payload = {
        "model": model, 
        "messages": history_messages,
        "temperature": temperature,       # Valores más bajos = respuestas más rápidas y deterministas
        "max_tokens": max_tokens,        # Limita la longitud de la respuesta
        "top_p": 0.9,             # Ayuda a respuestas más precisas y rápidas
        "presence_penalty": 0.2   # Evita repeticiones que consumen tokens
    }
    
    try:
        # Añadir más información de depuración
        print(f"Enviando solicitud a: {API_URL}")
        print(f"Payload: {payload}")
        
        # Con esta línea que incluye timeout:
        response = requests.post(API_URL, json=payload, headers=headers, timeout=30)
        
        # Manejar errores HTTP específicamente
        if response.status_code != 200:
            print(f"Error HTTP {response.status_code}: {response.text}")
            return f"Lo siento, hubo un problema con el servicio (Error {response.status_code})"
            
        # Proceso exitoso
        return response.json()['choices'][0]['message']['content']
        
    except requests.exceptions.RequestException as e:
        print(f"Error de conexión con OpenRouter: {str(e)}")
        return "Lo siento, hay problemas de conexión con el servicio de asistencia."
        
    except Exception as e:
        print(f"Error inesperado en OpenRouter: {str(e)}")
        return "Ha ocurrido un error inesperado. Intente de nuevo más tarde."