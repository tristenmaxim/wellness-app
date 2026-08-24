from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    telegram_bot_token: str
    openrouter_api_key: str
    openrouter_model: str = "google/gemini-2.5-flash"
    usda_api_key: str
    photos_dir: str = "/app/photos"


settings = Settings()
