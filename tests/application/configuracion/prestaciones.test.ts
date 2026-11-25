import { describe, it, expect } from 'vitest';
import { crearPrestacion } from '../../../src/application/configuracion/crearPrestacion';
import { actualizarPrestacion } from '../../../src/application/configuracion/actualizarPrestacion';
import type { Usuario } from '../../../src/domain/shared/rol';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';

const AHORA = new Date('2026-11-30T09:00:00-03:00');
const admin: Usuario = { id: 'u-admin', nombre: 'Admin Ficticio', rol: 'admin' };
const recepcion: Usuario = { id: 'u-recepcion', nombre: 'Recepcionista Ficticia', rol: 'recepcion' };
const nuevoEntorno = () => cargarSeed(new RelojFijo(AHORA));

describe('crearPrestacion', () => {
  it('dado un admin cuando crea una prestación de 45 minutos entonces se guarda con id nuevo', () => {
    const deps = nuevoEntorno();
    const r = crearPrestacion(deps, admin, { codigo: 'LIM-01', nombre: 'Limpieza', duracionMin: 45 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor).toMatchObject({ codigo: 'LIM-01', nombre: 'Limpieza', duracionMin: 45 });
    expect(deps.prestaciones.buscarPorId(r.valor.id)).toEqual(r.valor);
  });

  it('dado un admin cuando crea una prestación de 20 minutos entonces falla con regla RN-CF-01 sin guardar', () => {
    const deps = nuevoEntorno();
    const cantidadInicial = deps.prestaciones.listar().length;
    const r = crearPrestacion(deps, admin, { codigo: 'LIM-01', nombre: 'Limpieza', duracionMin: 20 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.tipo).toBe('regla');
      if (r.error.tipo === 'regla') expect(r.error.error.regla).toBe('RN-CF-01');
    }
    expect(deps.prestaciones.listar()).toHaveLength(cantidadInicial);
  });

  it('dado recepción cuando intenta crear una prestación entonces devuelve permiso sin guardar', () => {
    const deps = nuevoEntorno();
    const r = crearPrestacion(deps, recepcion, { codigo: 'LIM-01', nombre: 'Limpieza', duracionMin: 45 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('permiso');
  });

  it('dado un admin cuando crea una prestación con codigo solo espacios entonces devuelve entrada', () => {
    const deps = nuevoEntorno();
    const r = crearPrestacion(deps, admin, { codigo: '   ', nombre: 'Limpieza', duracionMin: 45 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('entrada');
  });

  it('dado un admin cuando crea una prestación con nombre solo espacios entonces devuelve entrada', () => {
    const deps = nuevoEntorno();
    const r = crearPrestacion(deps, admin, { codigo: 'LIM-01', nombre: '   ', duracionMin: 45 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('entrada');
  });
});

describe('actualizarPrestacion', () => {
  it('dado un admin cuando actualiza prest-control a 45 minutos entonces se guarda el cambio', () => {
    const deps = nuevoEntorno();
    const original = deps.prestaciones.buscarPorId('prest-control');
    expect(original).toBeDefined();
    if (original === undefined) return;
    const r = actualizarPrestacion(deps, admin, 'prest-control', {
      codigo: original.codigo,
      nombre: original.nombre,
      duracionMin: 45,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valor.duracionMin).toBe(45);
    expect(deps.prestaciones.buscarPorId('prest-control')?.duracionMin).toBe(45);
  });

  it('dado un admin cuando actualiza con duración de 20 minutos entonces falla con RN-CF-01 y no modifica', () => {
    const deps = nuevoEntorno();
    const original = deps.prestaciones.buscarPorId('prest-control');
    expect(original).toBeDefined();
    if (original === undefined) return;
    const r = actualizarPrestacion(deps, admin, 'prest-control', {
      codigo: original.codigo,
      nombre: original.nombre,
      duracionMin: 20,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.tipo).toBe('regla');
      if (r.error.tipo === 'regla') expect(r.error.error.regla).toBe('RN-CF-01');
    }
    expect(deps.prestaciones.buscarPorId('prest-control')?.duracionMin).toBe(original.duracionMin);
  });

  it('dado un id inexistente cuando se actualiza entonces devuelve no-encontrado', () => {
    const deps = nuevoEntorno();
    const r = actualizarPrestacion(deps, admin, 'prest-inexistente', {
      codigo: 'X',
      nombre: 'X',
      duracionMin: 45,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('no-encontrado');
  });
});
