import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    DEBUG = os.getenv("DEBUG", "True") == "True" 
    PORT = int(os.getenv("PORT", 5000))           
    SECRET_KEY = os.getenv("SECRET_KEY", "1234")  