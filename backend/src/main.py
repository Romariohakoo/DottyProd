import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import settings
from src.core.exceptions import register_exception_handlers
from src.core.observability import setup_logging, setup_observability
from src.routers import api_router


def create_app():
    setup_logging()
    app = FastAPI(title="Dotty", docs_url="/api/docs", openapi_url="/api/openapi.json")
    register_exception_handlers(app)
    setup_observability(app)

    if settings.cors_origin_list:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origin_list,
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
            expose_headers=["X-Request-ID"],
        )
    app.include_router(api_router)
    return app


app = create_app()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=settings.server_port, log_config=None, access_log=False)
