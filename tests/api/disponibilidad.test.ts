import { describe, it, expect } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/api/app';
import { cargarSeed } from '../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../src/infrastructure/clock/clock';
import { AuditoriaEnMemoria } from '../../src/infrastructure/memory/auditoria-en-memoria';

const AHORA = new Date('2026-11-30T09:00:00-03:00');
const RECEPCION = { 'X-Usuario': 'u-recepcion', 'X-Rol': 'recepcion' };

const nuevaApp = (ahora: Date = AHORA): Express => createApp(cargarSeed(new RelojFijo(ahora)));

const consultar = (
  app: Express,
  query: Record<string, string> = {},
  headers: Record<string, string> = RECEPCION,
) =>
  request(app)
    .get('/api/disponibilidad')
    .query({ prestacionId: 'prest-control', profesionalId: 'prof-1', fecha: '2026-12-01', ...query })
    .set(headers);

describe('GET /api/disponibilidad - consulta exitosa', () => {
  it('dado el seed sin turnos cuando recepcion consulta prest-trat de prof-1 el 2026-12-01 entonces responde 200 y el primer hueco es 12:00Z-13:00Z en sillon-1', async () => {
    const res = await consultar(nuevaApp(), { prestacionId: 'prest-trat' });
    expect(res.status).toBe(200);
    expect(res.body.huecos[0]).toEqual({
      inicio: '2026-12-01T12:00:00.000Z',
      fin: '2026-12-01T13:00:00.000Z',
      sillonId: 'sillon-1',
    });
  });
});

/** 'HH:mm' local (UTC-03:00) de un instante ISO. */
const hhmm = (iso: string): string =>
  new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000).toISOString().slice(11, 16);
const en = (hora: string, fecha = '2026-12-01'): string => `${fecha}T${hora}:00-03:00`;
type HuecoJson = { inicio: string; fin: string; sillonId: string };
const horas = (body: { huecos: HuecoJson[] }): string[] => body.huecos.map((h) => hhmm(h.inicio));

const crearTurno = (app: Express, cuerpo: Record<string, string>) =>
  request(app)
    .post('/api/turnos')
    .set(RECEPCION)
    .send({ prestacionId: 'prest-control', ...cuerpo });

describe('GET /api/disponibilidad - agenda real', () => {
  it('dado turnos 10:00-10:30 creados en sillon-1 (prof-2) y sillon-2 (prof-1) cuando se consulta control de prof-1 entonces no aparecen 09:45, 10:00 ni 10:15 y 09:30 y 10:30 siguen libres', async () => {
    const app = nuevaApp();
    const a = await crearTurno(app, { pacienteId: 'pac-01', profesionalId: 'prof-2', sillonId: 'sillon-1', inicio: en('10:00') });
    const b = await crearTurno(app, { pacienteId: 'pac-02', profesionalId: 'prof-1', sillonId: 'sillon-2', inicio: en('10:00') });
    expect([a.status, b.status]).toEqual([201, 201]);
    const hs = horas((await consultar(app)).body);
    for (const h of ['09:45', '10:00', '10:15']) expect(hs).not.toContain(h);
    expect(hs).toContain('09:30');
    expect(hs).toContain('10:30');
  });

  it('dado un turno de prof-2 en sillon-1 a las 10:00 cuando se consulta control de prof-1 entonces 10:00 se ofrece en sillon-2', async () => {
    const app = nuevaApp();
    await crearTurno(app, { pacienteId: 'pac-01', profesionalId: 'prof-2', sillonId: 'sillon-1', inicio: en('10:00') });
    const res = await consultar(app);
    expect(res.body.huecos.find((h: HuecoJson) => hhmm(h.inicio) === '10:00')?.sillonId).toBe('sillon-2');
  });

  it('dado un turno cancelado de prof-1 10:00-10:30 en el repositorio cuando se consulta entonces 10:00 es hueco en sillon-1', async () => {
    const deps = cargarSeed(new RelojFijo(AHORA));
    deps.turnos.guardar({
      id: 't-cancelado',
      pacienteId: 'pac-01',
      prestacionId: 'prest-control',
      profesionalId: 'prof-1',
      sillonId: 'sillon-1',
      inicio: new Date(en('10:00')),
      fin: new Date(en('10:30')),
      estado: 'cancelado',
      senado: false,
      esSobreturno: false,
      origen: 'recepcion',
      creadoPor: 'u-recepcion',
      creadoEn: AHORA,
    });
    const res = await consultar(createApp(deps));
    expect(res.body.huecos.find((h: HuecoJson) => hhmm(h.inicio) === '10:00')?.sillonId).toBe('sillon-1');
  });

  it('dado el bloqueo de urgencias del seed cuando se consulta control de prof-1 entonces 18:00 es hueco y 18:15, 18:30 y 18:45 no', async () => {
    const hs = horas((await consultar(nuevaApp())).body);
    expect(hs).toContain('18:00');
    for (const h of ['18:15', '18:30', '18:45']) expect(hs).not.toContain(h);
  });

  it('dado el seed cuando se consulta prest-orto de prof-2 entonces los inicios son estrictamente crecientes', async () => {
    const res = await consultar(nuevaApp(), { prestacionId: 'prest-orto', profesionalId: 'prof-2' });
    const ts: number[] = res.body.huecos.map((h: HuecoJson) => new Date(h.inicio).getTime());
    expect(ts.length).toBeGreaterThan(0);
    for (let i = 1; i < ts.length; i++) expect(ts[i]).toBeGreaterThan(ts[i - 1] ?? 0);
  });

  it('dado un sabado cuando se consulta entonces responde 200 con huecos vacio', async () => {
    const res = await consultar(nuevaApp(), { fecha: '2026-12-05' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ huecos: [] });
  });
});

