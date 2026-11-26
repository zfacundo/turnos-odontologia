import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../src/api/app';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';

const RECEPCION = {
  'X-Usuario': 'u-recepcion',
  'X-Rol': 'recepcion',
};

const TELEFONO = '+54 9 11 0000-0001';
const OTRO_TELEFONO = '+54 9 11 0000-0002';

function nuevaApp() {
  return createApp(
    cargarSeed(
      new RelojFijo(new Date('2026-11-30T09:00:00-03:00'))
    )
  );
}

const turno = {
  pacienteId: 'pac-01',
  prestacionId: 'prest-control',
  profesionalId: 'prof-1',
  sillonId: 'sillon-1',
  inicio: '2026-12-01T10:00:00-03:00',
};

describe('C-09 - Avisos de cancelacion por WhatsApp simulado', () => {
  it('avisa al paciente cuando recepcion cancela correctamente', async () => {
    const app = nuevaApp();

    const creado = await request(app)
      .post('/api/turnos')
      .set(RECEPCION)
      .send(turno);

    expect(creado.status).toBe(201);

    const cancelado = await request(app)
      .post(`/api/turnos/${creado.body.id}/cancelar`)
      .set(RECEPCION)
      .send({ motivo: 'El paciente no puede asistir' });

    expect(cancelado.status).toBe(200);

    const respuesta = await request(app)
      .get('/api/sim/whatsapp/avisos')
      .query({ telefono: TELEFONO });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.simulado).toBe(true);
    expect(respuesta.body.avisos).toHaveLength(2);
    expect(respuesta.body.avisos[0].texto).toContain('agendado correctamente');
    expect(respuesta.body.avisos[1].texto).toContain('cancelado');
    expect(respuesta.body.avisos[1].texto)
      .not.toContain('El paciente no puede asistir');
  });

  it('no genera avisos cuando la cancelacion falla', async () => {
    const app = nuevaApp();

    const fallido = await request(app)
      .post('/api/turnos/turno-inexistente/cancelar')
      .set(RECEPCION)
      .send({ motivo: 'Cancelacion de prueba' });

    expect(fallido.status).not.toBe(200);

    const respuesta = await request(app)
      .get('/api/sim/whatsapp/avisos')
      .query({ telefono: TELEFONO });

    expect(respuesta.body.avisos).toHaveLength(0);
  });

  it('no muestra el aviso en el telefono de otro paciente', async () => {
    const app = nuevaApp();

    const creado = await request(app)
      .post('/api/turnos')
      .set(RECEPCION)
      .send(turno);

    expect(creado.status).toBe(201);

    const cancelado = await request(app)
      .post(`/api/turnos/${creado.body.id}/cancelar`)
      .set(RECEPCION)
      .send({ motivo: 'Cancelacion de prueba' });

    expect(cancelado.status).toBe(200);

    const respuesta = await request(app)
      .get('/api/sim/whatsapp/avisos')
      .query({ telefono: OTRO_TELEFONO });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.avisos).toHaveLength(0);
  });
});


describe('Confirmacion desde Agenda', () => {
  it('envia aviso al crear un turno desde recepcion', async () => {
    const app = nuevaApp();

    const creado = await request(app)
      .post('/api/turnos')
      .set(RECEPCION)
      .send(turno);

    expect(creado.status).toBe(201);

    const respuesta = await request(app)
      .get('/api/sim/whatsapp/avisos')
      .query({ telefono: TELEFONO });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.avisos).toHaveLength(1);
    expect(respuesta.body.avisos[0].texto)
      .toContain('agendado correctamente');
  });

  it('no envia aviso cuando el alta falla', async () => {
    const app = nuevaApp();

    const fallido = await request(app)
      .post('/api/turnos')
      .set(RECEPCION)
      .send({ ...turno, pacienteId: 'pac-no-existe' });

    expect(fallido.status).not.toBe(201);

    const respuesta = await request(app)
      .get('/api/sim/whatsapp/avisos')
      .query({ telefono: TELEFONO });

    expect(respuesta.body.avisos).toHaveLength(0);
  });

  it('no duplica avisos para turnos de origen whatsapp', async () => {
    const app = nuevaApp();

    const creado = await request(app)
      .post('/api/turnos')
      .set(RECEPCION)
      .send({ ...turno, origen: 'whatsapp' });

    expect(creado.status).toBe(201);

    const respuesta = await request(app)
      .get('/api/sim/whatsapp/avisos')
      .query({ telefono: TELEFONO });

    expect(respuesta.body.avisos).toHaveLength(0);
  });
});
