import express from 'express';
import 'dotenv/config';
import path from 'path';
import { crearPedidoHandler, cancelarPedidoHandler } from './controllers/pedidos.controller';
import { crearProductoHandler, listarProductosHandler, actualizarStockHandler } from './controllers/productos.controller';
import { historialPedidosHandler } from './controllers/pedidos.controller';
import { loginHandler, registerHandler } from './controllers/auth.controller';

export const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.post('/api/pedidos', crearPedidoHandler);
app.patch('/api/pedidos/:id/cancelar', cancelarPedidoHandler);
app.get('/api/pedidos/historial/:clienteId', historialPedidosHandler);
app.get('/api/clientes/:clienteId/pedidos', historialPedidosHandler);
app.post('/api/auth/register', registerHandler);
app.post('/api/auth/login', loginHandler);
app.post('/api/productos', crearProductoHandler);
app.get('/api/productos', listarProductosHandler);
app.patch('/api/productos/:id/stock', actualizarStockHandler);

if (require.main === module) {
  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => {
    console.log(`E-Commerce XP ejecutándose en http://localhost:${port}`);
  });
}