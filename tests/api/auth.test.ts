import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/api/app';
import type { Deps } from '../../src/api/deps';
import type { GeneradorToken } from '../../src/application/auth/puertos';
import { RelojFijo } from '../../src/infrastructure/clock/clock';
import { AuditoriaEnMemoria } from '../../src/infrastructure/memory/auditoria-en-memoria';
import { cargarSeed } from '../../src/infrastructure/seed/cargar-seed';

const LOGIN = new Date('2026-12-01T09:00:00-03:00');

class GeneradorSecuencial implements GeneradorToken {
  private n = 0;
  generar(): string {
    this.n += 1;
    return `tok-${this.n}`;
  }
}

const nuevoDeps = (ahora: Date = LOGIN): Deps => ({
  ...cargarSeed(new RelojFijo(ahora)),
  generadorToken: new GeneradorSecuencial(),
});

const login = (deps: Deps, usuarioId: string) =>
  request(createApp(deps)).post('/api/auth/login').send({ usuarioId });

describe('GET /api/auth/usuarios', () => {
  it('dado el seed cuando se hace GET sin headers entonces responde 200 con 4 usuarios y simulado true', async () => {
    const res = await request(createApp(nuevoDeps())).get('/api/auth/usuarios');
    expect(res.status).toBe(200);
    expect(res.body.simulado).toBe(true);
    expect(res.body.usuarios).toHaveLength(4);
    for (const u of res.body.usuarios as Record<string, unknown>[]) {
      expect(typeof u.id).toBe('string');
      expect(typeof u.nombre).toBe('string');
      expect(['admin', 'recepcion', 'odontologo']).toContain(u.rol);
    }
  });

  it('dado una sesion activa cuando se hace GET /api/auth/usuarios entonces ningun elemento tiene campo token', async () => {
    const deps = nuevoDeps();
    await login(deps, 'u-admin');
    const res = await request(createApp(deps)).get('/api/auth/usuarios');
    for (const u of res.body.usuarios as Record<string, unknown>[]) expect('token' in u).toBe(false);
    expect(JSON.stringify(res.body)).not.toContain('tok-1');
  });

  it('dado un usuario paciente en el seed cuando se lista entonces no aparece', async () => {
    const deps: Deps = {
      ...nuevoDeps(),
      usuarios: [...nuevoDeps().usuarios, { id: 'u-pac', nombre: 'Paciente Ficticio', rol: 'paciente' }],
    };
    const res = await request(createApp(deps)).get('/api/auth/usuarios');
    expect(res.body.usuarios).toHaveLength(4);
  });
});

