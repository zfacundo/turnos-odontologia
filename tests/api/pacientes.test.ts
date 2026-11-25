import { describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/api/app';
import { cargarSeed } from '../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../src/infrastructure/clock/clock';

const AHORA = new Date('2026-11-30T09:00:00-03:00');
const RECEPCION = { 'X-Usuario': 'u-recepcion', 'X-Rol': 'recepcion' };
const ADMIN = { 'X-Usuario': 'u-admin', 'X-Rol': 'admin' };
const ODONTO = { 'X-Usuario': 'u-odonto-1', 'X-Rol': 'odontologo' };
const PACIENTE = { 'X-Usuario': 'pac-usuario', 'X-Rol': 'paciente' };

const BASE = {
  nombre: 'Paciente Ficticio Once',
  dni: '99000011',
  telefono: '+54 9 11 0000-0011',
} as const;

const nuevaApp = (): Express => createApp(cargarSeed(new RelojFijo(AHORA)));
const crear = (app: Express, cuerpo: unknown, headers: Record<string, string> = RECEPCION) =>
  request(app).post('/api/pacientes').set(headers).send(cuerpo as object);
const actualizar = (
  app: Express,
  id: string,
  cuerpo: unknown,
  headers: Record<string, string> = RECEPCION,
) => request(app).put(`/api/pacientes/${id}`).set(headers).send(cuerpo as object);

const crearPaciente11 = async (app: Express): Promise<string> => {
  const res = await crear(app, BASE);
  expect(res.status).toBe(201);
  return res.body.id as string;
};

describe('POST /api/pacientes - alta valida', () => {
  it('dado la API con el seed cuando recepcion hace POST con datos ficticios validos entonces responde 201 con id y campos', async () => {
    const res = await crear(nuevaApp(), BASE);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject(BASE);
    expect(typeof res.body.id).toBe('string');
  });

  it('dado la API con el seed cuando admin hace POST con datos validos entonces responde 201', async () => {
    const res = await crear(nuevaApp(), BASE, ADMIN);
    expect(res.status).toBe(201);
  });

  it('dado un email ficticio y obra social AF-9999 cuando se da de alta entonces responde 201 y conserva los campos', async () => {
    const res = await crear(nuevaApp(), {
      ...BASE,
      email: 'ficticio11@ejemplo.invalid',
      obraSocialId: 'OS-01',
      nroAfiliado: 'AF-9999',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      email: 'ficticio11@ejemplo.invalid',
      obraSocialId: 'OS-01',
      nroAfiliado: 'AF-9999',
    });
  });

  it('dado un alta sin datos de obra social cuando se responde entonces no aparecen esos campos', async () => {
    const res = await crear(nuevaApp(), BASE);
    expect(res.status).toBe(201);
    expect(res.body.email).toBeUndefined();
    expect(res.body.obraSocialId).toBeUndefined();
    expect(res.body.nroAfiliado).toBeUndefined();
  });
});

describe('POST /api/pacientes - entrada malformada', () => {
  it.each([
    ['dni no ficticio', { dni: '12345678' }],
    ['telefono no ficticio', { telefono: '1133333333' }],
    ['nombre vacio', { nombre: '' }],
    ['nombre con espacios', { nombre: '   ' }],
    ['dni vacio', { dni: '' }],
    ['dni con espacios', { dni: '   ' }],
    ['email con formato invalido', { email: 'ficticio@@ejemplo' }],
    ['email real', { email: 'paciente@gmail.com' }],
    ['email vacio', { email: '' }],
    ['obraSocialId invalido', { obraSocialId: 'obra-social-real-1' }],
    ['nroAfiliado invalido', { nroAfiliado: 'AF-12' }],
  ])('dado %s cuando se da de alta entonces responde 400 tipo entrada', async (_nombre, cambio) => {
    const res = await crear(nuevaApp(), { ...BASE, ...cambio });
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });

  it.each([
    ['un objeto vacio', {}],
    ['un arreglo', []],
  ])('dado %s cuando se da de alta entonces responde 400 tipo entrada', async (_nombre, cuerpo) => {
    const res = await crear(nuevaApp(), cuerpo);
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
  });
});

describe('POST /api/pacientes - DNI duplicado', () => {
  it('dado el DNI 99000001 del seed cuando se da de alta con otro nombre entonces responde 409 regla DNI_DUPLICADO', async () => {
    const app = nuevaApp();
    const res = await crear(app, {
      ...BASE,
      dni: '99000001',
      nombre: 'Paciente Ficticio Duplicado',
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      tipo: 'regla',
      regla: 'DNI_DUPLICADO',
      dimension: 'paciente',
    });
    expect(res.body.error.tipo).not.toBe('entrada');
    expect((await request(app).get('/api/pacientes').set(RECEPCION)).body.pacientes).toHaveLength(10);
  });
});

describe('PUT /api/pacientes/:id', () => {
  it('dado un paciente creado cuando se actualiza dos veces con su DNI entonces responde 200 en ambas con la misma ficha enmascarada', async () => {
    const app = nuevaApp();
    const id = await crearPaciente11(app);
    const cuerpo = { ...BASE, nombre: 'Paciente Ficticio Once Actualizado' };
    const primero = await actualizar(app, id, cuerpo);
    const segundo = await actualizar(app, id, cuerpo);
    expect(primero.status).toBe(200);
    expect(segundo.status).toBe(200);
    expect(primero.body).toEqual(segundo.body);
    expect(primero.body).toMatchObject({
      id,
      nombre: cuerpo.nombre,
      dni: '99****11',
      telefono: '+54 9 11 0000-**11',
    });
    expect((await request(app).get('/api/pacientes').set(RECEPCION)).body.pacientes).toHaveLength(11);
  });

  it('dado el DNI 99000001 del seed cuando se asigna a otro paciente entonces responde 409 regla', async () => {
    const app = nuevaApp();
    const id = await crearPaciente11(app);
    const res = await actualizar(app, id, { ...BASE, dni: '99000001' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ tipo: 'regla', regla: 'DNI_DUPLICADO' });
  });

  it('dado un id inexistente cuando se actualiza con datos validos entonces responde 404 con paciente no encontrado', async () => {
    const res = await actualizar(nuevaApp(), 'no-existe', BASE);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ tipo: 'no-encontrado', mensaje: 'paciente no encontrado' });
  });

  it('dado un nombre con solo espacios cuando se actualiza entonces responde 400 y no modifica la ficha', async () => {
    const app = nuevaApp();
    const id = await crearPaciente11(app);
    const res = await actualizar(app, id, { ...BASE, nombre: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error.tipo).toBe('entrada');
    const detalle = await request(app).get(`/api/pacientes/${id}`).set(RECEPCION);
    expect(detalle.body.nombre).toBe(BASE.nombre);
  });
});

