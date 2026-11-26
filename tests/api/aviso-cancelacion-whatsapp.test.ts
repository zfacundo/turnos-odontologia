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

describe('Aviso de cancelacion por WhatsApp simulado (API)', () => {
  it('dado un turno activo de pac-01 con prof-1, cuando recepcion lo cancela y responde 200, entonces el WhatsApp simulado de pac-01 incluye el aviso con el texto exacto', async () => {
    const app = nuevaApp();
    const creado = await request(app).post('/api/turnos').set(RECEPCION).send({
      pacienteId: 'pac-01',
      prestacionId: 'prest-control',
      profesionalId: 'prof-1',
      sillonId: 'sillon-1',
      inicio: '2026-12-01T13:00:00Z',
    });
    expect(creado.status).toBe(201);

    const cancelado = await request(app)
      .post(`/api/turnos/${creado.body.id}/cancelar`)
      .set(RECEPCION)
      .send({ motivo: 'El paciente no puede asistir' });
    expect(cancelado.status).toBe(200);

    const avisos = await request(app).get('/api/sim/whatsapp/avisos').query({ telefono: TELEFONO });
    expect(avisos.status).toBe(200);
    const textos = (avisos.body.avisos as { texto: string }[]).map((a) => a.texto.replace(/\s/g, ' '));
    expect(textos).toContain(
      'Hola, Paciente Ficticio Uno. Te informamos que tu turno del 1/12/26, 10:00 a. m. con Dra. Ficticia Perez fue cancelado. Para solicitar otro turno, comunicate con recepción.'
    );
  });

  it('dado un turno cancelado sin motivo, cuando la cancelacion responde 400, entonces no se registra ningun aviso de cancelacion', async () => {
    const app = nuevaApp();
    const creado = await request(app).post('/api/turnos').set(RECEPCION).send({
      pacienteId: 'pac-01',
      prestacionId: 'prest-control',
      profesionalId: 'prof-1',
      sillonId: 'sillon-1',
      inicio: '2026-12-01T13:00:00Z',
    });

    const rechazado = await request(app)
      .post(`/api/turnos/${creado.body.id}/cancelar`)
      .set(RECEPCION)
      .send({});
    expect(rechazado.status).toBe(400);

    const avisos = await request(app).get('/api/sim/whatsapp/avisos').query({ telefono: TELEFONO });
    const textos = (avisos.body.avisos as { texto: string }[]).map((a) => a.texto);
    expect(textos.some((t) => t.includes('fue cancelado'))).toBe(false);
  });
});
