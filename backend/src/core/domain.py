from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


class DomainError(Exception):
    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(detail)


class NotFoundError(DomainError):
    pass


class ForbiddenError(DomainError):
    pass


class ConflictError(DomainError):
    pass


class PlaceInUse(ConflictError):
    pass


class InvalidDataError(DomainError):
    pass


class UnsupportedFile(DomainError):
    pass


class FileTooLarge(DomainError):
    pass


def require_timezone(name: str) -> str:
    value = name.strip()
    try:
        ZoneInfo(value)
    except (ZoneInfoNotFoundError, ValueError, KeyError):
        raise InvalidDataError("Unknown timezone") from None
    return value
