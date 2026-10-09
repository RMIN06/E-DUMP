from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_ignore_empty=True, extra="ignore"
    )
    app_env: Literal["development", "production"] = "development"
    mongodb_uri: str | None = None
    mongodb_db: str = "edump"
    jwt_secret: SecretStr | None = None
    access_token_ttl_min: int = 15
    refresh_token_ttl_days: int = 30
    allowed_email_regex: str = r"^l25\d{4}@lhr\.nu\.edu\.pk$"
    admin_emails: str = ""
    r2_account_id: str | None = None
    r2_access_key_id: SecretStr | None = None
    r2_secret_access_key: SecretStr | None = None
    r2_bucket: str = "edump-files"
    max_upload_mb: int = Field(default=25, ge=1, le=25)
    upload_quota_mb: int = Field(default=500, ge=1)
    download_url_ttl_sec: int = Field(default=600, ge=1, le=600)
    expo_push_access_token: SecretStr | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
