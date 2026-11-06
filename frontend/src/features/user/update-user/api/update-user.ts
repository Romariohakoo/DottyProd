import type { UserDto } from '@entities/user';
import api from '@shared/api';

import type { UpdateUserDto } from './update-user.dto';

export const updateUser = async (
  data: Partial<UpdateUserDto>,
) => (await api.patch<UserDto>('/users/me', data)).data;
