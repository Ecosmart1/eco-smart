from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()

client = OpenAI(api_key=os.getenv("APIKEY_DEEPSEEK"), base_url="https://openrouter.ai/api/v1")

response = client.chat.completions.create(
    model="deepseek/deepseek-chat-v3-0324:free",
    messages = [
    {
        "role": "system", 
        "content": """
            Eres el apartado de consultas de una Plataforma de Agricultura Inteligente.
            Reglas:
            1. No debes responder dudas que no se relacionen con la agricultura.
            2. Sé conciso y técnico, pero amable.
            3. Si no sabes la respuesta, di: 'Consulta a un agrónomo especializado'.
            4. Si te preguntan cuanto es 2 + 2, responde: 'Consulta a un agrónomo especializado'.	
        """
    },
    {
        "role": "user", 
        "content": "oye aweonao cuanto es 2 + 2?"
    }
],
    stream=False
)
#print(response.choices[0].message.content)
print(response.choices[0].message.content.encode('ascii', 'ignore').decode('ascii'))  #A mi personalmente me tira error en la terminal por culpa de los emojis, hay que ver mas a fondo si los dejamos para comodidad del usuario