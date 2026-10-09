import io
import zipfile

import pytest
from starlette.datastructures import Headers, UploadFile

from app.errors import DomainError
from app.services.upload_validation import (
    MIMES,
    safe_filename,
    validate_upload,
    verify_type,
)
from tests.fixtures import JPG, PDF, PNG, WEBP, office


async def test_native_percent_encoded_filename_is_restored_and_sanitized() -> None:
    upload = UploadFile(
        io.BytesIO(PDF),
        filename="Lecture%203%20%E2%80%93%20notes.pdf",
        headers=Headers({"content-type": "application/pdf"}),
    )
    result = await validate_upload(upload, 10000)
    assert result.original_name == "Lecture 3 – notes.pdf"
    result.body.close()


@pytest.mark.parametrize(
    "extension,body",
    [
        ("pdf", PDF),
        ("png", PNG),
        ("jpg", JPG),
        ("jpeg", JPG),
        ("webp", WEBP),
        ("docx", office("docx")),
        ("pptx", office("pptx")),
    ],
)
async def test_allowed_files_are_sniffed_hashed_and_streamed(
    extension: str, body: bytes
) -> None:
    upload = UploadFile(
        io.BytesIO(body),
        filename="chapter 3." + extension,
        headers=Headers({"content-type": MIMES[extension]}),
    )
    result = await validate_upload(upload, 25 * 1024 * 1024)
    assert result.size_bytes == len(body)
    assert len(result.sha256) == 64
    assert result.body.read() == body
    result.body.close()


@pytest.mark.parametrize(
    "extension,body,mime",
    [
        ("exe", b"MZexe", "application/octet-stream"),
        ("pdf", b"MZexe", "application/pdf"),
        ("pdf", b"", "application/pdf"),
        ("png", PNG, "image/jpeg"),
        ("docx", office("docx", macro=True), MIMES["docx"]),
        ("pptx", office("pptx", wrong=True), MIMES["pptx"]),
        ("docx", b"PKbad", MIMES["docx"]),
        ("pdf", b"junk%PDF-1.7", MIMES["pdf"]),
    ],
)
async def test_unsafe_spoofed_empty_and_macro_files_fail(
    extension: str, body: bytes, mime: str
) -> None:
    upload = UploadFile(
        io.BytesIO(body),
        filename="test." + extension,
        headers=Headers({"content-type": mime}),
    )
    with pytest.raises(DomainError, match=".") as caught:
        await validate_upload(upload, 10000)
    assert caught.value.code == "unsupported_type"


@pytest.mark.parametrize("precheck", [True, False])
async def test_size_cap_covers_declared_and_streamed_sizes(precheck: bool) -> None:
    upload = UploadFile(
        io.BytesIO(PDF * 100),
        filename="x.pdf",
        size=3000 if precheck else None,
        headers=Headers({"content-type": "application/pdf"}),
    )
    with pytest.raises(DomainError) as caught:
        await validate_upload(upload, 100)
    assert caught.value.code == "file_too_large"


@pytest.mark.parametrize(
    "contents",
    [b"<!DOCTYPE x [<!ENTITY hi 'x'>]><Types/>", b"not xml", b"x" * 65537],
    ids=["entities", "malformed", "oversized"],
)
def test_office_content_types_are_bounded_and_reject_entities(contents: bytes) -> None:
    body = io.BytesIO()
    with zipfile.ZipFile(body, "w") as archive:
        archive.writestr("[Content_Types].xml", contents)
        archive.writestr("word/document.xml", "x")
    with pytest.raises(DomainError):
        verify_type(body, "docx", MIMES["docx"])


def test_original_name_is_metadata_without_controls_or_paths() -> None:
    assert safe_filename("../\\chapter\x00\n3.pdf") == "..chapter3.pdf"
    assert len(safe_filename("x" * 200)) == 150
    assert safe_filename("\x00") == "file"
