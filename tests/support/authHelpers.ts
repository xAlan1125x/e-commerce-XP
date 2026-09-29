import request from 'supertest';
import { app } from '../../src/app';

/**
 * Credenciales de prueba para la suite BDD. El usuario ADMIN se crea con
 * "npm run db:seed" (ver prisma/seed.ts); test:e2e ejecuta el seed antes de
 * correr Cucumber, así que este helper solo necesita loguearse.
 */
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@estudio.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin#12345';
const CLIENTE_PASSWORD = 'ClienteTests#2026';

let adminTokenCache: string | null = null;
const clienteTokenCache = new Map<string, string>();

export async function obtenerTokenAdmin(): Promise<string> {
  if (adminTokenCache) return adminTokenCache;
  const login = await request(app).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (login.status !== 200 || !login.body?.accessToken) {
    throw new Error(`No se pudo autenticar el usuario ADMIN de pruebas (¿corriste "npm run db:seed"?): ${JSON.stringify(login.body)}`);
  }
  adminTokenCache = login.body.accessToken as string;
  return adminTokenCache;
}

export async function obtenerTokenCliente(clienteId: string): Promise<string> {
  const cacheado = clienteTokenCache.get(clienteId);
  if (cacheado) return cacheado;

  const email = `${clienteId}@tests.local`;
  const registro = await request(app)
    .post('/api/auth/register')
    .send({ clienteId, email, password: CLIENTE_PASSWORD, twoFactorEnabled: false });
  if (registro.status !== 201 && registro.status !== 422) {
    throw new Error(`No se pudo registrar el cliente de pruebas "${clienteId}": ${JSON.stringify(registro.body)}`);
  }

  const login = await request(app).post('/api/auth/login').send({ email, password: CLIENTE_PASSWORD });
  if (login.status !== 200 || !login.body?.accessToken) {
    throw new Error(`No se pudo autenticar el cliente de pruebas "${clienteId}": ${JSON.stringify(login.body)}`);
  }
  clienteTokenCache.set(clienteId, login.body.accessToken as string);
  return login.body.accessToken as string;
}
