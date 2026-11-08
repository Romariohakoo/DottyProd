export interface User {
  id: number;
  username: string;
  email: string;
  telegramId?: number | null;
  name?: string | null;
  avatarUrl?: string | null;
}
