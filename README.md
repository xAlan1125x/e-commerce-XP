# E-Commerce XP: Backend, BDD y frontend

Plataforma backend de comercio electrónico implementada con TypeScript, Express y prácticas de Extreme Programming (XP). El comportamiento se especifica con Cucumber/Gherkin y puede probarse desde una interfaz web sencilla.

Documentación complementaria: [SEGURIDAD.md](SEGURIDAD.md) detalla la implementación de autenticación JWT, autorización RBAC, protección anti-IDOR y hardening.

## Funcionalidades de la aplicación

### Funcionalidades disponibles desde el frontend

Desde `http://localhost:3000` se puede:

- Iniciar sesión (JWT) o registrarse desde el panel de "Sesión", visible en ambas vistas.
- Cambiar entre las vistas de desarrollo **Comprador** y **Vendedor**.
- Como comprador, consultar el catálogo, filtrar por categoría, crear un carrito multiítem, confirmar pedidos y consultar/cancelar tu propio historial (requiere sesión iniciada como ese cliente).
- Como vendedor autenticado con rol `ADMIN`, crear y eliminar productos, actualizar stock, consultar todos los pedidos y ver sus estados, clientes, fechas y totales.
- Ver mensajes de procesamiento, éxito y error que se limpian y vuelven a mostrar en cada acción.
- Ver el stock actualizado después de cada operación.
- Como vendedor, eliminar productos que todavía no estén asociados a pedidos y refrescar el catálogo, el inventario y los pedidos sin recargar la página.

### Funcionalidades disponibles mediante la API

La API REST también permite:

- Actualizar el stock de un producto existente (rol `ADMIN`).
- Cancelar pedidos pendientes y reintegrar su stock.
- Consultar el historial de pedidos de un cliente, protegido contra IDOR (solo el propio cliente o un `ADMIN`).
- Crear pedidos con uno o varios productos.
- Rechazar pedidos sin stock suficiente con HTTP `409`, sin aplicar descuentos parciales.
- Registrar usuarios con contraseñas protegidas mediante bcrypt (el rol siempre nace `CLIENTE`).
- Iniciar sesión con contraseña y segundo factor TOTP de seis dígitos, recibiendo un access token JWT y un refresh token.
- Renovar el access token (`/api/auth/refresh`) y revocarlo (`/api/auth/logout`).
- Autorización basada en roles (RBAC) sobre las rutas de administración del catálogo.
- Límite de intentos de login por IP (rate limiting) y validación estricta de los bodies de autenticación (Zod).
- Cifrar datos sensibles utilizando AES-256-GCM.
- Configurar el origen permitido por CORS mediante `CORS_ORIGIN` y el límite de login mediante `LOGIN_RATE_LIMIT_MAX`.

