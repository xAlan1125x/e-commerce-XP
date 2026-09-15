import { Request, Response } from 'express';
import { loginUser, registerUser } from '../security/auth.service';

export function registerHandler(req: Request, res: Response) {
  try {
    registerUser(req.body?.id, req.body?.password, req.body?.twoFactorEnabled !== false);
    return res.status(201).json({ id: req.body.id, twoFactorEnabled: req.body?.twoFactorEnabled !== false });
  } catch (error) {
    return res.status(422).json({ error: error instanceof Error ? error.message : 'Datos inválidos' });
  }
}

export function loginHandler(req: Request, res: Response) {
  const token = loginUser(req.body?.id, req.body?.password, req.body?.totp);
  return token ? res.status(200).json({ token }) : res.status(401).json({ error: 'Credenciales o segundo factor inválidos' });
}
