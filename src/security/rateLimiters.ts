import rateLimit from 'express-rate-limit';

/**
 * En entorno de test (BDD) subimos el límite para no bloquear corridas repetidas
 * de la suite desde 127.0.0.1 dentro de la misma ventana de 15 minutos.
 */
const max = process.env.NODE_ENV === 'test' ? 1000 : Number(process.env.LOGIN_RATE_LIMIT_MAX ?? 5);

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta nuevamente en unos minutos.' }
});
