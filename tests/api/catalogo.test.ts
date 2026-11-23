import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/api/app';
import { cargarSeed } from '../../src/infrastructure/seed/cargar-seed';
import { crearDepsVacias } from '../../src/infrastructure/seed/deps-vacias';
import { RelojFijo } from '../../src/infrastructure/clock/clock';

const reloj = new RelojFijo(new Date('2026-12-01T10:00:00-03:00'));

describe('GET /api/catalogo', () => {
  it('dado la API con el seed cuando se hace GET /api/catalogo entonces responde 200 con 2 sillones, 2 profesionales y 5 prestaciones', async () => {
    const res = await request(createApp(cargarSeed(reloj))).get('/api/catalogo');
    expect(res.status).toBe(200);
    expect(res.body.sillones).toHaveLength(2);
    expect(res.body.profesionales).toHaveLength(2);
    expect(res.body.prestaciones).toHaveLength(5);
  });

  it('dado la API con el seed cuando se hace GET /api/catalogo entonces las prestaciones traen id, codigo, nombre y duracionMin y orto dura 45', async () => {
    const res = await request(createApp(cargarSeed(reloj))).get('/api/catalogo');
    for (const p of res.body.prestaciones) {
      expect(typeof p.id).toBe('string');
      expect(typeof p.codigo).toBe('string');
      expect(typeof p.nombre).toBe('string');
      expect(typeof p.duracionMin).toBe('number');
    }
    const orto = res.body.prestaciones.find((p: { codigo: string }) => p.codigo === 'orto');
    expect(orto.duracionMin).toBe(45);
  });

  it('dado la API con repositorios vacios cuando se hace GET /api/catalogo entonces responde 200 con las tres listas vacias', async () => {
    const res = await request(createApp(crearDepsVacias(reloj))).get('/api/catalogo');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ sillones: [], prestaciones: [], profesionales: [] });
  });

  it('dado una app con seed y otra vacia cuando se consulta el catalogo de cada una entonces son independientes (2 sillones vs 0)', async () => {
    const conSeed = createApp(cargarSeed(reloj));
    const vacia = createApp(crearDepsVacias(reloj));
    const [a, b] = await Promise.all([
      request(conSeed).get('/api/catalogo'),
      request(vacia).get('/api/catalogo'),
    ]);
    expect(a.body.sillones).toHaveLength(2);
    expect(b.body.sillones).toHaveLength(0);
  });

  it('dado una request sin headers de rol cuando se hace GET /api/catalogo entonces responde 200', async () => {
    const res = await request(createApp(cargarSeed(reloj))).get('/api/catalogo');
    expect(res.status).toBe(200);
  });
});