describe('GET /api/pacientes - enmascaramiento', () => {
  it('dado el seed cuando recepcion lista entonces todas las fichas tienen dni y telefono enmascarados', async () => {
    const res = await request(nuevaApp()).get('/api/pacientes').set(RECEPCION);
    expect(res.status).toBe(200);
    expect(res.body.pacientes).toHaveLength(10);
    expect(res.body.pacientes[0]).toMatchObject({
      dni: '99****01',
      telefono: '+54 9 11 0000-**01',
    });
  });

  it('dado un paciente con campos opcionales cuando se consulta por id entonces devuelve esos campos y el enmascaramiento', async () => {
    const app = nuevaApp();
    const id = await crearPaciente11(app);
    await actualizar(app, id, {
      ...BASE,
      email: 'ficticio11@ejemplo.invalid',
      obraSocialId: 'OS-01',
      nroAfiliado: 'AF-0001',
    });
    const res = await request(app).get(`/api/pacientes/${id}`).set(RECEPCION);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      dni: '99****11',
      telefono: '+54 9 11 0000-**11',
      email: 'ficticio11@ejemplo.invalid',
      obraSocialId: 'OS-01',
      nroAfiliado: 'AF-0001',
    });
  });

  it('dado el mismo paciente cuando se listan y se consulta por id entonces ambos usan el mismo enmascaramiento', async () => {
    const app = nuevaApp();
    const id = await crearPaciente11(app);
    const lista = await request(app).get('/api/pacientes').set(RECEPCION);
    const detalle = await request(app).get(`/api/pacientes/${id}`).set(RECEPCION);
    const deLista = (lista.body.pacientes as { id: string }[]).find((p) => p.id === id);
    expect(deLista).toMatchObject({ dni: '99****11', telefono: '+54 9 11 0000-**11' });
    expect(detalle.body).toMatchObject({ dni: '99****11', telefono: '+54 9 11 0000-**11' });
  });

  it('dado un dni consultado enmascarado cuando se intenta dar de alta con el dni completo entonces responde 409', async () => {
    const app = nuevaApp();
    await request(app).get('/api/pacientes/pac-01').set(RECEPCION);
    const res = await crear(app, { ...BASE, dni: '99000001' });
    expect(res.status).toBe(409);
    expect(res.body.error.regla).toBe('DNI_DUPLICADO');
  });

  it('dado un id inexistente cuando se consulta entonces responde 404 con paciente no encontrado', async () => {
    const res = await request(nuevaApp()).get('/api/pacientes/no-existe').set(RECEPCION);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ tipo: 'no-encontrado', mensaje: 'paciente no encontrado' });
  });
});

describe('/api/pacientes - permisos por rol', () => {
  it('dado un odontologo cuando intenta dar de alta entonces responde 403 tipo permiso', async () => {
    const res = await crear(nuevaApp(), BASE, ODONTO);
    expect(res.status).toBe(403);
    expect(res.body.error.tipo).toBe('permiso');
  });

  it('dado un odontologo cuando intenta actualizar entonces responde 403 y la ficha no se modifica', async () => {
    const app = nuevaApp();
    const id = await crearPaciente11(app);
    const res = await actualizar(app, id, { ...BASE, nombre: 'Intruso' }, ODONTO);
    expect(res.status).toBe(403);
    expect(res.body.error.tipo).toBe('permiso');
    const detalle = await request(app).get(`/api/pacientes/${id}`).set(RECEPCION);
    expect(detalle.body.nombre).toBe(BASE.nombre);
  });

  it('dado un odontologo cuando consulta entonces responde 200', async () => {
    const res = await request(nuevaApp()).get('/api/pacientes').set(ODONTO);
    expect(res.status).toBe(200);
  });

  it('dado un paciente cuando consulta, da de alta o actualiza entonces responde 403', async () => {
    const app = nuevaApp();
    const get = await request(app).get('/api/pacientes').set(PACIENTE);
    const post = await crear(app, BASE, PACIENTE);
    const put = await actualizar(app, 'pac-01', BASE, PACIENTE);
    expect(get.status).toBe(403);
    expect(post.status).toBe(403);
    expect(put.status).toBe(403);
  });

  it('dado una peticion sin X-Rol cuando consulta, da de alta o actualiza entonces responde 403', async () => {
    const app = nuevaApp();
    const get = await request(app).get('/api/pacientes/pac-01');
    const post = await request(app).post('/api/pacientes').send(BASE);
    const put = await request(app).put('/api/pacientes/pac-01').send(BASE);
    expect(get.status).toBe(403);
    expect(post.status).toBe(403);
    expect(put.status).toBe(403);
  });
});
