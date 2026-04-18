from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Google Earth Engine
    gee_service_account: str = ""
    gee_private_key_file: str = "./gee-key.json"

    # Sentinel Hub
    sentinelhub_client_id: str = ""
    sentinelhub_client_secret: str = ""

    # NASA Earthdata
    nasa_earthdata_token: str = ""

    # Gemini AI
    gemini_api_key: str = ""

    # App
    cors_origins: str = "http://localhost:3000"
    port: int = 8000

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
