import io
import zipfile


def office(extension: str, *, macro: bool = False, wrong: bool = False) -> bytes:
    family = (
        "wordprocessingml.document"
        if extension == "docx"
        else "presentationml.presentation"
    )
    part = "word/document.xml" if extension == "docx" else "ppt/presentation.xml"
    body = io.BytesIO()
    with zipfile.ZipFile(body, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(
            "[Content_Types].xml",
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Override PartName="/'
            + part
            + '" ContentType="application/vnd.openxmlformats-officedocument.'
            + family
            + '.main+xml"/></Types>',
        )
        archive.writestr("wrong.xml" if wrong else part, "<document/>")
        if macro:
            archive.writestr("word/VBAPROJECT.BIN", "macro")
    return body.getvalue()


PDF = b"%PDF-1.7\nE-DUMP test material\n%%EOF"
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
JPG = b"\xff\xd8\xff\xe0" + b"\x00" * 32
WEBP = b"RIFF" + b"\x00" * 4 + b"WEBPVP8 " + b"\x00" * 32
