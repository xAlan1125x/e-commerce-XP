Feature: Consulta de Historial de Pedidos
  Como cliente registrado
  Quiero consultar el historial de mis pedidos realizados
  Para realizar el seguimiento de mis compras

  @happy_path
  Scenario: Consultar el historial con pedidos realizados
    Given que el cliente "cliente_01" ha realizado 2 pedidos previamente
    When el cliente "cliente_01" solicita su historial de pedidos
    Then el sistema debe devolver un código HTTP 200 OK
    And la lista debe contener exactamente 2 pedidos pertenecientes a "cliente_01"

  @edge_path
  Scenario: Consultar el historial sin pedidos previos
    Given que el cliente "cliente_nuevo" no ha realizado ninguna compra
    When el cliente "cliente_nuevo" solicita su historial de pedidos
    Then el sistema debe devolver un código HTTP 200 OK
    And la lista devuelta debe estar vacía