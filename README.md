# E-Commerce XP: Backend, BDD y frontend

Plataforma backend de comercio electrónico implementada con TypeScript, Express y prácticas de Extreme Programming (XP). El comportamiento se especifica con Cucumber/Gherkin y puede probarse desde una interfaz web sencilla.

## Historias de usuario y criterios de aceptación

### HU01 - Creación de productos

Como administrador quiero registrar un producto con nombre, precio, stock y categoría para ponerlo a la venta.

- Se guarda con un ID único si el nombre no está vacío, el precio es mayor que 0 y el stock es mayor o igual a 0.
- Los campos inválidos producen HTTP 422.
- No se permiten nombres exactos duplicados.

### HU02 - Consulta del catálogo

Como cliente quiero listar productos activos y filtrarlos por categoría.

- La respuesta incluye nombre, precio, stock y categoría.
- `GET /api/productos?categoria=...` devuelve solo la categoría solicitada.
- Si no hay coincidencias, devuelve `[]` con HTTP 200.

### HU03 - Actualización de stock

Como administrador quiero modificar la cantidad disponible de un producto.

- El stock de un producto existente se actualiza.
- Un ID inexistente devuelve HTTP 404.
- No se aceptan valores negativos.

### HU04 - Creación de pedidos

Como cliente registrado quiero comprar uno o varios productos.

- El pedido se crea solo si hay stock suficiente.
- El stock se descuenta al confirmar.
- Una compra con varios ítems insuficientes se rechaza sin cambios parciales.

### HU05 - Cancelación de pedidos

Como cliente quiero cancelar pedidos pendientes para liberar productos reservados.

- Un pedido pendiente cambia a `Cancelado`.
- El stock se reintegra automáticamente.
- Los pedidos `Enviado` o `Entregado` devuelven HTTP 400.

### HU06 - Historial

Como cliente registrado quiero consultar únicamente mis pedidos.

- Cada pedido incluye fecha, productos, cantidades, precio unitario y total.
- Un cliente sin pedidos recibe `[]` con HTTP 200.

### Historias técnicas

- La autenticación futura debe soportar TOTP de 6 dígitos o WebAuthn/Passkeys y responder 401 sin la segunda validación.
- Las contraseñas se procesan con bcrypt y factor de coste 12; los secretos sensibles se cifran con AES-256-GCM usando `ENCRYPTION_KEY`.
- Las compras validan todos los ítems antes de modificar el inventario; una compra sin stock suficiente devuelve HTTP 409 y no aplica descuentos parciales.

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
│   ├── repositories/                # Persistencia (en memoria para esta entrega)
│   └── security/                    # bcrypt, TOTP, AES-256-GCM y tokens
├── tests/step_definitions/           # Adaptadores Cucumber que ejercitan app real
├── prisma/schema.prisma              # Modelo persistente preparado para Prisma
├── cucumber.js                       # Configuración ts-node + features
├── package.json                      # Scripts y dependencias
└── tsconfig.json                     # TypeScript strict
```

La persistencia en memoria mantiene la solución simple y reproducible para BDD. El esquema Prisma documenta el modelo relacional y permite migrar a una base real sin cambiar el contrato de la API.

## API

- `POST /api/productos` crea un producto.
- `GET /api/productos?categoria=Audio` lista y filtra productos.
- `PATCH /api/productos/:id/stock` actualiza stock.
- `POST /api/pedidos` crea un pedido.
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
npm run dev
```

Edita `.env` con secretos locales propios. En PowerShell también puedes usar
`$env:ENCRYPTION_KEY = "una-clave-local-segura"` antes de arrancar.

Abrir `http://localhost:3000` para usar el frontend.

Para ejecutar la suite BDD:

```bash
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
