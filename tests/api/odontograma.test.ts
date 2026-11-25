
import { describe, it, expect } from 'vitest';
import request from 'supertest';

import { createApp } from '../../src/api/app';
import { cargarSeed } from '../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../src/infrastructure/clock/clock';

const RECEPCION = {
  'X-Usuario': 'u-recepcion',
  'X-Rol': 'recepcion',
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

async function preparar() {
  const deps = cargarSeed(
    new RelojFijo(new Date('2026-11-30T09:00:00-03:00'))
  );

  const app = createApp(deps);

  const respuesta = await request(app)
    .post('/api/turnos')
    .set(RECEPCION)
    .send(turnoBase);

  expect(respuesta.status).toBe(201);

  return {
    app,
    turnoId: respuesta.body.id as string,
  };
}

describe('C-10 - API del odontograma', () => {

  it('devuelve una lista vacía al consultar un turno nuevo', async () => {
    const { app, turnoId } = await preparar();

    const respuesta = await request(app)
      .get(`/api/turnos/${turnoId}/piezas`)
      .set(ODONTOLOGO); // spec: panel-reemplaza-agenda-vieja

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.piezas).toEqual([]);
  });

  it('guarda la pieza 16 y permite recuperarla', async () => {
    const { app, turnoId } = await preparar();

    const guardado = await request(app)
      .put(`/api/turnos/${turnoId}/piezas`)
      .set(ODONTOLOGO) // spec: panel-reemplaza-agenda-vieja
      .send({
        pieza: 16,
        sintomas: ['dolor_masticar'],
        caras: ['O'],
      });

    expect(guardado.status).toBe(200);
    expect(guardado.body).toMatchObject({
      turnoId,
      pieza: 16,
      estado: 'a_revisar',
      sintomas: ['dolor_masticar'],
      caras: ['O'],
    });

    const consulta = await request(app)
      .get(`/api/turnos/${turnoId}/piezas`)
      .set(ODONTOLOGO); // spec: panel-reemplaza-agenda-vieja

    expect(consulta.status).toBe(200);
    expect(consulta.body.piezas).toHaveLength(1);
    expect(consulta.body.piezas[0].pieza).toBe(16);
  });

  it('rechaza un número de pieza inválido', async () => {
    const { app, turnoId } = await preparar();

    const respuesta = await request(app)
      .put(`/api/turnos/${turnoId}/piezas`)
      .set(ODONTOLOGO) // spec: panel-reemplaza-agenda-vieja
      .send({
        pieza: 19,
        sintomas: ['dolor_masticar'],
      });

    expect(respuesta.status).toBe(400);
  });

  it('rechaza síntomas desconocidos', async () => {
    const { app, turnoId } = await preparar();

    const respuesta = await request(app)
      .put(`/api/turnos/${turnoId}/piezas`)
      .set(ODONTOLOGO) // spec: panel-reemplaza-agenda-vieja
      .send({
        pieza: 16,
        sintomas: ['sintoma_inventado'],
      });

    expect(respuesta.status).toBe(400);
  });

  it('rechaza turnos inexistentes', async () => {
    const { app } = await preparar();

    const respuesta = await request(app)
      .get('/api/turnos/turno-inexistente/piezas')
      .set(ODONTOLOGO); // spec: panel-reemplaza-agenda-vieja

    expect(respuesta.status).toBe(404);
  });

  it('impide que recepción marque una pieza como hecha', async () => {
    const { app, turnoId } = await preparar();

    await request(app)
      .put(`/api/turnos/${turnoId}/piezas`)
      .set(ODONTOLOGO) // spec: panel-reemplaza-agenda-vieja
      .send({
        pieza: 16,
        sintomas: ['dolor_masticar'],
      });

    const respuesta = await request(app)
      .put(`/api/turnos/${turnoId}/piezas`)
      .set(RECEPCION)
      .send({
        pieza: 16,
        estado: 'hecho',
      });

    expect(respuesta.status).toBe(403);
  });

  it('permite al odontólogo marcar una pieza como hecha', async () => {
    const { app, turnoId } = await preparar();

    await request(app)
      .put(`/api/turnos/${turnoId}/piezas`)
      .set(ODONTOLOGO) // spec: panel-reemplaza-agenda-vieja
      .send({
        pieza: 16,
        sintomas: ['dolor_masticar'],
      });

    const respuesta = await request(app)
      .put(`/api/turnos/${turnoId}/piezas`)
      .set(ODONTOLOGO)
      .send({
        pieza: 16,
        estado: 'hecho',
      });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.estado).toBe('hecho');

    const consulta = await request(app)
      .get(`/api/turnos/${turnoId}/piezas`)
      .set(ODONTOLOGO);

    expect(consulta.body.piezas[0].estado).toBe('hecho');
  });

});

