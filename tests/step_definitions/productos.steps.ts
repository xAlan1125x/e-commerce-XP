import { Given, When, Then } from '@cucumber/cucumber';
import request from 'supertest';
import assert from 'assert';
import { app } from '../../src/app';
import { ProductosRepository } from '../../src/repositories/productos.repository';

export let respuestaHTTP: { status: number; body?: any } = { status: 0 };
let productoGuardado: any = null;
let catalogoConsultado: any[] = [];
const productos = new ProductosRepository();

Given('que no existe un producto registrado con el nombre {string}', async function (nombre: string) {
  await productos.eliminarPorNombre(nombre);
  productoGuardado = null;
  respuestaHTTP = { status: 0 };
});

Given('que no existe un producto llamado {string}', async function (nombre: string) {
  await productos.eliminarPorNombre(nombre);
  productoGuardado = null;
  respuestaHTTP = { status: 0 };
});

When('el administrador envía una solicitud para crear el producto {string} con precio {float}, stock {int} y categoría {string}', async function (nombre: string, precio: number, stock: number, categoria: string) {
  this.response = await request(app).post('/api/productos').send({ nombre, precio, stock, categoria });
  respuestaHTTP = { status: this.response.status, body: this.response.body };
  productoGuardado = this.response.body;
});

Then('el producto debe guardarse correctamente en la base de datos con un ID único', function () {
  assert.strictEqual(typeof productoGuardado.id, 'number');
  assert.strictEqual(productoGuardado.id > 0, true);
});

Then('el sistema debe responder con un código HTTP {int} Created', function (statusCode: number) {
  assert.strictEqual(this.response?.status ?? respuestaHTTP.status, statusCode);
});

Then('el sistema debe rechazar la creación del producto', function () {
  assert.strictEqual(respuestaHTTP.status >= 400, true);
});

Then('el sistema debe rechazar la creación', function () {
  assert.strictEqual(respuestaHTTP.status >= 400, true);
});

Then('el sistema debe responder con un código HTTP {int} Unprocessable Content', function (statusCode: number) {
  assert.strictEqual(respuestaHTTP.status, statusCode);
});

Given('que existen los siguientes productos en el catálogo:', async function (dataTable) {
  for (const producto of dataTable.hashes()) {
    await productos.eliminarPorNombre(producto.nombre);
    await request(app).post('/api/productos').send({
      nombre: producto.nombre,
      precio: Number(producto.precio),
      stock: Number(producto.stock),
      categoria: producto.categoria
    }).expect(201);
  }
});

When('el cliente solicita la lista de productos filtrando por la categoría {string}', async function (categoria: string) {
  this.response = await request(app).get('/api/productos').query({ categoria });
  respuestaHTTP = { status: this.response.status, body: this.response.body };
  catalogoConsultado = this.response.body;
});

Then('el sistema debe devolver un código HTTP {int} OK', function (statusCode: number) {
  assert.strictEqual(this.response?.status ?? respuestaHTTP.status, statusCode);
});

Then('el sistema debe responder con un código HTTP {int} OK', function (statusCode: number) {
  assert.strictEqual(this.response?.status ?? respuestaHTTP.status, statusCode);
});

Then('la lista debe contener únicamente el producto {string}', function (nombreProducto: string) {
  assert.strictEqual(catalogoConsultado.length, 1);
  assert.strictEqual(catalogoConsultado[0].nombre, nombreProducto);
});

Then('la lista devuelta debe estar vacía', function () {
  assert.strictEqual(catalogoConsultado.length, 0);
});

Given('que existe el producto {string} con ID {int} y stock actual de {int} unidades', async function (nombre: string, id: number, stock: number) {
  await productos.guardarConId(id, { nombre, precio: 1, stock, categoria: 'Pruebas' });
  productoGuardado = { id, nombre, stock };
});

When('el administrador envía una solicitud para actualizar el stock del producto con ID {int} a {int} unidades', async function (id: number, nuevoStock: number) {
  this.response = await request(app).patch(`/api/productos/${id}/stock`).send({ stock: nuevoStock });
  respuestaHTTP = { status: this.response.status, body: this.response.body };
  if (this.response.status < 400) productoGuardado = this.response.body;
});

Then('el stock del producto con ID {int} en la base de datos debe ser {int}', function (id: number, stockEsperado: number) {
  assert.strictEqual(productoGuardado.id, id);
  assert.strictEqual(productoGuardado.stock, stockEsperado);
});

When('el administrador intenta actualizar el stock del producto con ID {int} a {int} unidades', async function (id: number, nuevoStock: number) {
  this.response = await request(app).patch(`/api/productos/${id}/stock`).send({ stock: nuevoStock });
  respuestaHTTP = { status: this.response.status, body: this.response.body };
});

Then('el sistema debe responder con un código HTTP {int} Not Found', function (statusCode: number) {
  assert.strictEqual(this.response?.status ?? respuestaHTTP.status, statusCode);
});
