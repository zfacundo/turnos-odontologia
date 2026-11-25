import { describe, it, expect } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../../src/api/app';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';

const AHORA = new Date('2026-11-30T09:00:00-03:00');
const RECEPCION = { 'X-Usuario': 'u-recepcion', 'X-Rol': 'recepcion' };
const ADMIN = { 'X-Usuario': 'u-admin', 'X-Rol': 'admin' };
const ODONTO = { 'X-Usuario': 'u-odonto-1', 'X-Rol': 'odontologo' };
const PACIENTE = { 'X-Usuario': 'pac-usuario', 'X-Rol': 'paciente' };
const AVISO = 'SIMULACIÓN — no es Mercado Pago real';
const RUTA = '/api/sim/mercadopago/pagos';

const nuevaApp = (): Express => createApp(cargarSeed(new RelojFijo(AHORA)));

/** Crea el turno de referencia T por la API de recepcion (C-02). */
const crearT = async (app: Express): Promise<string> => {
  const res = await request(app).post('/api/turnos').set(RECEPCION).send({
    pacienteId: 'pac-01',
    prestacionId: 'prest-control',
    profesionalId: 'prof-1',
    sillonId: 'sillon-1',
    inicio: '2026-12-01T10:00:00-03:00',
  });
  expect(res.status).toBe(201);
  return res.body.id as string;
};

const pagar = (app: Express, cuerpo: unknown, headers: Record<string, string> = PACIENTE) =>
  request(app).post(RUTA).set(headers).send(cuerpo as object);

const turnoEnLista = async (app: Express, id: string) => {
  const res = await request(app).get('/api/turnos');
  return (res.body.turnos as { id: string; estado: string; senado: boolean }[]).find((t) => t.id === id);
};

describe('POST /api/sim/mercadopago/pagos: exito', () => {
  it('dado T reservado cuando el paciente paga aprobado entonces responde 201 rotulado y T queda señado', async () => {
    const app = nuevaApp();
    const id = await crearT(app);
    const res = await pagar(app, { turnoId: id, resultado: 'aprobado' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      simulado: true,
      aviso: AVISO,
      pago: { turnoId: id, estado: 'aprobado', simulado: true, fecha: AHORA.toISOString() },
      turno: { id, estado: 'reservado', senado: true },
    });
    expect(await turnoEnLista(app, id)).toMatchObject({ estado: 'reservado', senado: true });
  });

  it('dado T confirmado cuando el paciente paga aprobado entonces responde 201 y T sigue confirmado y señado', async () => {
    const app = nuevaApp();
    const id = await crearT(app);
    await request(app).post(`/api/turnos/${id}/confirmar`).set(RECEPCION).send();
    const res = await pagar(app, { turnoId: id, resultado: 'aprobado' });
    expect(res.status).toBe(201);
    expect(res.body.turno).toEqual({ id, estado: 'confirmado', senado: true });
  });

  it('dado T reservado cuando el paciente paga rechazado entonces responde 201 rotulado y T no cambia', async () => {
    const app = nuevaApp();
    const id = await crearT(app);
    const res = await pagar(app, { turnoId: id, resultado: 'rechazado' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      simulado: true,
      aviso: AVISO,
      pago: { estado: 'rechazado', simulado: true },
      turno: { id, senado: false },
    });
    expect(await turnoEnLista(app, id)).toMatchObject({ estado: 'reservado', senado: false });
  });
});

describe('POST /api/sim/mercadopago/pagos: errores', () => {
  it('dado T ya señado por la API cuando el paciente paga aprobado otra vez entonces responde 409 RN-SM-01 "turno ya señado"', async () => {
    const app = nuevaApp();
    const id = await crearT(app);
    await pagar(app, { turnoId: id, resultado: 'aprobado' });
    const res = await pagar(app, { turnoId: id, resultado: 'aprobado' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ tipo: 'regla', regla: 'RN-SM-01', conflicto: { turnoId: id } });
    expect(res.body.error.mensaje).toContain('turno ya señado');
  });

  it('dado T cancelado por la API cuando el paciente paga aprobado entonces responde 409 RN-SM-01 citando SU-07', async () => {
    const app = nuevaApp();
    const id = await crearT(app);
    await request(app).post(`/api/turnos/${id}/cancelar`).set(RECEPCION).send({ motivo: 'Pedido del paciente' });
    const res = await pagar(app, { turnoId: id, resultado: 'aprobado' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ regla: 'RN-SM-01', conflicto: { turnoId: id } });
    expect(res.body.error.mensaje).toContain('SU-07');
  });

  it('dado que no existe turno-inexistente cuando el paciente lo paga entonces responde 404 no-encontrado', async () => {
    const res = await pagar(nuevaApp(), { turnoId: 'turno-inexistente', resultado: 'aprobado' });
    expect(res.status).toBe(404);
    expect(res.body.error.tipo).toBe('no-encontrado');
  });

  for (const [nombre, headers] of [
    ['recepcion', RECEPCION],
    ['admin', ADMIN],
    ['odontologo', ODONTO],
  ] as const) {
    it(`dado T reservado cuando ${nombre} paga aprobado entonces responde 403 y T sigue sin señar`, async () => {
      const app = nuevaApp();
      const id = await crearT(app);
      const res = await pagar(app, { turnoId: id, resultado: 'aprobado' }, headers);
      expect(res.status).toBe(403);
      expect(res.body.error.tipo).toBe('permiso');
      expect((await turnoEnLista(app, id))?.senado).toBe(false);
    });
  }

  it('dado T reservado cuando se paga sin header de rol entonces responde 403', async () => {
    const app = nuevaApp();
    const id = await crearT(app);
    const res = await request(app).post(RUTA).send({ turnoId: id, resultado: 'aprobado' });
    expect(res.status).toBe(403);
  });

  it('dado T reservado cuando el paciente envia resultado pendiente entonces responde 400 entrada', async () => {
    const app = nuevaApp();
    const id = await crearT(app);
    const res = await pagar(app, { turnoId: id, resultado: 'pendiente' });
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it('dado un pedido sin turnoId cuando el paciente lo envia entonces responde 400 entrada', async () => {
    const res = await pagar(nuevaApp(), { resultado: 'aprobado' });
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it('dado un cuerpo JSON que no es objeto cuando el paciente lo envia entonces responde 400 entrada', async () => {
    const res = await pagar(nuevaApp(), ['aprobado']);
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });
});
