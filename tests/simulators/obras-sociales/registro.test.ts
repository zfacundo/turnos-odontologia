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

const NUEVOS = [
  { nro: 'AF-0005', obra: 'OS-01', plan: 'Plan 210', cobertura: 80, copago: 20, estado: 'activo' },
  { nro: 'AF-0006', obra: 'OS-01', plan: 'Plan 310', cobertura: 90, copago: 10, estado: 'activo' },
  { nro: 'AF-0007', obra: 'OS-01', plan: 'Plan 410', cobertura: 100, copago: 0, estado: 'activo' },
  { nro: 'AF-0008', obra: 'OS-02', plan: 'SMG20', cobertura: 75, copago: 25, estado: 'con_copago' },
  { nro: 'AF-0009', obra: 'OS-02', plan: 'SMG30', cobertura: 85, copago: 15, estado: 'activo' },
  { nro: 'AF-0010', obra: 'OS-02', plan: 'SMG50', cobertura: 100, copago: 0, estado: 'activo' },
  { nro: 'AF-0011', obra: 'OS-03', plan: 'Oro 220', cobertura: 70, copago: 30, estado: 'con_copago' },
  { nro: 'AF-0012', obra: 'OS-03', plan: 'Plata 200', cobertura: 60, copago: 40, estado: 'con_copago' },
  { nro: 'AF-0013', obra: 'OS-03', plan: 'Azul 100', cobertura: 0, copago: 100, estado: 'sin_cobertura' },
  { nro: 'AF-0014', obra: 'OS-04', plan: 'Bronce', cobertura: 50, copago: 50, estado: 'con_copago' },
  { nro: 'AF-0015', obra: 'OS-04', plan: 'Plata', cobertura: 75, copago: 25, estado: 'activo' },
  { nro: 'AF-0016', obra: 'OS-04', plan: 'Oro', cobertura: 90, copago: 10, estado: 'activo' },
  { nro: 'AF-0017', obra: 'OS-05', plan: 'Plan General', cobertura: 70, copago: 30, estado: 'con_copago' },
  { nro: 'AF-0018', obra: 'OS-05', plan: 'Plan Integral', cobertura: 85, copago: 15, estado: 'activo' },
  { nro: 'AF-0019', obra: 'OS-05', plan: 'Plan Básico', cobertura: 0, copago: 100, estado: 'sin_cobertura' },
  { nro: 'AF-0020', obra: 'OS-06', plan: 'Gen 1000', cobertura: 65, copago: 35, estado: 'con_copago' },
  { nro: 'AF-0021', obra: 'OS-06', plan: 'Gen 2000', cobertura: 80, copago: 20, estado: 'activo' },
  { nro: 'AF-0022', obra: 'OS-06', plan: 'Gen 3000', cobertura: 95, copago: 5, estado: 'activo' },
  { nro: 'AF-0023', obra: 'OS-07', plan: 'Global', cobertura: 80, copago: 20, estado: 'activo' },
  { nro: 'AF-0024', obra: 'OS-07', plan: 'Clásico', cobertura: 60, copago: 40, estado: 'con_copago' },
] as const;

