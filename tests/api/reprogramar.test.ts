import { describe, it, expect } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/api/app';
import { cargarSeed } from '../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../src/infrastructure/clock/clock';

const AHORA = new Date('2026-11-30T09:00:00-03:00');
const RECEPCION = { 'X-Usuario': 'u-recepcion', 'X-Rol': 'recepcion' };
const ODONTO_1 = { 'X-Usuario': 'u-odonto-1', 'X-Rol': 'odontologo' };
const PACIENTE = { 'X-Usuario': 'pac-usuario', 'X-Rol': 'paciente' };
const SIN_ROL = {};

const cuerpoBase = {
  pacienteId: 'pac-01',
  prestacionId: 'prest-control',
  profesionalId: 'prof-1',
  sillonId: 'sillon-1',
  inicio: '2026-12-01T10:00:00-03:00',
};

const nuevaApp = (reloj: Date = AHORA): Express => createApp(cargarSeed(new RelojFijo(reloj)));

const crear = async (app: Express, cuerpo: object): Promise<string> => {
  const res = await request(app).post('/api/turnos').set(RECEPCION).send(cuerpo);
  return res.body.id as string;
};

const reprogramar = (app: Express, id: string, cuerpo: unknown, headers: Record<string, string> = RECEPCION) =>
  request(app).post(`/api/turnos/${id}/reprogramar`).set(headers).send(cuerpo as object);

const turnoEnLista = async (app: Express, id: string): Promise<{ inicio: string; fin: string } | undefined> => {
  const res = await request(app).get('/api/turnos');
  return (res.body.turnos as { id: string; inicio: string; fin: string }[]).find((t) => t.id === id);
};

describe('POST /api/turnos/:id/reprogramar', () => {
  it('dado T creado cuando recepcion reprograma a 2026-12-01T10:15:00-03:00 entonces responde 200 con 10:15 a 10:45 y el mismo id', async () => {
    const app = nuevaApp();
    const id = await crear(app, cuerpoBase);
    const res = await reprogramar(app, id, { inicio: '2026-12-01T10:15:00-03:00' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id });
    expect(new Date(res.body.inicio as string)).toEqual(new Date('2026-12-01T10:15:00-03:00'));
    expect(new Date(res.body.fin as string)).toEqual(new Date('2026-12-01T10:45:00-03:00'));
  });

  it('dado T creado cuando recepcion reprograma a 11:00 en sillon-2 con prof-2 entonces responde 200 con ese profesional y sillon', async () => {
    const app = nuevaApp();
    const id = await crear(app, cuerpoBase);
    const res = await reprogramar(app, id, {
      inicio: '2026-12-01T11:00:00-03:00',
      profesionalId: 'prof-2',
      sillonId: 'sillon-2',
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id, profesionalId: 'prof-2', sillonId: 'sillon-2' });
  });

  it('dado T y U de pac-02 con prof-2 en sillon-1 a las 11:00 cuando recepcion reprograma T a 11:00 entonces 409 RN-AG-02 sillon con conflicto U', async () => {
    const app = nuevaApp();
    const id = await crear(app, cuerpoBase);
    const u = await crear(app, { ...cuerpoBase, pacienteId: 'pac-02', profesionalId: 'prof-2', inicio: '2026-12-01T11:00:00-03:00' });
    const res = await reprogramar(app, id, { inicio: '2026-12-01T11:00:00-03:00' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ regla: 'RN-AG-02', dimension: 'sillon', conflicto: { turnoId: u } });
  });

  it('dado T creado cuando recepcion reprograma a 12:45 entonces 409 RN-AG-04', async () => {
    const app = nuevaApp();
    const id = await crear(app, cuerpoBase);
    const res = await reprogramar(app, id, { inicio: '2026-12-01T12:45:00-03:00' });
    expect(res.status).toBe(409);
    expect(res.body.error.regla).toBe('RN-AG-04');
  });

  it('dado reloj 2026-11-30 11:00 y T cuando el paciente reprograma al 2026-12-02 10:00 entonces 409 RN-AG-06 con conflicto T', async () => {
    const app = nuevaApp(new Date('2026-11-30T11:00:00-03:00'));
    const id = await crear(app, cuerpoBase);
    const res = await reprogramar(app, id, { inicio: '2026-12-02T10:00:00-03:00' }, PACIENTE);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ regla: 'RN-AG-06', conflicto: { turnoId: id } });
  });

  it('dado T con reloj a 25 h cuando el paciente reprograma al 2026-12-02 10:00 entonces 200', async () => {
    const app = nuevaApp();
    const id = await crear(app, cuerpoBase);
    const res = await reprogramar(app, id, { inicio: '2026-12-02T10:00:00-03:00' }, PACIENTE);
    expect(res.status).toBe(200);
  });

  it('dado T cancelado cuando recepcion reprograma entonces 409 RN-AG-09 con conflicto T', async () => {
    const app = nuevaApp();
    const id = await crear(app, cuerpoBase);
    await request(app).post(`/api/turnos/${id}/cancelar`).set(RECEPCION).send({ motivo: 'Aviso' });
    const res = await reprogramar(app, id, { inicio: '2026-12-01T11:00:00-03:00' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ regla: 'RN-AG-09', conflicto: { turnoId: id } });
  });

  it('dado T reprogramado a 11:00 cuando recepcion crea un turno de pac-02 con prof-1 en sillon-1 a las 10:00 entonces 201', async () => {
    const app = nuevaApp();
    const id = await crear(app, cuerpoBase);
    await reprogramar(app, id, { inicio: '2026-12-01T11:00:00-03:00' });
    const res = await request(app).post('/api/turnos').set(RECEPCION).send({ ...cuerpoBase, pacienteId: 'pac-02' });
    expect(res.status).toBe(201);
  });
});

