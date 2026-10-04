import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    HOST: str = os.getenv("ML_SERVICE_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("ML_SERVICE_PORT", 8000))
    SERVICE_NAME: str = "ProxyShield ML Service"
    VERSION: str = "1.0.0"

settings = Settings()
