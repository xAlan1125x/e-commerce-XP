import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword, verifyTotp } from './credentials';
import { signAccessToken, signRefreshToken, verifyRefreshToken, Rol } from './jwt';

const prisma = new PrismaClient();

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface SessionMetadata {
  deviceName?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface SesionIniciada {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  clienteId: string;
  rol: Rol;
}

export interface SesionActiva {
  sessionId: string;
  deviceName: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  current: boolean;
}

export type ResultadoRevocacion = 'revoked' | 'forbidden' | 'not_found';

/** Alta de usuario. El rol siempre nace en CLIENTE: nunca se confía en el body para asignar privilegios. */
export async function registerUser(clienteId: string, email: string, password: string, twoFactorEnabled = true) {
  const existente = await prisma.usuario.findFirst({ where: { OR: [{ email }, { clienteId }] } });
  if (existente) throw new Error('El cliente o el email ya están registrados');

  return prisma.usuario.create({
    data: { clienteId, email, password: hashPassword(password), rol: 'CLIENTE', twoFactorEnabled }
  });
}

/**
 * Cada login crea una sesión persistente. PostgreSQL reemplaza al Redis sugerido
 * en el PRD: el registro queda disponible para todas las réplicas de la API.
 */
export async function loginUser(
  email: string,
  password: string,
  totp: unknown,
  metadata: SessionMetadata = {}
): Promise<SesionIniciada | null> {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || !verifyPassword(password, usuario.password)) return null;
  if (usuario.twoFactorEnabled && !verifyTotp(totp)) return null;

  const rol = usuario.rol as Rol;
  const sessionId = crypto.randomUUID();
  const accessToken = signAccessToken({ sub: usuario.id, clienteId: usuario.clienteId, rol, sessionId });
  const { token: refreshToken, expiresAt } = signRefreshToken({ sub: usuario.id, sessionId });
  await prisma.refreshToken.create({
    data: {
      sessionId,
      tokenHash: hashToken(refreshToken),
      usuarioId: usuario.id,
      deviceName: metadata.deviceName?.trim() || 'Navegador web',
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
      expiresAt
    }
  });

  return { accessToken, refreshToken, sessionId, clienteId: usuario.clienteId, rol };
}

/** Renueva el access token si la sesión persiste, no fue revocada y no expiró. */
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string } | null> {
  let payload: { sub: number; sessionId: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return null;
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { usuario: true }
  });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date() ||
      stored.usuarioId !== payload.sub || stored.sessionId !== payload.sessionId) return null;

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { lastUsedAt: new Date() }
  });

  const accessToken = signAccessToken({
    sub: stored.usuario.id,
    clienteId: stored.usuario.clienteId,
    rol: stored.usuario.rol as Rol,
    sessionId: stored.sessionId
  });
  return { accessToken };
}

/** Revoca la sesión asociada a un refresh token durante el logout. */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken) },
    data: { revokedAt: new Date() }
  });
}

/** Lista únicamente las sesiones vigentes del usuario autenticado. */
export async function listActiveSessions(usuarioId: number, currentSessionId: string): Promise<SesionActiva[]> {
  const sesiones = await prisma.refreshToken.findMany({
    where: {
      usuarioId,
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { lastUsedAt: 'desc' },
    select: {
      sessionId: true,
      deviceName: true,
      userAgent: true,
      ipAddress: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true
    }
  });

  return sesiones.map((sesion) => ({
    ...sesion,
    current: sesion.sessionId === currentSessionId
  }));
}

/** Revoca por id público y distingue recursos ajenos para responder 403. */
export async function revokeSession(usuarioId: number, sessionId: string): Promise<ResultadoRevocacion> {
  const sesion = await prisma.refreshToken.findUnique({
    where: { sessionId },
    select: { id: true, usuarioId: true }
  });
  if (!sesion) return 'not_found';
  if (sesion.usuarioId !== usuarioId) return 'forbidden';

  await prisma.refreshToken.update({
    where: { id: sesion.id },
    data: { revokedAt: new Date() }
  });
  return 'revoked';
}

/**
 * Complementa la firma JWT con estado servidor para que una revocación sea
 * inmediata, aun cuando el access token todavía no haya vencido.
 */
export async function isSessionActive(usuarioId: number, sessionId: string | undefined): Promise<boolean> {
  if (!sessionId) return false;
  const sesion = await prisma.refreshToken.findFirst({
    where: {
      sessionId,
      usuarioId,
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    select: { id: true }
  });
  return Boolean(sesion);
}
