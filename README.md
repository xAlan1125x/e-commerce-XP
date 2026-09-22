# E-Commerce XP: Backend, BDD y frontend

Plataforma backend de comercio electrónico implementada con TypeScript, Express y prácticas de Extreme Programming (XP). El comportamiento se especifica con Cucumber/Gherkin y puede probarse desde una interfaz web sencilla.

## Funcionalidades de la aplicación

### Funcionalidades disponibles desde el frontend

Desde `http://localhost:3000` se puede:

- Cambiar entre las vistas de desarrollo **Comprador** y **Vendedor**.
- Como comprador, consultar el catálogo, filtrar por categoría, crear un carrito multiítem, confirmar pedidos y consultar/cancelar el historial.
- Como vendedor, crear y eliminar productos, actualizar stock, consultar todos los pedidos y ver sus estados, clientes, fechas y totales.
- Ver mensajes de procesamiento, éxito y error que se limpian y vuelven a mostrar en cada acción.
- Ver el stock actualizado después de cada operación.

### Funcionalidades disponibles mediante la API

La API REST también permite:

- Actualizar el stock de un producto existente.
- Cancelar pedidos pendientes y reintegrar su stock.
- Consultar el historial de pedidos de un cliente.
- Crear pedidos con uno o varios productos.
- Rechazar pedidos sin stock suficiente con HTTP `409`, sin aplicar descuentos parciales.
- Registrar usuarios con contraseñas protegidas mediante bcrypt.
- Iniciar sesión con contraseña y segundo factor TOTP de seis dígitos.
- Cifrar datos sensibles utilizando AES-256-GCM.

