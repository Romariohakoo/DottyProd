import api from '@shared/api';

import { GetUserReqDto, GetUserResDto } from './user.dto';

export const getUser = async (query: GetUserReqDto) =>
  (await api.get<GetUserResDto>(`/users/${query.id}`)).data;

export const getMe = async () =>
  (await api.get<GetUserResDto>('/users/me')).data;
