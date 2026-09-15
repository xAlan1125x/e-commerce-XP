import express from 'express';
import path from 'path';
import { crearPedidoHandler, cancelarPedidoHandler } from './controllers/pedidos.controller';
import { crearProductoHandler, listarProductosHandler, actualizarStockHandler } from './controllers/productos.controller';
import { historialPedidosHandler } from './controllers/pedidos.controller';

export const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.post('/api/pedidos', crearPedidoHandler);
app.patch('/api/pedidos/:id/cancelar', cancelarPedidoHandler);
app.get('/api/pedidos/historial/:clienteId', historialPedidosHandler);
app.post('/api/productos', crearProductoHandler);
app.get('/api/productos', listarProductosHandler);
app.patch('/api/productos/:id/stock', actualizarStockHandler);

if (require.main === module) {
  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => {
    console.log(`E-Commerce XP ejecutándose en http://localhost:${port}`);
  });
}