Feature: Creación de Productos en el Catálogo
  Como administrador de la tienda
  Quiero registrar un nuevo producto con su nombre, precio, stock y categoría
  Para ponerlo a la venta en el catálogo

  @happy_path
  Scenario: Registrar un producto correctamente con datos válidos
    Given que no existe un producto llamado "Teclado Mecánico"
    When el administrador envía una solicitud para crear el producto "Teclado Mecánico" con precio 4500.00, stock 10 y categoría "Periféricos"
    Then el producto debe guardarse correctamente en la base de datos con un ID único
    And el sistema debe responder con un código HTTP 201 Created

  @error_path
  Scenario: Rechazar la creación de un producto con precio inválido
    When el administrador envía una solicitud para crear el producto "Mouse Pad" con precio -100.00, stock 5 y categoría "Periféricos"
    Then el sistema debe rechazar la creación
    And el sistema debe responder con un código HTTP 422 Unprocessable Content