describe('POST /api/turnos/:id/reprogramar - errores', () => {
  it('dado T cuando u-odonto-1 reprograma entonces 403 y T sigue a las 10:00', async () => {
    const app = nuevaApp();
    const id = await crear(app, cuerpoBase);
    const res = await reprogramar(app, id, { inicio: '2026-12-01T11:00:00-03:00' }, ODONTO_1);
    expect(res.status).toBe(403);
    const t = await turnoEnLista(app, id);
    expect(new Date(t?.inicio ?? '')).toEqual(new Date('2026-12-01T10:00:00-03:00'));
  });

  it.each([
    ['cuerpo invalido (sin inicio)', {}],
    ['inicio sin zona horaria', { inicio: 'basura' }],
  ])('dado un request sin rol y %s cuando reprograma entonces 403 (el rol se valida antes que la entrada)', async (_d, cuerpo) => {
    const app = nuevaApp();
    const id = await crear(app, cuerpoBase);
    const res = await reprogramar(app, id, cuerpo, SIN_ROL);
    expect(res.status).toBe(403);
  });

  it('dado u-odonto-1 y un cuerpo invalido cuando reprograma entonces 403 y no 400', async () => {
    const app = nuevaApp();
    const id = await crear(app, cuerpoBase);
    const res = await reprogramar(app, id, { inicio: 'no-es-fecha' }, ODONTO_1);
    expect(res.status).toBe(403);
  });

  it.each([
    ['inicio sin zona horaria', { inicio: '2026-12-01T11:00:00' }],
    ['inicio ausente', {}],
    ['inicio no textual', { inicio: 12345 }],
    ['fecha imposible', { inicio: '2026-13-45T11:00:00-03:00' }],
    ['profesionalId inexistente', { inicio: '2026-12-01T11:00:00-03:00', profesionalId: 'prof-inexistente' }],
    ['profesionalId no textual', { inicio: '2026-12-01T11:00:00-03:00', profesionalId: 7 }],
    ['mismo horario, profesional y sillon', { inicio: '2026-12-01T10:00:00-03:00' }],
  ])('dado T cuando recepcion reprograma con %s entonces 400', async (_d, cuerpo) => {
    const app = nuevaApp();
    const id = await crear(app, cuerpoBase);
    const res = await reprogramar(app, id, cuerpo);
    expect(res.status).toBe(400);
  });

  it('dado un cuerpo que no es objeto cuando recepcion reprograma entonces 400', async () => {
    const app = nuevaApp();
    const id = await crear(app, cuerpoBase);
    const res = await request(app)
      .post(`/api/turnos/${id}/reprogramar`)
      .set(RECEPCION)
      .set('Content-Type', 'application/json')
      .send('[1,2]');
    expect(res.status).toBe(400);
  });

  it('dado el seed cuando recepcion reprograma turno-inexistente entonces 404 con error.tipo no-encontrado', async () => {
    const app = nuevaApp();
    const res = await reprogramar(app, 'turno-inexistente', { inicio: '2026-12-01T11:00:00-03:00' });
    expect(res.status).toBe(404);
    expect(res.body.error.tipo).toBe('no-encontrado');
  });
});