Los endpoints disponibles están detallados en la sección [API](#api).

## Historias de usuario y requisitos

### Requisitos funcionales

#### HU01 - Creación de productos en el catálogo

Como administrador de la tienda, quiero registrar un nuevo producto con su nombre, precio, stock y categoría para ponerlo a la venta en el catálogo.

Criterios de aceptación:

- El producto se guarda con un ID único si el nombre no está vacío, el precio es mayor que `0` y el stock es mayor o igual que `0`.
- Si el precio es menor o igual que `0`, faltan campos obligatorios o los datos son inválidos, el sistema responde HTTP `422 Unprocessable Content`.
- No se permite registrar dos productos con el mismo nombre exacto.

#### HU02 - Consulta del catálogo de productos

Como cliente, quiero listar los productos disponibles con opción de filtrar por categoría para encontrar los artículos que me interesan.

Criterios de aceptación:

- La consulta devuelve los productos junto con su nombre, precio, stock y categoría.
- Si se especifica una categoría, solo se devuelven los productos pertenecientes a ella.
- Si no existen coincidencias, el sistema responde con `[]` y HTTP `200 OK`.

#### HU03 - Actualización de inventario

Como administrador de la tienda, quiero modificar la cantidad disponible de un producto para mantener el inventario actualizado.

Criterios de aceptación:

- Al enviar un nuevo valor para un producto existente, su stock se actualiza.
- Si el producto no existe, el sistema responde HTTP `404 Not Found`.
- No se permiten valores de stock negativos.

#### HU04 - Creación de pedidos y checkout

Como cliente registrado, quiero procesar la compra de uno o varios productos para generar un pedido en el sistema.

Criterios de aceptación:

- El pedido se crea únicamente si existe stock suficiente para todos los productos solicitados.
- Al confirmar la compra, el stock de cada producto se descuenta automáticamente.
- Si un pedido con varios productos no puede completarse por falta de stock, toda la operación se rechaza sin modificaciones parciales y responde HTTP `409 Conflict`.

#### HU05 - Cancelación de pedidos

Como cliente, quiero cancelar un pedido en estado pendiente para liberar los productos reservados.

Criterios de aceptación:

- Un pedido pendiente cambia su estado a `Cancelado`.
- El stock de los productos incluidos se reintegra automáticamente.
- Si el pedido está `Enviado` o `Entregado`, la cancelación se rechaza con HTTP `400 Bad Request`.

#### HU06 - Consulta del historial de pedidos

Como cliente registrado, quiero consultar el historial de mis pedidos realizados para realizar el seguimiento de mis compras.

Criterios de aceptación:

- El cliente solo puede consultar los pedidos asociados a su propio identificador.
- Cada pedido muestra fecha, productos, cantidades, precio unitario y total calculado.
- Si el cliente no tiene pedidos, el sistema devuelve `[]` con HTTP `200 OK`.

### Requisitos no funcionales y técnicos

#### RNF01 - Autenticación robusta con segundo factor

Como usuario de la plataforma, quiero autenticarme mediante un segundo factor para evitar accesos no autorizados.

Criterios de aceptación:

- El inicio de sesión puede exigir un código TOTP válido de seis dígitos.
- Un inicio de sesión con credenciales incorrectas o sin el segundo factor devuelve HTTP `401 Unauthorized`.
- La arquitectura deja previsto el soporte de WebAuthn/Passkeys.

#### RNF02 - Protección de credenciales y datos sensibles

Como administrador y auditor de seguridad, quiero proteger las credenciales y los datos sensibles almacenados.

Criterios de aceptación:

- Las contraseñas no se guardan en texto plano y se procesan con bcrypt con factor de coste `12`.
- Los secretos sensibles se cifran con AES-256-GCM.
- La clave de cifrado se obtiene desde la variable de entorno `ENCRYPTION_KEY`.
- No existe un endpoint para recuperar contraseñas en texto plano.

#### RNF03 - Transacciones y consistencia del inventario

Como arquitecto del sistema, quiero que las compras mantengan la consistencia del inventario ante errores y concurrencia.

Criterios de aceptación:

- La compra valida todos sus productos antes de descontar stock.
- Si una compra no puede completarse, no se aplican cambios parciales.
- Una operación sin stock suficiente responde HTTP `409 Conflict`.

#### RNF04 - Calidad, arquitectura e integración continua

Como equipo de desarrollo, queremos mantener una solución comprobable y fácil de evolucionar.

Criterios de aceptación:

- El código utiliza TypeScript con `strict` habilitado.
- La aplicación separa controladores, servicios y repositorios.
- Los comportamientos se verifican mediante escenarios Cucumber/Gherkin.
- GitHub Actions ejecuta instalación, lint, compilación TypeScript y pruebas BDD en cada push y pull request.

## Fases BDD y XP

1. **Fase 1 - Requisitos:** historias y criterios de aceptación.
2. **Fase 2 - BDD:** escenarios `.feature` y step definitions en TypeScript.
3. **Fase 3 - Backend:** implementación por capas que hace pasar los escenarios, seguida de refactorización.

El ciclo aplicado es **Red → Green → Refactor**: primero se expresa el comportamiento con Gherkin, después se implementa la solución mínima y finalmente se mejora la estructura sin cambiar el comportamiento. El repositorio usa diseño simple (YAGNI), separación por capas y CI en cada push.

## Estructura del repositorio

```text
.
├── .github/workflows/main.yml       # CI: instalación, lint disponible, TypeScript y Cucumber
├── features/                        # Especificaciones ejecutables en Gherkin
│   ├── creacion_productos.feature  # HU01: alta y validaciones
│   ├── consulta_catalogo.feature    # HU02: listado y filtro
│   ├── actualizacion_stock.feature  # HU03: inventario
│   ├── creacion_pedidos.feature     # HU04: checkout y stock
│   ├── cancelacion_pedido.feature   # HU05: cancelación y reintegro
│   └── historial_pedidos.feature    # HU06: historial por cliente
├── public/                          # Frontend estático servido por Express
│   ├── index.html                   # Pantalla de catálogo, alta y checkout
│   ├── app.js                       # Cliente HTTP de la API
│   └── styles.css                   # Estilos responsive
├── src/
│   ├── app.ts                       # Configuración Express, rutas y frontend
│   ├── controllers/                 # Traducción HTTP -> casos de uso
│   ├── services/                    # Reglas de negocio
│   ├── repositories/                # Persistencia de productos y stock mediante Prisma
│   └── security/                    # bcrypt, TOTP, AES-256-GCM y tokens
├── tests/step_definitions/           # Adaptadores Cucumber que ejercitan app real
├── prisma/schema.prisma              # Modelo persistente preparado para Prisma
├── cucumber.js                       # Configuración ts-node + features
├── package.json                      # Scripts y dependencias
└── tsconfig.json                     # TypeScript strict
```

Los productos y su stock se almacenan mediante Prisma en SQLite. Los pedidos mantienen su información de negocio en el repositorio de la aplicación y actualizan el stock de productos dentro de transacciones Prisma, evitando que el catálogo y el checkout utilicen fuentes de datos diferentes.

## API

- `POST /api/productos` crea un producto.
- `GET /api/productos?categoria=Audio` lista y filtra productos.
- `PATCH /api/productos/:id/stock` actualiza stock.
- `DELETE /api/productos/:id` elimina un producto que todavía no esté incluido en pedidos.
- `POST /api/pedidos` crea un pedido.
- `GET /api/pedidos` lista los pedidos disponibles para la vista del vendedor.
- `PATCH /api/pedidos/:id/cancelar` cancela un pedido pendiente.
- `GET /api/clientes/:clienteId/pedidos` consulta el historial del cliente.
- `POST /api/auth/register` registra credenciales con bcrypt.
- `POST /api/auth/login` exige contraseña y, si está activado, código TOTP de seis dígitos.
- `GET /` sirve el frontend.

## Cómo levantar el proyecto

Requisitos: Node.js 22 o superior.

```bash
npm install
copy .env.example .env
npx prisma db push
npm run dev
```

Edita `.env` con secretos locales propios. En PowerShell también puedes usar
`$env:ENCRYPTION_KEY = "una-clave-local-segura"` antes de arrancar.

Si el servidor ya estaba ejecutándose, detenlo y vuelve a ejecutar `npm run dev`
después de actualizar el código. De lo contrario, el navegador puede seguir
conectado a un proceso anterior que no tenga las rutas más recientes.

Abrir `http://localhost:3000` para usar el frontend.

Para ejecutar la suite BDD:

```bash
npx prisma db push
npm run test:e2e
```

Para comprobar tipos:

```bash
npx tsc --noEmit
```

Para ejecutar el linter:

```bash
npm run lint
```

El pipeline de GitHub Actions ejecuta `npm ci`, lint, compilación TypeScript y la suite Cucumber en cada push y pull request.
