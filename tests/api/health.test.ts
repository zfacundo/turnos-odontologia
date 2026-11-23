import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/api/app';
import { crearDepsVacias } from '../../src/infrastructure/seed/deps-vacias';
import { RelojFijo } from '../../src/infrastructure/clock/clock';

const app = () => createApp(crearDepsVacias(new RelojFijo(new Date('2026-12-01T10:00:00-03:00'))));

describe('GET /api/health', () => {
  it('dado la API con repos en memoria cuando se hace GET /api/health entonces responde 200 {status:"ok"}', async () => {
    const res = await request(app()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('dado la API cuando se hace GET /api/no-existe entonces responde 404 con un JSON de error', async () => {
    const res = await request(app()).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.error.tipo).toBeTruthy();
    expect(res.body.error.mensaje).toBeTruthy();
  });
});

describe('Rol simulado por headers', () => {
  it('dado X-Usuario u-recepcion y X-Rol recepcion cuando se hace GET /api/health entonces responde 200', async () => {
    const res = await request(app()).get('/api/health').set('X-Usuario', 'u-recepcion').set('X-Rol', 'recepcion');
    expect(res.status).toBe(200);
  });

  it('dado cada rol valido cuando se hace GET /api/health entonces responde 200', async () => {
    for (const rol of ['admin', 'recepcion', 'odontologo', 'paciente']) {
      const res = await request(app()).get('/api/health').set('X-Rol', rol);
      expect(res.status).toBe(200);
    }
  });

  it('dado X-Rol superusuario cuando se hace GET /api/health entonces responde 400 con error de entrada que menciona X-Rol', async () => {
    const res = await request(app()).get('/api/health').set('X-Rol', 'superusuario');
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
    expect(res.body.error.mensaje).toMatch(/X-Rol/);
  });

  it('dado una request sin headers de rol cuando se hace GET /api/health entonces responde 200', async () => {
    const res = await request(app()).get('/api/health');
    expect(res.status).toBe(200);
  });
});
