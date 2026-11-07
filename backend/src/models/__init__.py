# TODO: Импортировать сюда все модели, чтобы Alembic видел их при --autogenerate
from src.models.telegram_login_model import TelegramLoginModel
from src.models.auth_session_model import AuthSessionModel
from src.models.trip_model import (
    AttachmentModel,
    EventCommentModel,
    EventModel,
    PlaceModel,
    TripMemberModel,
    TripModel,
)
from src.models.user_model import UserModel
