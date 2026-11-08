import asyncio
from datetime import datetime, timedelta, timezone

from src.models.notification_model import NotificationModel
from src.services.telegram_notifications import process_bot_update, send_due_notifications
from tests.test_trips import _register

URL = "/api/notifications"


def test_notification_crud_and_ownership(client):
    _, anna = _register(client, "anna", "anna@example.com")
    _, boris = _register(client, "boris", "boris@example.com")
    payload = {"text": "  Купить билеты  ", "notify_at": "2026-12-10T12:00:00+03:00"}
    assert client.post(URL, json=payload).status_code == 401
    assert client.post(URL, headers=anna, json={**payload, "notify_at": "2026-12-10T12:00:00"}).status_code == 422
    created = client.post(URL, headers=anna, json=payload)
    assert created.status_code == 201, created.text
    notification_id = created.json()["id"]
    assert created.json()["text"] == "Купить билеты"
    assert client.get(URL, headers=boris).json() == []
    assert client.get(f"{URL}/{notification_id}", headers=boris).status_code == 404
    assert client.put(f"{URL}/{notification_id}", headers=boris, json=payload).status_code == 404
    assert client.delete(f"{URL}/{notification_id}", headers=boris).status_code == 404
    updated = client.put(f"{URL}/{notification_id}", headers=anna, json={**payload, "text": "Паспорт"})
    assert updated.status_code == 200
    assert updated.json()["text"] == "Паспорт"
    assert len(client.get(URL, headers=anna).json()) == 1
    assert client.delete(f"{URL}/{notification_id}", headers=anna).status_code == 204
    assert client.get(URL, headers=anna).json() == []


class FakeTelegramClient:
    def __init__(self, fail=False):
        self.fail = fail
        self.calls = []

    async def post(self, url, json):
        self.calls.append((url, json))
        if self.fail:
            raise RuntimeError("temporary failure")

        class Response:
            def raise_for_status(self):
                pass

            def json(self):
                return {"ok": True, "result": {}}

        return Response()


def test_bot_link_and_due_delivery(client, db_session, monkeypatch):
    from src.core.config import settings
    from src.services import telegram_notifications

    monkeypatch.setattr(settings, "telegram_bot_token", "test-token")
    _, headers = _register(client, "anna", "anna@example.com")
    link = client.post(f"{URL}/telegram-link", headers=headers)
    assert link.status_code == 200
    code = link.json()["command"].split()[1]
    bot = FakeTelegramClient()
    update = {"message": {"chat": {"id": 12345, "type": "private"}, "from": {"id": 12345}, "text": f"/start {code}"}}
    monkeypatch.setattr(telegram_notifications, "SessionLocal", client.app.state.test_session_factory)
    asyncio.run(process_bot_update(bot, update))
    assert "подключён" in bot.calls[0][1]["text"]
    assert client.post(f"{URL}/telegram-link", headers=headers).status_code == 200

    past = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
    created = client.post(URL, headers=headers, json={"text": "Пора", "notify_at": past})
    assert created.status_code == 201
    bot.fail = True
    assert asyncio.run(send_due_notifications(bot)) == 0
    notification_id = created.json()["id"]

    def reset_retry(session):
        notification = session.get(NotificationModel, notification_id)
        async def update():
            row = await notification
            assert row.attempt_count == 1 and row.sent_at is None
            row.next_attempt_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        return update()

    db_session(reset_retry)
    bot.fail = False
    assert asyncio.run(send_due_notifications(bot)) == 1
    assert bot.calls[-1][1] == {"chat_id": 12345, "text": "Пора"}
    assert asyncio.run(send_due_notifications(bot)) == 0
    assert client.get(f"{URL}/{notification_id}", headers=headers).json()["sent_at"] is not None
    assert client.put(f"{URL}/{notification_id}", headers=headers, json={"text": "Again", "notify_at": past}).status_code == 409


def test_event_reminders_and_chat_confirmation(client, db_session, monkeypatch):
    from src.models.trip_model import EventModel, TripMemberModel
    from src.models.user_model import UserModel
    from src.services import telegram_notifications
    from tests.test_trips import _trip

    owner_id, owner = _register(client, "owner", "owner@example.com")
    member_id, member = _register(client, "member", "member@example.com")
    _, outsider = _register(client, "other", "other@example.com")
    start = datetime.now(timezone.utc) + timedelta(minutes=30)

    async def setup(session):
        user = await session.get(UserModel, owner_id)
        user.telegram_id = 12345  # OAuth alone does not confirm a bot chat.
        trip = _trip(owner_id, "Trip", start.date())
        session.add(trip)
        await session.flush()
        session.add(TripMemberModel(trip_id=trip.id, user_id=member_id, role="viewer"))
        event = EventModel(trip_id=trip.id, created_by=owner_id, type="activity", title="Museum",
                           start_at=start, category="walk")
        session.add(event)
        await session.flush()
        return event.id

    event_id = db_session(setup)
    monkeypatch.setattr(telegram_notifications, "SessionLocal", client.app.state.test_session_factory)
    assert client.get(f"{URL}/telegram-status", headers=owner).json() == {"linked": False}
    asyncio.run(telegram_notifications.schedule_event_reminders())
    asyncio.run(telegram_notifications.schedule_event_reminders())
    owner_rows = client.get(URL, headers=owner).json()
    assert {row["reminder_minutes"] for row in owner_rows} == {0, 60}
    assert all(row["event_id"] == event_id for row in owner_rows)
    assert len(client.get(URL, headers=member).json()) == 2
    assert client.get(URL, headers=outsider).json() == []
    bot = FakeTelegramClient()
    assert asyncio.run(send_due_notifications(bot)) == 0
    update = {"message": {"chat": {"id": 12345, "type": "private"}, "from": {"id": 12345}, "text": "/start"}}
    asyncio.run(process_bot_update(bot, update))
    assert client.get(f"{URL}/telegram-status", headers=owner).json() == {"linked": True}
    assert asyncio.run(send_due_notifications(bot)) == 1
    assert bot.calls[-1][1] == {"chat_id": 12345, "text": "Скоро событие: Museum"}

    async def reschedule(session):
        event = await session.get(EventModel, event_id)
        event.start_at = start + timedelta(minutes=10)
        event.title = "Gallery"
    db_session(reschedule)
    asyncio.run(telegram_notifications.schedule_event_reminders())
    rows = client.get(URL, headers=owner).json()
    assert len([row for row in rows if row["sent_at"] is None]) == 2
    assert all("Gallery" in row["text"] for row in rows if row["sent_at"] is None)
    assert client.delete(f"{URL}/{next(row['id'] for row in rows if row['sent_at'] is None)}", headers=owner).status_code == 409

    async def started(session):
        event = await session.get(EventModel, event_id)
        event.start_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db_session(started)
    asyncio.run(telegram_notifications.schedule_event_reminders())
    assert asyncio.run(send_due_notifications(bot)) == 1
    assert bot.calls[-1][1] == {"chat_id": 12345, "text": "Событие начинается: Gallery"}
