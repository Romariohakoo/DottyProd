from fastapi import APIRouter

from src.routers import attachments, auth, events, notifications, ping, places, tickets, trips

api_router = APIRouter(prefix="/api")
api_router.include_router(ping.router)
api_router.include_router(auth.router)
api_router.include_router(trips.router)
api_router.include_router(places.router)
api_router.include_router(events.router)
api_router.include_router(attachments.router)
api_router.include_router(tickets.router)
api_router.include_router(notifications.router)
