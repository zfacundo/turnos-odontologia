import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../src/api/app';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';

const RECEPCION = { 'X-Usuario': 'u-recepcion', 'X-Rol': 'recepcion' };
const TELEFONO = '+54 9 11 0000-0001';

function nuevaApp() {
  return createApp(cargarSeed(new RelojFijo(new Date('2026-11-30T09:00:00-03:00'))));
}

describe('GET /api/sim/whatsapp/contactos', () => {
  it('dado el seed, cuando se consultan los contactos, entonces pac-01 viene con telefono enmascarado y sin propiedad telefono', async () => {
    const res = await request(nuevaApp()).get('/api/sim/whatsapp/contactos');

    expect(res.status).toBe(200);
    expect(res.body.simulado).toBe(true);
    const contactos = res.body.contactos as Record<string, unknown>[];
    expect(contactos.find((c) => c.id === 'pac-01')).toEqual({
      id: 'pac-01',
      nombre: 'Paciente Ficticio Uno',
      telefonoEnmascarado: '+54 9 11 0000-**01',
    });
    for (const contacto of contactos) expect(contacto).not.toHaveProperty('telefono');
  });

  it('dado el seed, cuando se consultan los contactos, entonces el cuerpo no contiene ningun telefono completo', async () => {
    const res = await request(nuevaApp()).get('/api/sim/whatsapp/contactos');

    expect(res.text).not.toContain(TELEFONO);
    expect(res.text).not.toMatch(/\+54 9 11 0000-00\d{2}/);
    expect(res.body.total).toBe((res.body.contactos as unknown[]).length);
  });
});

describe('identificacion por paciente en los endpoints del simulador', () => {
  it('dado pac-01, cuando escribe hola por pacienteId, entonces responde 200 simulado con el menu inicial', async () => {
    const res = await request(nuevaApp())
      .post('/api/sim/whatsapp/mensaje')
      .send({ pacienteId: 'pac-01', texto: 'hola' });

    expect(res.status).toBe(200);
    expect(res.body.simulado).toBe(true);
    expect(res.body.aviso).toBe('Simulación — no es WhatsApp real');
    expect(res.body.opciones.length).toBeGreaterThan(0);
  });

  it('dado un paciente identificado por id, cuando continua por telefono, entonces el bot sigue la misma conversacion', async () => {
    const app = nuevaApp();
    const inicio = await request(app)
      .post('/api/sim/whatsapp/mensaje')
      .send({ pacienteId: 'pac-01', texto: 'hola' });
    const primera = inicio.body.opciones[0] as { id: string };

    const continuo = await request(app)
      .post('/api/sim/whatsapp/mensaje')
      .send({ telefono: TELEFONO, opcionId: primera.id });
    const reinicio = await request(app)
      .post('/api/sim/whatsapp/mensaje')
      .send({ telefono: '+54 9 11 0000-0002', opcionId: primera.id });

    expect(continuo.status).toBe(200);
    expect(JSON.stringify(continuo.body.mensajes)).not.toBe(
      JSON.stringify(reinicio.body.mensajes)
    );
  });

  it('dado pac-01, cuando pide el recordatorio por pacienteId o por telefono, entonces la respuesta es la misma', async () => {
    const porId = await request(nuevaApp())
      .post('/api/sim/whatsapp/recordatorio')
      .send({ pacienteId: 'pac-01' });
    const porTelefono = await request(nuevaApp())
      .post('/api/sim/whatsapp/recordatorio')
      .send({ telefono: TELEFONO });

    expect(porId.status).toBe(200);
    expect(porId.body).toEqual(porTelefono.body);
  });

  it('dado un turno de pac-01 cancelado por recepcion, cuando se consultan avisos por pacienteId, entonces pac-01 lo ve y pac-02 no', async () => {
    const app = nuevaApp();
    const creado = await request(app).post('/api/turnos').set(RECEPCION).send({
      pacienteId: 'pac-01',
      prestacionId: 'prest-control',
      profesionalId: 'prof-1',
      sillonId: 'sillon-1',
      inicio: '2026-12-01T13:00:00Z',
    });
    await request(app)
      .post(`/api/turnos/${creado.body.id}/cancelar`)
      .set(RECEPCION)
      .send({ motivo: 'El paciente no puede asistir' });

    const uno = await request(app).get('/api/sim/whatsapp/avisos').query({ pacienteId: 'pac-01' });
    const dos = await request(app).get('/api/sim/whatsapp/avisos').query({ pacienteId: 'pac-02' });

    expect(uno.status).toBe(200);
    expect(uno.body.simulado).toBe(true);
    expect((uno.body.avisos as { texto: string }[]).some((a) => a.texto.includes('fue cancelado'))).toBe(true);
    expect(dos.status).toBe(200);
    expect(dos.body.avisos).toEqual([]);
  });

  it.each([
    ['telefono y pacienteId a la vez', { telefono: TELEFONO, pacienteId: 'pac-01' }],
    ['ninguno de los dos', {}],
    ['pacienteId inexistente', { pacienteId: 'pac-inexistente' }],
  ])('dado %s, cuando se pide mensaje, recordatorio o avisos, entonces responde 400 entrada', async (_nombre, ident) => {
    const app = nuevaApp();

    const mensaje = await request(app)
      .post('/api/sim/whatsapp/mensaje')
      .send({ ...ident, texto: 'hola' });
    const recordatorio = await request(app).post('/api/sim/whatsapp/recordatorio').send(ident);
    const avisos = await request(app).get('/api/sim/whatsapp/avisos').query(ident);

    for (const res of [mensaje, recordatorio, avisos]) {
      expect(res.status).toBe(400);
      expect(res.body.error.tipo).toBe('entrada');
    }
  });
});
