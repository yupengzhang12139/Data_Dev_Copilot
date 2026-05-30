"""应用配置，统一从环境变量 / .env 读取。"""
from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    LLM_API_KEY: str = ""
    LLM_BASE_URL: str = "https://api.openai.com/v1"
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_USER_AGENT: str = "Cursor"
    LLM_TIMEOUT: int = 60

    DBT_PROJECT_DIR: str = "../sample_dbt_project"

    SQLITE_PATH: str = "./data_dev_copilot.db"

    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000

    ALLOW_EXTERNAL_LLM: bool = True

    @property
    def dbt_project_path(self) -> Path:
        p = Path(self.DBT_PROJECT_DIR)
        if not p.is_absolute():
            p = (Path(__file__).resolve().parents[2] / p).resolve()
        return p


settings = Settings()
