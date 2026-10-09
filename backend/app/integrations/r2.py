from functools import partial
from typing import BinaryIO, Protocol, cast
from urllib.parse import quote

import anyio
import boto3  # type: ignore[import-untyped]
from botocore.config import Config  # type: ignore[import-untyped]
from botocore.exceptions import (  # type: ignore[import-untyped]
    BotoCoreError,
    ClientError,
)

from app.config import Settings
from app.errors import Unavailable


class Storage(Protocol):
    async def put(self, key: str, body: BinaryIO, mime: str) -> None: ...
    async def delete(self, key: str) -> None: ...
    async def download_url(
        self, key: str, filename: str, mime: str, ttl: int
    ) -> str: ...


class S3Client(Protocol):
    def put_object(self, **kwargs: object) -> object: ...
    def delete_object(self, **kwargs: object) -> object: ...
    def generate_presigned_url(
        self, method: str, *, Params: dict[str, object], ExpiresIn: int
    ) -> str: ...


class R2Storage:
    def __init__(self, settings: Settings) -> None:
        if (
            not settings.r2_account_id
            or not settings.r2_access_key_id
            or not settings.r2_secret_access_key
        ):
            raise Unavailable()
        self.bucket = settings.r2_bucket
        self.client = cast(
            S3Client,
            boto3.client(
                "s3",
                endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
                region_name="auto",
                aws_access_key_id=settings.r2_access_key_id.get_secret_value(),
                aws_secret_access_key=settings.r2_secret_access_key.get_secret_value(),
                config=Config(
                    signature_version="s3v4",
                    connect_timeout=10,
                    read_timeout=90,
                    retries={"total_max_attempts": 1},
                    request_checksum_calculation="when_required",
                    response_checksum_validation="when_required",
                ),
            ),
        )

    async def put(self, key: str, body: BinaryIO, mime: str) -> None:
        body.seek(0)
        try:
            await anyio.to_thread.run_sync(
                partial(
                    self.client.put_object,
                    Bucket=self.bucket,
                    Key=key,
                    Body=body,
                    ContentType=mime,
                )
            )
        except (BotoCoreError, ClientError) as exc:
            raise Unavailable() from exc

    async def delete(self, key: str) -> None:
        try:
            await anyio.to_thread.run_sync(
                partial(self.client.delete_object, Bucket=self.bucket, Key=key)
            )
        except (BotoCoreError, ClientError) as exc:
            raise Unavailable() from exc

    async def download_url(self, key: str, filename: str, mime: str, ttl: int) -> str:
        try:
            return await anyio.to_thread.run_sync(
                partial(
                    self.client.generate_presigned_url,
                    "get_object",
                    Params={
                        "Bucket": self.bucket,
                        "Key": key,
                        "ResponseContentType": mime,
                        "ResponseContentDisposition": "attachment; filename*=UTF-8''"
                        + quote(filename, safe=""),
                    },
                    ExpiresIn=ttl,
                )
            )
        except (BotoCoreError, ClientError) as exc:
            raise Unavailable() from exc
