export interface AuthResult {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  readonly accessToken: string;
  readonly accessTokenExpiresInSeconds: number;
  readonly refreshToken: string;
  readonly refreshTokenExpiresInSeconds: number;
}
