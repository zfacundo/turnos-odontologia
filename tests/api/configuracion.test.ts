import { describe, it, expect } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/api/app';
import { crearBloqueo } from '../../src/application/configuracion/crearBloqueo';
import { RelojFijo } from '../../src/infrastructure/clock/clock';
import { cargarSeed } from '../../src/infrastructure/seed/cargar-seed';

const AHORA = new Date('2026-11-30T09:00:00-03:00');
const ADMIN = { 'X-Usuario': 'u-admin', 'X-Rol': 'admin' };
const RECEPCION = { 'X-Usuario': 'u-recepcion', 'X-Rol': 'recepcion' };
const ODONTO = { 'X-Usuario': 'u-odonto-1', 'X-Rol': 'odontologo' };
const nuevaApp = (): Express => createApp(cargarSeed(new RelojFijo(AHORA)));

describe('POST /api/sillones', () => {
  it('dado un admin cuando crea un sillón con nombre válido entonces responde 201 con activo true', async () => {
    const res = await request(nuevaApp()).post('/api/sillones').set(ADMIN).send({ nombre: 'Sillón 3' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ nombre: 'Sillón 3', activo: true });
    expect(typeof res.body.id).toBe('string');
  });

  it('dado recepción cuando intenta crear un sillón entonces responde 403', async () => {
    const res = await request(nuevaApp()).post('/api/sillones').set(RECEPCION).send({ nombre: 'Sillón 3' });
    expect(res.status).toBe(403);
    expect(res.body.error.tipo).toBe('permiso');
  });

  it('dado un admin cuando envía un cuerpo vacío entonces responde 400', async () => {
    const res = await request(nuevaApp()).post('/api/sillones').set(ADMIN).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it('dado un admin cuando envía un nombre solo espacios entonces responde 400 entrada', async () => {
    const res = await request(nuevaApp()).post('/api/sillones').set(ADMIN).send({ nombre: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });
});

describe('DELETE /api/sillones/:id', () => {
  it('dado un admin cuando desactiva sillon-1 entonces responde 200 con activo false', async () => {
    const res = await request(nuevaApp()).delete('/api/sillones/sillon-1').set(ADMIN);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'sillon-1', activo: false });
  });

  it('dado un sillón ya desactivado cuando se desactiva de nuevo entonces responde 200 idempotente', async () => {
    const app = nuevaApp();
    await request(app).delete('/api/sillones/sillon-1').set(ADMIN);
    const res = await request(app).delete('/api/sillones/sillon-1').set(ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.activo).toBe(false);
  });

  it('dado un id inexistente cuando se desactiva entonces responde 404', async () => {
    const res = await request(nuevaApp()).delete('/api/sillones/sillon-inexistente').set(ADMIN);
    expect(res.status).toBe(404);
    expect(res.body.error.tipo).toBe('no-encontrado');
  });
});

describe('POST y PUT /api/prestaciones', () => {
  const valida = { codigo: 'LIM-01', nombre: 'Limpieza', duracionMin: 45 };

  it('dado un admin cuando crea una prestación de 45 minutos entonces responde 201', async () => {
    const res = await request(nuevaApp()).post('/api/prestaciones').set(ADMIN).send(valida);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject(valida);
  });

  it('dado un admin cuando crea una prestación de 20 minutos entonces responde 409 RN-CF-01', async () => {
    const res = await request(nuevaApp())
      .post('/api/prestaciones')
      .set(ADMIN)
      .send({ ...valida, duracionMin: 20 });
    expect(res.status).toBe(409);
    expect(res.body.error.regla).toBe('RN-CF-01');
  });

  it('dado un admin cuando actualiza una prestación entonces responde 200 con el cambio', async () => {
    const res = await request(nuevaApp())
      .put('/api/prestaciones/prest-control')
      .set(ADMIN)
      .send({ ...valida, duracionMin: 60 });
    expect(res.status).toBe(200);
    expect(res.body.duracionMin).toBe(60);
  });

  it('dado un admin cuando actualiza con duración inválida entonces responde 409 sin cambios', async () => {
    const app = nuevaApp();
    const res = await request(app)
      .put('/api/prestaciones/prest-control')
      .set(ADMIN)
      .send({ ...valida, duracionMin: 20 });
    expect(res.status).toBe(409);
    expect(res.body.error.regla).toBe('RN-CF-01');
    const catalogo = await request(app).get('/api/catalogo');
    const original = catalogo.body.prestaciones.find((p: { id: string }) => p.id === 'prest-control');
    expect(original.duracionMin).not.toBe(20);
  });

  it('dado un admin cuando envía codigo solo espacios entonces responde 400 entrada', async () => {
    const res = await request(nuevaApp())
      .post('/api/prestaciones')
      .set(ADMIN)
      .send({ ...valida, codigo: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it('dado un admin cuando envía nombre solo espacios entonces responde 400 entrada', async () => {
    const res = await request(nuevaApp())
      .post('/api/prestaciones')
      .set(ADMIN)
      .send({ ...valida, nombre: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it('dado un id inexistente cuando se actualiza entonces responde 404', async () => {
    const res = await request(nuevaApp())
      .put('/api/prestaciones/prest-inexistente')
      .set(ADMIN)
      .send(valida);
    expect(res.status).toBe(404);
  });

  it('dado recepción cuando intenta crear o actualizar entonces responde 403', async () => {
    const app = nuevaApp();
    const crear = await request(app).post('/api/prestaciones').set(RECEPCION).send(valida);
    const editar = await request(app)
      .put('/api/prestaciones/prest-control')
      .set(RECEPCION)
      .send(valida);
    expect(crear.status).toBe(403);
    expect(editar.status).toBe(403);
  });
});

describe('PUT /api/profesionales/:id/disponibilidad', () => {
  const ruta = '/api/profesionales/prof-1/disponibilidad';
  const semana = [1, 2, 3, 4, 5].map((diaSemana) => ({ diaSemana, desde: '09:00', hasta: '17:00' }));

  it('dado un admin cuando define la semana completa entonces responde 200 con las franjas', async () => {
    const res = await request(nuevaApp()).put(ruta).set(ADMIN).send(semana);
    expect(res.status).toBe(200);
    expect(res.body.disponibilidad).toEqual(semana);
  });

  it('dado el mismo cuerpo cuando se reenvía entonces responde 200 e idempotente', async () => {
    const app = nuevaApp();
    await request(app).put(ruta).set(ADMIN).send(semana);
    const res = await request(app).put(ruta).set(ADMIN).send(semana);
    expect(res.status).toBe(200);
    expect(res.body.disponibilidad).toEqual(semana);
  });

  it('dado un arreglo vacío cuando se define entonces responde 200 sin franjas', async () => {
    const res = await request(nuevaApp()).put(ruta).set(ADMIN).send([]);
    expect(res.status).toBe(200);
    expect(res.body.disponibilidad).toEqual([]);
  });

  it('dado franjas solapadas cuando se definen entonces responde 409 RN-CF-02', async () => {
    const res = await request(nuevaApp())
      .put(ruta)
      .set(ADMIN)
      .send([{ diaSemana: 1, desde: '09:00', hasta: '13:00' }, { diaSemana: 1, desde: '12:00', hasta: '15:00' }]);
    expect(res.status).toBe(409);
    expect(res.body.error.regla).toBe('RN-CF-02');
  });

  it('dado una franja desalineada 09:10 cuando se define entonces responde 409 RN-CF-02', async () => {
    const res = await request(nuevaApp())
      .put(ruta)
      .set(ADMIN)
      .send([{ diaSemana: 1, desde: '09:10', hasta: '13:00' }]);
    expect(res.status).toBe(409);
    expect(res.body.error.regla).toBe('RN-CF-02');
  });

  it('dado diaSemana 8 cuando se define entonces responde 400 entrada', async () => {
    const res = await request(nuevaApp())
      .put(ruta)
      .set(ADMIN)
      .send([{ diaSemana: 8, desde: '09:00', hasta: '13:00' }]);
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it('dado horas 25:00 y 9:00 cuando se definen entonces responde 400 entrada', async () => {
    const app = nuevaApp();
    const mal1 = await request(app)
      .put(ruta)
      .set(ADMIN)
      .send([{ diaSemana: 1, desde: '25:00', hasta: '26:00' }]);
    const mal2 = await request(app)
      .put(ruta)
      .set(ADMIN)
      .send([{ diaSemana: 1, desde: '9:00', hasta: '13:00' }]);
    expect(mal1.status).toBe(400);
    expect(mal2.status).toBe(400);
    expect(mal1.body.error.tipo).toBe('entrada');
    expect(mal2.body.error.tipo).toBe('entrada');
  });

  it('dado un profesional inexistente cuando se define entonces responde 404', async () => {
    const res = await request(nuevaApp())
      .put('/api/profesionales/prof-inexistente/disponibilidad')
      .set(ADMIN)
      .send([]);
    expect(res.status).toBe(404);
  });

  it('dado recepción cuando intenta definir entonces responde 403', async () => {
    const res = await request(nuevaApp()).put(ruta).set(RECEPCION).send(semana);
    expect(res.status).toBe(403);
  });

  it('dado un cuerpo que no es arreglo cuando se define entonces responde 400', async () => {
    const res = await request(nuevaApp()).put(ruta).set(ADMIN).send({ disponibilidad: semana });
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });
});

describe('GET /api/bloqueos', () => {
  it('dado el seed cuando recepción consulta sin filtros entonces responde 200 con los bloqueos', async () => {
    const res = await request(nuevaApp()).get('/api/bloqueos').set(RECEPCION);
    expect(res.status).toBe(200);
    expect(res.body.bloqueos.length).toBeGreaterThan(0);
    expect(res.body.bloqueos[0].id).toMatch(/^bloq-urg-/);
  });

  it('dado un rango del lunes cuando se consulta entonces incluye ese día y excluye otros', async () => {
    const res = await request(nuevaApp())
      .get('/api/bloqueos')
      .query({
        desde: '2026-11-30T18:00:00-03:00',
        hasta: '2026-11-30T20:00:00-03:00',
      })
      .set(RECEPCION);
    expect(res.status).toBe(200);
    const ids = res.body.bloqueos.map((b: { id: string }) => b.id);
    expect(ids).toContain('bloq-urg-2026-11-30');
    expect(ids).not.toContain('bloq-urg-2026-12-01');
  });

  it('dado bloqueos propios, ajenos y globales cuando se filtra por profesional entonces incluye propios y globales', async () => {
    const deps = cargarSeed(new RelojFijo(AHORA));
    const admin = { id: 'u-admin', nombre: 'Admin Ficticio', rol: 'admin' } as const;
    const crear = (profesionalId?: string) => {
      const r = crearBloqueo(deps, admin, {
        motivo: 'Prueba',
        desde: new Date('2026-12-09T10:00:00-03:00'),
        hasta: new Date('2026-12-09T11:00:00-03:00'),
        profesionalId,
      });
      if (!r.ok) throw new Error('No se pudo crear el bloqueo de prueba');
      return r.valor;
    };
    const propio = crear('prof-1');
    const ajeno = crear('prof-2');
    const global = crear();
    const app = createApp(deps);
    const res = await request(app).get('/api/bloqueos?profesionalId=prof-1').set(RECEPCION);
    expect(res.status).toBe(200);
    const ids = res.body.bloqueos.map((b: { id: string }) => b.id);
    expect(ids).toContain(propio.id);
    expect(ids).toContain(global.id);
    expect(ids).not.toContain(ajeno.id);
  });

  it('dado solo desde cuando se consulta entonces responde 400', async () => {
    const res = await request(nuevaApp())
      .get('/api/bloqueos?desde=2026-11-30T18:00:00-03:00')
      .set(RECEPCION);
    expect(res.status).toBe(400);
  });

  it('dado desde posterior a hasta cuando se consulta entonces responde 400', async () => {
    const res = await request(nuevaApp())
      .get('/api/bloqueos')
      .query({
        desde: '2026-12-01T10:00:00-03:00',
        hasta: '2026-12-01T09:00:00-03:00',
      })
      .set(RECEPCION);
    expect(res.status).toBe(400);
  });

  it('dado una request sin X-Rol cuando se consulta entonces responde 403', async () => {
    const res = await request(nuevaApp()).get('/api/bloqueos');
    expect(res.status).toBe(403);
  });
});

describe('POST y DELETE /api/bloqueos', () => {
  const base = {
    motivo: 'Mantenimiento',
    desde: '2026-12-09T10:00:00-03:00',
    hasta: '2026-12-09T11:00:00-03:00',
  };

  it('dado recepción cuando crea un bloqueo global entonces responde 201', async () => {
    const res = await request(nuevaApp()).post('/api/bloqueos').set(RECEPCION).send(base);
    expect(res.status).toBe(201);
    expect(res.body.motivo).toBe('Mantenimiento');
  });

  it('dado un odontólogo cuando crea un bloqueo de su profesional entonces responde 201', async () => {
    const res = await request(nuevaApp())
      .post('/api/bloqueos')
      .set(ODONTO)
      .send({ ...base, profesionalId: 'prof-1' });
    expect(res.status).toBe(201);
    expect(res.body.profesionalId).toBe('prof-1');
  });

  it('dado un odontólogo cuando crea un bloqueo ajeno entonces responde 403', async () => {
    const res = await request(nuevaApp())
      .post('/api/bloqueos')
      .set(ODONTO)
      .send({ ...base, profesionalId: 'prof-2' });
    expect(res.status).toBe(403);
  });

  it('dado un motivo solo espacios cuando se crea entonces responde 400 entrada', async () => {
    const res = await request(nuevaApp())
      .post('/api/bloqueos')
      .set(RECEPCION)
      .send({ ...base, motivo: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it('dado un intervalo desalineado cuando se crea entonces responde 409 RN-AG-03', async () => {
    const res = await request(nuevaApp())
      .post('/api/bloqueos')
      .set(RECEPCION)
      .send({ ...base, desde: '2026-12-09T10:10:00-03:00' });
    expect(res.status).toBe(409);
    expect(res.body.error.regla).toBe('RN-AG-03');
  });

  it('dado recepción cuando elimina un bloqueo entonces responde 204 y ya no aparece en GET', async () => {
    const deps = cargarSeed(new RelojFijo(AHORA));
    const admin = { id: 'u-admin', nombre: 'Admin Ficticio', rol: 'admin' } as const;
    const creado = crearBloqueo(deps, admin, {
      motivo: 'Prueba',
      desde: new Date(base.desde),
      hasta: new Date(base.hasta),
    });
    if (!creado.ok) throw new Error('No se pudo crear el bloqueo de prueba');
    const app = createApp(deps);
    const res = await request(app).delete(`/api/bloqueos/${creado.valor.id}`).set(RECEPCION);
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    const lista = await request(app).get('/api/bloqueos').set(RECEPCION);
    const ids = lista.body.bloqueos.map((b: { id: string }) => b.id);
    expect(ids).not.toContain(creado.valor.id);
  });

  it('dado un odontólogo cuando elimina un bloqueo ajeno entonces responde 403 y no lo borra', async () => {
    const deps = cargarSeed(new RelojFijo(AHORA));
    const admin = { id: 'u-admin', nombre: 'Admin Ficticio', rol: 'admin' } as const;
    const creado = crearBloqueo(deps, admin, {
      motivo: 'Prueba',
      desde: new Date(base.desde),
      hasta: new Date(base.hasta),
      profesionalId: 'prof-2',
    });
    if (!creado.ok) throw new Error('No se pudo crear el bloqueo de prueba');
    const app = createApp(deps);
    const res = await request(app).delete(`/api/bloqueos/${creado.valor.id}`).set(ODONTO);
    expect(res.status).toBe(403);
    expect(deps.bloqueos.buscarPorId(creado.valor.id)).toBeDefined();
  });

  it('dado un id inexistente cuando se elimina entonces responde 404', async () => {
    const res = await request(nuevaApp()).delete('/api/bloqueos/bloq-inexistente').set(RECEPCION);
    expect(res.status).toBe(404);
  });
});

describe('E2E RN-CF-04 desde la API', () => {
  it('dado un turno creado cuando se desactiva su sillón entonces GET lo conserva y un nuevo POST falla con RN-CF-04', async () => {
    const app = nuevaApp();
    const cuerpo = {
      pacienteId: 'pac-01',
      prestacionId: 'prest-control',
      profesionalId: 'prof-1',
      sillonId: 'sillon-1',
      inicio: '2026-12-01T10:00:00-03:00',
    };
    const creado = await request(app).post('/api/turnos').set(RECEPCION).send(cuerpo);
    expect(creado.status).toBe(201);
    const baja = await request(app).delete('/api/sillones/sillon-1').set(ADMIN);
    expect(baja.status).toBe(200);
    const lista = await request(app).get('/api/turnos').set(RECEPCION);
    expect(lista.body.turnos.map((t: { id: string }) => t.id)).toContain(creado.body.id);
    const rechazado = await request(app).post('/api/turnos').set(RECEPCION).send(cuerpo);
    expect(rechazado.status).toBe(409);
    expect(rechazado.body.error).toMatchObject({ tipo: 'regla', regla: 'RN-CF-04' });
  });
});
