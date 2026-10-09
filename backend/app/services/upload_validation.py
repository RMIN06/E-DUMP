import hashlib
import re
import tempfile
import unicodedata
import zipfile
from dataclasses import dataclass
from typing import BinaryIO, cast
from urllib.parse import unquote
from xml.etree import ElementTree

import anyio
import filetype  # type: ignore[import-untyped]
from starlette.datastructures import UploadFile

from app.errors import DomainError

MIMES = {
    "pdf": "application/pdf",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "webp": "image/webp",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


@dataclass
class ValidatedFile:
    body: BinaryIO
    original_name: str
    extension: str
    mime_type: str
    size_bytes: int
    sha256: str


def safe_filename(value: str) -> str:
    value = "".join(
        char
        for char in value
        if char not in "/\\" and not unicodedata.category(char).startswith("C")
    )
    return value.strip()[:150] or "file"


def verify_type(body: BinaryIO, extension: str, declared: str) -> None:
    mime = MIMES[extension]
    if declared.lower().split(";", 1)[0].strip() != mime:
        raise DomainError(
            "unsupported_type", "The file type does not match its contents.", 422
        )
    body.seek(0)
    head = body.read(8192)
    if extension in ("docx", "pptx"):
        try:
            body.seek(0)
            with zipfile.ZipFile(body) as archive:
                entries = archive.infolist()
                names = [entry.filename.lower() for entry in entries]
                if (
                    len(entries) > 4096
                    or "[content_types].xml" not in names
                    or any(name.endswith("vbaproject.bin") for name in names)
                ):
                    raise ValueError("Invalid office package")
                if any(
                    entry.flag_bits & 1 or entry.file_size > 100 * 1024 * 1024
                    for entry in entries
                ):
                    raise ValueError("Unsafe office package")
                if sum(entry.file_size for entry in entries) > 100 * 1024 * 1024:
                    raise ValueError("Oversized office package")
                info = next(
                    entry
                    for entry in entries
                    if entry.filename.lower() == "[content_types].xml"
                )
                if info.file_size > 64 * 1024:
                    raise ValueError("Oversized content types")
                xml = archive.read(info)
                if re.search(
                    rb"<!\s*(DOCTYPE|ENTITY)", xml.replace(b"\x00", b""), re.I
                ):
                    raise ValueError("Unsafe XML")
                root = ElementTree.fromstring(xml)
                if (
                    root.tag
                    != "{http://schemas.openxmlformats.org/package/2006/content-types}Types"
                ):
                    raise ValueError("Invalid content type manifest")
                expected = (
                    "word/document.xml"
                    if extension == "docx"
                    else "ppt/presentation.xml"
                )
                if expected not in names or not any(
                    node.attrib.get("PartName", "").lstrip("/") == expected
                    and node.attrib.get("ContentType") == mime + ".main+xml"
                    for node in root
                ):
                    raise ValueError("Wrong office contents")
        except (
            zipfile.BadZipFile,
            ValueError,
            KeyError,
            ElementTree.ParseError,
            OSError,
            RuntimeError,
        ) as exc:
            raise DomainError(
                "unsupported_type", "Choose a valid DOCX or PPTX without macros.", 422
            ) from exc
    else:
        found = filetype.guess(head)
        if (
            found is None
            or str(found.mime) != mime
            or extension == "pdf"
            and not head.startswith(b"%PDF-")
        ):
            raise DomainError(
                "unsupported_type", "The file type does not match its contents.", 422
            )
    body.seek(0)


async def validate_upload(upload: UploadFile, maximum: int) -> ValidatedFile:
    # Native multipart encoders use RFC 7578 percent-encoded UTF-8 filenames.
    original = unquote(upload.filename or "")
    extension = original.rsplit(".", 1)[-1].lower()
    if extension not in MIMES:
        raise DomainError("unsupported_type", "Choose a PDF, image, PPTX or DOCX.", 422)
    if upload.size is not None and upload.size > maximum:
        raise DomainError("file_too_large", "Choose a file no larger than 25 MB.", 413)
    body = cast(BinaryIO, tempfile.TemporaryFile(mode="w+b"))
    size = 0
    digest = hashlib.sha256()
    try:
        while chunk := await upload.read(64 * 1024):
            size += len(chunk)
            if size > maximum:
                raise DomainError(
                    "file_too_large", "Choose a file no larger than 25 MB.", 413
                )
            digest.update(chunk)
            await anyio.to_thread.run_sync(body.write, chunk)
        if not size:
            raise DomainError("unsupported_type", "The selected file is empty.", 422)
        await anyio.to_thread.run_sync(
            verify_type, body, extension, upload.content_type or ""
        )
        return ValidatedFile(
            body,
            safe_filename(original),
            extension,
            MIMES[extension],
            size,
            digest.hexdigest(),
        )
    except BaseException:
        body.close()
        raise
