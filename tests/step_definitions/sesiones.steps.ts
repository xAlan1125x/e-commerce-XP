import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { app } from '../../src/app';
import { hashPassword } from '../../src/security/credentials';

const prisma = new PrismaClient();
const password = 'ClienteTests#2026';

interface LoginDePrueba {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

const sesionesPorAlias = new Map<string, LoginDePrueba>();
let accessTokenCliente = '';
let sesionesListadas: LoginDePrueba[] = [];
let loginsConcurrentes: Array<{ status: number; body: LoginDePrueba }> = [];

async function prepararUsuario(clienteId: string) {
  const email = `${clienteId}@sesiones.tests`;
  const usuario = await prisma.usuario.upsert({
    where: { clienteId },
    update: { email, password: hashPassword(password), twoFactorEnabled: false },
    create: { clienteId, email, password: hashPassword(password), twoFactorEnabled: false }
  });
  await prisma.refreshToken.deleteMany({ where: { usuarioId: usuario.id } });
  return { usuario, email };
}

async function iniciarSesion(email: string, deviceName: string) {
  return request(app)
    .post('/api/auth/login')
    .set('User-Agent', `Cucumber/${deviceName}`)
    .send({ email, password, deviceName });
}

Given('que el usuario {string} ha iniciado sesión desde dos dispositivos', async function (clienteId: string) {
  sesionesPorAlias.clear();
  sesionesListadas = [];
  loginsConcurrentes = [];
  const { email } = await prepararUsuario(clienteId);
  const [primera, segunda] = await Promise.all([
    iniciarSesion(email, 'Notebook'),
    iniciarSesion(email, 'Teléfono')
  ]);
  assert.strictEqual(primera.status, 200);
  assert.strictEqual(segunda.status, 200);
  sesionesPorAlias.set('session_01', primera.body);
  sesionesPorAlias.set('session_02', segunda.body);
  accessTokenCliente = primera.body.accessToken;
});

When('el usuario {string} solicita sus sesiones activas', async function (_clienteId: string) {
  this.response = await request(app)
    .get('/api/auth/sessions')
    .set('Authorization', `Bearer ${accessTokenCliente}`);
  sesionesListadas = this.response.body;
});

Then('la lista debe contener {int} sesiones activas', async function (cantidad: number) {
  if (!sesionesListadas.length) {
    const response = await request(app)
      .get('/api/auth/sessions')
      .set('Authorization', `Bearer ${accessTokenCliente}`);
    assert.strictEqual(response.status, 200);
    sesionesListadas = response.body;
  }
  assert.strictEqual(sesionesListadas.length, cantidad);
  assert.strictEqual(sesionesListadas.every((sesion) => typeof sesion.sessionId === 'string'), true);
});

Given('que la sesión {string} pertenece al usuario {string}', async function (alias: string, clienteId: string) {
  if (alias === 'session_03') {
    const { email } = await prepararUsuario(clienteId);
    const login = await iniciarSesion(email, 'Tablet ajena');
    assert.strictEqual(login.status, 200);
    sesionesPorAlias.set(alias, login.body);
  }
  assert.ok(sesionesPorAlias.has(alias));
});

When('el usuario {string} revoca la sesión {string}', async function (_clienteId: string, alias: string) {
  const sesion = sesionesPorAlias.get(alias)!;
  this.response = await request(app)
    .delete(`/api/auth/sessions/${sesion.sessionId}`)
    .set('Authorization', `Bearer ${accessTokenCliente}`);
});

Then('el sistema debe responder con un código HTTP {int} No Content', function (statusCode: number) {
  assert.strictEqual(this.response.status, statusCode);
});

Then('el refresh token de {string} debe quedar invalidado', async function (alias: string) {
  const sesion = sesionesPorAlias.get(alias)!;
  const refresh = await request(app)
    .post('/api/auth/refresh')
    .send({ refreshToken: sesion.refreshToken });
  assert.strictEqual(refresh.status, 401);
});

When('el usuario {string} intenta revocar la sesión {string}', async function (_clienteId: string, alias: string) {
  const sesion = sesionesPorAlias.get(alias)!;
  this.response = await request(app)
    .delete(`/api/auth/sessions/${sesion.sessionId}`)
    .set('Authorization', `Bearer ${accessTokenCliente}`);
});

When('el usuario {string} inicia {int} sesiones nuevas simultáneamente', async function (clienteId: string, cantidad: number) {
  const email = `${clienteId}@sesiones.tests`;
  loginsConcurrentes = await Promise.all(
    Array.from({ length: cantidad }, (_, indice) => iniciarSesion(email, `Concurrente ${indice + 1}`))
  );
});

Then('los {int} inicios de sesión deben completarse correctamente', function (cantidad: number) {
  assert.strictEqual(loginsConcurrentes.length, cantidad);
  assert.strictEqual(loginsConcurrentes.every((login) => login.status === 200), true);
  assert.strictEqual(new Set(loginsConcurrentes.map((login) => login.body.sessionId)).size, cantidad);
});
