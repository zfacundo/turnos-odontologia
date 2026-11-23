
import { describe, it, expect } from 'vitest';
import request from 'supertest';

import { createApp } from '../../src/api/app';
import { cargarSeed } from '../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../src/infrastructure/clock/clock';

const AHORA = new Date('2026-11-30T09:00:00-03:00');

const RECEPCION = {
  'X-Usuario': 'u-recepcion',
  'X-Rol': 'recepcion',
};

const ADMIN = {
  'X-Usuario': 'u-admin',
  'X-Rol': 'admin',
};

const ODONTOLOGO = {
  'X-Usuario': 'u-odonto-1',
  'X-Rol': 'odontologo',
};

const turnoBase = {
  pacienteId: 'pac-01',
  prestacionId: 'prest-control',
  profesionalId: 'prof-1',
  sillonId: 'sillon-1',
  inicio: '2026-12-01T10:00:00-03:00',
};

function preparar() {
  const deps = cargarSeed(new RelojFijo(AHORA));
  const app = createApp(deps);

  return { app, deps };
}

describe('C-09 - Auditoría y registro', () => {

  it('devuelve listas vacías cuando no hay eventos', async () => {
    const { app } = preparar();

    const auditoria = await request(app)
      .get('/api/auditoria')
      .set(RECEPCION);

    const registro = await request(app)
      .get('/api/registro')
      .set(RECEPCION);

    expect(auditoria.status).toBe(200);
    expect(auditoria.body.eventos).toEqual([]);

    expect(registro.status).toBe(200);
    expect(registro.body.registro).toEqual([]);
  });

  it('permite consultar auditoría a recepción y administración', async () => {
    const { app } = preparar();

    for (const headers of [RECEPCION, ADMIN]) {
      const respuesta = await request(app)
        .get('/api/auditoria')
        .set(headers);

      expect(respuesta.status).toBe(200);
      expect(Array.isArray(respuesta.body.eventos)).toBe(true);
    }
  });

  it('rechaza consultas del odontólogo con HTTP 403', async () => {
    const { app } = preparar();

    for (const ruta of ['/api/auditoria', '/api/registro']) {
      const respuesta = await request(app)
        .get(ruta)
        .set(ODONTOLOGO);

      expect(respuesta.status).toBe(403);
      expect(respuesta.body.error.tipo).toBe('permiso');
    }
  });

  it('rechaza consultas sin un rol autorizado', async () => {
    const { app } = preparar();

    const respuesta = await request(app)
      .get('/api/auditoria');

    expect(respuesta.status).toBe(403);
  });

  it('registra un turno creado y genera un mensaje legible', async () => {
    const { app } = preparar();

    const creacion = await request(app)
      .post('/api/turnos')
      .set(RECEPCION)
      .send(turnoBase);

    expect(creacion.status).toBe(201);

    const auditoria = await request(app)
      .get('/api/auditoria')
      .set(RECEPCION);

    expect(auditoria.status).toBe(200);
    expect(auditoria.body.eventos).toHaveLength(1);

    expect(auditoria.body.eventos[0]).toMatchObject({
      accion: 'crear',
      entidad: 'turno',
      entidadId: creacion.body.id,
      usuarioId: 'u-recepcion',
      rol: 'recepcion',
    });

    const registro = await request(app)
      .get('/api/registro')
      .set(RECEPCION);

    expect(registro.status).toBe(200);
    expect(registro.body.registro).toHaveLength(1);
    expect(registro.body.registro[0].mensaje)
      .toContain('Turno creado:');
    expect(registro.body.registro[0].mensaje)
      .toContain('pac-01');
  });

  it('devuelve los eventos ordenados cronológicamente', async () => {
    const { app, deps } = preparar();

    deps.auditoria.registrar({
      fecha: new Date('2026-11-30T12:00:00Z'),
      usuarioId: 'u-admin',
      rol: 'admin',
      accion: 'segunda',
      entidad: 'turno',
      entidadId: 'turno-2',
    });

    deps.auditoria.registrar({
      fecha: new Date('2026-11-30T10:00:00Z'),
      usuarioId: 'u-admin',
      rol: 'admin',
      accion: 'primera',
      entidad: 'turno',
      entidadId: 'turno-1',
    });

    const respuesta = await request(app)
      .get('/api/auditoria')
      .set(ADMIN);

    expect(respuesta.status).toBe(200);

    expect(
      respuesta.body.eventos.map(
        (evento: { accion: string }) => evento.accion,
      ),
    ).toEqual(['primera', 'segunda']);
  });

  it('no registra intentos de creación rechazados', async () => {
    const { app } = preparar();

    const primero = await request(app)
      .post('/api/turnos')
      .set(RECEPCION)
      .send(turnoBase);

    expect(primero.status).toBe(201);

    const segundo = await request(app)
      .post('/api/turnos')
      .set(RECEPCION)
      .send({
        ...turnoBase,
        pacienteId: 'pac-02',
      });

    expect(segundo.status).toBe(409);

    const respuesta = await request(app)
      .get('/api/auditoria')
      .set(RECEPCION);

    expect(respuesta.body.eventos).toHaveLength(1);
  });

  it('no expone rutas para modificar o borrar auditoría', async () => {
    const { app } = preparar();

    const modificar = await request(app)
      .patch('/api/auditoria/turno-1')
      .set(ADMIN)
      .send({ accion: 'modificada' });

    const borrar = await request(app)
      .delete('/api/auditoria/turno-1')
      .set(ADMIN);

    expect(modificar.status).toBe(404);
    expect(borrar.status).toBe(404);
  });

});
