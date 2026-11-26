import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/api/app';
import { cargarSeed } from '../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../src/infrastructure/clock/clock';

const RECEPCION = { 'X-Usuario': 'u-recepcion', 'X-Rol': 'recepcion' };

const TELEFONO = '+54 9 11 0000-0001';

function nuevaApp() {
  return createApp(cargarSeed(new RelojFijo(new Date('2026-11-30T09:00:00-03:00'))));
}

const turno = {
  pacienteId: 'pac-01',
  prestacionId: 'prest-control',
  profesionalId: 'prof-1',
  sillonId: 'sillon-1',
  inicio: '2026-12-01T10:00:00-03:00',
};

async function avisosDe(app: ReturnType<typeof nuevaApp>, telefono: string) {
  const respuesta = await request(app)
    .get('/api/sim/whatsapp/avisos')
    .query({ telefono });
  expect(respuesta.status).toBe(200);
  return respuesta.body as { simulado: boolean; avisos: { id: number; texto: string }[] };
}

describe('Confirmacion de turno por WhatsApp simulado (API)', () => {
  it('dado recepcion con sesion, cuando crea un turno de origen recepcion, entonces el WhatsApp simulado del paciente recibe la confirmacion con el texto exacto', async () => {
    const app = nuevaApp();

    const creado = await request(app).post('/api/turnos').set(RECEPCION).send(turno);

    expect(creado.status).toBe(201);
    const cuerpo = await avisosDe(app, TELEFONO);
    expect(cuerpo.simulado).toBe(true);
    expect(cuerpo.avisos).toHaveLength(1);
    expect(cuerpo.avisos[0]?.texto.replace(/\s/g, ' ')).toBe(
      'Hola, Paciente Ficticio Uno. Tu turno del 1/12/26, 10:00 a. m. con Dra. Ficticia Perez para Control y limpieza fue agendado correctamente. ¡Te esperamos!'
    );
  });

  it('dado administracion con sesion, cuando crea un turno de origen recepcion, entonces se registra la confirmacion', async () => {
    const app = nuevaApp();

    const creado = await request(app)
      .post('/api/turnos')
      .set({ 'X-Usuario': 'u-admin', 'X-Rol': 'admin' })
      .send(turno);

    expect(creado.status).toBe(201);
    expect((await avisosDe(app, TELEFONO)).avisos).toHaveLength(1);
  });

  it('dado un turno enviado con origen whatsapp, cuando el alta responde 201, entonces no se registra confirmacion', async () => {
    const app = nuevaApp();

    const creado = await request(app)
      .post('/api/turnos')
      .set(RECEPCION)
      .send({ ...turno, origen: 'whatsapp' });

    expect(creado.status).toBe(201);
    expect((await avisosDe(app, TELEFONO)).avisos).toEqual([]);
  });

  it('dado un usuario con rol paciente, cuando crea un turno y el alta responde 201, entonces no se registra confirmacion', async () => {
    const app = nuevaApp();

    const creado = await request(app)
      .post('/api/turnos')
      .set({ 'X-Usuario': 'u-paciente', 'X-Rol': 'paciente' })
      .send(turno);

    expect(creado.status).toBe(201);
    expect((await avisosDe(app, TELEFONO)).avisos).toEqual([]);
  });

  it('dado un solapamiento, cuando el alta responde 409, entonces no se registra confirmacion del segundo intento', async () => {
    const app = nuevaApp();
    await request(app).post('/api/turnos').set(RECEPCION).send(turno);

    const repetido = await request(app)
      .post('/api/turnos')
      .set(RECEPCION)
      .send({ ...turno, pacienteId: 'pac-02' });

    expect(repetido.status).toBe(409);
    expect((await avisosDe(app, '+54 9 11 0000-0002')).avisos).toEqual([]);
  });

  it('dado un paciente inexistente, cuando el alta responde 400, entonces no se registra confirmacion', async () => {
    const app = nuevaApp();

    const rechazado = await request(app)
      .post('/api/turnos')
      .set(RECEPCION)
      .send({ ...turno, pacienteId: 'pac-inexistente' });

    expect(rechazado.status).toBe(400);
    expect((await avisosDe(app, TELEFONO)).avisos).toEqual([]);
  });

  it('dado un odontologo, cuando intenta crear un turno y el alta responde 403, entonces no se registra confirmacion', async () => {
    const app = nuevaApp();

    const rechazado = await request(app)
      .post('/api/turnos')
      .set({ 'X-Usuario': 'u-odonto-1', 'X-Rol': 'odontologo' })
      .send(turno);

    expect(rechazado.status).toBe(403);
    expect((await avisosDe(app, TELEFONO)).avisos).toEqual([]);
  });

  it('dado un turno creado para el paciente uno, cuando se consulta el telefono del paciente dos, entonces no ve la confirmacion', async () => {
    const app = nuevaApp();
    await request(app).post('/api/turnos').set(RECEPCION).send(turno);

    expect((await avisosDe(app, '+54 9 11 0000-0002')).avisos).toEqual([]);
  });

  it('dado un turno creado y luego cancelado, cuando se consulta el WhatsApp simulado, entonces hay dos avisos con la confirmacion primero', async () => {
    const app = nuevaApp();
    const creado = await request(app).post('/api/turnos').set(RECEPCION).send(turno);
    expect(creado.status).toBe(201);

    const cancelado = await request(app)
      .post(`/api/turnos/${creado.body.id}/cancelar`)
      .set(RECEPCION)
      .send({ motivo: 'El paciente no puede asistir' });
    expect(cancelado.status).toBe(200);

    const { avisos } = await avisosDe(app, TELEFONO);
    expect(avisos).toHaveLength(2);
    expect(avisos[0]?.texto).toContain('agendado correctamente');
    expect(avisos[1]?.texto).toContain('cancelado');
    expect(avisos[0]?.id).toBeLessThan(avisos[1]?.id ?? 0);
  });
});
