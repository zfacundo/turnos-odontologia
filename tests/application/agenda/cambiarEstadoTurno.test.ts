import { describe, it, expect } from 'vitest';
import { cambiarEstadoTurno } from '../../../src/application/agenda/cambiarEstadoTurno';
import { crearTurno } from '../../../src/application/agenda/crearTurno';
import type { Turno } from '../../../src/domain/agenda/turno';
import type { Usuario } from '../../../src/domain/shared/rol';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';
import { AuditoriaEnMemoria } from '../../../src/infrastructure/memory/auditoria-en-memoria';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';

const AHORA = new Date('2026-11-30T09:00:00-03:00');
const CAMBIO = new Date('2026-12-01T11:00:00-03:00');

const recepcion: Usuario = { id: 'u-recepcion', nombre: 'Recepcionista Ficticia', rol: 'recepcion' };
const odonto1: Usuario = { id: 'u-odonto-1', nombre: 'Dra. Ficticia Perez', rol: 'odontologo', profesionalId: 'prof-1' };
const odonto2: Usuario = { id: 'u-odonto-2', nombre: 'Dr. Ficticio Gomez', rol: 'odontologo', profesionalId: 'prof-2' };
const paciente: Usuario = { id: 'pac-usuario', nombre: 'Paciente Ficticio', rol: 'paciente' };

const nuevoEntorno = () => {
  const base = cargarSeed(new RelojFijo(AHORA));
  const creado = crearTurno(base, recepcion, {
    pacienteId: 'pac-01',
    prestacionId: 'prest-control',
    profesionalId: 'prof-1',
    sillonId: 'sillon-1',
    inicio: new Date('2026-12-01T10:00:00-03:00'),
  });
  if (!creado.ok) throw new Error('No se pudo crear el turno T');
  const turno: Turno = creado.valor;
  const deps = { ...base, clock: new RelojFijo(CAMBIO) };
  const auditoria = base.auditoria as AuditoriaEnMemoria;
  const eventosPrevios = auditoria.eventos().length;
  return { deps, turno, auditoria, eventosPrevios };
};

