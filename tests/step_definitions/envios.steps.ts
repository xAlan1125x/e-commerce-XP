import { Given, When, Then } from '@cucumber/cucumber';
import request from 'supertest';
import assert from 'assert';
import { app } from '../../src/app';
import { respuestaHTTP } from './productos.steps';
import { obtenerTokenCliente } from '../support/authHelpers';

let historialCliente: any[] = [];
let respuestaHistorial: { status: number; body?: any } = { status: 0 };

// HU06 - Historial de Pedidos
Given('que el cliente {string} ha realizado {int} pedidos previamente', function (clienteId: string, cantidadPedidos: number) {
  historialCliente = [];
  const repo = require('../../src/repositories/pedidos.repository').PedidosRepository.getInstance();
  repo.eliminarPorCliente(clienteId);
  for (let i = 0; i < cantidadPedidos; i++) {
    historialCliente.push(repo.agregarPedidoParaPrueba(clienteId));
  }
});

When('el cliente {string} solicita su historial de pedidos', async function (clienteId: string) {
  const token = await obtenerTokenCliente(clienteId);
  const response = await request(app).get(`/api/pedidos/historial/${clienteId}`).set('Authorization', `Bearer ${token}`);
  respuestaHistorial = { status: response.status, body: response.body };
  respuestaHTTP.status = response.status;
  respuestaHTTP.body = response.body;
});

Then('la lista debe contener exactamente {int} pedidos pertenecientes a {string}', function (cantidadEsperada: number, clienteId: string) {
  assert.strictEqual(respuestaHistorial.body.length, cantidadEsperada);
  assert.strictEqual(respuestaHistorial.body.every((p: any) => p.clienteId === clienteId), true);
});

Given('que el cliente {string} no ha realizado ninguna compra', function (clienteId: string) {
  historialCliente = [];
  const repo = require('../../src/repositories/pedidos.repository').PedidosRepository.getInstance();
  repo.eliminarPorCliente(clienteId);
});

When('el cliente {string} intenta consultar el historial de {string}', async function (clienteId: string, clienteObjetivo: string) {
  const token = await obtenerTokenCliente(clienteId);
  const response = await request(app).get(`/api/pedidos/historial/${clienteObjetivo}`).set('Authorization', `Bearer ${token}`);
  respuestaHistorial = { status: response.status, body: response.body };
  respuestaHTTP.status = response.status;
  respuestaHTTP.body = response.body;
});

Then('el sistema debe responder con un código HTTP {int} Forbidden', function (statusCode: number) {
  assert.strictEqual(respuestaHistorial.status, statusCode);
});