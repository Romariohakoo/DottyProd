import asyncio
import json

import httpx
import pytest
from pydantic import TypeAdapter

from src.core.config import settings
from src.core.domain import RecognitionFailed, RecognitionUnavailable
from src.schemas.ticket import TicketDraft
from src.services.ticket_recognition import recognize_ticket_image


def test_missing_key(monkeypatch):
    monkeypatch.setattr(settings, "openrouter_api_key", "")
    with pytest.raises(RecognitionUnavailable):
        asyncio.run(recognize_ticket_image(b"photo", "image/png"))


@pytest.mark.parametrize("failure", [None, "json", "schema", "truncated", "http", "timeout"])
def test_provider_response(monkeypatch, failure):
    monkeypatch.setattr(settings, "openrouter_api_key", "test-key")
    draft = dict(transport_type="train", from_airport=None, to_airport=None,
                 from_station="Москва", to_station="Казань", from_name=None,
                 to_name=None, date="2026-11-08", departure_time="12:30",
                 arrival_time="20:10", seat=None, flight_number=None,
                 platform_number="3", carriage_number="5", seat_number="12",
                 bus_number=None, other_fields=None, review_required=True)
    if failure == "schema":
        draft["transport_type"] = "invented"

    async def post(self, url, *, headers, json):
        assert headers["Authorization"] == "Bearer test-key"
        assert json["response_format"]["json_schema"]["strict"] is True
        assert json["response_format"]["json_schema"]["schema"]["type"] == "object"
        assert json["provider"]["require_parameters"] is True
        assert json["max_tokens"] == 4096
        assert "reasoning" not in json
        assert json["messages"][1]["content"][0]["image_url"]["url"].startswith("data:image/png;base64,")
        if failure == "timeout":
            raise httpx.ReadTimeout("timeout")
        return httpx.Response(500 if failure == "http" else 200,
                              request=httpx.Request("POST", url),
                              content=body)

    body = json.dumps({"choices": [{"finish_reason": "length" if failure == "truncated" else "stop",
                                   "message": {"content": "invalid" if failure == "json" else json.dumps(draft)}}]})
    monkeypatch.setattr(httpx.AsyncClient, "post", post)
    if failure:
        with pytest.raises(RecognitionFailed):
            asyncio.run(recognize_ticket_image(b"photo", "image/png"))
    else:
        result = asyncio.run(recognize_ticket_image(b"photo", "image/png"))
        assert result.transport_type == "train"
        assert result.platform_number == "3"
        assert "bus_number" not in result.model_dump()


@pytest.mark.parametrize("draft", [
    dict(transport_type="plane", from_airport="SVO", to_airport="LED", date="2026-11-08",
         departure_time="08:45", arrival_time="10:15", seat="12A",
         flight_number="SU 010", review_required=True),
    dict(transport_type="bus", from_name="Москва", to_name="Тула", bus_number="123",
         departure_time="09:00", arrival_time="11:30", review_required=True),
    dict(transport_type="other", other_fields=[{"name": "Место", "value": "Сектор А"}],
         review_required=True),
])
def test_ticket_types(draft):
    assert TypeAdapter(TicketDraft).validate_python(draft).model_dump(mode="json") == draft


def test_mismatched_fields_rejected():
    with pytest.raises(ValueError):
        TypeAdapter(TicketDraft).validate_python(dict(transport_type="plane",
            from_airport="SVO", to_airport="LED", date=None, departure_time=None,
            arrival_time=None, seat=None, flight_number=None, bus_number="123",
            review_required=True))
