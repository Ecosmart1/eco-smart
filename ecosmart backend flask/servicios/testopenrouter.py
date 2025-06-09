from openrouter import send_to_deepseek

# Prueba simple
history = [
    {"role": "system", "content": "Eres un asistente útil."},
    {"role": "user", "content": "Hola, ¿cómo estás?"}
]

try:
    response = send_to_deepseek(history)
    print("Respuesta exitosa:")
    print(response)
except Exception as e:
    print(f"Error: {str(e)}")