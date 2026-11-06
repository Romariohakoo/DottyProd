import uvicorn
from fastapi import FastAPI

from src.core.config import settings
from src.core.exceptions import register_exception_handlers
from src.core.observability import setup_logging, setup_observability
from src.routers import api_router


def create_app():
    setup_logging()
    app = FastAPI(title="ProdTemplate", docs_url="/api/docs")
    register_exception_handlers(app)
    setup_observability(app)
    app.include_router(api_router)
    return app


app = create_app()

if __name__ == "__main__":
    # log_config=None: uvicorn не перетирает наш JSON-логгер
    uvicorn.run(app, host="0.0.0.0", port=settings.server_port, log_config=None, access_log=False)
