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

export class PedidosRepository {
  private static instance: PedidosRepository;
  private readonly prisma = new PrismaClient();
  private pedidos: Pedido[] = [];
  private stockMap: Map<string, number> = new Map();

  private constructor() {
    this.reset();
  }

  public static getInstance(): PedidosRepository {
    if (!PedidosRepository.instance) {
      PedidosRepository.instance = new PedidosRepository();
    }
    return PedidosRepository.instance;
  }

  reset(): void {
    this.pedidos = [
      { id: 501, clienteId: 'cli_1', producto: 'Procesador Intel', cantidad: 2, items: [{ producto: 'Procesador Intel', cantidad: 2, precioUnitario: 1 }], estado: 'Pendiente', createdAt: new Date().toISOString(), total: 2 },
      { id: 502, clienteId: 'cli_2', producto: 'Procesador Intel', cantidad: 1, items: [{ producto: 'Procesador Intel', cantidad: 1, precioUnitario: 1 }], estado: 'Enviado', createdAt: new Date().toISOString(), total: 1 }
    ];
    this.stockMap.set('Procesador Intel', 10);
  }

  async obtenerStock(producto: string): Promise<number> {
    const registro = await this.prisma.producto.findUnique({ where: { nombre: producto }, select: { stock: true } });
    return registro?.stock ?? 0;
  }

  async actualizarStock(producto: string, nuevoStock: number): Promise<void> {
    await this.prisma.producto.upsert({
      where: { nombre: producto },
      update: { stock: nuevoStock },
      create: { nombre: producto, precio: 1, stock: nuevoStock, categoria: 'Pruebas' }
    });
  }

  async crearPedido(clienteId: string, items: PedidoItem[]): Promise<{ pedido: Pedido; stockRestante: number } | null> {
    const cantidades = new Map<string, number>();
    for (const item of items) cantidades.set(item.producto, (cantidades.get(item.producto) ?? 0) + item.cantidad);
    const actualizado = await this.prisma.$transaction(async (tx) => {
      for (const [producto, cantidad] of cantidades) {
        const result = await tx.producto.updateMany({
          where: { nombre: producto, stock: { gte: cantidad } },
          data: { stock: { decrement: cantidad } }
        });
        if (result.count !== 1) return false;
      }
      return true;
    });
    if (!actualizado) return null;
    const first = items[0];
    const nuevoPedido: Pedido = {
      id: this.pedidos.reduce((max, pedido) => Math.max(max, pedido.id), 0) + 1,
      clienteId,
      producto: first.producto,
      cantidad: first.cantidad,
      items,
      estado: 'Pendiente de Envío',
      createdAt: new Date().toISOString(),
      total: items.reduce((sum, item) => sum + item.cantidad * item.precioUnitario, 0)
    };
    this.pedidos.push(nuevoPedido);
    return { pedido: nuevoPedido, stockRestante: await this.obtenerStock(first.producto) };
  }

  async cancelarPedido(id: number): Promise<{ pedido: Pedido; stockRestante: number } | null> {
    const pedido = this.pedidos.find(p => p.id === id);
    if (!pedido || pedido.estado === 'Enviado' || pedido.estado === 'Entregado') return null;

    pedido.estado = 'Cancelado';
    await this.prisma.$transaction(async (tx) => {
      for (const item of pedido.items) {
        await tx.producto.updateMany({
          where: { nombre: item.producto },
          data: { stock: { increment: item.cantidad } }
        });
      }
    });

    return { pedido, stockRestante: await this.obtenerStock(pedido.items[0].producto) };
  }

  listarPorCliente(clienteId: string): Pedido[] {
    return this.pedidos.filter(pedido => pedido.clienteId === clienteId);
  }

  listarTodos(): Pedido[] {
    return [...this.pedidos].sort((a, b) => b.id - a.id);
  }

  eliminarPorCliente(clienteId: string): void {
    this.pedidos = this.pedidos.filter(pedido => pedido.clienteId !== clienteId);
  }

  agregarPedidoParaPrueba(clienteId: string, estado = 'Entregado'): Pedido {
    const pedido: Pedido = {
      id: this.pedidos.reduce((max, actual) => Math.max(max, actual.id), 0) + 1,
      clienteId,
      producto: 'Pedido de prueba',
      cantidad: 1,
      items: [{ producto: 'Pedido de prueba', cantidad: 1, precioUnitario: 15000 }],
      estado,
      createdAt: new Date().toISOString(),
      total: 15000
    };
    this.pedidos.push(pedido);
    return pedido;
  }
}
import { PrismaClient } from '@prisma/client';
