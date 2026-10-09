from fastapi import Request
from fastapi.responses import JSONResponse


class DomainError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status: int,
        details: dict[str, object] | None = None,
    ) -> None:
        self.code = code
        self.message = message
        self.status = status
        self.details = details or {}
        super().__init__(message)


async def domain_handler(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, DomainError):
        raise exc
    return JSONResponse(
        status_code=exc.status,
        content={
            "error": {"code": exc.code, "message": exc.message, "details": exc.details}
        },
        headers={"WWW-Authenticate": "Bearer"} if exc.status == 401 else None,
    )


class Unavailable(Exception):
    """Readiness failed without exposing connection details."""


async def unavailable_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={
            "error": {
                "code": "unavailable",
                "message": "The service is not ready. Try again shortly.",
                "details": {},
            }
        },
    )
