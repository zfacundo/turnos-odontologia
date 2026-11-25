import { describe, it, expect } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../../src/api/app';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';

const AVISO = 'Simulación — no es WhatsApp real';
const TEL_UNO = '+54 9 11 0000-0001';
const TEL_NUEVO = '+54 9 11 0000-0099';
const RECEPCION = { 'X-Usuario': 'u-recepcion', 'X-Rol': 'recepcion' };

const nuevaApp = (): Express => createApp(cargarSeed(new RelojFijo(new Date('2026-11-30T09:00:00-03:00'))));
const mensaje = (app: Express, cuerpo: Record<string, unknown>) => request(app).post('/api/sim/whatsapp/mensaje').send(cuerpo);
const recordatorio = (app: Express, cuerpo: Record<string, unknown>) =>
  request(app).post('/api/sim/whatsapp/recordatorio').send(cuerpo);

type Opcion = { id: string; etiqueta: string };
const idDe = (opciones: Opcion[], etiqueta: string): string => {
  const o = opciones.find((x) => x.etiqueta === etiqueta);
  if (o === undefined) throw new Error(`no hay opción ${etiqueta}`);
  return o.id;
};

/** Recorre el chat eligiendo por etiqueta y devuelve la ultima respuesta. */
async function chatear(app: Express, telefono: string, pasos: string[]) {
  let res = await mensaje(app, { telefono, texto: 'Hola! Quería sacar un turno' });
  for (const etiqueta of pasos) {
    res = await mensaje(app, { telefono, opcionId: idDe(res.body.opciones, etiqueta) });
  }
  return res;
}

describe('POST /api/sim/whatsapp/mensaje - contrato', () => {
  it('dado el paciente de pac-01 cuando escribe hola entonces responde 200 rotulado como simulacion con mensajes, opciones y pideTexto', async () => {
    const res = await mensaje(nuevaApp(), { telefono: TEL_UNO, texto: 'hola' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ simulado: true, aviso: AVISO, pideTexto: false });
    expect(res.body.mensajes[0].texto).toMatch(/asistente del consultorio/);
    expect(res.body.opciones.map((o: Opcion) => o.etiqueta)).toEqual(['Pedir un turno', 'Ver o cambiar mi turno']);
  });

  it('dado un telefono real cuando envia un mensaje entonces responde 400 entrada', async () => {
    const res = await mensaje(nuevaApp(), { telefono: '+54 9 11 4321-0000', texto: 'hola' });
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it('dado un mensaje sin telefono cuando se envia entonces responde 400 entrada', async () => {
    const res = await mensaje(nuevaApp(), { texto: 'hola' });
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it('dado un mensaje sin opcionId ni texto cuando se envia entonces responde 400 entrada', async () => {
    const res = await mensaje(nuevaApp(), { telefono: TEL_UNO });
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it('dado un mensaje con opcionId y texto a la vez cuando se envia entonces responde 400 entrada', async () => {
    const res = await mensaje(nuevaApp(), { telefono: TEL_UNO, opcionId: 'pedir', texto: 'hola' });
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it('dado dos telefonos cuando conversan a la vez entonces cada uno mantiene su propia conversacion', async () => {
    const app = nuevaApp();
    const a = await chatear(app, TEL_UNO, ['Pedir un turno']);
    const b = await mensaje(app, { telefono: TEL_NUEVO, texto: 'hola' });
    expect(a.body.opciones.map((o: Opcion) => o.etiqueta)).toContain('Ortodoncia');
    expect(b.body.opciones.map((o: Opcion) => o.etiqueta)).toEqual(['Pedir un turno', 'Ver o cambiar mi turno']);
    const sigueA = await mensaje(app, { telefono: TEL_UNO, opcionId: idDe(a.body.opciones, 'Ortodoncia') });
    expect(sigueA.body.opciones.map((o: Opcion) => o.etiqueta)).toEqual(['Dra. Ficticia Perez', 'Dr. Ficticio Gomez']);
  });
});

describe('POST /api/sim/whatsapp/mensaje - reserva de punta a punta', () => {
  it('dado el seed cuando pac-01 reserva por el bot entonces GET /api/turnos muestra el turno reservado con origen whatsapp', async () => {
    const app = nuevaApp();
    const res = await chatear(app, TEL_UNO, ['Pedir un turno', 'Control y limpieza', 'Dra. Ficticia Perez', 'Lun 30/11 09:00']);
    expect(res.body.mensajes.some((m: { tarjeta?: { titulo: string } }) => m.tarjeta?.titulo === 'Turno reservado')).toBe(true);
    const turnos = await request(app)
      .get('/api/turnos')
      .query({ desde: '2026-11-30T00:00:00-03:00', hasta: '2026-12-01T00:00:00-03:00' })
      .set(RECEPCION);
    expect(turnos.body.turnos).toHaveLength(1);
    expect(turnos.body.turnos[0]).toMatchObject({
      pacienteId: 'pac-01',
      profesionalId: 'prof-1',
      inicio: '2026-11-30T12:00:00.000Z',
      estado: 'reservado',
      origen: 'whatsapp',
    });
  });

  it('dado un numero nuevo cuando el bot pide datos entonces pideTexto es verdadero y con los datos completa la reserva', async () => {
    const app = nuevaApp();
    const pide = await chatear(app, TEL_NUEVO, ['Pedir un turno', 'Control y limpieza', 'Dra. Ficticia Perez', 'Lun 30/11 09:00']);
    expect(pide.body.pideTexto).toBe(true);
    const fin = await mensaje(app, { telefono: TEL_NUEVO, texto: 'Paciente Ficticio Once, 99.000.011' });
    expect(fin.body.mensajes.some((m: { tarjeta?: { titulo: string } }) => m.tarjeta?.titulo === 'Turno reservado')).toBe(true);
  });
});

describe('POST /api/sim/whatsapp/recordatorio', () => {
  it('dado pac-01 con un turno reservado cuando se envia el recordatorio entonces responde con el texto y las 3 opciones', async () => {
    const app = nuevaApp();
    await request(app)
      .post('/api/turnos')
      .set(RECEPCION)
      .send({ pacienteId: 'pac-01', prestacionId: 'prest-control', profesionalId: 'prof-1', sillonId: 'sillon-1', inicio: '2026-12-01T10:00:00-03:00' });
    const res = await recordatorio(app, { telefono: TEL_UNO });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ simulado: true, aviso: AVISO });
    expect(res.body.mensajes[0].texto).toMatch(/te recordamos tu turno[\s\S]*Mar 1\/12 10:00[\s\S]*¿Confirmás tu asistencia\?/);
    expect(res.body.opciones.map((o: Opcion) => o.etiqueta)).toEqual(['Confirmo', 'Necesito cambiarlo', 'Cancelar turno']);
    const confirmo = await mensaje(app, { telefono: TEL_UNO, opcionId: idDe(res.body.opciones, 'Confirmo') });
    expect(confirmo.body.mensajes.some((m: { tarjeta?: { titulo: string } }) => m.tarjeta?.titulo === 'Turno confirmado')).toBe(true);
  });

  it('dado un numero sin turnos cuando se envia el recordatorio entonces informa que no hay turnos proximos', async () => {
    const res = await recordatorio(nuevaApp(), { telefono: TEL_NUEVO });
    expect(res.status).toBe(200);
    expect(res.body.mensajes[0].texto).toMatch(/No hay turnos próximos/);
  });

  it('dado un telefono invalido cuando se envia el recordatorio entonces responde 400 entrada', async () => {
    const res = await recordatorio(nuevaApp(), { telefono: '11 4321-0000' });
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });
});
