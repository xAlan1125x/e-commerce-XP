import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import { crearPedidoHandler, cancelarPedidoHandler, listarPedidosHandler } from './controllers/pedidos.controller';
import { crearProductoHandler, listarProductosHandler, actualizarStockHandler, eliminarProductoHandler } from './controllers/productos.controller';
import { historialPedidosHandler } from './controllers/pedidos.controller';
import {
  listSessionsHandler,
  loginHandler,
  logoutHandler,
  refreshHandler,
  registerHandler,
  revokeSessionHandler
} from './controllers/auth.controller';
import { requireAuth, requireOwnership, requireRole } from './security/authMiddleware';
import { loginLimiter } from './security/rateLimiters';
import { crearPedidoSchema, loginSchema, refreshSchema, registroSchema, validate } from './security/validation';

export const app = express();
app.use(express.json());

const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
app.use(cors({ origin: corsOrigin }));

const openapiDocument = YAML.parse(
  fs.readFileSync(path.join(process.cwd(), 'openapi.yaml'), 'utf8')
);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

app.use(express.static(path.join(__dirname, '..', 'public')));

// --- Autenticación (pública) ---
app.post('/api/auth/register', validate(registroSchema), registerHandler);
app.post('/api/auth/login', loginLimiter, validate(loginSchema), loginHandler);
app.post('/api/auth/refresh', validate(refreshSchema), refreshHandler);
app.post('/api/auth/logout', validate(refreshSchema), logoutHandler);
app.get('/api/auth/sessions', requireAuth, listSessionsHandler);
app.delete('/api/auth/sessions/:sessionId', requireAuth, revokeSessionHandler);

// --- Catálogo (lectura pública, escritura solo ADMIN) ---
app.get('/api/productos', listarProductosHandler);
app.post('/api/productos', requireAuth, requireRole(['ADMIN']), crearProductoHandler);
app.patch('/api/productos/:id/stock', requireAuth, requireRole(['ADMIN']), actualizarStockHandler);
app.delete('/api/productos/:id', requireAuth, requireRole(['ADMIN']), eliminarProductoHandler);

// --- Pedidos ---
app.post('/api/pedidos', validate(crearPedidoSchema), crearPedidoHandler);
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
