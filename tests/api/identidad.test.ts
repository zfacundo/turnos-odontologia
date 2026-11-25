import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/api/app';
import type { Deps } from '../../src/api/deps';
import { iniciarSesion } from '../../src/application/auth/iniciarSesion';
import { RelojFijo } from '../../src/infrastructure/clock/clock';
import { cargarSeed } from '../../src/infrastructure/seed/cargar-seed';

const LOGIN = new Date('2026-12-01T09:00:00-03:00');

const PACIENTE_NUEVO = {
  nombre: 'Paciente Ficticio Once',
  dni: '99000011',
  telefono: '+54 9 11 0000-0011',
};

function entorno(): { deps: Deps; token: (usuarioId: string) => string } {
  const deps = cargarSeed(new RelojFijo(LOGIN));
  const token = (usuarioId: string): string => {
    const r = iniciarSesion(deps, { usuarioId });
    if (!r.ok) throw new Error('login de prueba falló');
    return r.valor.token;
  };
  return { deps, token };
}

describe('identidad (token + headers simulados)', () => {
  it('dado un token valido de u-odonto-1 cuando se hace POST /api/pacientes con X-Rol admin entonces gana el token y responde 403', async () => {
    const { deps, token } = entorno();
    const res = await request(createApp(deps))
      .post('/api/pacientes')
      .set('Authorization', `Bearer ${token('u-odonto-1')}`)
      .set('X-Rol', 'admin')
      .send(PACIENTE_NUEVO);
    expect(res.status).toBe(403);
    expect(res.body.error.tipo).toBe('permiso');
  });

  it('dado un token valido de u-admin cuando se hace POST /api/pacientes entonces se evalua el rol admin y responde 201', async () => {
    const { deps, token } = entorno();
    const res = await request(createApp(deps))
      .post('/api/pacientes')
      .set('Authorization', `Bearer ${token('u-admin')}`)
      .send(PACIENTE_NUEVO);
    expect(res.status).toBe(201);
  });

  it('dado Bearer no-existe cuando se hace GET /api/pacientes entonces responde 401 con tipo autenticacion', async () => {
    const { deps } = entorno();
    const res = await request(createApp(deps)).get('/api/pacientes').set('Authorization', 'Bearer no-existe');
    expect(res.status).toBe(401);
    expect(res.body.error.tipo).toBe('autenticacion');
  });

  it('dado el esquema Basic cuando se hace GET /api/turnos entonces responde 401 con tipo autenticacion', async () => {
    const { deps } = entorno();
    const res = await request(createApp(deps)).get('/api/turnos').set('Authorization', 'Basic dXNlcjpwYXNz');
    expect(res.status).toBe(401);
    expect(res.body.error.tipo).toBe('autenticacion');
  });

  it('dado un Authorization sin token cuando se hace GET /api/turnos entonces responde 401', async () => {
    const { deps } = entorno();
    for (const valor of ['Bearer', 'Bearer ', 'bearer', '']) {
      const res = await request(createApp(deps)).get('/api/turnos').set('Authorization', valor);
      expect(res.status).toBe(401);
    }
  });

  it('dado un token inexistente cuando se hace GET /api/health entonces responde 401 (no se ejecuta la operacion)', async () => {
    const { deps } = entorno();
    const res = await request(createApp(deps)).get('/api/health').set('Authorization', 'Bearer x');
    expect(res.status).toBe(401);
  });

  it('dado X-Usuario u-recepcion y X-Rol recepcion sin Authorization cuando se hace GET /api/pacientes entonces responde 200', async () => {
    const { deps } = entorno();
    const res = await request(createApp(deps))
      .get('/api/pacientes')
      .set('X-Usuario', 'u-recepcion')
      .set('X-Rol', 'recepcion');
    expect(res.status).toBe(200);
  });

  it('dado un token valido y X-Rol superusuario cuando se hace GET /api/health entonces responde 200', async () => {
    const { deps, token } = entorno();
    const res = await request(createApp(deps))
      .get('/api/health')
      .set('Authorization', `Bearer ${token('u-admin')}`)
      .set('X-Rol', 'superusuario');
    expect(res.status).toBe(200);
  });

  it('dado X-Rol superusuario sin Authorization cuando se hace GET /api/health entonces sigue respondiendo 400', async () => {
    const { deps } = entorno();
    const res = await request(createApp(deps)).get('/api/health').set('X-Rol', 'superusuario');
    expect(res.status).toBe(400);
  });

  it('dado un token emitido a las 09:00 cuando el reloj marca las 17:00 entonces responde 401', async () => {
    const { deps, token } = entorno();
    const t = token('u-admin');
    const vencida: Deps = { ...deps, clock: new RelojFijo(new Date('2026-12-01T17:00:00-03:00')) };
    const res = await request(createApp(vencida)).get('/api/pacientes').set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(401);
    expect(res.body.error.tipo).toBe('autenticacion');
  });

  it('dado un token vigente de u-odonto-1 cuando se hace GET /api/pacientes entonces responde 200', async () => {
    const { deps, token } = entorno();
    const res = await request(createApp(deps))
      .get('/api/pacientes')
      .set('Authorization', `Bearer ${token('u-odonto-1')}`);
    expect(res.status).toBe(200);
  });
});
