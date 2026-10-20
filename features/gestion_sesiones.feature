Feature: Gestión de Sesiones Activas
  Como usuario autenticado
  Quiero ver y revocar mis sesiones activas
  Para controlar desde qué dispositivos accedo

  Background:
    Given que el usuario "cliente_01" ha iniciado sesión desde dos dispositivos

  @happy_path
  Scenario: Listar sesiones activas
    When el usuario "cliente_01" solicita sus sesiones activas
    Then el sistema debe devolver un código HTTP 200 OK
    And la lista debe contener 2 sesiones activas

  @happy_path
  Scenario: Revocar una sesión específica
    Given que la sesión "session_02" pertenece al usuario "cliente_01"
    When el usuario "cliente_01" revoca la sesión "session_02"
    Then el sistema debe responder con un código HTTP 204 No Content
    And el refresh token de "session_02" debe quedar invalidado

  @error_path
  Scenario: No se puede revocar una sesión ajena
    Given que la sesión "session_03" pertenece al usuario "cliente_02"
    When el usuario "cliente_01" intenta revocar la sesión "session_03"
    Then el sistema debe responder con un código HTTP 403 Forbidden

  @concurrency
  Scenario: Registrar inicios de sesión concurrentes
    When el usuario "cliente_01" inicia 6 sesiones nuevas simultáneamente
    Then los 6 inicios de sesión deben completarse correctamente
    And la lista debe contener 8 sesiones activas
