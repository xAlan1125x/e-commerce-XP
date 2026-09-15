import { PedidosRepository, Pedido, PedidoItem } from '../repositories/pedidos.repository';

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

  crear(clienteId: string, cantidad: number, producto: string): ResultadoPedido {
    return this.crearConItems(clienteId, [{ producto, cantidad, precioUnitario: 1 }]);
  }

  crearConItems(clienteId: string, items: PedidoItem[]): ResultadoPedido {
    if (!clienteId || !items.length || items.some(item => !item.producto || !Number.isInteger(item.cantidad) || item.cantidad <= 0)) {
      return { error: 'Los datos del pedido no son válidos', status: 422 };
    }
    const resultado = this.repo.crearPedido(clienteId, items);
    if (!resultado) return { error: 'Stock insuficiente', status: 409 };
    return { pedido: resultado.pedido, stockRestante: resultado.stockRestante, status: 201 };
  }

  cancelar(id: number): ResultadoPedido {
    const resultado = this.repo.cancelarPedido(id);
    if (!resultado) {
      return { error: 'No se puede cancelar el pedido', status: 400 };
    }
    return { pedido: resultado.pedido, stockRestante: resultado.stockRestante, status: 200 };
  }

  historial(clienteId: string): Pedido[] {
    return this.repo.listarPorCliente(clienteId);
  }
}