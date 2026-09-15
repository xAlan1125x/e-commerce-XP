import crypto from 'crypto';
import { hashPassword, verifyPassword, verifyTotp } from './credentials';

interface User { id: string; passwordHash: string; twoFactorEnabled: boolean; }
const users = new Map<string, User>();

export function registerUser(id: string, password: string, twoFactorEnabled = true): void {
  if (!id || !password) throw new Error('Credenciales obligatorias');
  users.set(id, { id, passwordHash: hashPassword(password), twoFactorEnabled });
}

export function loginUser(id: string, password: string, totp: unknown): string | null {
  const user = users.get(id);
  if (!user || !verifyPassword(password, user.passwordHash) || (user.twoFactorEnabled && !verifyTotp(totp))) return null;
  const payload = Buffer.from(JSON.stringify({ sub: user.id, exp: Date.now() + 3600000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', process.env.JWT_SECRET ?? 'development-only-secret').update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
