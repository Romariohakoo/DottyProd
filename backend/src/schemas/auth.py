from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str = Field(min_length=8)

    @field_validator("password")
    @classmethod
    def password_fits_limits(cls, password: str) -> str:
        if len(password.encode("utf-8")) > 72:
            raise ValueError("password must be at most 72 bytes (UTF-8)")
        if len(password) > 32:
            raise ValueError("password must be at most 32 characters")

        return password


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdateCredentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    username: str | None = None

    @field_validator("password")
    @classmethod
    def password_fits_limits(cls, password: str) -> str:
        if len(password.encode("utf-8")) > 72:
            raise ValueError("password must be at most 72 bytes (UTF-8)")
        if len(password) > 32:
            raise ValueError("password must be at most 32 characters")

        return password


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
    telegram_id: int | None = None
    name: str | None = None
    avatar_url: str | None = None


class UserProfileUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    avatar_url: str | None = Field(default=None, max_length=2048)
