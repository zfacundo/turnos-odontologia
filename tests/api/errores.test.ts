import { describe, it, expect, vi, afterEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import {
  ErrorDeAutenticacion,
  ErrorDeEntrada,
  ErrorDePermiso,
  FalloDeRegla,
  lanzarSiFallo,
  manejadorDeErrores,
} from '../../src/api/middleware/errores';
import { fallo, ok } from '../../src/domain/shared/result';

function appCon(ruta: express.RequestHandler): Express {
  const app = express();
  app.use(express.json());
  app.post('/x', ruta);
  app.get('/x', ruta);
  app.use(manejadorDeErrores);
  return app;
}

afterEach(() => vi.restoreAllMocks());

describe('manejadorDeErrores', () => {
  it('dado un fallo de regla RN-AG-02 con dimension profesional y conflicto t-1 cuando se procesa entonces responde 409 con esos campos', async () => {
    const app = appCon(() => {
      throw new FalloDeRegla({
        regla: 'RN-AG-02',
        mensaje: 'Solapamiento',
        dimension: 'profesional',
        conflicto: { turnoId: 't-1' },
      });
    });
    const res = await request(app).get('/x');
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      tipo: 'regla',
      regla: 'RN-AG-02',
      dimension: 'profesional',
      conflicto: { turnoId: 't-1' },
    });
  });

  it('dado un fallo de regla sin dimension ni conflicto cuando se procesa entonces responde 409 sin esos campos', async () => {
    const app = appCon((_req, _res, next) => {
      try {
        lanzarSiFallo(fallo({ regla: 'RN-CF-01', mensaje: 'Duracion invalida' }));
      } catch (e) {
        next(e);
      }
    });
    const res = await request(app).get('/x');
    expect(res.status).toBe(409);
    expect(res.body.error.regla).toBe('RN-CF-01');
    expect('dimension' in res.body.error).toBe(false);
    expect('conflicto' in res.body.error).toBe(false);
  });

  it('dado un resultado exitoso cuando se usa lanzarSiFallo entonces devuelve el valor sin lanzar', () => {
    expect(lanzarSiFallo(ok(42))).toBe(42);
  });

  it('dado un error de entrada cuando se procesa entonces responde 400 con tipo entrada y mensaje', async () => {
    const app = appCon(() => {
      throw new ErrorDeEntrada('Falta el campo pacienteId');
    });
    const res = await request(app).get('/x');
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
    expect(res.body.error.mensaje).toBe('Falta el campo pacienteId');
  });

  it('dado un JSON malformado cuando se procesa entonces responde 400 con tipo entrada', async () => {
    const app = appCon((_req, res) => {
      res.json({ ok: true });
    });
    const res = await request(app).post('/x').set('Content-Type', 'application/json').send('{malo');
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it('dado un error de autenticacion cuando se procesa entonces responde 401 con tipo autenticacion y mensaje generico', async () => {
    const app = appCon(() => {
      throw new ErrorDeAutenticacion('Sesión inválida o vencida.');
    });
    const res = await request(app).get('/x');
    expect(res.status).toBe(401);
    expect(res.body.error.tipo).toBe('autenticacion');
    expect(res.body.error.mensaje).toBe('Sesión inválida o vencida.');
  });

  it('dado un error de permiso cuando se procesa entonces responde 403 con tipo permiso', async () => {
    const app = appCon(() => {
      throw new ErrorDePermiso('Rol sin permiso');
    });
    const res = await request(app).get('/x');
    expect(res.status).toBe(403);
    expect(res.body.error.tipo).toBe('permiso');
  });

  it('dado un error inesperado "boom" cuando se procesa entonces responde 500 sin mensaje ni stack', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const app = appCon(() => {
      throw new Error('boom');
    });
    const res = await request(app).get('/x');
    expect(res.status).toBe(500);
    expect(res.body.error.tipo).toBe('interno');
    const cuerpo = JSON.stringify(res.body);
    expect(cuerpo).not.toContain('boom');
    expect(cuerpo).not.toMatch(/at .*\(/);
  });
});
