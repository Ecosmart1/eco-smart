import os
import requests

# Definir la clave API y la URL base
OPENROUTER_KEY = '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'
API_URL = 'https://openrouter.ai/api/v1/chat/completions'

def send_to_deepseek(history_messages):
    """
    Envía mensajes a DeepSeek a través de OpenRouter
    history_messages: lista de dicts {role: 'user'|'system'|'assistant', content: str}
    """
    headers = {
        'Authorization': f'Bearer {OPENROUTER_KEY}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        "model": "deepseek/deepseek-r1:free", 
        "messages": history_messages
    }
    
    try:
        response = requests.post(API_URL, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()['choices'][0]['message']['content']
    except Exception as e:
        print(f"Error comunicándose con OpenRouter: {str(e)}")
        raise