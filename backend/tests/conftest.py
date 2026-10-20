import base64
import secrets

import pytest

from app.config import Settings, get_settings
from app.routers.auth import limiter


@pytest.fixture(autouse=True)
def isolated_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("MONGODB_URI", "")
    monkeypatch.setenv("JWT_SECRET", base64.b64encode(secrets.token_bytes(32)).decode())
    monkeypatch.setenv("ADMIN_EMAILS", "l250002@lhr.nu.edu.pk")
    from tests.email_helpers import FakeEmailSender

    FakeEmailSender.messages.clear()
    monkeypatch.setattr("app.deps.MailjetEmailSender", FakeEmailSender)
    limiter.reset()
    get_settings.cache_clear()
