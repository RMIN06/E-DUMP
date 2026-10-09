from typing import BinaryIO

from app.errors import Unavailable


class FakeStorage:
    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}
        self.put_calls = 0
        self.fail_put = False
        self.fail_delete = False
        self.downloads: list[tuple[str, str, str, int]] = []

    async def put(self, key: str, body: BinaryIO, mime: str) -> None:
        self.put_calls += 1
        if self.fail_put:
            raise Unavailable()
        body.seek(0)
        self.objects[key] = body.read()

    async def delete(self, key: str) -> None:
        if self.fail_delete:
            raise Unavailable()
        self.objects.pop(key, None)

    async def download_url(self, key: str, filename: str, mime: str, ttl: int) -> str:
        self.downloads.append((key, filename, mime, ttl))
        return "https://private.invalid/signed-test-download"
