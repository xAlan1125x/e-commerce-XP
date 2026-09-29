# E-Commerce XP: Backend, BDD y frontend

Plataforma backend de comercio electrónico implementada con TypeScript, Express y prácticas de Extreme Programming (XP). El comportamiento se especifica con Cucumber/Gherkin y puede probarse desde una interfaz web sencilla.

## Funcionalidades de la aplicación

### Funcionalidades disponibles desde el frontend

Desde `http://localhost:3000` se puede:

- Iniciar sesión (JWT) o registrarse desde el panel de "Sesión", visible en ambas vistas.
- Cambiar entre las vistas de desarrollo **Comprador** y **Vendedor**.
- Como comprador, consultar el catálogo, filtrar por categoría, crear un carrito multiítem, confirmar pedidos y consultar/cancelar tu propio historial (requiere sesión iniciada como ese cliente).
- Como vendedor autenticado con rol `ADMIN`, crear y eliminar productos, actualizar stock, consultar todos los pedidos y ver sus estados, clientes, fechas y totales.
- Ver mensajes de procesamiento, éxito y error que se limpian y vuelven a mostrar en cada acción.
- Ver el stock actualizado después de cada operación.

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
│   ├── schema.prisma                 # Modelo persistente (incluye Usuario y RefreshToken)
│   └── seed.ts                       # Crea el usuario ADMIN inicial ("npm run db:seed")
├── cucumber.js                       # Configuración ts-node + features
├── package.json                      # Scripts y dependencias
└── tsconfig.json                     # TypeScript strict
```

Los productos y su stock se almacenan mediante Prisma en SQLite. Los pedidos mantienen su información de negocio en el repositorio de la aplicación y actualizan el stock de productos dentro de transacciones Prisma, evitando que el catálogo y el checkout utilicen fuentes de datos diferentes.

## API

### Autenticación (públicas, sujetas a validación Zod)

- `POST /api/auth/register` registra un usuario (`clienteId`, `email`, `password`, `twoFactorEnabled?`). El rol siempre nace `CLIENTE`.
- `POST /api/auth/login` exige `email` + `password` y, si está activado, `totp` de seis dígitos. Devuelve `accessToken` (JWT, 15 min) y `refreshToken` (7 días). Limitado a 5 intentos / 15 min por IP.
- `POST /api/auth/refresh` recibe `refreshToken` y devuelve un nuevo `accessToken`.
- `POST /api/auth/logout` recibe `refreshToken` y lo revoca.

### Catálogo y pedidos

- `GET /api/productos?categoria=Audio` lista y filtra productos (pública).
- `POST /api/productos` crea un producto. **Requiere `Authorization: Bearer <accessToken>` con rol `ADMIN`.**
- `PATCH /api/productos/:id/stock` actualiza stock. **Requiere rol `ADMIN`.**
- `DELETE /api/productos/:id` elimina un producto que todavía no esté incluido en pedidos. **Requiere rol `ADMIN`.**
- `POST /api/pedidos` crea un pedido (pública).
- `GET /api/pedidos` lista todos los pedidos para la vista del vendedor. **Requiere rol `ADMIN`.**
- `PATCH /api/pedidos/:id/cancelar` cancela un pedido pendiente (pública).
- `GET /api/pedidos/historial/:clienteId` / `GET /api/clientes/:clienteId/pedidos` consultan el historial del cliente. **Requiere estar autenticado como ese mismo `clienteId`, o ser `ADMIN`.**
- `GET /` sirve el frontend.

Las rutas marcadas como protegidas devuelven `401` sin token (o token inválido/expirado) y `403` con un token válido pero sin los permisos necesarios.

## Cómo levantar el proyecto

Requisitos: Node.js 22 o superior.

```bash
npm install
copy .env.example .env
npx prisma db push
npm run db:seed
npm run dev
```

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
