import { Request, Response } from 'express';
import { ProductosService } from '../services/productos.service';

const service = new ProductosService();

export const crearProductoHandler = async (req: Request, res: Response) => {
  const result = await service.crear(req.body?.nombre, req.body?.precio, req.body?.stock, req.body?.categoria);
  return 'error' in result ? res.status(result.status).json({ error: result.error }) : res.status(result.status).json(result.producto);
};

export const listarProductosHandler = async (req: Request, res: Response) => {
  return res.status(200).json(await service.listar(typeof req.query.categoria === 'string' ? req.query.categoria : undefined));
};

export const actualizarStockHandler = async (req: Request, res: Response) => {
  const result = await service.actualizarStock(Number(req.params.id), req.body?.stock);
  return 'error' in result ? res.status(result.status).json({ error: result.error }) : res.status(result.status).json(result.producto);
};

export const eliminarProductoHandler = async (req: Request, res: Response) => {
  const result = await service.eliminar(Number(req.params.id));
  return result.error ? res.status(result.status).json({ error: result.error }) : res.status(result.status).send();
};
