from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    server_port: int = 8080

    postgres_username: str
    postgres_password: str
    postgres_host: str
    postgres_port: int
    postgres_database: str

    secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7

    cors_origins: str = "http://localhost:3000"

    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    cookie_domain: str | None = None

    upload_dir: str = "/data/uploads"
    upload_max_bytes: int = 10_485_760
    upload_max_pixels: int = 40_000_000
    upload_max_per_event: int = 20

    @field_validator("cookie_samesite", mode="before")
    @classmethod
    def _lowercase_samesite(cls, value):
        return value.lower() if isinstance(value, str) else value

    @model_validator(mode="after")
    def _samesite_none_requires_secure(self):
        if self.cookie_samesite == "none":
            self.cookie_secure = True
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def database_url(self):
        return (
            f"postgresql+asyncpg://{self.postgres_username}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_database}"
        )


settings = Settings()
