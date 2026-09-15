Feature: Consulta del Catálogo de Productos
  Como cliente
  Quiero listar los productos disponibles con opción de filtrar por categoría
  Para encontrar los artículos que me interesan

  Background:
    Given que existen los siguientes productos en el catálogo:
      | nombre              | precio   | stock | categoria   |
      | Monitor 24 Pulgadas | 120000.00 | 5     | Pantallas   |
      | Auriculares Gamer   | 35000.00  | 8     | Audio       |

  @happy_path
  Scenario: Consultar productos filtrando por categoría existente
    When el cliente solicita la lista de productos filtrando por la categoría "Pantallas"
    Then el sistema debe devolver un código HTTP 200 OK
    And la lista debe contener únicamente el producto "Monitor 24 Pulgadas"

  @edge_path
  Scenario: Consultar productos de una categoría sin resultados
    When el cliente solicita la lista de productos filtrando por la categoría "Electrohogar"
    Then el sistema debe devolver un código HTTP 200 OK
    And la lista devuelta debe estar vacía