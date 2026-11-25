import { describe, it, expect } from 'vitest';
import { crearTurno } from '../../../src/application/agenda/crearTurno';
import { crearSillon } from '../../../src/application/configuracion/crearSillon';
import { desactivarSillon } from '../../../src/application/configuracion/desactivarSillon';
import type { Usuario } from '../../../src/domain/shared/rol';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';

const AHORA = new Date('2026-11-30T09:00:00-03:00');
const admin: Usuario = { id: 'u-admin', nombre: 'Admin Ficticio', rol: 'admin' };
const recepcion: Usuario = { id: 'u-recepcion', nombre: 'Recepcionista Ficticia', rol: 'recepcion' };
const nuevoEntorno = () => cargarSeed(new RelojFijo(AHORA));

describe('crearSillon', () => {
  it('dado el seed y un admin cuando crea un sillón con nombre válido entonces se guarda activo con id nuevo', () => {
    const deps = nuevoEntorno();
    const r = crearSillon(deps, admin, { nombre: 'Sillón 3' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor).toMatchObject({ nombre: 'Sillón 3', activo: true });
    expect(typeof r.valor.id).toBe('string');
    expect(deps.sillones.buscarPorId(r.valor.id)).toEqual(r.valor);
    expect(deps.sillones.listar()).toHaveLength(3);
  });

  it('dado recepción cuando intenta crear un sillón entonces devuelve permiso y no lo guarda', () => {
    const deps = nuevoEntorno();
    const r = crearSillon(deps, recepcion, { nombre: 'Sillón 3' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('permiso');
    expect(deps.sillones.listar()).toHaveLength(2);
  });

  it('dado un admin cuando crea un sillón con nombre solo espacios entonces devuelve entrada y no lo guarda', () => {
    const deps = nuevoEntorno();
    const r = crearSillon(deps, admin, { nombre: '   ' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('entrada');
    expect(deps.sillones.listar()).toHaveLength(2);
  });
});

describe('desactivarSillon', () => {
  it('dado el seed y un admin cuando desactiva sillon-1 entonces queda inactivo y sigue existiendo', () => {
    const deps = nuevoEntorno();
    const r = desactivarSillon(deps, admin, 'sillon-1');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valor).toMatchObject({ id: 'sillon-1', activo: false });
    expect(deps.sillones.buscarPorId('sillon-1')?.activo).toBe(false);
  });

  it('dado sillon-1 ya inactivo cuando se desactiva de nuevo entonces responde activo false sin error', () => {
    const deps = nuevoEntorno();
    desactivarSillon(deps, admin, 'sillon-1');
    const r = desactivarSillon(deps, admin, 'sillon-1');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valor.activo).toBe(false);
  });

  it('dado un turno existente en sillon-1 cuando se desactiva el sillón entonces el turno sigue en el repositorio', () => {
    const deps = nuevoEntorno();
    const creado = crearTurno(deps, recepcion, {
      pacienteId: 'pac-01',
      prestacionId: 'prest-control',
      profesionalId: 'prof-1',
      sillonId: 'sillon-1',
      inicio: new Date('2026-12-01T10:00:00-03:00'),
    });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;
    desactivarSillon(deps, admin, 'sillon-1');
    expect(deps.turnos.buscarPorId(creado.valor.id)).toEqual(creado.valor);
  });

  it('dado un id inexistente cuando se desactiva entonces devuelve no-encontrado', () => {
    const deps = nuevoEntorno();
    const r = desactivarSillon(deps, admin, 'sillon-inexistente');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('no-encontrado');
  });

  it('dado recepción cuando intenta desactivar entonces devuelve permiso y el sillón sigue activo', () => {
    const deps = nuevoEntorno();
    const r = desactivarSillon(deps, recepcion, 'sillon-1');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('permiso');
    expect(deps.sillones.buscarPorId('sillon-1')?.activo).toBe(true);
  });
});
