import { describe, it, expect } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/api/app';
import { cargarSeed } from '../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../src/infrastructure/clock/clock';

const AHORA = new Date('2026-11-30T09:00:00-03:00');
const en = (hhmm: string, fecha = '2026-12-01'): string => `${fecha}T${hhmm}:00-03:00`;

const RECEPCION = { 'X-Usuario': 'u-recepcion', 'X-Rol': 'recepcion' };

const cuerpoBase = {
  pacienteId: 'pac-01',
  prestacionId: 'prest-control',
  profesionalId: 'prof-1',
  sillonId: 'sillon-1',
  inicio: en('10:00'),
};

const nuevaApp = (): Express => createApp(cargarSeed(new RelojFijo(AHORA)));

const crear = (app: Express, cuerpo: Record<string, unknown>, headers: Record<string, string> = RECEPCION) =>
  request(app).post('/api/turnos').set(headers).send(cuerpo);

describe('POST /api/turnos - alta exitosa', () => {
  it('dado la API con el seed y el reloj fijo cuando recepcion hace POST /api/turnos valido entonces responde 201 con el turno reservado y fin 2026-12-01T13:30:00.000Z', async () => {
    const res = await crear(nuevaApp(), cuerpoBase);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      pacienteId: 'pac-01',
      estado: 'reservado',
      senado: false,
      esSobreturno: false,
      origen: 'recepcion',
      creadoPor: 'u-recepcion',
      creadoEn: AHORA.toISOString(),
      inicio: '2026-12-01T13:00:00.000Z',
      fin: '2026-12-01T13:30:00.000Z',
    });
    expect(typeof res.body.id).toBe('string');
  });

  it('dado la API con el seed cuando se hace POST /api/turnos valido con origen whatsapp entonces responde 201 con origen whatsapp', async () => {
    const res = await crear(nuevaApp(), { ...cuerpoBase, origen: 'whatsapp' });
    expect(res.status).toBe(201);
    expect(res.body.origen).toBe('whatsapp');
  });
});

describe('POST /api/turnos - 409 por regla de negocio', () => {
  it('dado un turno de prof-1 en sillon-1 de 10:00 a 10:30 creado con id X cuando recepcion crea otro de prof-1 en sillon-2 con otro paciente a las 10:00 entonces responde 409 RN-AG-02 dimension profesional con conflicto X y GET devuelve un solo turno', async () => {
    const app = nuevaApp();
    const primero = await crear(app, cuerpoBase);
    const res = await crear(app, { ...cuerpoBase, pacienteId: 'pac-02', sillonId: 'sillon-2' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      tipo: 'regla',
      regla: 'RN-AG-02',
      dimension: 'profesional',
      conflicto: { turnoId: primero.body.id },
    });
    const lista = await request(app).get('/api/turnos');
    expect(lista.body.turnos).toHaveLength(1);
  });

  it('dado la API con el seed cuando recepcion crea un tratamiento a las 12:30 entonces responde 409 con RN-AG-04', async () => {
    const res = await crear(nuevaApp(), { ...cuerpoBase, prestacionId: 'prest-trat', inicio: en('12:30') });
    expect(res.status).toBe(409);
    expect(res.body.error.regla).toBe('RN-AG-04');
  });

  it('dado la API con el seed cuando recepcion crea un control con inicio 10:10 entonces responde 409 con RN-AG-03', async () => {
    const res = await crear(nuevaApp(), { ...cuerpoBase, inicio: en('10:10') });
    expect(res.status).toBe(409);
    expect(res.body.error.regla).toBe('RN-AG-03');
  });

  it('dado un turno de pac-01 con prof-1 a las 10:00 cuando recepcion crea otro de pac-01 con prof-2 en sillon-2 a las 10:00 entonces responde 409 RN-AG-05 dimension paciente', async () => {
    const app = nuevaApp();
    await crear(app, cuerpoBase);
    const res = await crear(app, { ...cuerpoBase, profesionalId: 'prof-2', sillonId: 'sillon-2' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ regla: 'RN-AG-05', dimension: 'paciente' });
  });
});

