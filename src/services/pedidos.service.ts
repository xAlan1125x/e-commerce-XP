import { PedidosRepository, Pedido } from '../repositories/pedidos.repository';

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
    const pedido = this.repo.crearPedido(clienteId, cantidad, producto);
    if (!pedido) {
      return { error: 'Stock insuficiente', status: 400 };
    }
    const stockRestante = this.repo.obtenerStock(producto);
    return { pedido, stockRestante, status: 201 }; // Retornar 201 Created
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