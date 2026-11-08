import asyncio
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy import select

from src.db.dependencies import SessionDep
from src.models.user_model import UserModel

router = APIRouter(tags=["ping"])
logger = logging.getLogger(__name__)


@router.get("/ping", response_class=PlainTextResponse)
async def ping():
    return "ok"


@router.get("/ready")
async def ready(session: SessionDep):
    try:
        async with asyncio.timeout(3):
            # Check the application schema as well as the database connection.
            await session.execute(select(UserModel.id).limit(1))
    except Exception:
        logger.exception("Database readiness check failed")
        raise HTTPException(status_code=503, detail="Database is not ready") from None
    return {"status": "ready"}
