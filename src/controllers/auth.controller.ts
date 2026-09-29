import { Request, Response } from 'express';
import { loginUser, refreshAccessToken, registerUser, revokeRefreshToken } from '../security/auth.service';

export async function registerHandler(req: Request, res: Response) {
  try {
    const { clienteId, email, password, twoFactorEnabled } = req.body;
    const usuario = await registerUser(clienteId, email, password, twoFactorEnabled !== false);
    return res.status(201).json({
      id: usuario.id,
      clienteId: usuario.clienteId,
      email: usuario.email,
      rol: usuario.rol,
      twoFactorEnabled: usuario.twoFactorEnabled
    });
  } catch (error) {
    return res.status(422).json({ error: error instanceof Error ? error.message : 'Datos inválidos' });
  }
}

export async function loginHandler(req: Request, res: Response) {
  const sesion = await loginUser(req.body?.email, req.body?.password, req.body?.totp);
  return sesion ? res.status(200).json(sesion) : res.status(401).json({ error: 'Credenciales o segundo factor inválidos' });
}

export async function refreshHandler(req: Request, res: Response) {
  const resultado = await refreshAccessToken(req.body?.refreshToken);
  return resultado ? res.status(200).json(resultado) : res.status(401).json({ error: 'Refresh token inválido o expirado' });
}

export async function logoutHandler(req: Request, res: Response) {
  await revokeRefreshToken(req.body?.refreshToken);
  return res.status(204).send();
}
