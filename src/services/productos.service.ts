import { Producto } from '@prisma/client';
import { ProductosRepository } from '../repositories/productos.repository';

export type ResultadoProducto =
  | { producto: Producto; status: number }
  | { error: string; status: number };

export class ProductosService {
  constructor(private readonly repo = new ProductosRepository()) {}

  async crear(nombre: unknown, precio: unknown, stock: unknown, categoria: unknown): Promise<ResultadoProducto> {
    if (typeof nombre !== 'string' || !nombre.trim() ||
        typeof categoria !== 'string' || !categoria.trim() ||
        typeof precio !== 'number' || !Number.isFinite(precio) || precio <= 0 ||
        typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0) {
      return { error: 'Los datos del producto no son válidos', status: 422 };
    }
    try {
      const producto = await this.repo.crear({ nombre: nombre.trim(), precio, stock, categoria: categoria.trim() });
      return { producto, status: 201 };
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        return { error: 'Ya existe un producto con ese nombre', status: 422 };
      }
      throw error;
    }
  }

  listar(categoria?: string): Promise<Producto[]> {
    return this.repo.listar(categoria);
  }

  async actualizarStock(id: number, stock: unknown): Promise<ResultadoProducto> {
    if (!Number.isInteger(stock) || (stock as number) < 0) {
      return { error: 'El stock no puede ser negativo', status: 422 };
    }
    const producto = await this.repo.actualizarStock(id, stock as number);
    return producto
      ? { producto, status: 200 }
      : { error: 'Producto no encontrado', status: 404 };
  }
}
