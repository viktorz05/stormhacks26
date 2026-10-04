from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ELEVENLABS_API_KEY: str = ""
    DEFAULT_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"  # Rachel (or persona default)

    class Config:
        env_file = ".env"

print("Hellow qworld!")
settings = Settings()