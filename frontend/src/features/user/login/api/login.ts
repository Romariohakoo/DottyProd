import type { UserAndTokenDto } from '@entities/user';
import api from '@shared/api';

import type { LoginDto } from './login.dto';

export const login = async (data: LoginDto) =>
  (await api.post<UserAndTokenDto>('/auth/login', data))
    .data;