describe('padrón simulado precargado y compartido', () => {
  it('dado el seed cuando se listan las obras sociales entonces están OS-01 a OS-07 con sus nombres', () => {
    const padron = new PadronObraSocialEnMemoria();
    expect(padron.listarObrasSociales().map((o) => o.codigo)).toEqual([
      'OS-01', 'OS-02', 'OS-03', 'OS-04', 'OS-05', 'OS-06', 'OS-07',
    ]);
    expect(padron.listarObrasSociales().map((o) => o.nombre)).toEqual([
      'OSDE', 'Swiss Medical', 'Galeno', 'Medifé', 'OSEP', 'Sancor Salud', 'Omint',
    ]);
  });

  it('dado el seed cuando se listan los afiliados entonces están AF-0001 a AF-0024', () => {
    const padron = new PadronObraSocialEnMemoria();
    const numeros = padron.listar().map((a) => a.nroAfiliado);
    expect(numeros).toHaveLength(24);
    expect(numeros[0]).toBe('AF-0001');
    expect(numeros[23]).toBe('AF-0024');
    expect(numeros).toEqual(Array.from({ length: 24 }, (_, i) => `AF-${String(i + 1).padStart(4, '0')}`));
  });

  it('dado AF-0001 a AF-0004 cuando se consultan entonces se mantienen intactos', () => {
    const padron = new PadronObraSocialEnMemoria();
    expect(padron.buscarPorNumero('AF-0001')).toMatchObject({ obraSocial: 'OS-01', plan: 'Plan Base', cobertura: 80, copagoPct: 20, estado: 'activo' });
    expect(padron.buscarPorNumero('AF-0002')).toMatchObject({ obraSocial: 'OS-02', plan: 'Plan Copago', cobertura: 60, copagoPct: 40, estado: 'con_copago' });
    expect(padron.buscarPorNumero('AF-0003')).toMatchObject({ obraSocial: 'OS-03', plan: 'Plan Sin Cobertura', cobertura: 0, copagoPct: 100, estado: 'sin_cobertura' });
    expect(padron.buscarPorNumero('AF-0004')).toMatchObject({ obraSocial: 'OS-04', plan: 'Plan Error Simulado', cobertura: 0, copagoPct: 100, estado: 'error_simulado' });
  });

  it.each(NUEVOS)('dado $nro cuando se consulta entonces responde con $obra / $plan', async (afiliado) => {
    const res = await request(nuevaApp())
      .get(`/api/sim/obras-sociales/afiliados/${afiliado.nro}`)
      .set(RECEPCION);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      nroAfiliado: afiliado.nro,
      obraSocial: afiliado.obra,
      plan: afiliado.plan,
      cobertura: afiliado.cobertura,
      copagoPct: afiliado.copago,
      estado: afiliado.estado,
      simulado: true,
    });
  });

  it('dado la ruta del padrón cuando se consulta entonces expone las 7 obras sociales y los 24 afiliados', async () => {
    const res = await request(nuevaApp()).get('/api/sim/obras-sociales/padron').set(RECEPCION);
    expect(res.status).toBe(200);
    expect(res.body.obrasSociales).toHaveLength(7);
    expect(res.body.afiliados).toHaveLength(24);
    expect(res.body.afiliados.map((a: { nroAfiliado: string }) => a.nroAfiliado)).toContain('AF-0024');
  });

  it('dado AF-0004 cuando se consulta entonces sigue respondiendo RN-SM-02', async () => {
    const res = await request(nuevaApp()).get('/api/sim/obras-sociales/afiliados/AF-0004').set(RECEPCION);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ tipo: 'regla', regla: 'RN-SM-02' });
    expect(res.body.error.mensaje).toContain('SIMULACIÓN');
  });

  it('dado el bot cuando consulta AF-0024 entonces reconoce la obra social precargada OS-07', async () => {
    const app = nuevaApp();
    const enviar = (cuerpo: Record<string, unknown>) =>
      request(app).post('/api/sim/whatsapp/mensaje').send({ telefono: TELEFONO, ...cuerpo });
    await enviar({ texto: 'Hola' });
    await enviar({ opcionId: 'os' });
    await enviar({ texto: 'AF-0024' });
    const res = await enviar({ opcionId: 'confirmar-afiliado' });
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).toContain('OS-07');
    expect(JSON.stringify(res.body)).toContain('Clásico');
    expect(JSON.stringify(res.body)).toContain('60%');
  });

  it('dado un administrador cuando intenta registrar por API entonces ya no existen endpoints de alta', async () => {
    const app = nuevaApp();
    const obra = await request(app)
      .post('/api/sim/obras-sociales/obras-sociales')
      .set(ADMIN)
      .send({ codigo: 'OS-08', nombre: 'No permitida', planes: ['Plan'] });
    const afiliado = await request(app)
      .post('/api/sim/obras-sociales/afiliados')
      .set(ADMIN)
      .send({ nroAfiliado: 'AF-0025', obraSocial: 'OS-01', plan: 'Plan 210', cobertura: 80, copagoPct: 20, estado: 'activo' });
    expect(obra.status).toBe(404);
    expect(afiliado.status).toBe(404);
  });
});
