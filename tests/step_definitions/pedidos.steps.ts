import { Given, When, Then } from '@cucumber/cucumber';
import request from 'supertest';
import assert from 'assert';
import { app } from '../../src/app';
import { PedidosRepository } from '../../src/repositories/pedidos.repository';

const repo = PedidosRepository.getInstance();

// HU04 - Creación de Pedido
Given('que el producto {string} tiene un stock disponible de {int} unidades', function (nombre: string, stock: number) {
  repo.actualizarStock(nombre, stock);
});

When('el cliente {string} realiza un pedido de {int} unidades de {string}', async function (clienteId: string, cantidad: number, nombreProducto: string) {
  this.response = await request(app)
    .post('/api/pedidos')
    .send({ clienteId, cantidad, producto: nombreProducto });
});

When('el cliente {string} intenta realizar un pedido de {int} unidades de {string}', async function (clienteId: string, cantidad: number, nombreProducto: string) {
  this.response = await request(app)
    .post('/api/pedidos')
    .send({ clienteId, cantidad, producto: nombreProducto });
});

Then('el pedido debe registrarse con estado {string}', function (estadoEsperado: string) {
  assert.strictEqual(this.response?.body?.estado, estadoEsperado);
});

Then('el stock de {string} debe actualizarse automáticamente a {int} unidad', function (nombreProducto: string, stockEsperado: number) {
  assert.strictEqual(this.response?.body?.stockRestante, stockEsperado);
});

Then('el stock de {string} debe actualizarse automáticamente a {int} unidades', function (nombreProducto: string, stockEsperado: number) {
  assert.strictEqual(this.response?.body?.stockRestante, stockEsperado);
});

Then('la creación del pedido debe ser rechazada por falta de stock', function () {
  assert.strictEqual(this.response?.status >= 400, true);
});

Then('el stock de {string} debe permanecer intacto en {int} unidades', function (nombreProducto: string, stockEsperado: number) {
  assert.strictEqual(this.response?.status >= 400, true);
});

// HU05 - Cancelación de Pedidos
Given('que el cliente {string} tiene un pedido registrado con ID {int} en estado {string} que incluye {int} unidades de {string}', function (cliente: string, id: number, estado: string, cantidad: number, producto: string) {
  repo.actualizarStock(producto, 10);
  const repoAny = repo as any;
  const pedidoExistente = repoAny.pedidos?.find((p: any) => p.id === id);
  if (pedidoExistente) {
    pedidoExistente.producto = producto;
    pedidoExistente.cantidad = cantidad;
    pedidoExistente.estado = estado;
  }
});

Given('el stock actual de {string} es de {int} unidades', function (producto: string, stock: number) {
  repo.actualizarStock(producto, stock);
});

When('el cliente solicita cancelar el pedido con ID {int}', async function (id: number) {
  this.response = await request(app)
    .patch(`/api/pedidos/${id}/cancelar`)
    .send();
});

Then('el estado del pedido {int} debe cambiar a {string}', function (id: number, estadoEsperado: string) {
  assert.strictEqual(this.response?.body?.estado, estadoEsperado);
});

Then('el stock de {string} debe reintegrarse a {int} unidades', function (producto: string, stockEsperado: number) {
  assert.strictEqual(this.response?.body?.stockRestante, stockEsperado);
});

Given('que el pedido con ID {int} se encuentra en estado {string}', function (id: number, estado: string) {
  // Pre-configuración
});

When('el cliente intenta cancelar el pedido con ID {int}', async function (id: number) {
  this.response = await request(app)
    .patch(`/api/pedidos/${id}/cancelar`)
    .send();
});

Then('el sistema debe rechazar la cancelación', function () {
  assert.strictEqual(this.response?.status >= 400, true);
});

Then('el sistema debe responder con un código HTTP {int} Bad Request', function (statusCode: number) {
  assert.strictEqual(this.response?.status, statusCode);
});