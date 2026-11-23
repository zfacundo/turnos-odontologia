import { describe, it, expect } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/api/app';
import { cargarSeed } from '../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../src/infrastructure/clock/clock';

const AHORA = new Date('2026-11-30T09:00:00-03:00');
const RECEPCION = { 'X-Usuario': 'u-recepcion', 'X-Rol': 'recepcion' };
const ODONTO_1 = { 'X-Usuario': 'u-odonto-1', 'X-Rol': 'odontologo' };
const PACIENTE = { 'X-Usuario': 'pac-usuario', 'X-Rol': 'paciente' };

const cuerpoBase = {
  pacienteId: 'pac-01',
  prestacionId: 'prest-control',
  profesionalId: 'prof-1',
  sillonId: 'sillon-1',
  inicio: '2026-12-01T10:00:00-03:00',
};

const nuevaApp = (reloj: Date = AHORA): Express => createApp(cargarSeed(new RelojFijo(reloj)));

const crearT = async (app: Express): Promise<string> => {
  const res = await request(app).post('/api/turnos').set(RECEPCION).send(cuerpoBase);
  return res.body.id as string;
};

const accion = (app: Express, id: string, nombre: string, headers: Record<string, string> = RECEPCION, cuerpo?: object) =>
  request(app).post(`/api/turnos/${id}/${nombre}`).set(headers).send(cuerpo);

const estadoEnLista = async (app: Express, id: string): Promise<string | undefined> => {
  const res = await request(app).get('/api/turnos');
  return (res.body.turnos as { id: string; estado: string }[]).find((t) => t.id === id)?.estado;
};

describe('POST /api/turnos/:id/{confirmar|atender|ausente}', () => {
  it('dado T reservado cuando recepcion hace POST confirmar entonces responde 200 con estado confirmado', async () => {
    const app = nuevaApp();
    const id = await crearT(app);
    const res = await accion(app, id, 'confirmar');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id, estado: 'confirmado' });
  });

  it('dado T reservado cuando recepcion hace POST ausente entonces responde 200 con estado ausente', async () => {
    const app = nuevaApp();
    const id = await crearT(app);
    const res = await accion(app, id, 'ausente');
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('ausente');
  });

  it('dado T de prof-1 cuando u-odonto-1 (odontologo) hace POST atender entonces responde 200 con estado atendido', async () => {
    const app = nuevaApp();
    const id = await crearT(app);
    const res = await accion(app, id, 'atender', ODONTO_1);
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('atendido');
  });

  it('dado T de prof-1 cuando u-odonto-2 hace POST atender entonces responde 403 y T sigue reservado', async () => {
    const app = nuevaApp();
    const id = await crearT(app);
    const res = await accion(app, id, 'atender', { 'X-Usuario': 'u-odonto-2', 'X-Rol': 'odontologo' });
    expect(res.status).toBe(403);
    expect(await estadoEnLista(app, id)).toBe('reservado');
  });

  it('dado T confirmado cuando recepcion confirma otra vez entonces responde 409 RN-AG-09', async () => {
    const app = nuevaApp();
    const id = await crearT(app);
    await accion(app, id, 'confirmar');
    const res = await accion(app, id, 'confirmar');
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ tipo: 'regla', regla: 'RN-AG-09', conflicto: { turnoId: id } });
  });

  it('dado un turno inexistente cuando recepcion hace POST confirmar entonces responde 404 con error.tipo no-encontrado', async () => {
    const res = await accion(nuevaApp(), 'turno-inexistente', 'confirmar');
    expect(res.status).toBe(404);
    expect(res.body.error.tipo).toBe('no-encontrado');
  });

  it('dado un request sin rol cuando hace POST confirmar entonces responde 403', async () => {
    const app = nuevaApp();
    const id = await crearT(app);
    const res = await accion(app, id, 'confirmar', {});
    expect(res.status).toBe(403);
  });
});

