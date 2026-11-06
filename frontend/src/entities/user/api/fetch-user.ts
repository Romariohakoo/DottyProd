import api from "@shared/api";

import { GetUserResDto } from "./user.dto";

export const getMe = async () =>
  (await api.get<GetUserResDto>("/auth/me")).data;
