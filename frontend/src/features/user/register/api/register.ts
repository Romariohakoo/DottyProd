import type { UserAndTokenDto } from '@entities/user';
import api from '@shared/api';

import type { RegisterDto } from './register.dto';

export const register = async (data: RegisterDto) =>
  (await api.post<UserAndTokenDto>('/auth/register', data))
    .data;
