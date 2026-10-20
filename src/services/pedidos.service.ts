import {
  ClienteNoEncontradoError,
  PedidosRepository,
  Pedido,
  PedidoItem,
  StockInsuficienteError
} from '../repositories/pedidos.repository';

export interface ExitoPedido {
  pedido: Pedido;
  stockRestante: number;
  status: number;
}

export interface ErrorPedido {
  error: string;
  status: number;
}

export type ResultadoPedido = ExitoPedido | ErrorPedido;

export class PedidosService {
  private repo = PedidosRepository.getInstance();

  async crear(clienteId: string, cantidad: number, producto: string): Promise<ResultadoPedido> {
    return this.crearConItems(clienteId, [{ producto, cantidad, precioUnitario: 1 }]);
  }

  async crearConItems(clienteId: string, items: PedidoItem[]): Promise<ResultadoPedido> {
    if (!clienteId || !items.length || items.some(item => !item.producto || !Number.isInteger(item.cantidad) || item.cantidad <= 0)) {
      return { error: 'Los datos del pedido no son válidos', status: 422 };
    }
    try {
      const resultado = await this.repo.crearPedido(clienteId, items);
      return { pedido: resultado.pedido, stockRestante: resultado.stockRestante, status: 201 };
    } catch (error) {
      if (error instanceof ClienteNoEncontradoError) {
        return { error: error.message, status: 400 };
      }
      if (error instanceof StockInsuficienteError) {
        return { error: error.message, status: 409 };
      }
      throw error;
    }
  }

  async cancelar(id: number): Promise<ResultadoPedido> {
    const resultado = await this.repo.cancelarPedido(id);
    if (!resultado) {
      return { error: 'No se puede cancelar el pedido', status: 400 };
    }
    return { pedido: resultado.pedido, stockRestante: resultado.stockRestante, status: 200 };
  }

  historial(clienteId: string): Promise<Pedido[]> {
    return this.repo.listarPorCliente(clienteId);
  }

  todos(): Promise<Pedido[]> {
    return this.repo.listarTodos();
  }
}
