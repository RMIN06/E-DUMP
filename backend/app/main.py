import asyncio
import re
from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.config import get_settings
from app.db.client import lifespan
from app.deps import limiter
from app.errors import DomainError, Unavailable, domain_handler, unavailable_handler
from app.routers.announcements import router as announcements_router
from app.routers.auth import router as auth_router
from app.routers.health import router as health_router
from app.routers.materials import router as materials_router
from app.routers.me import router as me_router
from app.routers.schedule import router as schedule_router
from app.routers.subjects import router as subjects_router


class JsonBodyLimit:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or not scope["path"].startswith("/api/v1/"):
            await self.app(scope, receive, send)
            return
        headers = dict(scope["headers"])
        upload = (
            scope["method"] == "POST"
            and re.fullmatch(
                r"/api/v1/(subjects/[^/]+/materials|announcements/attachments)",
                scope["path"],
            )
            is not None
        )
        maximum = (get_settings().max_upload_mb + 1) * 1024 * 1024 if upload else 65536
        try:
            length = int(headers.get(b"content-length", b"0"))
        except ValueError:
            length = maximum + 1
        if length > maximum or length < 0:
            response = JSONResponse(
                status_code=413,
                content={
                    "error": {
                        "code": "file_too_large" if upload else "validation_error",
                        "message": "Request body is too large.",
                        "details": {},
                    }
                },
            )
            await response(scope, receive, send)
            return
        size = 0

        async def limited_receive() -> Message:
            nonlocal size
            message = await receive()
            if message["type"] == "http.request":
                size += len(message.get("body", b""))
                if size > maximum:
                    raise HTTPException(
                        status_code=413, detail="Request body is too large."
                    )
            return message

        await self.app(scope, limited_receive, send)


def create_app() -> FastAPI:
    development = get_settings().app_env == "development"
    application = FastAPI(
        title="E-DUMP",
        version="0.0.0",
        lifespan=lifespan,
        docs_url="/docs" if development else None,
        redoc_url=None,
        openapi_url="/openapi.json" if development else None,
    )
    application.add_exception_handler(Unavailable, unavailable_handler)
    application.add_exception_handler(DomainError, domain_handler)
    application.add_exception_handler(PyMongoError, unavailable_handler)
    application.state.auth_lock = asyncio.Lock()
    application.state.material_lock = asyncio.Lock()
    application.state.limiter = limiter
    application.add_middleware(JsonBodyLimit)

    @application.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": "file_too_large"
                    if exc.status_code == 413
                    and request.url.path.endswith(("/materials", "/attachments"))
                    else "validation_error",
                    "message": "Request body is too large."
                    if exc.status_code == 413
                    else "Request failed.",
                    "details": {},
                }
            },
        )

    @application.exception_handler(RequestValidationError)
    async def invalid_request(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Check the submitted fields.",
                    "details": {},
                }
            },
        )

    @application.exception_handler(RateLimitExceeded)
    async def rate_limited(request: Request, exc: RateLimitExceeded) -> JSONResponse:
        return JSONResponse(
            status_code=429,
            content={
                "error": {
                    "code": "rate_limited",
                    "message": "Too many attempts. Wait a minute.",
                    "details": {},
                }
            },
            headers={"Retry-After": "60"},
        )

    @application.middleware("http")
    async def security_headers(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        if request.url.path.startswith(
            ("/api/v1/auth/", "/api/v1/me")
        ) or request.url.path.endswith("/download"):
            response.headers["Cache-Control"] = "no-store"
        return response

    application.include_router(health_router)
    application.include_router(auth_router)
    application.include_router(me_router)
    application.include_router(subjects_router)
    application.include_router(schedule_router)
    application.include_router(materials_router)
    application.include_router(announcements_router)
    return application


app = create_app()
