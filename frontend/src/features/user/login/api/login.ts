import api from "@shared/api";

import type { LoginResDto } from "./login.dto";

export const login = async () =>
  (await api.post<LoginResDto>("/auth/telegram/start")).data;
