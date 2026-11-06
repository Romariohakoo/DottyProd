import { Uid } from '@shared/api';

import { User } from '../model';

export type UserDto = User;

export interface GetUserReqDto {
  id: Uid;
}
export type GetUserResDto = UserDto;

export interface UserAndTokenDto {
  accessToken: string;
  expiresIn: number;
  user: User;
}
