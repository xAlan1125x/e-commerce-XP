import { Request, Response } from 'express';
import { PedidosService } from '../services/pedidos.service';

const service = new PedidosService();

export const crearPedidoHandler = async (req: Request, res: Response) => {
  const { clienteId, cantidad, producto, items } = req.body;
  const pedidoItems = Array.isArray(items) ? items.map((item: { producto: string; cantidad: number; precioUnitario?: number }) => ({
    producto: item.producto,
    cantidad: item.cantidad,
    precioUnitario: item.precioUnitario ?? 1
  })) : [{ producto, cantidad, precioUnitario: 1 }];
  const result = await service.crearConItems(clienteId, pedidoItems);

  if ('error' in result) {
    return res.status(result.status).json({ error: result.error });
  }

  // Asegura el retorno con res.status(201)
  return res.status(result.status).json({
    id: result.pedido.id,
    clienteId: result.pedido.clienteId,
    producto: result.pedido.producto,
    estado: result.pedido.estado,
    stockRestante: result.stockRestante,
    items: result.pedido.items,
    total: result.pedido.total,
    createdAt: result.pedido.createdAt
  });
};

export const cancelarPedidoHandler = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await service.cancelar(id);

  if ('error' in result) {
    return res.status(result.status).json({ error: result.error });
  }

  return res.status(result.status).json({
    id: result.pedido.id,
    estado: result.pedido.estado,
    stockRestante: result.stockRestante
  });
};

export const historialPedidosHandler = (req: Request, res: Response) => {
  return res.status(200).json(service.historial(String(req.params.clienteId)));
};

export const listarPedidosHandler = (_req: Request, res: Response) => {
  return res.status(200).json(service.todos());
};