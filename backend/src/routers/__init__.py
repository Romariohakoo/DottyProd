from fastapi import APIRouter

from src.routers import attachments, auth, comments, events, ping, places, trips

api_router = APIRouter(prefix="/api")
api_router.include_router(ping.router)
api_router.include_router(auth.router)
api_router.include_router(trips.router)
api_router.include_router(places.router)
api_router.include_router(events.router)
api_router.include_router(comments.router)
api_router.include_router(attachments.router)
