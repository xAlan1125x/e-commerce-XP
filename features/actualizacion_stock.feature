Feature: Actualización de Inventario / Stock
  Como administrador de la tienda
  Quiero modificar la cantidad disponible de un producto
  Para mantener el inventario actualizado

  Background:
    Given que existe el producto "Silla Gamer" con ID 101 y stock actual de 5 unidades

  @happy_path
  Scenario: Actualizar el stock de un producto existente
    When el administrador envía una solicitud para actualizar el stock del producto con ID 101 a 20 unidades
    Then el stock del producto con ID 101 en la base de datos debe ser 20
    And el sistema debe responder con un código HTTP 200 OK

  @error_path
  Scenario: Rechazar la actualización de stock para un producto inexistente
    When el administrador intenta actualizar el stock del producto con ID 9999 a 10 unidades
    Then el sistema debe responder con un código HTTP 404 Not Found