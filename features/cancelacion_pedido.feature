Feature: Cancelación de Pedidos
  Como cliente
  Quiero poder cancelar un pedido en estado "Pendiente"
  Para liberar los productos reservados

  Background:
    Given que el cliente "cliente_01" tiene un pedido registrado con ID 501 en estado "Pendiente" que incluye 2 unidades de "Procesador Intel"
    And el stock actual de "Procesador Intel" es de 10 unidades

  @happy_path
  Scenario: Cancelar un pedido pendiente y reintegrar el stock
    When el cliente solicita cancelar el pedido con ID 501
    Then el estado del pedido 501 debe cambiar a "Cancelado"
    And el stock de "Procesador Intel" debe reintegrarse a 12 unidades

  @error_path
  Scenario: Rechazar la cancelación si el pedido ya fue enviado
    Given que el pedido con ID 502 se encuentra en estado "Enviado"
    When el cliente intenta cancelar el pedido con ID 502
    Then el sistema debe rechazar la cancelación
    And el sistema debe responder con un código HTTP 400 Bad Request