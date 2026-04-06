from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application settings.

    A dedicated settings object keeps environment handling explicit and testable.
    """

    app_name: str = "DevScope Backend"
    app_version: str = "0.1.0"
    github_api_base_url: str = "https://api.github.com"
    github_oauth_client_id: str | None = None
    github_oauth_client_secret: str | None = None
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    """Return a cached settings instance for fast repeated access."""
    return Settings()
