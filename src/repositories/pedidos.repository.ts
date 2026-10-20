import { Prisma, PrismaClient } from '@prisma/client';

export interface Pedido {
  id: number;
  clienteId: string;
  producto?: string;
  cantidad?: number;
  items: PedidoItem[];
  estado: string;
  createdAt: string;
  total: number;
}

export interface PedidoItem {
  producto: string;
  cantidad: number;
  precioUnitario: number;
}

type PedidoConRelaciones = Prisma.PedidoGetPayload<{
  include: { usuario: true; detalles: { include: { producto: true } } };
}>;

export class StockInsuficienteError extends Error {}
export class ClienteNoEncontradoError extends Error {}

export class PedidosRepository {
  private static instance: PedidosRepository;
  private readonly prisma = new PrismaClient();

  private constructor() {}

  public static getInstance(): PedidosRepository {
    if (!PedidosRepository.instance) {
      PedidosRepository.instance = new PedidosRepository();
    }
    return PedidosRepository.instance;
  }

  private mapearPedido(pedido: PedidoConRelaciones): Pedido {
    const items = pedido.detalles.map((detalle) => ({
      producto: detalle.producto.nombre,
      cantidad: detalle.cantidad,
      precioUnitario: detalle.precioUnit
    }));
    const primero = items[0];
    return {
      id: pedido.id,
      clienteId: pedido.usuario.clienteId,
      producto: primero?.producto,
      cantidad: primero?.cantidad,
      items,
      estado: pedido.estado,
      createdAt: pedido.createdAt.toISOString(),
      total: pedido.total
    };
  }

  async obtenerStock(producto: string): Promise<number> {
    const registro = await this.prisma.producto.findUnique({
      where: { nombre: producto },
      select: { stock: true }
    });
    return registro?.stock ?? 0;
  }

  async actualizarStock(producto: string, nuevoStock: number): Promise<void> {
    await this.prisma.producto.upsert({
      where: { nombre: producto },
      update: { stock: nuevoStock },
      create: { nombre: producto, precio: 1, stock: nuevoStock, categoria: 'Pruebas' }
    });
  }

  async crearPedido(clienteId: string, items: PedidoItem[]): Promise<{ pedido: Pedido; stockRestante: number }> {
    const cantidades = new Map<string, number>();
    for (const item of items) {
      cantidades.set(item.producto, (cantidades.get(item.producto) ?? 0) + item.cantidad);
    }

    const pedidoPersistido = await this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.findUnique({ where: { clienteId } });
      if (!usuario) throw new ClienteNoEncontradoError('El cliente no está registrado');

      const productos = await tx.producto.findMany({
        where: { nombre: { in: [...cantidades.keys()] } }
      });
      const productosPorNombre = new Map(productos.map((producto) => [producto.nombre, producto]));

      const pedido = await tx.pedido.create({
        data: { usuarioId: usuario.id, estado: 'Pendiente de Envío', total: 0 }
      });

      let total = 0;
      for (const [nombre, cantidad] of cantidades) {
        const producto = productosPorNombre.get(nombre);
        if (!producto) throw new StockInsuficienteError(`El producto "${nombre}" no existe`);

        const actualizado = await tx.producto.updateMany({
          where: { id: producto.id, stock: { gte: cantidad } },
          data: { stock: { decrement: cantidad } }
        });
        if (actualizado.count !== 1) {
          throw new StockInsuficienteError(`Stock insuficiente para "${nombre}"`);
        }

        await tx.detallePedido.create({
          data: {
            pedidoId: pedido.id,
            productoId: producto.id,
            cantidad,
            precioUnit: producto.precio
          }
        });
        total += producto.precio * cantidad;
      }

      return tx.pedido.update({
        where: { id: pedido.id },
        data: { total },
        include: { usuario: true, detalles: { include: { producto: true } } }
      });
    });

    const primerProducto = pedidoPersistido.detalles[0]?.producto.nombre;
    return {
      pedido: this.mapearPedido(pedidoPersistido),
      stockRestante: primerProducto ? await this.obtenerStock(primerProducto) : 0
    };
  }

  async cancelarPedido(id: number): Promise<{ pedido: Pedido; stockRestante: number } | null> {
    const pedidoPersistido = await this.prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findUnique({
        where: { id },
        include: { usuario: true, detalles: { include: { producto: true } } }
      });
      if (!pedido || !['Pendiente', 'Pendiente de Envío'].includes(pedido.estado)) return null;

      for (const detalle of pedido.detalles) {
        await tx.producto.update({
          where: { id: detalle.productoId },
          data: { stock: { increment: detalle.cantidad } }
        });
      }

      return tx.pedido.update({
        where: { id },
        data: { estado: 'Cancelado' },
        include: { usuario: true, detalles: { include: { producto: true } } }
      });
    });

    if (!pedidoPersistido) return null;
    const primerProducto = pedidoPersistido.detalles[0]?.producto.nombre;
    return {
      pedido: this.mapearPedido(pedidoPersistido),
      stockRestante: primerProducto ? await this.obtenerStock(primerProducto) : 0
    };
  }

  async listarPorCliente(clienteId: string): Promise<Pedido[]> {
    const pedidos = await this.prisma.pedido.findMany({
      where: { usuario: { clienteId } },
      orderBy: { id: 'desc' },
      include: { usuario: true, detalles: { include: { producto: true } } }
    });
    return pedidos.map((pedido) => this.mapearPedido(pedido));
  }

  async listarTodos(): Promise<Pedido[]> {
    const pedidos = await this.prisma.pedido.findMany({
      orderBy: { id: 'desc' },
      include: { usuario: true, detalles: { include: { producto: true } } }
    });
    return pedidos.map((pedido) => this.mapearPedido(pedido));
  }

  async eliminarPorCliente(clienteId: string): Promise<void> {
    await this.prisma.pedido.deleteMany({ where: { usuario: { clienteId } } });
  }

  async guardarPedidoParaPrueba(
    id: number,
    clienteId: string,
    estado: string,
    producto: string,
    cantidad: number
  ): Promise<Pedido> {
    const persistido = await this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.findUniqueOrThrow({ where: { clienteId } });
      const productoPersistido = await tx.producto.upsert({
        where: { nombre: producto },
        update: {},
        create: { nombre: producto, precio: 1, stock: 0, categoria: 'Pruebas' }
      });
      await tx.pedido.deleteMany({ where: { id } });
      return tx.pedido.create({
        data: {
          id,
          usuarioId: usuario.id,
          estado,
          total: productoPersistido.precio * cantidad,
          detalles: {
            create: {
              productoId: productoPersistido.id,
              cantidad,
              precioUnit: productoPersistido.precio
            }
          }
        },
        include: { usuario: true, detalles: { include: { producto: true } } }
      });
    });
    return this.mapearPedido(persistido);
  }

  async agregarPedidoParaPrueba(clienteId: string, estado = 'Entregado'): Promise<Pedido> {
    const producto = await this.prisma.producto.upsert({
      where: { nombre: 'Pedido de prueba' },
      update: {},
      create: { nombre: 'Pedido de prueba', precio: 15000, stock: 100, categoria: 'Pruebas' }
    });
    const usuario = await this.prisma.usuario.findUniqueOrThrow({ where: { clienteId } });
    const persistido = await this.prisma.pedido.create({
      data: {
        usuarioId: usuario.id,
        estado,
        total: 15000,
        detalles: { create: { productoId: producto.id, cantidad: 1, precioUnit: 15000 } }
      },
      include: { usuario: true, detalles: { include: { producto: true } } }
    });
    return this.mapearPedido(persistido);
  }
}