Los endpoints disponibles están detallados en la sección [API](#api).
La documentación interactiva OpenAPI/Swagger está disponible en
`http://localhost:3000/api-docs` cuando la aplicación está ejecutándose.

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

#### RNF01 - Autenticación robusta con JWT y segundo factor

Como usuario de la plataforma, quiero autenticarme mediante un segundo factor y recibir tokens de corta duración para evitar accesos no autorizados.

Criterios de aceptación:

- El inicio de sesión puede exigir un código TOTP válido de seis dígitos.
- Un inicio de sesión con credenciales incorrectas o sin el segundo factor devuelve HTTP `401 Unauthorized`.
- El login exitoso emite un access token JWT de corta duración (15 min) y un refresh token (7 días) persistido de forma hasheada para poder revocarse.
- `POST /api/auth/refresh` permite renovar el access token sin volver a pedir contraseña; `POST /api/auth/logout` revoca el refresh token.
- El endpoint de login limita a 5 intentos cada 15 minutos por IP (`express-rate-limit`) para mitigar fuerza bruta.
- La arquitectura deja previsto el soporte de WebAuthn/Passkeys.

#### RNF05 - Autorización basada en roles y control de acceso a recursos

Como administrador de la tienda, quiero que solo el personal autorizado pueda modificar el catálogo y que cada cliente acceda únicamente a sus propios pedidos.

Criterios de aceptación:

- El rol se asigna siempre en `CLIENTE` al registrarse; nunca se confía en el body de la request para asignar `ADMIN` (previene escalación de privilegios).
- Crear, actualizar stock y eliminar productos, y listar todos los pedidos, requieren un access token válido con rol `ADMIN` (`requireAuth` + `requireRole`); sin token responde `401`, con rol insuficiente responde `403`.
- Consultar el historial de un cliente (`GET /api/pedidos/historial/:clienteId`) exige que el `clienteId` del token coincida con el de la URL, salvo que el usuario sea `ADMIN` (`requireOwnership`, previene IDOR); un cliente que intenta ver el historial de otro recibe `403`.
- CORS solo permite el origen configurado en `CORS_ORIGIN` (por defecto el propio frontend).
- Los bodies de `/api/auth/*` se validan con esquemas Zod estrictos antes de tocar la base de datos.

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
├── .env.example                     # Variables de entorno para desarrollo local
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
│   ├── repositories/                # Persistencia de productos y pedidos mediante Prisma
│   └── security/                    # bcrypt, TOTP, AES-256-GCM, JWT, RBAC, rate limiting y validación
│       ├── auth.service.ts          # Registro/login/refresh/logout (Prisma + JWT)
│       ├── authMiddleware.ts        # requireAuth, requireRole, requireOwnership (RBAC + anti-IDOR)
│       ├── jwt.ts                   # Firma y verificación de access/refresh tokens
│       ├── rateLimiters.ts          # Rate limiting del login
│       └── validation.ts            # Esquemas Zod para /api/auth/*
├── tests/
│   ├── step_definitions/             # Adaptadores Cucumber que ejercitan app real
│   └── support/authHelpers.ts        # Login/registro reutilizable para tests autenticados
├── prisma/
│   ├── migrations/                   # Migraciones versionadas de PostgreSQL
│   ├── schema.prisma                 # Entidades y relaciones administradas por Prisma
│   └── seed.ts                       # Crea el usuario ADMIN inicial ("npm run db:seed")
├── compose.yaml                      # PostgreSQL local en el puerto 5433
├── openapi.yaml                      # Contrato OpenAPI mostrado por Swagger UI
├── cucumber.js                       # Configuración ts-node + features
├── SEGURIDAD.md                      # Detalle de autenticación, RBAC y hardening
├── package.json                      # Scripts y dependencias
└── tsconfig.json                     # TypeScript strict
```

Productos, usuarios, pedidos, detalles y refresh tokens se almacenan mediante
Prisma en PostgreSQL. El checkout crea `Pedido` y `DetallePedido`, calcula el
total con los precios almacenados y descuenta el stock dentro de una única
transacción. Ante un producto inexistente o stock insuficiente se lanza un
error y PostgreSQL revierte todos los cambios.

## Entidades y persistencia con Prisma

En Prisma cada bloque `model` de `prisma/schema.prisma` representa una entidad
persistente y se convierte en una tabla de PostgreSQL. El modelo relacional
principal del checkout es:

```text
Usuario 1 ─── N Pedido 1 ─── N DetallePedido N ─── 1 Producto
```

- `Usuario` identifica al cliente que realiza la compra.
- `Pedido` almacena el estado, total, fecha y referencia al usuario.
- `DetallePedido` vincula cada producto con el pedido y conserva su cantidad y
  precio unitario.
- `Producto` contiene el catálogo y el stock disponible.

La migración inicial de `prisma/migrations/` crea las tablas, claves primarias,
índices únicos y claves foráneas. La creación de pedidos se implementa en
`src/repositories/pedidos.repository.ts` mediante `prisma.$transaction`:

1. Busca al usuario y todos los productos solicitados.
2. Crea el pedido inicial.
3. Descuenta el stock con una actualización condicional (`stock >= cantidad`).
4. Crea los registros de `DetallePedido` y calcula el total usando los precios
   almacenados, sin confiar en un precio enviado por el cliente.
5. Actualiza y devuelve el pedido con sus relaciones.

Si falta un producto o no hay stock suficiente se lanza un error dentro de la
transacción. Prisma ejecuta el rollback y evita pedidos, detalles o descuentos
parciales. El escenario `@transaction` de
`features/creacion_pedidos.feature` comprueba este comportamiento con un pedido
de varios productos.

### Ver las entidades y sus registros

Con PostgreSQL iniciado y las migraciones aplicadas, ejecutar en otra terminal:

```bash
npx prisma studio
```

Abrir `http://localhost:5555`. Prisma Studio permite inspeccionar las cinco
entidades, sus filas y relaciones directamente en PostgreSQL.

![Entidades disponibles en Prisma Studio](<Screenshots/2026-10-20 17_39_16-DimScreen Screen.png>)

Después de crear un pedido desde Swagger se puede abrir `Pedido` para comprobar
su `usuarioId`, estado, total, fecha y relación con `DetallePedido`.

![Pedidos persistidos en PostgreSQL](<Screenshots/2026-10-20 17_39_50-DimScreen Screen.png>)

## OpenAPI y Swagger UI

El contrato declarativo se encuentra en `openapi.yaml` (OpenAPI 3.1). Allí se
documenta `POST /api/pedidos`, su `requestBody`, los DTO esperados, un ejemplo y
las respuestas `201`, `400`, `409` y `422`. `src/app.ts` carga ese archivo y
publica Swagger UI como middleware de Express en `/api-docs`.

La validación efectiva del body no depende de Swagger: se realiza antes del
controlador mediante el esquema Zod `crearPedidoSchema` de
`src/security/validation.ts`.

![Contrato de pedidos en Swagger UI](<Screenshots/2026-10-20 17_37_48-DimScreen Screen.png>)

Desde **Try it out** se puede enviar un pedido válido y comprobar la respuesta
`201 Created`, el total calculado y el stock restante:

![Pedido creado desde Swagger](<Screenshots/2026-10-20 17_38_06-DimScreen Screen.png>)

También pueden verificarse los contratos de error. Una cantidad igual a cero
es rechazada con `422 Unprocessable Entity`, mientras que una cantidad superior
al stock responde `409 Conflict` y provoca el rollback:

![Validación de cantidad inválida](<Screenshots/2026-10-20 17_38_29-DimScreen Screen.png>)

![Rollback por stock insuficiente](<Screenshots/2026-10-20 17_38_45-DimScreen Screen.png>)

## API

### Autenticación (públicas, sujetas a validación Zod)

- `POST /api/auth/register` registra un usuario (`clienteId`, `email`, `password`, `twoFactorEnabled?`). El rol siempre nace `CLIENTE`.
- `POST /api/auth/login` exige `email` + `password` y, si está activado, `totp` de seis dígitos. Devuelve `accessToken` (JWT, 15 min) y `refreshToken` (7 días). Limitado a 5 intentos / 15 min por IP.
- `POST /api/auth/refresh` recibe `refreshToken` y devuelve un nuevo `accessToken`.
- `POST /api/auth/logout` recibe `refreshToken` y lo revoca.

### Catálogo y pedidos

Las rutas protegidas usan el encabezado `Authorization: Bearer <accessToken>`.

- `GET /api/productos?categoria=Audio` lista y filtra productos (pública).
- `POST /api/productos` crea un producto. **Requiere `Authorization: Bearer <accessToken>`` con rol `ADMIN`.**
- `PATCH /api/productos/:id/stock` actualiza stock. **Requiere rol `ADMIN`.**
- `DELETE /api/productos/:id` elimina un producto que todavía no esté incluido en pedidos. **Requiere rol `ADMIN`.**
- `POST /api/pedidos` crea un pedido (pública).
- `GET /api/pedidos` lista todos los pedidos para la vista del vendedor. **Requiere rol `ADMIN`.**
- `PATCH /api/pedidos/:id/cancelar` cancela un pedido pendiente (pública).
- `GET /api/pedidos/historial/:clienteId` / `GET /api/clientes/:clienteId/pedidos` consultan el historial del cliente. **Requiere estar autenticado como ese mismo `clienteId`, o ser `ADMIN`.**
- `GET /` sirve el frontend.

Las rutas marcadas como protegidas devuelven `401` sin token (o token inválido/expirado) y `403` con un token válido pero sin los permisos necesarios. Las rutas públicas de pedidos se mantienen así para conservar los escenarios BDD existentes; el historial y el listado global sí están protegidos.

## Cómo levantar el proyecto

Requisitos: Node.js 22 o superior y Docker Desktop.

Desde una copia nueva del repositorio, abrir una terminal en su raíz y ejecutar:

```bash
npm install
copy .env.example .env
npm run db:start
npm run db:deploy
npm run db:seed
npm run dev
```

En Linux o macOS, reemplazar `copy .env.example .env` por
`cp .env.example .env`.

Los comandos cumplen las siguientes funciones:

- `npm run db:start` levanta PostgreSQL con Docker Compose en el puerto `5433`.
- `npm run db:deploy` aplica las migraciones versionadas.
- `npm run db:seed` crea o actualiza el usuario administrador inicial.
- `npm run dev` inicia Express en el puerto `3000`.

Edita `.env` con secretos locales propios (`JWT_SECRET`, `JWT_REFRESH_SECRET`,
`ENCRYPTION_KEY`, etc.). En PowerShell también puedes usar
`$env:ENCRYPTION_KEY = "una-clave-local-segura"` antes de arrancar. Los valores
con `#` (como `SEED_ADMIN_PASSWORD`) deben ir entre comillas dobles, o `dotenv`
los corta ahí.

`npm run db:seed` crea (o actualiza) el usuario `ADMIN` inicial a partir de
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (por defecto
`admin@estudio.local` / `Admin#12345`). El rol `ADMIN` nunca se puede obtener
vía `/api/auth/register` — solo mediante este seed o un `ADMIN` ya autenticado.

Si el servidor ya estaba ejecutándose, detenlo y vuelve a ejecutar `npm run dev`
después de actualizar el código. De lo contrario, el navegador puede seguir
conectado a un proceso anterior que no tenga las rutas más recientes.

Abrir `http://localhost:3000` para usar el frontend. Desde la sección "Sesión"
podés iniciar sesión como `ADMIN` (para crear/editar productos) o registrarte
como cliente nuevo (para hacer pedidos y ver tu propio historial).

Abrir `http://localhost:3000/api-docs` para consultar y probar el contrato de
la API desde Swagger UI.

### Demostración completa para evaluación

Para preparar datos reproducibles y demostrar que la implementación funciona:

```bash
npm run test:e2e
npm run dev
```

La suite deja disponibles los clientes y productos usados por los escenarios.
En Swagger, desplegar `POST /api/pedidos`, seleccionar **Try it out** y ejecutar:

```json
{
  "clienteId": "cliente_01",
  "items": [
    {
      "producto": "Teclado Mecánico",
      "cantidad": 1
    }
  ]
}
```

El resultado esperado es `201 Created`, con el pedido persistido, `total: 4500`
y el stock restante. Para comprobar validaciones, cambiar `cantidad` a `0`
(`422`) o a `99999` (`409`). Finalmente, ejecutar `npx prisma studio` y abrir
`Pedido` y `DetallePedido` para verificar que los datos fueron almacenados.

### Variables de entorno

El archivo `.env.example` contiene una configuración local de referencia:

| Variable | Uso | Valor predeterminado |
| --- | --- | --- |
| `DATABASE_URL` | Conexión de Prisma a PostgreSQL | `postgresql://postgres:postgres@localhost:5433/ecommerce_xp?schema=public` |
| `PORT` | Puerto HTTP de Express | `3000` |
| `CORS_ORIGIN` | Único origen permitido por CORS | `http://localhost:3000` |
| `JWT_SECRET` | Firma de access tokens | Obligatoria |
| `JWT_REFRESH_SECRET` | Firma de refresh tokens | Obligatoria |
| `ENCRYPTION_KEY` | Cifrado AES-256-GCM de datos sensibles | Obligatoria |
| `DEV_TOTP_CODE` | Código TOTP fijo para desarrollo y pruebas | `123456` |
| `LOGIN_RATE_LIMIT_MAX` | Intentos de login por IP cada 15 minutos | `5` |
| `SEED_ADMIN_CLIENTE_ID` | `clienteId` del administrador inicial | `admin` |
| `SEED_ADMIN_EMAIL` | Email del administrador inicial | `admin@estudio.local` |
| `SEED_ADMIN_PASSWORD` | Contraseña del administrador inicial | `Admin#12345` |

No uses los secretos del ejemplo fuera de un entorno local. `JWT_SECRET`,
`JWT_REFRESH_SECRET` y `ENCRYPTION_KEY` deben ser distintos y reemplazarse por
valores propios.

### Probar la API con cURL

```bash
# Login como ADMIN
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@estudio.local","password":"Admin#12345"}'

# Crear producto (reemplazar <TOKEN> por el accessToken de la respuesta anterior)
curl -X POST http://localhost:3000/api/productos \
  -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" \
  -d '{"nombre":"Mouse","precio":15000,"stock":10,"categoria":"Perifericos"}'

# Sin token -> 401; con token de un CLIENTE -> 403 (RBAC)
# Historial de otro cliente con tu propio token -> 403 (IDOR)
```

Para ejecutar la suite BDD (el script corre el seed automáticamente):

```bash
npm run db:deploy
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

## Cobertura de pruebas

La suite BDD se ejecutó con 14 escenarios y 59 pasos, todos aprobados. La
cobertura se midió sobre `src/**/*.ts`, excluyendo únicamente
`src/app.ts`, con `c8`:

| Métrica | Cobertura |
| --- | ---: |
| Líneas | **82,17 %** |
| Sentencias | 82,17 % |
| Ramas | 79,24 % |
| Funciones | 74,60 % |

### Cobertura por módulo

| Módulo | Líneas |
| --- | ---: |
| Controllers | 80,73 % |
| Repositories | 95,83 % |
| Security | 75,31 % |
| Services | 77,22 % |

El repositorio de pedidos alcanza un **98,44 % de cobertura de líneas**,
**96,29 % de ramas** y **92,30 % de funciones**.

### Scripts disponibles

- `npm run dev`: inicia el servidor Express con `ts-node`.
- `npm run db:start`: levanta PostgreSQL local mediante Docker Compose.
- `npm run db:migrate`: crea y aplica migraciones durante el desarrollo.
- `npm run db:deploy`: aplica las migraciones pendientes.
- `npm run db:seed`: crea o actualiza el administrador inicial.
- `npm run test:e2e`: ejecuta el seed y todos los escenarios Cucumber.
- `npm run lint`: analiza el código TypeScript de `src/` y `tests/`.
- `npx tsc --noEmit`: comprueba los tipos sin generar archivos.

El pipeline de GitHub Actions levanta PostgreSQL, ejecuta `npm ci`, lint,
compilación TypeScript, migraciones y la suite Cucumber en cada push a `main`,
`master` o `dev`, y en cada pull request hacia `main` o `master`.
