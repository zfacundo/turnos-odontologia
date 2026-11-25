import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/api/app';
import { iniciarSesion } from '../../src/application/auth/iniciarSesion';
import { RelojFijo } from '../../src/infrastructure/clock/clock';
import { AuditoriaEnMemoria } from '../../src/infrastructure/memory/auditoria-en-memoria';
import { cargarSeed } from '../../src/infrastructure/seed/cargar-seed';

const AHORA = new Date('2026-12-01T08:00:00-03:00');

const entorno = () => {
  const deps = cargarSeed(new RelojFijo(AHORA));
  const auth = (usuarioId: string): string => {
    const r = iniciarSesion(deps, { usuarioId });
    if (!r.ok) throw new Error('login de prueba falló');
    return `Bearer ${r.valor.token}`;
  };
  return { deps, app: createApp(deps), auth };
};

const turno = (app: ReturnType<typeof createApp>, authz: string, cuerpo: object) =>
  request(app).post('/api/turnos').set('Authorization', authz).send(cuerpo);

describe('GET /api/panel/resumen', () => {
  it('dado un token de admin cuando pide el resumen con fecha entonces responde 200 con la forma completa y simulado true', async () => {
    const { app, auth } = entorno();
    const res = await request(app).get('/api/panel/resumen?fecha=2026-12-01').set('Authorization', auth('u-admin'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      fecha: '2026-12-01',
      turnosDelDia: 0,
      porEstado: { reservado: 0, confirmado: 0, atendido: 0, ausente: 0 },
      senados: 0,
      proximos: [],
      simulado: true,
    });
    expect(res.body.huecosLibres).toBeGreaterThan(0);
  });

  it('dado un token de recepcion cuando pide el resumen sin fecha entonces responde 200 con la fecha local del reloj', async () => {
    const { app, auth } = entorno();
    const res = await request(app).get('/api/panel/resumen').set('Authorization', auth('u-recepcion'));
    expect(res.status).toBe(200);
    expect(res.body.fecha).toBe('2026-12-01');
  });

  it('dado un token de odontologo cuando pide el resumen entonces responde 200 limitado a su profesional', async () => {
    const { app, auth } = entorno();
    const base = {
      pacienteId: 'pac-01',
      prestacionId: 'prest-control',
      inicio: '2026-12-01T10:00:00-03:00',
    };
    const t1 = await turno(app, auth('u-recepcion'), { ...base, profesionalId: 'prof-1', sillonId: 'sillon-1' });
    const t2 = await turno(app, auth('u-recepcion'), { ...base, pacienteId: 'pac-02', profesionalId: 'prof-2', sillonId: 'sillon-2' });
    expect([t1.status, t2.status]).toEqual([201, 201]);
    const res = await request(app).get('/api/panel/resumen').set('Authorization', auth('u-odonto-1'));
    expect(res.status).toBe(200);
    expect(res.body.turnosDelDia).toBe(1);
    expect(res.body.proximos[0]).toMatchObject({
      profesionalNombre: 'Dra. Ficticia Perez',
      pacienteNombre: 'Paciente Ficticio Uno',
      prestacionNombre: 'Control y limpieza',
      sillonNombre: 'Sillon 1',
    });
    const admin = await request(app).get('/api/panel/resumen').set('Authorization', auth('u-admin'));
    expect(admin.body.turnosDelDia).toBe(2);
  });

  it('dado headers simulados de odontologo sin token cuando pide el resumen entonces se resuelve su profesionalId del seed', async () => {
    const { app, auth } = entorno();
    await turno(app, auth('u-recepcion'), {
      pacienteId: 'pac-01',
      prestacionId: 'prest-control',
      profesionalId: 'prof-2',
      sillonId: 'sillon-2',
      inicio: '2026-12-01T10:00:00-03:00',
    });
    const res = await request(app)
      .get('/api/panel/resumen')
      .set('X-Usuario', 'u-odonto-1')
      .set('X-Rol', 'odontologo');
    expect(res.status).toBe(200);
    expect(res.body.turnosDelDia).toBe(0);
  });

  it('dado el rol paciente por header cuando pide el resumen entonces responde 403 permiso', async () => {
    const { app } = entorno();
    const res = await request(app).get('/api/panel/resumen').set('X-Rol', 'paciente');
    expect(res.status).toBe(403);
    expect(res.body.error.tipo).toBe('permiso');
  });

  it('dado ningun usuario cuando pide el resumen entonces responde 403 permiso', async () => {
    const { app } = entorno();
    const res = await request(app).get('/api/panel/resumen');
    expect(res.status).toBe(403);
    expect(res.body.error.tipo).toBe('permiso');
  });

  it('dado fecha 01-12-2026 cuando admin pide el resumen entonces responde 400 entrada', async () => {
    const { app, auth } = entorno();
    const res = await request(app).get('/api/panel/resumen?fecha=01-12-2026').set('Authorization', auth('u-admin'));
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it('dado fecha repetida en la query cuando admin pide el resumen entonces responde 400 entrada', async () => {
    const { app, auth } = entorno();
    const res = await request(app)
      .get('/api/panel/resumen?fecha=2026-12-01&fecha=2026-12-02')
      .set('Authorization', auth('u-admin'));
    expect(res.status).toBe(400);
  });

  it('dado un resumen exitoso cuando se revisa la auditoria entonces no suma eventos nuevos', async () => {
    const { deps, app, auth } = entorno();
    const authz = auth('u-admin');
    const antes = (deps.auditoria as AuditoriaEnMemoria).eventos().length;
    await request(app).get('/api/panel/resumen').set('Authorization', authz);
    await request(app).get('/api/panel/resumen?fecha=basura').set('Authorization', authz);
    expect((deps.auditoria as AuditoriaEnMemoria).eventos().length).toBe(antes);
  });
});
