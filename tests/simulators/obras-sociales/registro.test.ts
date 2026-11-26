import { describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../../src/api/app';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';
import { PadronObraSocialEnMemoria } from '../../../src/simulators/obras-sociales/padronRepository';

const AHORA = new Date('2026-11-30T09:00:00-03:00');
const RECEPCION = { 'X-Usuario': 'u-recepcion', 'X-Rol': 'recepcion' };
const ADMIN = { 'X-Usuario': 'u-admin', 'X-Rol': 'admin' };
const TELEFONO = '+54 9 11 0000-0099';

const nuevaApp = (): Express => createApp(cargarSeed(new RelojFijo(AHORA)));

async function registrarObraSocial(app: Express) {
  return request(app)
    .post('/api/sim/obras-sociales/obras-sociales')
    .set(ADMIN)
    .send({ codigo: 'OS-05', nombre: 'Obra Social Demo', planes: ['Plan Demo', 'Plan Demo Plus'] });
}

async function registrarAfiliado(app: Express) {
  return request(app)
    .post('/api/sim/obras-sociales/afiliados')
    .set(RECEPCION)
    .send({
      nroAfiliado: 'AF-0005',
      obraSocial: 'OS-05',
      plan: 'Plan Demo',
      cobertura: 70,
      copagoPct: 30,
      estado: 'con_copago',
    });
}

describe('padrón simulado compartido', () => {
  it('dado el seed cuando se listan obras sociales entonces están OS-01 a OS-04 con sus nombres', () => {
    const padron = new PadronObraSocialEnMemoria();
    expect(padron.listarObrasSociales().map((o) => o.codigo)).toEqual(['OS-01', 'OS-02', 'OS-03', 'OS-04']);
    expect(padron.buscarObraSocial('OS-01')?.nombre.length).toBeGreaterThan(0);
  });

  it('dado OS-05 cuando se registra y se repite entonces el segundo intento es rechazado', async () => {
    const app = nuevaApp();
    expect((await registrarObraSocial(app)).status).toBe(201);
    const repetida = await registrarObraSocial(app);
    expect(repetida.status).toBe(409);
    expect(repetida.body.error.mensaje).toContain('OS-05');
  });

  it('dado AF-0005 cuando se registra con OS-05 entonces queda consultable y aparece en el listado', async () => {
    const app = nuevaApp();
    await registrarObraSocial(app);
    expect((await registrarAfiliado(app)).status).toBe(201);

    const consulta = await request(app).get('/api/sim/obras-sociales/afiliados/AF-0005').set(RECEPCION);
    expect(consulta.status).toBe(200);
    expect(consulta.body).toMatchObject({ nroAfiliado: 'AF-0005', obraSocial: 'OS-05', cobertura: 70, copagoPct: 30 });

    const padron = await request(app).get('/api/sim/obras-sociales/padron').set(RECEPCION);
    expect(padron.status).toBe(200);
    expect(padron.body.obrasSociales.map((o: { codigo: string }) => o.codigo)).toContain('OS-05');
    expect(padron.body.afiliados.map((a: { nroAfiliado: string }) => a.nroAfiliado)).toContain('AF-0005');
  });

  it('dado un afiliado con plan ajeno a la obra social o copago incoherente cuando se registra entonces responde 400', async () => {
    const app = nuevaApp();
    await registrarObraSocial(app);
    const planAjeno = await request(app).post('/api/sim/obras-sociales/afiliados').set(RECEPCION).send({
      nroAfiliado: 'AF-0006',
      obraSocial: 'OS-05',
      plan: 'Plan Inexistente',
      cobertura: 70,
      copagoPct: 30,
      estado: 'activo',
    });
    expect(planAjeno.status).toBe(400);

    const copago = await request(app).post('/api/sim/obras-sociales/afiliados').set(RECEPCION).send({
      nroAfiliado: 'AF-0006',
      obraSocial: 'OS-05',
      plan: 'Plan Demo',
      cobertura: 70,
      copagoPct: 20,
      estado: 'activo',
    });
    expect(copago.status).toBe(400);
  });

  it('dado recepcion cuando registra una obra social entonces responde 403', async () => {
    const res = await request(nuevaApp())
      .post('/api/sim/obras-sociales/obras-sociales')
      .set(RECEPCION)
      .send({ codigo: 'OS-06', nombre: 'Obra Social Demo Dos', planes: ['Plan'] });
    expect(res.status).toBe(403);
  });

  it('dado AF-0005 registrado desde la API cuando el bot consulta entonces reconoce la obra social nueva', async () => {
    const app = nuevaApp();
    await registrarObraSocial(app);
    await registrarAfiliado(app);

    const enviar = (cuerpo: Record<string, unknown>) =>
      request(app).post('/api/sim/whatsapp/mensaje').send({ telefono: TELEFONO, ...cuerpo });

    await enviar({ texto: 'Hola' });
    await enviar({ opcionId: 'os' });
    await enviar({ texto: 'AF-0005' });
    const res = await enviar({ opcionId: 'confirmar-afiliado' });

    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).toContain('OS-05');
    expect(JSON.stringify(res.body)).toContain('Plan Demo');
    expect(JSON.stringify(res.body)).toContain('70%');
  });
});
