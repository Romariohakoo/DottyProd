import { Uid } from '@shared/api';

export interface User {
  id: Uid;
  login: string;
  name: string;
}
