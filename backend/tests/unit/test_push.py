import httpx
import pytest
import respx

from app.integrations.push import ExpoPushClient


@respx.mock
async def test_expo_tickets_remove_only_unregistered_tokens(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.config import get_settings

    monkeypatch.setenv("EXPO_PUSH_ACCESS_TOKEN", "synthetic-test-token")
    get_settings.cache_clear()
    route = respx.post("https://exp.host/--/api/v2/push/send").mock(
        return_value=httpx.Response(
            200,
            json={
                "data": [
                    {"status": "ok", "id": "ticket"},
                    {"status": "error", "details": {"error": "DeviceNotRegistered"}},
                ]
            },
        )
    )
    assert await ExpoPushClient().send(
        [{"to": "ExpoPushToken[active]"}, {"to": "ExpoPushToken[expired]"}]
    ) == ["ExpoPushToken[expired]"]
    assert (
        route.calls[0].request.headers["authorization"] == "Bearer synthetic-test-token"
    )


@respx.mock
@pytest.mark.parametrize(
    "body,status", [({"data": []}, 200), ({"data": None}, 200), ({}, 503)]
)
async def test_expo_failure_is_detected(body: dict[str, object], status: int) -> None:
    respx.post("https://exp.host/--/api/v2/push/send").mock(
        return_value=httpx.Response(status, json=body)
    )
    with pytest.raises((ValueError, httpx.HTTPStatusError)):
        await ExpoPushClient().send([{"to": "ExpoPushToken[test]"}])
