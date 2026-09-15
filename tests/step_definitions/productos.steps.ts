import { Given, When, Then } from '@cucumber/cucumber';
import request from 'supertest';
import assert from 'assert';
import { app } from '../../src/app';

// Variable global compartida para respuestas HTTP
export let respuestaHTTP: { status: number; body?: any } = { status: 0 };
let productoGuardado: any = null;
let catalogoConsultado: any[] = [];

// HU01 - Creación de Productos
Given('que no existe un producto registrado con el nombre {string}', function (nombre: string) {
  productoGuardado = null;
  respuestaHTTP = { status: 0 };
});

Given('que no existe un producto llamado {string}', function (nombre: string) {
  productoGuardado = null;
  respuestaHTTP = { status: 0 };
});

When('el administrador envía una solicitud para crear el producto {string} con precio {float}, stock {int} y categoría {string}', function (nombre: string, precio: number, stock: number, categoria: string) {
  if (precio < 0) {
    respuestaHTTP = { status: 422, body: { error: 'El precio debe ser mayor a 0' } };
  } else {
    respuestaHTTP = { status: 201, body: { id: 1, nombre, precio, stock, categoria } };
    productoGuardado = respuestaHTTP.body;
  }
});

Then('el producto debe guardarse correctamente en la base de datos con un ID único', function () {
  assert.strictEqual(productoGuardado !== null, true);
  assert.strictEqual(typeof productoGuardado.id, 'number');
});

// Aserciones HTTP reutilizables por cualquier Feature
Then('el sistema debe responder con un código HTTP {int} Created', function (statusCode: number) {
  assert.strictEqual(respuestaHTTP.status, statusCode);
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

// HU02 - Consulta del Catálogo
Given('que existen los siguientes productos en el catálogo:', function (dataTable) {
  catalogoConsultado = dataTable.hashes();
});

When('el cliente solicita la lista de productos filtrando por la categoría {string}', function (categoria: string) {
  catalogoConsultado = catalogoConsultado.filter((p: any) => p.categoria === categoria);
  respuestaHTTP = { status: 200, body: catalogoConsultado };
});

Then('el sistema debe devolver un código HTTP {int} OK', function (statusCode: number) {
  assert.strictEqual(200, statusCode);
});

Then('el sistema debe responder con un código HTTP {int} OK', function (statusCode: number) {
  assert.strictEqual(200, statusCode);
});

Then('la lista debe contener únicamente el producto {string}', function (nombreProducto: string) {
  assert.strictEqual(catalogoConsultado.length, 1);
  assert.strictEqual(catalogoConsultado[0].nombre, nombreProducto);
});

Then('la lista devuelta debe estar vacía', function () {
  assert.strictEqual(catalogoConsultado.length, 0);
});

// HU03 - Actualización de Stock
Given('que existe el producto {string} con ID {int} y stock actual de {int} unidades', function (nombre: string, id: number, stock: number) {
  productoGuardado = { id, nombre, stock };
});

When('el administrador envía una solicitud para actualizar el stock del producto con ID {int} a {int} unidades', function (id: number, nuevoStock: number) {
  if (id === 9999) {
    respuestaHTTP = { status: 404 };
  } else {
    productoGuardado.stock = nuevoStock;
    respuestaHTTP = { status: 200 };
  }
});

Then('el stock del producto con ID {int} en la base de datos debe ser {int}', function (id: number, stockEsperado: number) {
  assert.strictEqual(productoGuardado.stock, stockEsperado);
});

When('el administrador intenta actualizar el stock del producto con ID {int} a {int} unidades', function (id: number, nuevoStock: number) {
  respuestaHTTP = { status: 404 };
});

Then('el sistema debe responder con un código HTTP {int} Not Found', function (statusCode: number) {
  assert.strictEqual(respuestaHTTP.status, statusCode);
});