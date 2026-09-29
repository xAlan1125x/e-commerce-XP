import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type Rol = 'CLIENTE' | 'ADMIN';

export interface AccessTokenPayload {
  sub: number;
  clienteId: string;
  rol: Rol;
}

function getSecret(name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} es obligatoria`);
  return value;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, getSecret('JWT_SECRET'), { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, getSecret('JWT_SECRET')) as unknown as AccessTokenPayload;
}

export function signRefreshToken(payload: { sub: number }): { token: string; expiresAt: Date } {
  const token = jwt.sign(payload, getSecret('JWT_REFRESH_SECRET'), { expiresIn: REFRESH_TOKEN_TTL });
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  return { token, expiresAt };
}

export function verifyRefreshToken(token: string): { sub: number } {
  return jwt.verify(token, getSecret('JWT_REFRESH_SECRET')) as unknown as { sub: number };
}
