import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload, Rol } from './jwt';

declare global {
  namespace Express {
    interface Request {
      usuario?: AccessTokenPayload;
    }
  }
}

/** AuthN: valida la firma y vigencia del access token (JWT). */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
  }
  try {
    req.usuario = verifyAccessToken(token);
    return next();
  } catch {
    return res.status(403).json({ error: 'Token inválido o expirado.' });
  }
}

/** AuthZ (RBAC): exige que el usuario autenticado tenga alguno de los roles indicados. */
export function requireRole(rolesPermitidos: Rol[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes los permisos necesarios.' });
    }
    return next();
  };
}

/**
 * AuthZ por propiedad del recurso (previene IDOR): permite el acceso solo si el
 * clienteId autenticado coincide con el parámetro de ruta, o si el usuario tiene
 * alguno de los roles con acceso ampliado (ej. ADMIN).
 */
export function requireOwnership(paramName: string, rolesConAccesoTotal: Rol[] = ['ADMIN']) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
    }
    const esPropietario = req.usuario.clienteId === req.params[paramName];
    const tieneAccesoTotal = rolesConAccesoTotal.includes(req.usuario.rol);
    if (!esPropietario && !tieneAccesoTotal) {
      return res.status(403).json({ error: 'No tienes permisos para acceder a este recurso.' });
    }
    return next();
  };
}
