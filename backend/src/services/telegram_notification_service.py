"""Notification integration point. No automatic scheduling in this release."""
from datetime import datetime
from typing import Literal

import httpx

from src.core.config import settings


async def send_event_reminder(
    telegram_id: int, title: str, start_at: datetime,
) -> Literal["disabled", "sent", "unavailable", "retry"]:
    if not settings.telegram_notifications_enabled or not settings.telegram_bot_token.get_secret_value():
        return "disabled"
    # Plain text avoids parsing user-provided event titles as Telegram markup.
    text = f"Предстоящее событие: {title}\nНачало: {start_at.isoformat()}"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"https://api.telegram.org/bot{settings.telegram_bot_token.get_secret_value()}/sendMessage",
                json={"chat_id": telegram_id, "text": text[:4096]},
            )
        if response.status_code in (400, 403):
            return "unavailable"
        response.raise_for_status()
        return "sent" if response.json().get("ok") else "retry"
    except (httpx.HTTPError, ValueError):
        return "retry"
