export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResDto {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}
