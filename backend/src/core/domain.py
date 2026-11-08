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


class RecognitionUnavailable(DomainError):
    pass


class RecognitionFailed(DomainError):
    pass
