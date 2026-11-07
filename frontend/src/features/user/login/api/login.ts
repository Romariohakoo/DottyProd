import api, { setAccessToken } from "@shared/api";

import type { LoginDto, LoginResDto } from "./login.dto";

export const login = async (data: LoginDto) => {
  const response = (await api.post<LoginResDto>("/auth/login", data)).data;
  setAccessToken(response.accessToken);
  return response;
};

export const startTelegramLogin = async () => {
  const response = await api.post<{ authorization_url: string }>(
    "/auth/telegram/start",
  );
  return response.data;
};
