from pydantic_settings import BaseSettings, SettingsConfigDict
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    port: int = 8000
    gemini_api_key: str
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY")
    DEFAULT_VOICE_ID: str = os.getenv("DEFAULT_VOICE_ID")  # Rachel (or persona default)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8"
    )

settings = Settings()