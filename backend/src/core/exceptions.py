from fastapi import Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from src.core.domain import (
    ConflictError,
    DomainError,
    FileTooLarge,
    ForbiddenError,
    InvalidDataError,
    NotFoundError,
    UnsupportedFile,
)

_DOMAIN_STATUS = {
    NotFoundError: 404,
    ForbiddenError: 403,
    ConflictError: 409,
    InvalidDataError: 422,
    UnsupportedFile: 415,
    FileTooLarge: 413,
}


def register_exception_handlers(app):
    @app.exception_handler(HTTPException)
    async def http_error_handler(request, exc):
        """Формат тела ошибки. TODO поменять под требования олимпиады"""

        return JSONResponse(status_code=exc.status_code, content={"reason": exc.detail})

    @app.exception_handler(DomainError)
    async def domain_error_handler(request: Request, exc: DomainError):
        status_code = 400
        for cls in type(exc).mro():
            if cls in _DOMAIN_STATUS:
                status_code = _DOMAIN_STATUS[cls]
                break
        return JSONResponse(status_code=status_code, content={"reason": exc.detail})

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "reason": "Validation failed",
                "errors": jsonable_encoder(exc.errors()),
            },
        )