describe('GET /api/disponibilidad - reloj del sistema', () => {
  it('dado el reloj en 2026-12-01 10:10 cuando se consulta ese dia entonces el primer hueco es 10:15', async () => {
    const res = await consultar(nuevaApp(new Date(en('10:10'))));
    expect(horas(res.body)[0]).toBe('10:15');
  });

  it('dado el reloj en 2026-12-01 10:00 cuando se consulta ese dia entonces el primer hueco es 10:00', async () => {
    const res = await consultar(nuevaApp(new Date(en('10:00'))));
    expect(horas(res.body)[0]).toBe('10:00');
  });

  it('dado el reloj en 2026-12-01 10:00 cuando se consulta 2026-11-30 entonces responde 200 con huecos vacio', async () => {
    const res = await consultar(nuevaApp(new Date(en('10:00'))), { fecha: '2026-11-30' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ huecos: [] });
  });
});

describe('GET /api/disponibilidad - entrada invalida (400)', () => {
  const casos: [string, Record<string, string>][] = [
    ['fecha con formato 2026-12-1', { fecha: '2026-12-1' }],
    ['fecha inexistente 2026-02-30', { fecha: '2026-02-30' }],
    ['prestacion inexistente', { prestacionId: 'prest-inexistente' }],
    ['profesional inexistente', { profesionalId: 'prof-inexistente' }],
    ['prestacionId vacio', { prestacionId: '' }],
  ];
  for (const [nombre, query] of casos) {
    it(`dado ${nombre} cuando se consulta entonces responde 400 con error.tipo entrada`, async () => {
      const res = await consultar(nuevaApp(), query);
      expect(res.status).toBe(400);
      expect(res.body.error.tipo).toBe('entrada');
    });
  }

  it('dado que falta prestacionId cuando se consulta entonces responde 400 con error.tipo entrada', async () => {
    const res = await request(nuevaApp())
      .get('/api/disponibilidad')
      .query({ profesionalId: 'prof-1', fecha: '2026-12-01' })
      .set(RECEPCION);
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it('dado profesionalId enviado dos veces cuando se consulta entonces responde 400 con error.tipo entrada', async () => {
    const res = await request(nuevaApp())
      .get('/api/disponibilidad?prestacionId=prest-control&profesionalId=prof-1&profesionalId=prof-2&fecha=2026-12-01')
      .set(RECEPCION);
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });
});

describe('GET /api/disponibilidad - permiso y solo lectura', () => {
  const roles: [string, string][] = [
    ['u-admin', 'admin'],
    ['u-recepcion', 'recepcion'],
    ['u-odonto-1', 'odontologo'],
    ['pac-01', 'paciente'],
  ];
  for (const [usuario, rol] of roles) {
    it(`dado el rol ${rol} cuando consulta entonces recibe 200`, async () => {
      const res = await consultar(nuevaApp(), {}, { 'X-Usuario': usuario, 'X-Rol': rol });
      expect(res.status).toBe(200);
    });
  }

  it('dado una request sin X-Rol cuando consulta entonces responde 403 con error.tipo permiso', async () => {
    const res = await consultar(nuevaApp(), {}, {});
    expect(res.status).toBe(403);
    expect(res.body.error.tipo).toBe('permiso');
  });

  it('dado una agenda sin turnos cuando se consulta entonces GET /api/turnos sigue vacio y la auditoria no tiene eventos', async () => {
    const deps = cargarSeed(new RelojFijo(AHORA));
    const app = createApp(deps);
    expect((await consultar(app)).status).toBe(200);
    const turnos = await request(app).get('/api/turnos').set(RECEPCION);
    expect(turnos.body).toEqual({ turnos: [] });
    expect(deps.auditoria).toBeInstanceOf(AuditoriaEnMemoria);
    if (deps.auditoria instanceof AuditoriaEnMemoria) expect(deps.auditoria.eventos()).toEqual([]);
  });
});

describe('GET /api/disponibilidad - consistencia con el alta', () => {
  it('dado una agenda sin turnos cuando recepcion reserva para pac-01 el primer hueco de prest-trat devuelto entonces el alta responde 201', async () => {
    const app = nuevaApp();
    const huecos = (await consultar(app, { prestacionId: 'prest-trat' })).body.huecos as HuecoJson[];
    const primero = huecos[0];
    expect(primero).toBeDefined();
    const alta = await request(app).post('/api/turnos').set(RECEPCION).send({
      pacienteId: 'pac-01',
      prestacionId: 'prest-trat',
      profesionalId: 'prof-1',
      sillonId: primero?.sillonId,
      inicio: primero?.inicio,
    });
    expect(alta.status).toBe(201);
  });
});