describe('POST /api/turnos - 400 por payload invalido', () => {
  const sin = (campo: keyof typeof cuerpoBase) => {
    const { [campo]: _omitido, ...resto } = cuerpoBase;
    return resto;
  };

  it('dado la API con el seed cuando recepcion hace POST sin inicio entonces responde 400 tipo entrada', async () => {
    const res = await crear(nuevaApp(), sin('inicio'));
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it.each(['pacienteId', 'prestacionId', 'profesionalId', 'sillonId'] as const)(
    'dado la API con el seed cuando recepcion hace POST sin %s entonces responde 400 tipo entrada',
    async (campo) => {
      const res = await crear(nuevaApp(), sin(campo));
      expect(res.status).toBe(400);
      expect(res.body.error.tipo).toBe('entrada');
    },
  );

  it('dado la API con el seed cuando recepcion envia un pacienteId numerico entonces responde 400 tipo entrada', async () => {
    const res = await crear(nuevaApp(), { ...cuerpoBase, pacienteId: 123 });
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it('dado la API con el seed cuando recepcion envia inicio 2026-12-01T10:00:00 sin zona entonces responde 400 tipo entrada', async () => {
    const res = await crear(nuevaApp(), { ...cuerpoBase, inicio: '2026-12-01T10:00:00' });
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it('dado la API con el seed cuando recepcion envia un inicio con zona pero no fecha valida entonces responde 400 tipo entrada', async () => {
    const res = await crear(nuevaApp(), { ...cuerpoBase, inicio: '2026-13-45T10:00:00Z' });
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it('dado la API con el seed cuando recepcion envia origen invalido entonces responde 400 tipo entrada', async () => {
    const res = await crear(nuevaApp(), { ...cuerpoBase, origen: 'paloma' });
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it('dado la API con el seed cuando recepcion envia prest-inexistente entonces responde 400 tipo entrada con un mensaje que menciona la prestacion', async () => {
    const res = await crear(nuevaApp(), { ...cuerpoBase, prestacionId: 'prest-inexistente' });
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
    expect(String(res.body.error.mensaje).toLowerCase()).toContain('prestaci');
  });

  it('dado la API con el seed cuando recepcion envia ademas fin 10:15 de un tratamiento a las 10:00 entonces responde 201 con fin 11:00 (el fin enviado se ignora)', async () => {
    const res = await crear(nuevaApp(), {
      ...cuerpoBase,
      prestacionId: 'prest-trat',
      fin: en('10:15'),
    });
    expect(res.status).toBe(201);
    expect(res.body.fin).toBe('2026-12-01T14:00:00.000Z');
  });

  it('dado la API con el seed cuando se envia JSON sin cuerpo objeto entonces responde 400 tipo entrada', async () => {
    const res = await request(nuevaApp()).post('/api/turnos').set(RECEPCION).send([]);
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });
});

describe('POST /api/turnos - permisos por rol', () => {
  it('dado la API con el seed cuando un odontologo hace POST valido entonces responde 403 tipo permiso y GET no devuelve turnos', async () => {
    const app = nuevaApp();
    const res = await crear(app, cuerpoBase, { 'X-Usuario': 'u-odonto-1', 'X-Rol': 'odontologo' });
    expect(res.status).toBe(403);
    expect(res.body.error.tipo).toBe('permiso');
    expect((await request(app).get('/api/turnos')).body.turnos).toHaveLength(0);
  });

  it('dado la API con el seed cuando se hace POST valido sin headers X-Usuario ni X-Rol entonces responde 403 tipo permiso', async () => {
    const res = await crear(nuevaApp(), cuerpoBase, {});
    expect(res.status).toBe(403);
    expect(res.body.error.tipo).toBe('permiso');
  });

  it('dado la API con el seed cuando un admin hace POST valido entonces responde 201', async () => {
    const res = await crear(nuevaApp(), cuerpoBase, { 'X-Usuario': 'u-admin', 'X-Rol': 'admin' });
    expect(res.status).toBe(201);
  });

  it('dado la API con el seed cuando un paciente hace POST valido con origen whatsapp entonces responde 201', async () => {
    const res = await crear(nuevaApp(), { ...cuerpoBase, origen: 'whatsapp' }, { 'X-Rol': 'paciente' });
    expect(res.status).toBe(201);
  });
});

describe('GET /api/turnos - consulta con filtros', () => {
  const rango = (desde: string, hasta: string) =>
    `desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`;

  it('dado turnos de prof-1 de 09:00-09:30 y 10:00-10:30 y de prof-2 de 10:00-10:30 cuando se filtra por prof-1 y rango 09:30-11:00 entonces devuelve solo el de prof-1 de 10:00 (el contiguo no entra)', async () => {
    const app = nuevaApp();
    await crear(app, { ...cuerpoBase, inicio: en('09:00') });
    const objetivo = await crear(app, { ...cuerpoBase, pacienteId: 'pac-02' });
    await crear(app, { ...cuerpoBase, pacienteId: 'pac-03', profesionalId: 'prof-2', sillonId: 'sillon-2' });
    const res = await request(app).get(
      `/api/turnos?profesionalId=prof-1&${rango(en('09:30'), en('11:00'))}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.turnos.map((t: { id: string }) => t.id)).toEqual([objetivo.body.id]);
  });

  it('dado turnos en sillon-1 y en sillon-2 cuando se filtra por sillon-2 entonces devuelve solo los de sillon-2', async () => {
    const app = nuevaApp();
    await crear(app, cuerpoBase);
    await crear(app, { ...cuerpoBase, pacienteId: 'pac-02', profesionalId: 'prof-2', sillonId: 'sillon-2' });
    const res = await request(app).get('/api/turnos?sillonId=sillon-2');
    expect(res.status).toBe(200);
    expect(res.body.turnos).toHaveLength(1);
    expect(res.body.turnos[0].sillonId).toBe('sillon-2');
  });

  it('dado turnos creados a las 11:00 y a las 09:00 cuando se hace GET sin filtros entonces devuelve ambos con el de 09:00 primero', async () => {
    const app = nuevaApp();
    await crear(app, { ...cuerpoBase, inicio: en('11:00') });
    await crear(app, { ...cuerpoBase, inicio: en('09:00') });
    const res = await request(app).get('/api/turnos');
    expect(res.status).toBe(200);
    expect(res.body.turnos.map((t: { inicio: string }) => t.inicio)).toEqual([
      '2026-12-01T12:00:00.000Z',
      '2026-12-01T14:00:00.000Z',
    ]);
  });

  it('dado un turno cancelado y uno activo cuando se hace GET sin filtros entonces solo devuelve el activo', async () => {
    const deps = cargarSeed(new RelojFijo(AHORA));
    const app = createApp(deps);
    const a = await crear(app, cuerpoBase);
    await crear(app, { ...cuerpoBase, inicio: en('11:00') });
    const t = deps.turnos.buscarPorId(a.body.id);
    if (t === undefined) throw new Error('precondicion');
    deps.turnos.actualizar({ ...t, estado: 'cancelado' });
    const res = await request(app).get('/api/turnos');
    expect(res.body.turnos).toHaveLength(1);
  });

  it('dado la API con el seed cuando se hace GET con desde sin hasta entonces responde 400 tipo entrada', async () => {
    const res = await request(nuevaApp()).get(`/api/turnos?desde=${encodeURIComponent(en('09:00'))}`);
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it('dado la API con el seed cuando se hace GET con desde posterior a hasta entonces responde 400 tipo entrada', async () => {
    const res = await request(nuevaApp()).get(`/api/turnos?${rango(en('11:00'), en('09:00'))}`);
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it('dado la API con el seed cuando se hace GET con hasta sin desde o con fecha sin zona entonces responde 400 tipo entrada', async () => {
    const app = nuevaApp();
    const a = await request(app).get(`/api/turnos?hasta=${encodeURIComponent(en('09:00'))}`);
    const b = await request(app).get(`/api/turnos?${rango('2026-12-01T09:00:00', '2026-12-01T10:00:00')}`);
    expect(a.status).toBe(400);
    expect(b.status).toBe(400);
  });
});
