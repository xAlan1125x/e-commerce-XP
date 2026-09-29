# Seguridad, Autenticación y Autorización — E-Commerce XP

Este documento resume el contexto del proyecto, qué se implementó en esta etapa
(JWT + RBAC + hardening, a partir del TP de Unidad 4: Seguridad, Autenticación
y Autorización) y cómo probar todo. Complementa al [README.md](README.md)
general del proyecto, que documenta el resto de las funcionalidades (catálogo,
pedidos, BDD).

## Contexto del proyecto

**E-Commerce XP** es un backend de comercio electrónico en TypeScript + Express
+ Prisma (SQLite), desarrollado con prácticas de Extreme Programming (XP) y
BDD (Cucumber/Gherkin). Antes de este trabajo, el proyecto ya tenía:

- Catálogo de productos y pedidos con reglas de negocio (stock, cancelación,
  historial) verificadas por escenarios `.feature`.
- Un login "casero": contraseñas con bcrypt + TOTP de 2FA, pero el token de
  sesión era un HMAC armado a mano (no JWT) y los usuarios vivían en un `Map`
  en memoria (se perdían al reiniciar el server). No existían roles ni
  ninguna ruta protegida: cualquiera podía crear/borrar productos o ver el
  historial de pedidos de cualquier cliente.

## Qué se pidió

A partir de dos documentos del profesor:

1. Un ejemplo de **autenticación con JWT y autorización por roles (RBAC)** en
   Node.js/Express/MongoDB, para "agregar al sistema en desarrollo dichos
   procesos" y probarlos con Postman o cURL.
2. Los **Ejercicios 1, 2 y 3** de la Unidad 4:
   - **Ejercicio 1** — Arquitectura de autenticación: registro, login, renovación (refresh).
   - **Ejercicio 2** — Middlewares de autorización avanzada: `requireAuth`, `requireRole(rolesArray)`, y una prueba de IDOR (proteger un endpoint verificando la propiedad del recurso).
   - **Ejercicio 3** — Hardening del servidor: CORS, rate limiting, sanitización/validación.

## Qué se implementó

### Autenticación (JWT real + persistencia)

- Los usuarios ahora se guardan en la base (modelos `Usuario` y `RefreshToken`
  en [prisma/schema.prisma](prisma/schema.prisma)), no en memoria.
- El login emite un **access token JWT** de 15 minutos y un **refresh token**
  de 7 días (hasheado en la base, revocable) — ver [src/security/jwt.ts](src/security/jwt.ts)
  y [src/security/auth.service.ts](src/security/auth.service.ts).
- `POST /api/auth/refresh` renueva el access token sin pedir contraseña de nuevo.
- `POST /api/auth/logout` revoca el refresh token.
- El rol de un usuario **siempre nace `CLIENTE`** en el registro público; el
  rol `ADMIN` solo se asigna mediante el seed inicial o por un `ADMIN` ya
  autenticado (nunca confiando en el body de la request, para evitar
  escalación de privilegios).

### Autorización por roles (RBAC) y por propiedad del recurso (anti-IDOR)

Middlewares en [src/security/authMiddleware.ts](src/security/authMiddleware.ts):

- `requireAuth` — valida la firma y vigencia del JWT.
- `requireRole(['ADMIN'])` — exige un rol específico.
- `requireOwnership('clienteId')` — exige que el `clienteId` del token
  coincida con el de la URL (o que el usuario sea `ADMIN`).

Aplicado a rutas reales del negocio (ver [src/app.ts](src/app.ts)):

| Ruta | Protección |
| --- | --- |
| `POST /api/productos` (crear producto) | `ADMIN` |
| `PATCH /api/productos/:id/stock` (actualizar stock) | `ADMIN` |
| `DELETE /api/productos/:id` (eliminar producto) | `ADMIN` |
| `GET /api/pedidos` (listar todos los pedidos) | `ADMIN` |
| `GET /api/pedidos/historial/:clienteId` | Dueño del `clienteId`, o `ADMIN` (anti-IDOR) |
| `GET /api/productos`, `POST /api/pedidos`, `PATCH /api/pedidos/:id/cancelar` | Públicas (sin cambios) |

### Hardening

- **CORS** restringido al origen configurado en `CORS_ORIGIN` (antes abierto).
- **Rate limiting** en el login: 5 intentos cada 15 minutos por IP
  ([src/security/rateLimiters.ts](src/security/rateLimiters.ts)).
- **Validación estricta con Zod** en `/api/auth/*`
  ([src/security/validation.ts](src/security/validation.ts)); la inyección
  SQL/NoSQL ya estaba cubierta porque Prisma parametriza todas las queries.

### Para que nada se rompiera

- Se actualizaron los tests BDD (Cucumber) existentes para loguearse con el
  rol correcto antes de pegarle a las rutas ahora protegidas
  ([tests/support/authHelpers.ts](tests/support/authHelpers.ts)).
