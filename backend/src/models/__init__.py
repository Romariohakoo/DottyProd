# TODO: Импортировать сюда все модели, чтобы Alembic видел их при --autogenerate
from src.models.auth_session_model import AuthSessionModel
from src.models.trip_model import (
    AttachmentModel,
    EventModel,
    ExcursionDetailModel,
    MovementDetailModel,
    PlaceModel,
    TripMemberModel,
    TripModel,
)
from src.models.user_model import UserModel
