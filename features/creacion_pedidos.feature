Feature: Creación de Pedido / Checkout
  Como cliente registrado
  Quiero procesar la compra de uno o varios productos
  Para generar un pedido en el sistema

  Background:
    Given que el producto "Placa de Video" tiene un stock disponible de 3 unidades

  @happy_path
  Scenario: Procesar un pedido exitosamente con descuento de stock
    When el cliente "cliente_01" realiza un pedido de 2 unidades de "Placa de Video"
    Then el pedido debe registrarse con estado "Pendiente de Envío"
    And el stock de "Placa de Video" debe actualizarse automáticamente a 1 unidad
    And el sistema debe responder con un código HTTP 201 Created

  @error_path
  Scenario: Cancelar la operación por stock insuficiente (Rollback)
    When el cliente "cliente_02" intenta realizar un pedido de 5 unidades de "Placa de Video"
    Then la creación del pedido debe ser rechazada por falta de stock
    And el stock de "Placa de Video" debe permanecer intacto en 3 unidades

  @error_path @transaction
  Scenario: Revertir todos los cambios si falla un pedido con varios productos
    Given que el producto "Teclado Mecánico" tiene un stock disponible de 5 unidades
    When el cliente "cliente_03" intenta comprar 1 unidad de "Placa de Video" y 6 unidades de "Teclado Mecánico"
    Then la creación del pedido debe ser rechazada por falta de stock
    And el stock de "Placa de Video" debe permanecer intacto en 3 unidades
    And el stock de "Teclado Mecánico" debe permanecer intacto en 5 unidades
