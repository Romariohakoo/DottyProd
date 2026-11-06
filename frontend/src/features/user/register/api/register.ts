import type { UserDto } from "@entities/user";
import api from "@shared/api";

import type { RegisterDto } from "./register.dto";

export const register = async (data: RegisterDto) =>
  (await api.post<UserDto>("/auth/register", data)).data;
