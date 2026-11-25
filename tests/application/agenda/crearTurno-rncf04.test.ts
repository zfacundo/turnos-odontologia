import { describe, it, expect } from 'vitest';
import { crearTurno } from '../../../src/application/agenda/crearTurno';
import { desactivarSillon } from '../../../src/application/configuracion/desactivarSillon';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';

const AHORA = new Date('2026-11-30T09:00:00-03:00');
const recepcion = { id: 'u-recepcion', nombre: 'Recepcionista Ficticia', rol: 'recepcion' } as const;
const admin = { id: 'u-admin', nombre: 'Admin Ficticio', rol: 'admin' } as const;
const nuevoEntorno = () => cargarSeed(new RelojFijo(AHORA));
const entrada = {
  pacienteId: 'pac-01',
  prestacionId: 'prest-control',
  profesionalId: 'prof-1',
  sillonId: 'sillon-1',
  inicio: new Date('2026-12-01T10:00:00-03:00'),
};
const esRNCF04 = (r: ReturnType<typeof crearTurno>) => {
  expect(r.ok).toBe(false);
  if (!r.ok && r.error.tipo === 'regla') return r.error.error.regla === 'RN-CF-04';
  return false;
};

describe('RN-CF-04 en crearTurno', () => {
  it('dado un sillón inactivo cuando se crea un turno entonces falla con RN-CF-04 sin persistir', () => {
    const deps = nuevoEntorno();
    desactivarSillon(deps, admin, 'sillon-1');
    const cantidad = deps.turnos.listarActivos().length;
    const r = crearTurno(deps, recepcion, entrada);
    expect(esRNCF04(r)).toBe(true);
    expect(deps.turnos.listarActivos()).toHaveLength(cantidad);
  });

  it('dado un profesional inactivo cuando se crea un turno entonces falla con RN-CF-04 sin persistir', () => {
    const deps = nuevoEntorno();
    const prof = deps.profesionales.buscarPorId('prof-1');
    expect(prof).toBeDefined();
    if (prof === undefined) return;
    deps.profesionales.actualizar({ ...prof, activo: false });
    const r = crearTurno(deps, recepcion, entrada);
    expect(esRNCF04(r)).toBe(true);
  });

  it('dado sillón y profesional activos cuando se crea un turno entonces se reserva', () => {
    const deps = nuevoEntorno();
    const r = crearTurno(deps, recepcion, entrada);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valor.estado).toBe('reservado');
  });

  it('dado un sillón inactivo y un horario solapado cuando se crea el turno entonces gana RN-CF-04', () => {
    const deps = nuevoEntorno();
    const existente = crearTurno(deps, recepcion, entrada);
    expect(existente.ok).toBe(true);
    desactivarSillon(deps, admin, 'sillon-1');
    const r = crearTurno(deps, recepcion, entrada);
    expect(esRNCF04(r)).toBe(true);
  });

  it('dado un sillón inactivo y un horario fuera de franja cuando se crea el turno entonces gana RN-CF-04', () => {
    const deps = nuevoEntorno();
    desactivarSillon(deps, admin, 'sillon-1');
    const r = crearTurno(deps, recepcion, { ...entrada, inicio: new Date('2026-12-01T20:00:00-03:00') });
    expect(esRNCF04(r)).toBe(true);
  });

  it('dado un sillón inexistente cuando se crea el turno entonces sigue dando entrada', () => {
    const deps = nuevoEntorno();
    const r = crearTurno(deps, recepcion, { ...entrada, sillonId: 'sillon-inexistente' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('entrada');
  });
});
