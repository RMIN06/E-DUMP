import hashlib

from fastapi import APIRouter, Depends, Request, Response

from app.deps import AuthLock, CurrentUser, Database, EmailDelivery
from app.deps import limiter as limiter
from app.errors import DomainError
from app.models.auth import (
    CodeChallenge,
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    Tokens,
    VerifyRequest,
)
from app.services import auth_service, email_auth_service

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


async def login_context(
    request: Request, body: LoginRequest, database: Database
) -> None:
    try:
        email = auth_service.allowed_email(body.email)
    except DomainError:
        request.state.email_key = hashlib.sha256(body.email.encode()).hexdigest()
        request.state.new_account = False
        return
    request.state.email_key = hashlib.sha256(email.encode()).hexdigest()
    request.state.new_account = await auth_service.is_new_email(database, email)


def email_key(request: Request) -> str:
    return str(request.state.email_key)


def existing_account(request: Request) -> bool:
    return not bool(request.state.new_account)


@router.post(
    "/login", response_model=CodeChallenge, dependencies=[Depends(login_context)]
)
@limiter.limit("10/minute")
@limiter.limit("5/minute", key_func=email_key)
@limiter.limit("20/hour", exempt_when=existing_account)
async def login(
    request: Request,
    body: LoginRequest,
    database: Database,
    lock: AuthLock,
    sender: EmailDelivery,
) -> CodeChallenge:
    return await email_auth_service.request_code(database, body.email, lock, sender)


@router.post("/verify", response_model=LoginResponse)
@limiter.limit("30/minute")
async def verify(
    request: Request, body: VerifyRequest, database: Database, lock: AuthLock
) -> LoginResponse:
    return await email_auth_service.verify_code(
        database,
        body.email,
        body.challenge_id,
        body.code,
        lock,
        request.headers.get("user-agent", ""),
    )


@router.post("/refresh", response_model=Tokens)
async def refresh(
    request: Request, body: RefreshRequest, database: Database, lock: AuthLock
) -> Tokens:
    return await auth_service.rotate_refresh(
        database, body.refresh_token, lock, request.headers.get("user-agent", "")
    )


@router.post("/logout", status_code=204)
async def logout(
    body: RefreshRequest, user: CurrentUser, database: Database, lock: AuthLock
) -> Response:
    await auth_service.logout(database, user, body.refresh_token, lock)
    return Response(status_code=204)
