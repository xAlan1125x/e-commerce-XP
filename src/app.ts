import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import path from 'path';
import { crearPedidoHandler, cancelarPedidoHandler, listarPedidosHandler } from './controllers/pedidos.controller';
import { crearProductoHandler, listarProductosHandler, actualizarStockHandler, eliminarProductoHandler } from './controllers/productos.controller';
import { historialPedidosHandler } from './controllers/pedidos.controller';
import { loginHandler, logoutHandler, refreshHandler, registerHandler } from './controllers/auth.controller';
import { requireAuth, requireOwnership, requireRole } from './security/authMiddleware';
import { loginLimiter } from './security/rateLimiters';
import { loginSchema, refreshSchema, registroSchema, validate } from './security/validation';

export const app = express();
app.use(express.json());

const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
app.use(cors({ origin: corsOrigin }));

app.use(express.static(path.join(__dirname, '..', 'public')));

// --- Autenticación (pública) ---
app.post('/api/auth/register', validate(registroSchema), registerHandler);
app.post('/api/auth/login', loginLimiter, validate(loginSchema), loginHandler);
app.post('/api/auth/refresh', validate(refreshSchema), refreshHandler);
app.post('/api/auth/logout', validate(refreshSchema), logoutHandler);

// --- Catálogo (lectura pública, escritura solo ADMIN) ---
app.get('/api/productos', listarProductosHandler);
app.post('/api/productos', requireAuth, requireRole(['ADMIN']), crearProductoHandler);
app.patch('/api/productos/:id/stock', requireAuth, requireRole(['ADMIN']), actualizarStockHandler);
app.delete('/api/productos/:id', requireAuth, requireRole(['ADMIN']), eliminarProductoHandler);

// --- Pedidos ---
app.post('/api/pedidos', crearPedidoHandler);
app.patch('/api/pedidos/:id/cancelar', cancelarPedidoHandler);
app.get('/api/pedidos', requireAuth, requireRole(['ADMIN']), listarPedidosHandler);
app.get('/api/pedidos/historial/:clienteId', requireAuth, requireOwnership('clienteId'), historialPedidosHandler);
app.get('/api/clientes/:clienteId/pedidos', requireAuth, requireOwnership('clienteId'), historialPedidosHandler);

if (require.main === module) {
  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => {
    console.log(`E-Commerce XP ejecutándose en http://localhost:${port}`);
  });
}
