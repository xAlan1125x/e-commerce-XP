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

  obtenerStock(producto: string): number {
    return this.stockMap.get(producto) ?? 0;
  }

  actualizarStock(producto: string, nuevoStock: number): void {
    this.stockMap.set(producto, nuevoStock);
  }

  crearPedido(clienteId: string, items: PedidoItem[]): { pedido: Pedido; stockRestante: number } | null {
    const cantidades = new Map<string, number>();
    for (const item of items) cantidades.set(item.producto, (cantidades.get(item.producto) ?? 0) + item.cantidad);
    for (const [producto, cantidad] of cantidades) {
      if (this.obtenerStock(producto) < cantidad) return null;
    }
    for (const [producto, cantidad] of cantidades) this.actualizarStock(producto, this.obtenerStock(producto) - cantidad);
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
    return { pedido: nuevoPedido, stockRestante: this.obtenerStock(first.producto) };
  }

  cancelarPedido(id: number): { pedido: Pedido; stockRestante: number } | null {
    const pedido = this.pedidos.find(p => p.id === id);
    if (!pedido || pedido.estado === 'Enviado' || pedido.estado === 'Entregado') return null;

    pedido.estado = 'Cancelado';
    for (const item of pedido.items) this.actualizarStock(item.producto, this.obtenerStock(item.producto) + item.cantidad);

    return { pedido, stockRestante: this.obtenerStock(pedido.items[0].producto) };
  }

  listarPorCliente(clienteId: string): Pedido[] {
    return this.pedidos.filter(pedido => pedido.clienteId === clienteId);
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