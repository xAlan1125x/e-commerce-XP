import { Request, Response, NextFunction } from 'express';
import { z, ZodTypeAny } from 'zod';

export const registroSchema = z.object({
  clienteId: z.string().trim().min(3, 'clienteId debe tener al menos 3 caracteres').max(50),
  email: z.string().trim().email('email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  twoFactorEnabled: z.boolean().optional()
});

export const loginSchema = z.object({
  email: z.string().trim().email('email inválido'),
  password: z.string().min(1, 'password es obligatoria'),
  totp: z.string().optional()
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10, 'refreshToken inválido')
});

/** Sanitiza y valida el body contra un esquema estricto (Ejercicio 3.3: rechazar inputs inesperados). */
export function validate(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const resultado = schema.safeParse(req.body);
    if (!resultado.success) {
      return res.status(422).json({ error: resultado.error.issues.map((i) => i.message).join(', ') });
    }
    req.body = resultado.data;
    return next();
  };
}
