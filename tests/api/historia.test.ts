import { describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/api/app';
import type { Deps } from '../../src/api/deps';
import { iniciarSesion } from '../../src/application/auth/iniciarSesion';
import { RelojFijo } from '../../src/infrastructure/clock/clock';
import { AuditoriaEnMemoria } from '../../src/infrastructure/memory/auditoria-en-memoria';
import { HistoriaRepositoryEnMemoria } from '../../src/infrastructure/memory/historia-repository';
import { cargarSeed } from '../../src/infrastructure/seed/cargar-seed';

const AHORA = new Date('2026-12-01T10:00:00-03:00');
const NOTAS = 'Sin hallazgos (dato ficticio)';
const VALIDA = { fecha: '2026-12-01T09:00:00-03:00', procedimiento: 'Control y limpieza', notas: NOTAS };

/** Entorno con historia vacía (independiente del seed) para controlar el contenido. */
function entorno(): { deps: Deps; app: Express; auth: (u: string) => string } {
  const deps: Deps = { ...cargarSeed(new RelojFijo(AHORA)), historia: new HistoriaRepositoryEnMemoria() };
  const auth = (usuarioId: string): string => {
    const r = iniciarSesion(deps, { usuarioId });
    if (!r.ok) throw new Error('login de prueba falló');
    return `Bearer ${r.valor.token}`;
  };
  return { deps, app: createApp(deps), auth };
}

const alta = (app: Express, authz: string, id: string, cuerpo: unknown) =>
  request(app).post(`/api/pacientes/${id}/historia`).set('Authorization', authz).send(cuerpo as object);

describe('POST /api/pacientes/:id/historia', () => {
  it('dado un token de u-odonto-1 cuando da de alta una entrada valida entonces responde 201 con forma completa y simulado true', async () => {
    const { app, auth } = entorno();
    const res = await alta(app, auth('u-odonto-1'), 'pac-01', VALIDA);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      pacienteId: 'pac-01',
      profesionalId: 'prof-1',
      profesionalNombre: 'Dra. Ficticia Perez',
      creadoPor: 'u-odonto-1',
      procedimiento: 'Control y limpieza',
      notas: NOTAS,
      simulado: true,
    });
    expect(typeof res.body.id).toBe('string');
    expect(res.body.fecha).toBe(new Date(VALIDA.fecha).toISOString());
    expect(res.body.creadoEn).toBe(AHORA.toISOString());
  });

  it('dado un profesionalId prof-2 en el cuerpo cuando u-odonto-1 da de alta entonces responde 201 con prof-1', async () => {
    const { app, auth } = entorno();
    const res = await alta(app, auth('u-odonto-1'), 'pac-01', { ...VALIDA, profesionalId: 'prof-2' });
    expect(res.status).toBe(201);
    expect(res.body.profesionalId).toBe('prof-1');
  });

  it('dado un token de u-admin cuando intenta el alta entonces responde 403 permiso y no se crea la entrada', async () => {
    const { deps, app, auth } = entorno();
    const res = await alta(app, auth('u-admin'), 'pac-01', VALIDA);
    expect(res.status).toBe(403);
    expect(res.body.error.tipo).toBe('permiso');
    expect(deps.historia.listarPorPaciente('pac-01')).toHaveLength(0);
  });

  it('dado un procedimiento vacio cuando se da de alta entonces responde 400 entrada', async () => {
    const { app, auth } = entorno();
    const res = await alta(app, auth('u-odonto-1'), 'pac-01', { ...VALIDA, procedimiento: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it('dado notas de 1001 caracteres cuando se da de alta entonces responde 400 entrada', async () => {
    const { app, auth } = entorno();
    const res = await alta(app, auth('u-odonto-1'), 'pac-01', { ...VALIDA, notas: 'n'.repeat(1001) });
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it('dado una fecha futura cuando se da de alta entonces responde 409 con regla RN-HC-02', async () => {
    const { app, auth } = entorno();
    const res = await alta(app, auth('u-odonto-1'), 'pac-01', { ...VALIDA, fecha: '2026-12-02T10:00:00-03:00' });
    expect(res.status).toBe(409);
    expect(res.body.error.regla).toBe('RN-HC-02');
  });

  it('dado una fecha igual al instante actual cuando se da de alta entonces responde 201', async () => {
    const { app, auth } = entorno();
    const res = await alta(app, auth('u-odonto-1'), 'pac-01', { ...VALIDA, fecha: '2026-12-01T10:00:00-03:00' });
    expect(res.status).toBe(201);
  });

  it('dado un turno de otro paciente cuando se da de alta para pac-01 entonces responde 409 con regla RN-HC-01', async () => {
    const { app, auth } = entorno();
    const turno = await request(app)
      .post('/api/turnos')
      .set('Authorization', auth('u-recepcion'))
      .send({
        pacienteId: 'pac-02',
        prestacionId: 'prest-control',
        profesionalId: 'prof-1',
        sillonId: 'sillon-1',
        inicio: '2026-12-02T10:00:00-03:00',
      });
    expect(turno.status).toBe(201);
    const res = await alta(app, auth('u-odonto-1'), 'pac-01', { ...VALIDA, turnoId: turno.body.id });
    expect(res.status).toBe(409);
    expect(res.body.error.regla).toBe('RN-HC-01');
  });

  it('dado un paciente inexistente cuando se da de alta entonces responde 404 no-encontrado', async () => {
    const { app, auth } = entorno();
    const res = await alta(app, auth('u-odonto-1'), 'pac-999', VALIDA);
    expect(res.status).toBe(404);
    expect(res.body.error.tipo).toBe('no-encontrado');
  });

  it('dado un odontologo por headers simulados sin token cuando da de alta entonces se resuelve su profesionalId del seed', async () => {
    const { app } = entorno();
    const res = await request(app)
      .post('/api/pacientes/pac-01/historia')
      .set('X-Usuario', 'u-odonto-2')
      .set('X-Rol', 'odontologo')
      .send(VALIDA);
    expect(res.status).toBe(201);
    expect(res.body.profesionalId).toBe('prof-2');
  });
});

describe('GET /api/pacientes/:id/historia', () => {
  it('dado dos entradas de distinta fecha cuando admin consulta entonces responde 200 con la mas reciente primero y simulado true', async () => {
    const { app, auth } = entorno();
    await alta(app, auth('u-odonto-1'), 'pac-01', { ...VALIDA, fecha: '2026-10-01T10:00:00-03:00' });
    await alta(app, auth('u-odonto-1'), 'pac-01', { ...VALIDA, fecha: '2026-11-15T10:00:00-03:00' });
    const res = await request(app).get('/api/pacientes/pac-01/historia').set('Authorization', auth('u-admin'));
    expect(res.status).toBe(200);
    expect(res.body.simulado).toBe(true);
    expect((res.body.entradas as { fecha: string }[]).map((e) => e.fecha)).toEqual([
      new Date('2026-11-15T10:00:00-03:00').toISOString(),
      new Date('2026-10-01T10:00:00-03:00').toISOString(),
    ]);
  });

  it('dado un paciente sin entradas cuando odontologo consulta entonces responde 200 con entradas vacio', async () => {
    const { app, auth } = entorno();
    const res = await request(app).get('/api/pacientes/pac-02/historia').set('Authorization', auth('u-odonto-1'));
    expect(res.status).toBe(200);
    expect(res.body.entradas).toEqual([]);
  });

  it('dado un paciente inexistente cuando admin consulta entonces responde 404 no-encontrado', async () => {
    const { app, auth } = entorno();
    const res = await request(app).get('/api/pacientes/pac-999/historia').set('Authorization', auth('u-admin'));
    expect(res.status).toBe(404);
    expect(res.body.error.tipo).toBe('no-encontrado');
  });

  it('dado un token de u-recepcion cuando consulta entonces responde 403 permiso', async () => {
    const { app, auth } = entorno();
    const res = await request(app).get('/api/pacientes/pac-01/historia').set('Authorization', auth('u-recepcion'));
    expect(res.status).toBe(403);
    expect(res.body.error.tipo).toBe('permiso');
  });

  it('dado ningun Authorization ni X-Rol cuando consulta entonces responde 403 permiso', async () => {
    const { app } = entorno();
    const res = await request(app).get('/api/pacientes/pac-01/historia');
    expect(res.status).toBe(403);
    expect(res.body.error.tipo).toBe('permiso');
  });

  it('dado el rol paciente por headers cuando consulta entonces responde 403 y no revela si hay entradas', async () => {
    const { app } = entorno();
    const res = await request(app)
      .get('/api/pacientes/pac-01/historia')
      .set('X-Usuario', 'pac-01')
      .set('X-Rol', 'paciente');
    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).not.toContain('entradas');
  });

  it('dado una consulta exitosa cuando se revisa la auditoria entonces hay historia-consultar y la rechazada de recepcion no suma', async () => {
    const { deps, app, auth } = entorno();
    await request(app).get('/api/pacientes/pac-01/historia').set('Authorization', auth('u-recepcion'));
    await request(app).get('/api/pacientes/pac-01/historia').set('Authorization', auth('u-admin'));
    const acciones = (deps.auditoria as AuditoriaEnMemoria).eventos().map((e) => e.accion);
    expect(acciones.filter((a) => a === 'historia-consultar')).toHaveLength(1);
  });
});

describe('Historial de solo insercion', () => {
  it('dado una entrada hc-1 cuando un odontologo hace DELETE sobre la entrada entonces responde 404 y la entrada sigue', async () => {
    const { app, auth } = entorno();
    const creada = await alta(app, auth('u-odonto-1'), 'pac-01', VALIDA);
    const res = await request(app)
      .delete(`/api/pacientes/pac-01/historia/${creada.body.id}`)
      .set('Authorization', auth('u-odonto-1'));
    expect(res.status).toBe(404);
    const lista = await request(app).get('/api/pacientes/pac-01/historia').set('Authorization', auth('u-admin'));
    expect(lista.body.entradas).toHaveLength(1);
  });

  it('dado una entrada cuando se intenta PUT, PATCH o DELETE sobre la coleccion entonces responde 404 y la entrada queda intacta', async () => {
    const { app, auth } = entorno();
    const creada = await alta(app, auth('u-odonto-1'), 'pac-01', VALIDA);
    const ruta = `/api/pacientes/pac-01/historia/${creada.body.id}`;
    const intentos = [
      request(app).put(ruta).set('Authorization', auth('u-odonto-1')).send({ procedimiento: 'X' }),
      request(app).patch(ruta).set('Authorization', auth('u-odonto-1')).send({ procedimiento: 'X' }),
      request(app).put('/api/pacientes/pac-01/historia').set('Authorization', auth('u-odonto-1')).send({}),
      request(app).delete('/api/pacientes/pac-01/historia').set('Authorization', auth('u-odonto-1')),
    ];
    for (const intento of intentos) expect((await intento).status).toBe(404);
    const lista = await request(app).get('/api/pacientes/pac-01/historia').set('Authorization', auth('u-admin'));
    expect(lista.body.entradas[0].procedimiento).toBe('Control y limpieza');
  });
});

describe('Auditoria del alta por API', () => {
  it('dado un alta con notas cuando se revisa la auditoria entonces hay historia-crear y ningun campo contiene las notas', async () => {
    const { deps, app, auth } = entorno();
    await alta(app, auth('u-odonto-1'), 'pac-01', VALIDA);
    const eventos = (deps.auditoria as AuditoriaEnMemoria).eventos();
    const crear = eventos.filter((e) => e.accion === 'historia-crear');
    expect(crear).toHaveLength(1);
    expect(crear[0]?.entidadId).toBe('pac-01');
    expect(JSON.stringify(eventos)).not.toContain(NOTAS);
  });
});
