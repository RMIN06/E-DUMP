import io
from unittest.mock import Mock

import pytest
from botocore.exceptions import ClientError
from pydantic import SecretStr

from app.config import Settings
from app.errors import Unavailable
from app.integrations.r2 import R2Storage


@pytest.fixture
def storage(monkeypatch: pytest.MonkeyPatch) -> R2Storage:
    client = Mock()
    monkeypatch.setattr(
        "app.integrations.r2.boto3.client", lambda *args, **kwargs: client
    )
    return R2Storage(
        Settings(
            r2_account_id="test-account",
            r2_access_key_id=SecretStr("test-key"),
            r2_secret_access_key=SecretStr("test-secret"),
            r2_bucket="private-test",
        )
    )


async def test_r2_put_delete_and_signed_get_use_private_bucket_metadata(
    storage: R2Storage,
) -> None:
    body = io.BytesIO(b"%PDF-fixture")
    body.read()
    await storage.put("files/test.pdf", body, "application/pdf")
    storage.client.put_object.assert_called_once_with(
        Bucket="private-test",
        Key="files/test.pdf",
        Body=body,
        ContentType="application/pdf",
    )
    assert body.tell() == 0
    await storage.delete("files/test.pdf")
    storage.client.delete_object.assert_called_once_with(
        Bucket="private-test", Key="files/test.pdf"
    )
    storage.client.generate_presigned_url.return_value = "https://private-test/signed"
    assert (
        await storage.download_url(
            "files/test.pdf", "Lecture 3.pdf", "application/pdf", 600
        )
        == "https://private-test/signed"
    )
    arguments = storage.client.generate_presigned_url.call_args.kwargs
    assert arguments["ExpiresIn"] == 600
    assert (
        arguments["Params"]["ResponseContentDisposition"]
        == "attachment; filename*=UTF-8''Lecture%203.pdf"
    )
    assert arguments["Params"]["ResponseContentType"] == "application/pdf"


@pytest.mark.parametrize("method", ["put", "delete", "download_url"])
async def test_r2_provider_errors_are_hidden_from_api(
    storage: R2Storage, method: str
) -> None:
    error = ClientError(
        {"Error": {"Code": "AccessDenied", "Message": "provider-sensitive-message"}},
        "test",
    )
    storage.client.put_object.side_effect = error
    storage.client.delete_object.side_effect = error
    storage.client.generate_presigned_url.side_effect = error
    with pytest.raises(Unavailable) as caught:
        if method == "put":
            await storage.put("key", io.BytesIO(b"x"), "application/pdf")
        elif method == "delete":
            await storage.delete("key")
        else:
            await storage.download_url("key", "file.pdf", "application/pdf", 600)
    assert "provider-sensitive-message" not in str(caught.value)


def test_missing_r2_credentials_fail_closed() -> None:
    with pytest.raises(Unavailable):
        R2Storage(
            Settings(r2_account_id="", r2_access_key_id=None, r2_secret_access_key=None)
        )
