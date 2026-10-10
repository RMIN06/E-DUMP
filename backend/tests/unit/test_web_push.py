from unittest.mock import Mock

import pytest
from pydantic import ValidationError
from pywebpush import WebPushException
from requests import Response

from app.config import get_settings
from app.integrations import web_push
from app.models.web_device import WebKeys


@pytest.mark.parametrize("status", [200, 404, 410, 503])
async def test_provider_and_expiry(
    monkeypatch: pytest.MonkeyPatch, status: int
) -> None:
    monkeypatch.setenv("WEB_PUSH_PRIVATE_KEY", "synthetic-key")
    get_settings.cache_clear()
    response = Response()
    response.status_code = status
    send = Mock(
        side_effect=WebPushException("failed", response=response)
        if status != 200
        else None
    )
    monkeypatch.setattr(web_push, "webpush", send)
    assert await web_push.send({"endpoint": "test"}, {"announcement_id": "test"}) is (
        status in (404, 410)
    )
    assert send.call_args.kwargs["timeout"] == 15


async def test_unconfigured_push_does_not_send(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("WEB_PUSH_PRIVATE_KEY", "")
    get_settings.cache_clear()
    send = Mock()
    monkeypatch.setattr(web_push, "webpush", send)
    assert not await web_push.send({}, {})
    send.assert_not_called()


def test_invalid_subscription_keys() -> None:
    with pytest.raises(ValidationError):
        WebKeys(p256dh="invalid!", auth="invalid!")
