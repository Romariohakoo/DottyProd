import type { UserDto } from "@entities/user";
import api from "@shared/api";

export interface UpdateProfileDto {
  name?: string | null;
  avatarUrl?: string | null;
}

export interface UpdateCredentialsDto {
  email: string;
  password: string;
}

export const updateProfile = async (data: UpdateProfileDto) =>
  (await api.patch<UserDto>("/auth/me/profile", data)).data;

export const updateCredentials = async (data: UpdateCredentialsDto) =>
  (await api.patch<UserDto>("/auth/me", data)).data;

export const startTelegramLink = async () =>
  (await api.post<{ authorizationUrl: string }>("/auth/telegram/start")).data;
