import os
import requests

# Definir la clave API y la URL base - CORREGIR LA URL
OPENROUTER_KEY = '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'
API_URL = 'https://openrouter.ai/api/v1/chat/completions'  # URL CORREGIDA

def send_to_deepseek(history_messages):
    """
    Envía mensajes a DeepSeek a través de OpenRouter
    history_messages: lista de dicts {role: 'user'|'system'|'assistant', content: str}
    """
    headers = {
    'Authorization': f'Bearer {OPENROUTER_KEY.strip()}',  # Asegurarse de eliminar espacios
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://ecosmart.com',
    'X-Title': 'EcoSmart Asistente'
}
    
    payload = {
        "model": "deepseek/deepseek-r1:free", 
        "messages": history_messages
    }
    
    try:
        # Añadir más información de depuración
        print(f"Enviando solicitud a: {API_URL}")
        print(f"Payload: {payload}")
        
        response = requests.post(API_URL, json=payload, headers=headers)
        
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