describe('C-10 - Permisos del paciente', () => {
  it('impide que un paciente marque una pieza como hecha', async () => {
    const { app, turnoId } = await preparar();

    await request(app)
      .put(`/api/turnos/${turnoId}/piezas`)
      .set(ODONTOLOGO) // spec: panel-reemplaza-agenda-vieja
      .send({
        pieza: 16,
        sintomas: ['dolor_masticar'],
      });

    const respuesta = await request(app)
      .put(`/api/turnos/${turnoId}/piezas`)
      .set({
        'X-Usuario': 'u-paciente',
        'X-Rol': 'paciente',
      })
      .send({
        pieza: 16,
        estado: 'hecho',
      });

    expect(respuesta.status).toBe(403);
  });
});

describe('panel-reemplaza-agenda-vieja - solo el odontólogo usa el odontograma', () => {
  const PACIENTE = { 'X-Usuario': 'u-paciente', 'X-Rol': 'paciente' };
  const ADMIN = { 'X-Usuario': 'u-admin', 'X-Rol': 'admin' };
  const piezaValida = { pieza: 16, sintomas: ['dolor_masticar'] };

  it('dado un turno cuando recepción pide las piezas entonces responde 403', async () => {
    const { app, turnoId } = await preparar();
    const r = await request(app).get(`/api/turnos/${turnoId}/piezas`).set(RECEPCION);
    expect(r.status).toBe(403);
  });

  it('dado un turno cuando admin pide las piezas entonces responde 403', async () => {
    const { app, turnoId } = await preparar();
    const r = await request(app).get(`/api/turnos/${turnoId}/piezas`).set(ADMIN);
    expect(r.status).toBe(403);
  });

  it('dado un turno cuando recepción registra una pieza entonces 403 y el turno sigue sin piezas', async () => {
    const { app, turnoId } = await preparar();
    const r = await request(app).put(`/api/turnos/${turnoId}/piezas`).set(RECEPCION).send(piezaValida);
    expect(r.status).toBe(403);
    const consulta = await request(app).get(`/api/turnos/${turnoId}/piezas`).set(ODONTOLOGO);
    expect(consulta.body.piezas).toEqual([]);
  });

  it('dado un turno cuando un paciente registra una pieza entonces responde 403', async () => {
    const { app, turnoId } = await preparar();
    const r = await request(app).put(`/api/turnos/${turnoId}/piezas`).set(PACIENTE).send(piezaValida);
    expect(r.status).toBe(403);
  });

  it('dado una request sin usuario cuando pide las piezas entonces responde 403', async () => {
    const { app, turnoId } = await preparar();
    const r = await request(app).get(`/api/turnos/${turnoId}/piezas`);
    expect(r.status).toBe(403);
  });

  it('dado un token de odontólogo cuando registra la pieza 36 entonces 200 y queda a_revisar', async () => {
    const { app, turnoId } = await preparar();
    const login = await request(app).post('/api/auth/login').send({ usuarioId: 'u-odonto-1' });
    expect(login.status).toBe(201);
    const r = await request(app)
      .put(`/api/turnos/${turnoId}/piezas`)
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ pieza: 36, sintomas: ['dolor_masticar'] });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ pieza: 36, estado: 'a_revisar' });
  });

  it('dado un token de recepción cuando manda X-Rol odontologo entonces el token gana y responde 403', async () => {
    const { app, turnoId } = await preparar();
    const login = await request(app).post('/api/auth/login').send({ usuarioId: 'u-recepcion' });
    expect(login.status).toBe(201);
    const r = await request(app)
      .get(`/api/turnos/${turnoId}/piezas`)
      .set('Authorization', `Bearer ${login.body.token}`)
      .set('X-Rol', 'odontologo');
    expect(r.status).toBe(403);
  });

  it('dado un turno inexistente cuando recepción pide las piezas entonces 403 (permiso antes que búsqueda)', async () => {
    const { app } = await preparar();
    const r = await request(app).get('/api/turnos/turno-inexistente/piezas').set(RECEPCION);
    expect(r.status).toBe(403);
  });
});
