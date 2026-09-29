import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword, verifyTotp } from './credentials';
import { signAccessToken, signRefreshToken, verifyRefreshToken, Rol } from './jwt';

const prisma = new PrismaClient();

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface SesionIniciada {
  accessToken: string;
  refreshToken: string;
  clienteId: string;
  rol: Rol;
}

/** Alta de usuario. El rol siempre nace en CLIENTE: nunca se confía en el body para asignar privilegios. */
export async function registerUser(clienteId: string, email: string, password: string, twoFactorEnabled = true) {
  const existente = await prisma.usuario.findFirst({ where: { OR: [{ email }, { clienteId }] } });
  if (existente) throw new Error('El cliente o el email ya están registrados');

  return prisma.usuario.create({
    data: { clienteId, email, password: hashPassword(password), rol: 'CLIENTE', twoFactorEnabled }
  });
}

export async function loginUser(email: string, password: string, totp: unknown): Promise<SesionIniciada | null> {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || !verifyPassword(password, usuario.password)) return null;
  if (usuario.twoFactorEnabled && !verifyTotp(totp)) return null;

  const rol = usuario.rol as Rol;
  const accessToken = signAccessToken({ sub: usuario.id, clienteId: usuario.clienteId, rol });
  const { token: refreshToken, expiresAt } = signRefreshToken({ sub: usuario.id });
  await prisma.refreshToken.create({ data: { tokenHash: hashToken(refreshToken), usuarioId: usuario.id, expiresAt } });

  return { accessToken, refreshToken, clienteId: usuario.clienteId, rol };
}

/** Ejercicio 1.3: renueva el access token corto a partir de un refresh token largo y no revocado. */
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string } | null> {
  let payload: { sub: number };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return null;
  }

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.usuarioId !== payload.sub) return null;

  const usuario = await prisma.usuario.findUnique({ where: { id: stored.usuarioId } });
  if (!usuario) return null;

  const accessToken = signAccessToken({ sub: usuario.id, clienteId: usuario.clienteId, rol: usuario.rol as Rol });
  return { accessToken };
}

/** Revocación explícita (logout) del refresh token: mitiga la desventaja de los JWT stateless. */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken) },
    data: { revokedAt: new Date() }
  });
}
