from fastapi import APIRouter

from src.routers import auth, ping

api_router = APIRouter(prefix="/api")
api_router.include_router(ping.router)
api_router.include_router(auth.router)