- Se agregó un escenario BDD nuevo (`@security`) que prueba el 403 por IDOR
  en [features/historial_pedidos.feature](features/historial_pedidos.feature).
- Se agregó un seed (`npm run db:seed`) para crear el usuario `ADMIN` inicial.
- Se agregó un login/registro mínimo en el frontend
  ([public/index.html](public/index.html) / [public/app.js](public/app.js))
  para que la demo visual siguiera funcionando.
- Se actualizó el CI de GitHub Actions con los secrets de JWT, ahora
  obligatorios.

## Cómo probar los cambios

### 0. Preparar el entorno (una sola vez)

```bash
npm install
copy .env.example .env
npx prisma db push
npm run db:seed
```

`npm run db:seed` crea el usuario `ADMIN` inicial:
`admin@estudio.local` / `Admin#12345` (configurable en `.env` vía
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`). Ojo: valores con `#` van entre
comillas dobles en `.env`, si no `dotenv` los corta ahí.

### 1. Levantar el server

```bash
npm run dev
```

Abrí `http://localhost:3000` para la demo visual, o segui con cURL/Postman abajo.

### 2. Ejercicio 1 — Registro, login, refresh, logout

```bash
# Registro (rol siempre CLIENTE)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"clienteId":"cliente_test","email":"test@demo.com","password":"Password#123","twoFactorEnabled":false}'

# Login -> devuelve accessToken (15 min) y refreshToken (7 días)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@demo.com","password":"Password#123"}'

# Refresh (usar el refreshToken de la respuesta anterior)
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<REFRESH_TOKEN>"}'

# Logout (revoca el refresh token)
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<REFRESH_TOKEN>"}'

# Repetir el refresh con el mismo token -> ahora debe dar 401 (quedó revocado)
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<REFRESH_TOKEN>"}'
```

### 3. Ejercicio 2 — RBAC e IDOR

```bash
# Login como ADMIN
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@estudio.local","password":"Admin#12345"}'
# guardar el accessToken como $ADMIN_TOKEN

# Crear producto SIN token -> 401
curl -i -X POST http://localhost:3000/api/productos \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Mouse","precio":15000,"stock":10,"categoria":"Perifericos"}'

# Crear producto CON token ADMIN -> 201
curl -i -X POST http://localhost:3000/api/productos \
  -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"nombre":"Mouse","precio":15000,"stock":10,"categoria":"Perifericos"}'

# Con token de un CLIENTE (no ADMIN) -> 403
curl -i -X POST http://localhost:3000/api/productos \
  -H "Content-Type: application/json" -H "Authorization: Bearer $CLIENTE_TOKEN" \
  -d '{"nombre":"Mouse","precio":15000,"stock":10,"categoria":"Perifericos"}'

# IDOR: un cliente autenticado intenta ver el historial de OTRO cliente -> 403
curl -i http://localhost:3000/api/pedidos/historial/otro_cliente \
  -H "Authorization: Bearer $CLIENTE_TOKEN"

# El mismo cliente viendo SU PROPIO historial -> 200
curl -i http://localhost:3000/api/pedidos/historial/cliente_test \
  -H "Authorization: Bearer $CLIENTE_TOKEN"
```

### 4. Ejercicio 3 — Hardening

```bash
# Rate limiting: repetir un login fallido más de 5 veces en 15 min -> 429
for i in 1 2 3 4 5 6; do
  curl -s -o /dev/null -w "intento $i: %{http_code}\n" \
    -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@estudio.local","password":"incorrecta"}'
done

# Validación Zod: password muy corta / email inválido -> 422
curl -i -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"clienteId":"x","email":"no-es-un-email","password":"123"}'
```

> El rate limiter guarda el conteo en memoria: si lo probás varias veces
> seguidas contra el mismo server, vas a agotar la cuota real de 5 intentos y
> vas a ver 429 en llamadas posteriores (incluidas de otras pruebas) hasta
> que pasen los 15 minutos o reinicies el server con `npm run dev`.

### 5. Suite automática (BDD)

Corre los escenarios Cucumber existentes, incluido el nuevo de IDOR, con
usuarios de prueba autenticados automáticamente:

```bash
npm run test:e2e
```

Resultado esperado: `13 scenarios (13 passed)` / `53 steps (53 passed)`.

### 6. Chequeos de calidad

```bash
npx tsc --noEmit   # sin errores de tipos
npm run lint       # sin errores de ESLint
```

### 7. En Postman

1. Creá requests `POST` para `/api/auth/register`, `/login`, `/refresh`,
   `/logout`, y para las rutas de productos/pedidos de arriba.
2. En la pestaña **Tests** del request de login, agregá:
   ```javascript
   const body = pm.response.json();
   pm.environment.set("accessToken", body.accessToken);
   pm.environment.set("refreshToken", body.refreshToken);
   ```
3. En los requests protegidos, agregá el header
   `Authorization: Bearer {{accessToken}}`.
