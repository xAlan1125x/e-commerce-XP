export interface Pedido {
  id: number;
  clienteId: string;
  producto: string;
  cantidad: number;
  estado: string;
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
      { id: 501, clienteId: 'cli_1', producto: 'Procesador Intel', cantidad: 2, estado: 'Pendiente' },
      { id: 502, clienteId: 'cli_2', producto: 'Procesador Intel', cantidad: 1, estado: 'Enviado' }
    ];
    this.stockMap.set('Procesador Intel', 10);
  }

  obtenerStock(producto: string): number {
    return this.stockMap.get(producto) ?? 0;
  }

  actualizarStock(producto: string, nuevoStock: number): void {
    this.stockMap.set(producto, nuevoStock);
  }

  crearPedido(clienteId: string, cantidad: number, producto: string): Pedido | null {
    const stockActual = this.obtenerStock(producto);
    if (stockActual < cantidad) return null;

    const nuevoStock = stockActual - cantidad;
    this.actualizarStock(producto, nuevoStock);

    const nuevoPedido: Pedido = {
      id: this.pedidos.length + 1,
      clienteId,
      producto,
      cantidad,
      estado: 'Pendiente de Envío'
    };
    this.pedidos.push(nuevoPedido);
    return nuevoPedido;
  }

  cancelarPedido(id: number): { pedido: Pedido; stockRestante: number } | null {
    const pedido = this.pedidos.find(p => p.id === id);
    if (!pedido || pedido.estado === 'Enviado' || pedido.estado === 'Entregado') return null;

    pedido.estado = 'Cancelado';
    const nuevoStock = this.obtenerStock(pedido.producto) + pedido.cantidad;
    this.actualizarStock(pedido.producto, nuevoStock);

    return { pedido, stockRestante: nuevoStock };
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
      estado
    };
    this.pedidos.push(pedido);
    return pedido;
  }
}