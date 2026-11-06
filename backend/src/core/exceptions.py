from fastapi import Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException


def register_exception_handlers(app):
    @app.exception_handler(HTTPException)
    async def http_error_handler(request, exc):
        """Формат тела ошибки. TODO поменять под требования олимпиады"""

        return JSONResponse(status_code=exc.status_code, content={"reason": exc.detail})


    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "reason": "Validation failed",
                "errors": jsonable_encoder(exc.errors()),
            },
        )