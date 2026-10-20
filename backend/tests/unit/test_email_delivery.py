import base64

import httpx
import pytest
import respx

from app.config import get_settings
from app.errors import Unavailable
from app.integrations.email import MailjetEmailSender


@respx.mock
@pytest.mark.parametrize("status", [200, 400, 401, 429, 503, 302])
async def test_mailjet_delivery_is_private_and_https(
    monkeypatch: pytest.MonkeyPatch, status: int
):
    monkeypatch.setenv("MAILJET_API_KEY", "synthetic-test-api-key")
    monkeypatch.setenv("MAILJET_SECRET_KEY", "synthetic-test-api-secret")
    monkeypatch.setenv("EMAIL_SENDER", "sender@example.test")
    get_settings.cache_clear()
    route = respx.post("https://api.mailjet.com/v3.1/send").mock(
        return_value=httpx.Response(status, json={"Messages": [{"Status": "success"}]})
    )
    if status == 200:
        await MailjetEmailSender().send_code("recipient@example.test", "012345")
    else:
        with pytest.raises(Unavailable):
            await MailjetEmailSender().send_code("recipient@example.test", "012345")
    expected = base64.b64encode(
        b"synthetic-test-api-key:synthetic-test-api-secret"
    ).decode()
    assert route.calls[0].request.headers["authorization"] == "Basic " + expected
    assert b"012345" in route.calls[0].request.content


async def test_email_without_provider_configuration_fails_closed(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setenv("MAILJET_API_KEY", "")
    monkeypatch.setenv("MAILJET_SECRET_KEY", "")
    monkeypatch.setenv("EMAIL_SENDER", "")
    get_settings.cache_clear()
    with pytest.raises(Unavailable):
        await MailjetEmailSender().send_code("recipient@example.test", "012345")


@respx.mock
@pytest.mark.parametrize(
    "payload",
    [{"Messages": [{"Status": "error"}]}, {"Messages": []}, [], {"Messages": [None]}],
)
async def test_provider_rejection_or_malformed_success_never_accepts_delivery(
    monkeypatch: pytest.MonkeyPatch, payload: object
):
    monkeypatch.setenv("MAILJET_API_KEY", "synthetic-test-api-key")
    monkeypatch.setenv("MAILJET_SECRET_KEY", "synthetic-test-api-secret")
    monkeypatch.setenv("EMAIL_SENDER", "sender@example.test")
    get_settings.cache_clear()
    respx.post("https://api.mailjet.com/v3.1/send").mock(
        return_value=httpx.Response(200, json=payload)
    )
    with pytest.raises(Unavailable):
        await MailjetEmailSender().send_code("recipient@example.test", "012345")
