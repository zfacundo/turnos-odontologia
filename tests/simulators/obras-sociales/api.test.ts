import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../../src/api/app';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';

const AHORA = new Date('2026-11-30T09:00:00-03:00');
const RUTA = '/api/sim/obras-sociales/afiliados';
const AVISO = 'SIMULACIÓN — consulta de cobertura simulada, sin padrón real';
const RECEPCION = { 'X-Usuario': 'u-recepcion', 'X-Rol': 'recepcion' };
const ADMIN = { 'X-Usuario': 'u-admin', 'X-Rol': 'admin' };
const ODONTO = { 'X-Usuario': 'u-odonto-1', 'X-Rol': 'odontologo' };
const PACIENTE = { 'X-Usuario': 'pac-usuario', 'X-Rol': 'paciente' };

const nuevaApp = (): Express => createApp(cargarSeed(new RelojFijo(AHORA)));
const consultar = (app: Express, nro?: string, headers: Record<string, string> = RECEPCION) =>
  request(app).get(nro === undefined ? RUTA : `${RUTA}/${nro}`).set(headers);

describe('GET /api/sim/obras-sociales/afiliados/:nro', () => {
  it('dado AF-0001 cuando recepcion consulta entonces responde 200 con cobertura 80, copago 20 y aviso de simulacion', async () => {
    const res = await consultar(nuevaApp(), 'AF-0001');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      nroAfiliado: 'AF-0001',
      obraSocial: 'OS-01',
      plan: 'Plan Base',
      cobertura: 80,
      copagoPct: 20,
      planes: ['Plan Base', 'Plan Plus'],
      estado: 'activo',
      simulado: true,
      aviso: AVISO,
    });
  });

  it('dado AF-0002 cuando se consulta entonces responde 200 con cobertura 60, copago 40 y estado con_copago', async () => {
    const res = await consultar(nuevaApp(), 'AF-0002');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ cobertura: 60, copagoPct: 40, estado: 'con_copago' });
  });

  it('dado una respuesta exitosa cuando se inspecciona el cuerpo entonces no aparece el nombre del paciente', async () => {
    const res = await consultar(nuevaApp(), 'AF-0001');
    expect(JSON.stringify(res.body)).not.toContain('Paciente Ficticio');
    expect(res.body.nombre).toBeUndefined();
    expect(res.body.nombrePacienteFicticio).toBeUndefined();
  });

  it('dado AF-0003 cuando se consulta entonces responde 200 sin cobertura y sin excepcion', async () => {
    const res = await consultar(nuevaApp(), 'AF-0003');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ cobertura: 0, copagoPct: 100, estado: 'sin_cobertura' });
  });

  it('dado AF-9999 cuando se consulta entonces responde 404 con afiliado no encontrado', async () => {
    const res = await consultar(nuevaApp(), 'AF-9999');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ tipo: 'no-encontrado', mensaje: 'afiliado no encontrado' });
  });

  it('dado AF-0001 cuando se consulta dos veces entonces ambos cuerpos son equivalentes', async () => {
    const app = nuevaApp();
    const primero = await consultar(app, 'AF-0001');
    const segundo = await consultar(app, 'AF-0001');
    expect(primero.body).toEqual(segundo.body);
  });

  it('dado AF-0004 cuando se consulta entonces responde 409 RN-SM-02 simulada, no 400', async () => {
    const res = await consultar(nuevaApp(), 'AF-0004');
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ tipo: 'regla', regla: 'RN-SM-02' });
    expect(res.body.error.mensaje).toContain('SIMULACIÓN');
    expect(res.body.error.tipo).not.toBe('entrada');
  });

  it('dado AF-0004 y despues AF-0001 cuando se consulta entonces el padrón sigue respondiendo el activo', async () => {
    const app = nuevaApp();
    expect((await consultar(app, 'AF-0004')).status).toBe(409);
    const res = await consultar(app, 'AF-0001');
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('activo');
  });

  it('dado la ruta sin :nro cuando se consulta entonces responde 400 entrada que menciona el afiliado', async () => {
    const res = await consultar(nuevaApp());
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
    expect(String(res.body.error.mensaje).toLowerCase()).toContain('afiliado');
  });

  it('dado un :nro con solo espacios (%20) cuando se consulta entonces responde 400 entrada, no 404', async () => {
    const res = await consultar(nuevaApp(), '%20');
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it('dado el codigo del simulador cuando se inspecciona entonces no usa fetch ni URLs externas', () => {
    const base = path.join(__dirname, '..', '..', '..', 'src', 'simulators', 'obras-sociales');
    const archivos = ['afiliado.ts', 'padron.ts', 'padronRepository.ts', 'consultarAfiliado.ts', 'router.ts'];
    for (const archivo of archivos) {
      const contenido = readFileSync(path.join(base, archivo), 'utf8');
      expect(contenido).not.toMatch(/fetch\s*\(/i);
      expect(contenido).not.toMatch(/axios|node:http|https?:\/\//i);
    }
  });
});

describe('GET /api/sim/obras-sociales/afiliados/:nro - permisos', () => {
  it.each([
    ['admin', ADMIN],
    ['recepcion', RECEPCION],
    ['odontologo', ODONTO],
    ['paciente', PACIENTE],
  ])('dado el rol %s cuando consulta AF-0001 entonces responde 200 con simulado true', async (_rol, headers) => {
    const res = await consultar(nuevaApp(), 'AF-0001', headers);
    expect(res.status).toBe(200);
    expect(res.body.simulado).toBe(true);
  });

  it('dado una peticion sin X-Rol cuando consulta AF-0001 entonces responde 403 tipo permiso', async () => {
    const res = await request(nuevaApp()).get(`${RUTA}/AF-0001`);
    expect(res.status).toBe(403);
    expect(res.body.error.tipo).toBe('permiso');
  });
});
