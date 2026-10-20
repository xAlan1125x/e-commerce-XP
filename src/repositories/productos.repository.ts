import { Prisma, PrismaClient, Producto } from '@prisma/client';

const prisma = new PrismaClient();

export class ProductosRepository {
  /** Limpia datos relacionados únicamente para preparar escenarios BDD repetibles. */
  private async eliminarParaPrueba(where: Prisma.ProductoWhereInput): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const productos = await tx.producto.findMany({ where, select: { id: true } });
      const productoIds = productos.map((producto) => producto.id);
      if (!productoIds.length) return;

      const detalles = await tx.detallePedido.findMany({
        where: { productoId: { in: productoIds } },
        select: { pedidoId: true }
      });
      const pedidoIds = [...new Set(detalles.map((detalle) => detalle.pedidoId))];
      if (pedidoIds.length) {
        // Al borrar el pedido, sus detalles se eliminan por la relación onDelete: Cascade.
        await tx.pedido.deleteMany({ where: { id: { in: pedidoIds } } });
      }
      await tx.producto.deleteMany({ where: { id: { in: productoIds } } });
    });
  }

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
    await this.eliminarParaPrueba({ nombre });
  }

  /** Used by acceptance tests to establish a deterministic product identifier. */
  async guardarConId(id: number, datos: Omit<Producto, 'id' | 'createdAt'>): Promise<Producto> {
    await this.eliminarParaPrueba({ OR: [{ id }, { nombre: datos.nombre }] });
    return prisma.producto.create({ data: { id, ...datos } });
  }
}
