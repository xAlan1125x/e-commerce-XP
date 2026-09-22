import { PrismaClient, Producto } from '@prisma/client';

const prisma = new PrismaClient();

export class ProductosRepository {
  async crear(datos: Omit<Producto, 'id' | 'createdAt'>): Promise<Producto> {
    return prisma.producto.create({ data: datos });
  }

  async listar(categoria?: string): Promise<Producto[]> {
    return prisma.producto.findMany({
      where: categoria ? { categoria } : undefined,
      orderBy: { id: 'asc' }
    });
  }

  async actualizarStock(id: number, stock: number): Promise<Producto | null> {
    const producto = await prisma.producto.findUnique({ where: { id } });
    if (!producto) return null;
    return prisma.producto.update({ where: { id }, data: { stock } });
  }

  async eliminar(id: number): Promise<Producto | null> {
    const producto = await prisma.producto.findUnique({ where: { id } });
    if (!producto) return null;
    await prisma.producto.delete({ where: { id } });
    return producto;
  }

  async eliminarPorNombre(nombre: string): Promise<void> {
    await prisma.producto.deleteMany({ where: { nombre } });
  }

  /** Used by acceptance tests to establish a deterministic product identifier. */
  async guardarConId(id: number, datos: Omit<Producto, 'id' | 'createdAt'>): Promise<Producto> {
    await prisma.producto.deleteMany({ where: { id } });
    return prisma.producto.create({ data: { id, ...datos } });
  }
}
