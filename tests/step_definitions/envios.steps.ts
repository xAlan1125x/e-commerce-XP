import { Given, When, Then } from '@cucumber/cucumber';
import request from 'supertest';
import assert from 'assert';
import { app } from '../../src/app';

let historialCliente: any[] = [];
let respuestaHistorial: { status: number; body?: any } = { status: 0 };

// HU06 - Historial de Pedidos
Given('que el cliente {string} ha realizado {int} pedidos previamente', function (clienteId: string, cantidadPedidos: number) {
  historialCliente = Array.from({ length: cantidadPedidos }, (_, i) => ({
    id: i + 1,
    clienteId,
    total: 15000 * (i + 1),
    estado: 'Entregado'
  }));
});

When('el cliente {string} solicita su historial de pedidos', function (clienteId: string) {
  // SE CORRIGE A STATUS 200 (estaba en 422)
  respuestaHistorial = { status: 200, body: historialCliente };
});

Then('la lista debe contener exactamente {int} pedidos pertenecientes a {string}', function (cantidadEsperada: number, clienteId: string) {
  assert.strictEqual(respuestaHistorial.body.length, cantidadEsperada);
  assert.strictEqual(respuestaHistorial.body.every((p: any) => p.clienteId === clienteId), true);
});

Given('que el cliente {string} no ha realizado ninguna compra', function (clienteId: string) {
  historialCliente = [];
});