describe('cambiarEstadoTurno - transiciones', () => {
  it('dado T reservado cuando recepcion lo confirma entonces queda confirmado con actualizadoEn del reloj y persistido', () => {
    const { deps, turno } = nuevoEntorno();
    const r = cambiarEstadoTurno(deps, recepcion, { turnoId: turno.id, accion: 'confirmar' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.estado).toBe('confirmado');
    expect(r.valor.actualizadoEn).toEqual(CAMBIO);
    expect(deps.turnos.buscarPorId(turno.id)).toEqual(r.valor);
  });

  it('dado T confirmado cuando recepcion lo marca atendido entonces queda atendido', () => {
    const { deps, turno } = nuevoEntorno();
    cambiarEstadoTurno(deps, recepcion, { turnoId: turno.id, accion: 'confirmar' });
    const r = cambiarEstadoTurno(deps, recepcion, { turnoId: turno.id, accion: 'atender' });
    expect(r.ok && r.valor.estado).toBe('atendido');
  });

  it('dado T reservado cuando recepcion lo marca ausente entonces queda ausente', () => {
    const { deps, turno } = nuevoEntorno();
    const r = cambiarEstadoTurno(deps, recepcion, { turnoId: turno.id, accion: 'ausente' });
    expect(r.ok && r.valor.estado).toBe('ausente');
  });

  it('dado T ausente cuando recepcion lo marca atendido entonces falla con RN-AG-09 y el turno sigue ausente', () => {
    const { deps, turno } = nuevoEntorno();
    cambiarEstadoTurno(deps, recepcion, { turnoId: turno.id, accion: 'ausente' });
    const r = cambiarEstadoTurno(deps, recepcion, { turnoId: turno.id, accion: 'atender' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatchObject({ tipo: 'regla', error: { regla: 'RN-AG-09' } });
    expect(deps.turnos.buscarPorId(turno.id)?.estado).toBe('ausente');
  });

  it('dado T confirmado cuando recepcion lo confirma otra vez entonces falla con RN-AG-09 sin modificar el turno', () => {
    const { deps, turno } = nuevoEntorno();
    const primera = cambiarEstadoTurno(deps, recepcion, { turnoId: turno.id, accion: 'confirmar' });
    const r = cambiarEstadoTurno(deps, recepcion, { turnoId: turno.id, accion: 'confirmar' });
    expect(r.ok).toBe(false);
    if (r.ok || r.error.tipo !== 'regla') throw new Error('se esperaba error de regla');
    expect(r.error.error.regla).toBe('RN-AG-09');
    expect(r.error.error.conflicto).toEqual({ turnoId: turno.id });
    expect(deps.turnos.buscarPorId(turno.id)).toEqual(primera.ok ? primera.valor : undefined);
  });

  it('dado un id inexistente cuando recepcion confirma entonces falla con no-encontrado', () => {
    const { deps } = nuevoEntorno();
    const r = cambiarEstadoTurno(deps, recepcion, { turnoId: 'turno-inexistente', accion: 'confirmar' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('no-encontrado');
  });
});

describe('cambiarEstadoTurno - permisos', () => {
  it('dado T reservado cuando un odontologo lo confirma entonces falla con permiso y el turno sigue reservado', () => {
    const { deps, turno } = nuevoEntorno();
    const r = cambiarEstadoTurno(deps, odonto1, { turnoId: turno.id, accion: 'confirmar' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('permiso');
    expect(deps.turnos.buscarPorId(turno.id)?.estado).toBe('reservado');
  });

  it('dado T de prof-1 confirmado cuando u-odonto-1 lo marca atendido entonces queda atendido', () => {
    const { deps, turno } = nuevoEntorno();
    cambiarEstadoTurno(deps, recepcion, { turnoId: turno.id, accion: 'confirmar' });
    const r = cambiarEstadoTurno(deps, odonto1, { turnoId: turno.id, accion: 'atender' });
    expect(r.ok && r.valor.estado).toBe('atendido');
  });

  it('dado T de prof-1 reservado cuando u-odonto-2 lo marca ausente entonces falla con permiso sin cambios', () => {
    const { deps, turno } = nuevoEntorno();
    const r = cambiarEstadoTurno(deps, odonto2, { turnoId: turno.id, accion: 'ausente' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('permiso');
    expect(deps.turnos.buscarPorId(turno.id)?.estado).toBe('reservado');
  });

  it('dado un odontologo sin profesionalId cuando marca atendido entonces falla con permiso', () => {
    const { deps, turno } = nuevoEntorno();
    const sinProf: Usuario = { id: 'u-odonto-x', nombre: 'Sin Prof', rol: 'odontologo' };
    const r = cambiarEstadoTurno(deps, sinProf, { turnoId: turno.id, accion: 'atender' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('permiso');
  });

  it('dado T reservado cuando el paciente lo confirma entonces queda confirmado', () => {
    const { deps, turno } = nuevoEntorno();
    const r = cambiarEstadoTurno(deps, paciente, { turnoId: turno.id, accion: 'confirmar' });
    expect(r.ok && r.valor.estado).toBe('confirmado');
  });

  it('dado T confirmado cuando el paciente lo marca atendido entonces falla con permiso', () => {
    const { deps, turno } = nuevoEntorno();
    cambiarEstadoTurno(deps, recepcion, { turnoId: turno.id, accion: 'confirmar' });
    const r = cambiarEstadoTurno(deps, paciente, { turnoId: turno.id, accion: 'atender' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('permiso');
    expect(deps.turnos.buscarPorId(turno.id)?.estado).toBe('confirmado');
  });

  it('dado T reservado cuando un request sin usuario lo confirma entonces falla con permiso', () => {
    const { deps, turno } = nuevoEntorno();
    const r = cambiarEstadoTurno(deps, undefined, { turnoId: turno.id, accion: 'confirmar' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('permiso');
  });
});

describe('cambiarEstadoTurno - auditoria (RN-AU-01)', () => {
  it('dado T reservado cuando recepcion lo confirma entonces registra un evento confirmar con antes reservado y despues confirmado', () => {
    const { deps, turno, auditoria, eventosPrevios } = nuevoEntorno();
    cambiarEstadoTurno(deps, recepcion, { turnoId: turno.id, accion: 'confirmar' });
    const nuevos = auditoria.eventos().slice(eventosPrevios);
    expect(nuevos).toHaveLength(1);
    const [evento] = nuevos;
    expect(evento).toMatchObject({
      accion: 'confirmar',
      usuarioId: 'u-recepcion',
      rol: 'recepcion',
      fecha: CAMBIO,
      entidad: 'turno',
      entidadId: turno.id,
    });
    const detalle = JSON.parse(evento?.detalle ?? '{}') as {
      antes: { estado: string };
      despues: { estado: string };
    };
    expect(detalle.antes.estado).toBe('reservado');
    expect(detalle.despues.estado).toBe('confirmado');
  });

  it('dado T reservado cuando recepcion lo marca atendido entonces la accion auditada es atender', () => {
    const { deps, turno, auditoria, eventosPrevios } = nuevoEntorno();
    cambiarEstadoTurno(deps, recepcion, { turnoId: turno.id, accion: 'atender' });
    expect(auditoria.eventos().slice(eventosPrevios).map((e) => e.accion)).toEqual(['atender']);
  });

  it('dado operaciones rechazadas por permiso, inexistencia o regla cuando se intentan entonces no registran eventos', () => {
    const { deps, turno, auditoria, eventosPrevios } = nuevoEntorno();
    cambiarEstadoTurno(deps, odonto1, { turnoId: turno.id, accion: 'confirmar' });
    cambiarEstadoTurno(deps, recepcion, { turnoId: 'no-existe', accion: 'confirmar' });
    expect(auditoria.eventos()).toHaveLength(eventosPrevios);
    cambiarEstadoTurno(deps, recepcion, { turnoId: turno.id, accion: 'ausente' });
    expect(auditoria.eventos()).toHaveLength(eventosPrevios + 1);
    cambiarEstadoTurno(deps, recepcion, { turnoId: turno.id, accion: 'confirmar' });
    expect(auditoria.eventos()).toHaveLength(eventosPrevios + 1);
  });
});