describe('POST /api/turnos/:id/cancelar', () => {
  it('dado T atendido cuando recepcion cancela entonces responde 409 RN-AG-09 con conflicto el id de T', async () => {
    const app = nuevaApp();
    const id = await crearT(app);
    await accion(app, id, 'atender');
    const res = await accion(app, id, 'cancelar', RECEPCION, { motivo: 'Error de carga' });
    expect(res.status).toBe(409);
    expect(res.body.error.regla).toBe('RN-AG-09');
    expect(res.body.error.conflicto.turnoId).toBe(id);
  });

  it('dado el reloj a 23 h del inicio cuando el paciente cancela entonces responde 409 RN-AG-06 con conflicto el id de T', async () => {
    const app = nuevaApp(new Date('2026-11-30T11:00:00-03:00'));
    const id = await crearT(app);
    const res = await accion(app, id, 'cancelar', PACIENTE, { motivo: 'No puedo asistir' });
    expect(res.status).toBe(409);
    expect(res.body.error.regla).toBe('RN-AG-06');
    expect(res.body.error.conflicto.turnoId).toBe(id);
  });

  it('dado el reloj a 25 h del inicio cuando el paciente cancela entonces responde 200 cancelado', async () => {
    const app = nuevaApp();
    const id = await crearT(app);
    const res = await accion(app, id, 'cancelar', PACIENTE, { motivo: 'No puedo asistir' });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('cancelado');
  });

  it('dado T cuando recepcion cancela con motivo y luego crea otro turno para pac-02 en el mismo horario entonces cancelar responde 200 con motivo y autor y el alta responde 201', async () => {
    const app = nuevaApp();
    const id = await crearT(app);
    const res = await accion(app, id, 'cancelar', RECEPCION, { motivo: 'Paciente avisó por teléfono' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      estado: 'cancelado',
      motivoCancelacion: 'Paciente avisó por teléfono',
      canceladoPor: 'u-recepcion',
    });
    const alta = await request(app).post('/api/turnos').set(RECEPCION).send({ ...cuerpoBase, pacienteId: 'pac-02' });
    expect(alta.status).toBe(201);
  });

  it('dado T cuando u-odonto-1 cancela entonces responde 403 y GET muestra T reservado', async () => {
    const app = nuevaApp();
    const id = await crearT(app);
    const res = await accion(app, id, 'cancelar', ODONTO_1, { motivo: 'Me enfermé' });
    expect(res.status).toBe(403);
    expect(await estadoEnLista(app, id)).toBe('reservado');
  });

  it.each([[{}], [{ motivo: '' }], [{ motivo: '   ' }], [{ motivo: 5 }]])(
    'dado T cuando recepcion cancela con cuerpo %j entonces responde 400 y T sigue reservado',
    async (cuerpo) => {
      const app = nuevaApp();
      const id = await crearT(app);
      const res = await accion(app, id, 'cancelar', RECEPCION, cuerpo);
      expect(res.status).toBe(400);
      expect(await estadoEnLista(app, id)).toBe('reservado');
    },
  );

  it('dado un request sin rol cuando cancela sin motivo entonces responde 403 (rol antes que motivo, D3)', async () => {
    const app = nuevaApp();
    const id = await crearT(app);
    const res = await accion(app, id, 'cancelar', {}, {});
    expect(res.status).toBe(403);
    expect(await estadoEnLista(app, id)).toBe('reservado');
  });

  it('dado T cuando u-odonto-1 cancela sin motivo entonces responde 403 (rol antes que motivo, D3)', async () => {
    const app = nuevaApp();
    const id = await crearT(app);
    const res = await accion(app, id, 'cancelar', ODONTO_1, {});
    expect(res.status).toBe(403);
  });

  it('dado un turno inexistente cuando recepcion cancela con motivo entonces responde 404', async () => {
    const res = await accion(nuevaApp(), 'turno-inexistente', 'cancelar', RECEPCION, { motivo: 'x' });
    expect(res.status).toBe(404);
  });
});
