import { describe, it, expect } from 'vitest';
import { definirDisponibilidad } from '../../../src/application/configuracion/definirDisponibilidad';
import type { Franja } from '../../../src/domain/configuracion/profesional';
import type { Usuario } from '../../../src/domain/shared/rol';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';

const AHORA = new Date('2026-11-30T09:00:00-03:00');
const admin: Usuario = { id: 'u-admin', nombre: 'Admin Ficticio', rol: 'admin' };
const recepcion: Usuario = { id: 'u-recepcion', nombre: 'Recepcionista Ficticia', rol: 'recepcion' };
const nuevoEntorno = () => cargarSeed(new RelojFijo(AHORA));
const fr = (diaSemana: number, desde: string, hasta: string): Franja => ({
  diaSemana,
  desde,
  hasta,
}) as Franja;

describe('definirDisponibilidad', () => {
  it('dado un admin cuando define la semana completa entonces reemplaza la disponibilidad anterior', () => {
    const deps = nuevoEntorno();
    const anterior = deps.profesionales.buscarPorId('prof-1')?.disponibilidad;
    expect(anterior).toBeDefined();
    expect(anterior?.length).toBeGreaterThan(0);
    const semana = [1, 2, 3, 4, 5].map((dia) => fr(dia, '09:00', '17:00'));
    const r = definirDisponibilidad(deps, admin, 'prof-1', semana);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valor.disponibilidad).toEqual(semana);
    expect(deps.profesionales.buscarPorId('prof-1')?.disponibilidad).toEqual(semana);
  });

  it('dado la misma disponibilidad cuando se define dos veces entonces es idempotente', () => {
    const deps = nuevoEntorno();
    const semana = [fr(1, '09:00', '13:00')];
    definirDisponibilidad(deps, admin, 'prof-1', semana);
    const r = definirDisponibilidad(deps, admin, 'prof-1', semana);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valor.disponibilidad).toEqual(semana);
  });

  it('dado un arreglo vacio cuando se define entonces borra todas las franjas', () => {
    const deps = nuevoEntorno();
    definirDisponibilidad(deps, admin, 'prof-1', [fr(1, '09:00', '13:00')]);
    const r = definirDisponibilidad(deps, admin, 'prof-1', []);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valor.disponibilidad).toEqual([]);
  });

  it('dado franjas solapadas cuando se definen entonces falla con RN-CF-02 sin cambios', () => {
    const deps = nuevoEntorno();
    const inicial = deps.profesionales.buscarPorId('prof-1')?.disponibilidad;
    expect(inicial).toBeDefined();
    const r = definirDisponibilidad(deps, admin, 'prof-1', [
      fr(1, '09:00', '13:00'),
      fr(1, '12:00', '15:00'),
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.tipo).toBe('regla');
      if (r.error.tipo === 'regla') expect(r.error.error.regla).toBe('RN-CF-02');
    }
    expect(deps.profesionales.buscarPorId('prof-1')?.disponibilidad).toEqual(inicial);
  });

  it('dado una franja desalineada 09:10 cuando se define entonces falla con regla RN-CF-02', () => {
    const deps = nuevoEntorno();
    const r = definirDisponibilidad(deps, admin, 'prof-1', [fr(1, '09:10', '13:00')]);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.tipo).toBe('regla');
      if (r.error.tipo === 'regla') expect(r.error.error.regla).toBe('RN-CF-02');
    }
  });

  it('dado diaSemana 8 cuando se define entonces devuelve entrada', () => {
    const deps = nuevoEntorno();
    const r = definirDisponibilidad(deps, admin, 'prof-1', [fr(8, '09:00', '13:00')]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('entrada');
  });

  it('dado hora 25:00 cuando se define entonces devuelve entrada', () => {
    const deps = nuevoEntorno();
    const r = definirDisponibilidad(deps, admin, 'prof-1', [fr(1, '25:00', '26:00')]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('entrada');
  });

  it('dado hora 9:00 cuando se define entonces devuelve entrada por no tener dos dígitos', () => {
    const deps = nuevoEntorno();
    const r = definirDisponibilidad(deps, admin, 'prof-1', [fr(1, '9:00', '13:00')]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('entrada');
  });

  it('dado un profesional inexistente cuando se define entonces devuelve no-encontrado', () => {
    const deps = nuevoEntorno();
    const r = definirDisponibilidad(deps, admin, 'prof-inexistente', []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('no-encontrado');
  });

  it('dado recepción cuando intenta definir disponibilidad entonces devuelve permiso', () => {
    const deps = nuevoEntorno();
    const r = definirDisponibilidad(deps, recepcion, 'prof-1', []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('permiso');
  });
});
