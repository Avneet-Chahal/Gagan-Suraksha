from pathlib import Path
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str = "Gagan Suraksha API"
    VERSION: str = "0.1.0"
    DESCRIPTION: str = "Satellite debris tracking, catalog management, and conjunction-risk assessment backend."
    API_V1_STR: str = "/api"

    # Database
    DATABASE_URL: str = "sqlite:///./gagan_suraksha.db"
    SQL_ECHO: bool = False

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Server binding
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    def ensure_db_dir_exists(self) -> None:
        """If SQLite URL points to a file with directory path, ensure directory exists."""
        if self.DATABASE_URL.startswith("sqlite:///") and ":memory:" not in self.DATABASE_URL:
            # Extract file path after sqlite:///
            db_path_str = self.DATABASE_URL.replace("sqlite:///", "")
            db_path = Path(db_path_str)
            if db_path.parent and str(db_path.parent) != ".":
                db_path.parent.mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_db_dir_exists()