describe('POST /api/auth/login', () => {
  it('dado u-recepcion cuando hace login entonces responde 201 con token, rol recepcion y simulado true', async () => {
    const res = await login(nuevoDeps(), 'u-recepcion');
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.usuario.rol).toBe('recepcion');
    expect(res.body.simulado).toBe(true);
    expect(res.body.expiraEn).toBe(new Date('2026-12-01T17:00:00-03:00').toISOString());
  });

  it('dado u-odonto-1 cuando hace login entonces usuario.profesionalId es prof-1', async () => {
    const res = await login(nuevoDeps(), 'u-odonto-1');
    expect(res.status).toBe(201);
    expect(res.body.usuario.profesionalId).toBe('prof-1');
  });

  it('dado u-fantasma cuando hace login entonces responde 401 autenticacion y no hay sesion', async () => {
    const deps = nuevoDeps();
    const res = await login(deps, 'u-fantasma');
    expect(res.status).toBe(401);
    expect(res.body.error.tipo).toBe('autenticacion');
    expect(deps.sesiones.buscar('tok-1')).toBeUndefined();
  });

  it('dado usuarioId numerico cuando hace login entonces responde 400 entrada', async () => {
    const res = await request(createApp(nuevoDeps())).post('/api/auth/login').send({ usuarioId: 42 });
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it('dado u-admin cuando hace login dos veces entonces los tokens son distintos y ambos sirven', async () => {
    const deps = nuevoDeps();
    const a = await login(deps, 'u-admin');
    const b = await login(deps, 'u-admin');
    expect(a.body.token).not.toBe(b.body.token);
    for (const t of [a.body.token, b.body.token]) {
      const r = await request(createApp(deps)).get('/api/auth/sesion').set('Authorization', `Bearer ${t}`);
      expect(r.status).toBe(200);
    }
  });

  it('dado un login de u-admin cuando se revisa la auditoria entonces hay un evento login sin el token', async () => {
    const deps = nuevoDeps();
    const res = await login(deps, 'u-admin');
    const eventos = (deps.auditoria as AuditoriaEnMemoria).eventos();
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({ accion: 'login', entidadId: 'u-admin' });
    expect(JSON.stringify(eventos)).not.toContain(res.body.token as string);
  });
});

describe('GET /api/auth/sesion', () => {
  it('dado un token valido de u-recepcion cuando consulta la sesion entonces responde 200 sin token en el cuerpo', async () => {
    const deps = nuevoDeps();
    const l = await login(deps, 'u-recepcion');
    const res = await request(createApp(deps))
      .get('/api/auth/sesion')
      .set('Authorization', `Bearer ${l.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.usuario.id).toBe('u-recepcion');
    expect(res.body.simulado).toBe(true);
    expect('token' in res.body).toBe(false);
    expect(JSON.stringify(res.body)).not.toContain(l.body.token as string);
  });

  it('dado ningun Authorization cuando consulta la sesion entonces responde 401 autenticacion', async () => {
    const res = await request(createApp(nuevoDeps())).get('/api/auth/sesion');
    expect(res.status).toBe(401);
    expect(res.body.error.tipo).toBe('autenticacion');
  });

  it('dado solo headers X-Rol validos y sin token cuando consulta la sesion entonces responde 401', async () => {
    const res = await request(createApp(nuevoDeps()))
      .get('/api/auth/sesion')
      .set('X-Usuario', 'u-admin')
      .set('X-Rol', 'admin');
    expect(res.status).toBe(401);
  });

  it('dado un login a las 09:00 cuando el reloj marca 16:59 entonces responde 200', async () => {
    const deps = nuevoDeps();
    const l = await login(deps, 'u-admin');
    const tarde: Deps = { ...deps, clock: new RelojFijo(new Date('2026-12-01T16:59:00-03:00')) };
    const res = await request(createApp(tarde))
      .get('/api/auth/sesion')
      .set('Authorization', `Bearer ${l.body.token}`);
    expect(res.status).toBe(200);
  });

  it('dado un login a las 09:00 cuando el reloj marca 17:00 entonces responde 401 autenticacion', async () => {
    const deps = nuevoDeps();
    const l = await login(deps, 'u-admin');
    const tarde: Deps = { ...deps, clock: new RelojFijo(new Date('2026-12-01T17:00:00-03:00')) };
    const res = await request(createApp(tarde))
      .get('/api/auth/sesion')
      .set('Authorization', `Bearer ${l.body.token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.tipo).toBe('autenticacion');
  });
});

describe('POST /api/auth/logout', () => {
  it('dado un token valido cuando hace logout entonces responde 204 y el token ya no sirve (401)', async () => {
    const deps = nuevoDeps();
    const l = await login(deps, 'u-admin');
    const auth = `Bearer ${l.body.token}`;
    const out = await request(createApp(deps)).post('/api/auth/logout').set('Authorization', auth);
    expect(out.status).toBe(204);
    const r = await request(createApp(deps)).get('/api/auth/sesion').set('Authorization', auth);
    expect(r.status).toBe(401);
  });

  it('dado un token ya cerrado cuando hace logout otra vez entonces responde 401', async () => {
    const deps = nuevoDeps();
    const l = await login(deps, 'u-admin');
    const auth = `Bearer ${l.body.token}`;
    await request(createApp(deps)).post('/api/auth/logout').set('Authorization', auth);
    const otra = await request(createApp(deps)).post('/api/auth/logout').set('Authorization', auth);
    expect(otra.status).toBe(401);
  });

  it('dado token-inexistente cuando hace logout entonces responde 401', async () => {
    const res = await request(createApp(nuevoDeps()))
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer token-inexistente');
    expect(res.status).toBe(401);
  });

  it('dado un logout sin Authorization cuando se envia entonces responde 401', async () => {
    const res = await request(createApp(nuevoDeps())).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });

  it('dado un login y logout de u-admin cuando se revisa la auditoria entonces hay login y logout', async () => {
    const deps = nuevoDeps();
    const l = await login(deps, 'u-admin');
    await request(createApp(deps)).post('/api/auth/logout').set('Authorization', `Bearer ${l.body.token}`);
    const acciones = (deps.auditoria as AuditoriaEnMemoria).eventos().map((e) => e.accion);
    expect(acciones).toEqual(['login', 'logout']);
  });
});
