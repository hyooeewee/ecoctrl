export interface IotResponse {
  code: number;
  [key: string]: unknown;
}

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}
