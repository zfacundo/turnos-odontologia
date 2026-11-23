import { describe, it, expect } from 'vitest';
import { cambiarEstadoTurno } from '../../../src/application/agenda/cambiarEstadoTurno';
import { cancelarTurno, type TurnoLiberado } from '../../../src/application/agenda/cancelarTurno';
import { crearTurno } from '../../../src/application/agenda/crearTurno';
import type { Turno } from '../../../src/domain/agenda/turno';
import type { Usuario } from '../../../src/domain/shared/rol';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';
import { AuditoriaEnMemoria } from '../../../src/infrastructure/memory/auditoria-en-memoria';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';

const AHORA = new Date('2026-11-30T09:00:00-03:00');
const INICIO = new Date('2026-12-01T10:00:00-03:00');
const MOTIVO = 'Paciente avisó por teléfono';

const admin: Usuario = { id: 'u-admin', nombre: 'Admin Ficticio', rol: 'admin' };
const recepcion: Usuario = { id: 'u-recepcion', nombre: 'Recepcionista Ficticia', rol: 'recepcion' };
const odonto1: Usuario = { id: 'u-odonto-1', nombre: 'Dra. Ficticia Perez', rol: 'odontologo', profesionalId: 'prof-1' };
const paciente: Usuario = { id: 'pac-usuario', nombre: 'Paciente Ficticio', rol: 'paciente' };

const nuevoEntorno = (reloj: string = '2026-11-30T09:00:00-03:00') => {
  const base = cargarSeed(new RelojFijo(AHORA));
  const creado = crearTurno(base, recepcion, {
    pacienteId: 'pac-01',
    prestacionId: 'prest-control',
    profesionalId: 'prof-1',
    sillonId: 'sillon-1',
    inicio: INICIO,
  });
  if (!creado.ok) throw new Error('No se pudo crear el turno T');
  const turno: Turno = creado.valor;
  const publicados: TurnoLiberado[] = [];
  const deps = {
    ...base,
    clock: new RelojFijo(new Date(reloj)),
    eventos: { publicar: (e: TurnoLiberado): void => void publicados.push(e) },
  };
  const auditoria = base.auditoria as AuditoriaEnMemoria;
  return { base, deps, turno, auditoria, publicados, eventosPrevios: auditoria.eventos().length };
};

describe('cancelarTurno - datos de la cancelacion', () => {
  it('dado T reservado y reloj 2026-11-30 09:00 cuando u-recepcion cancela con motivo entonces queda cancelado con motivo, autor y actualizadoEn del reloj', () => {
    const { deps, turno } = nuevoEntorno();
    const r = cancelarTurno(deps, recepcion, { turnoId: turno.id, motivo: MOTIVO });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.turno).toMatchObject({
      estado: 'cancelado',
      motivoCancelacion: MOTIVO,
      canceladoPor: 'u-recepcion',
      actualizadoEn: AHORA,
    });
    expect(deps.turnos.buscarPorId(turno.id)).toEqual(r.valor.turno);
  });

  it.each([[undefined], [''], ['   ']])(
    'dado T reservado cuando recepcion cancela con motivo %j entonces falla con entrada y el turno sigue reservado',
    (motivo) => {
      const { deps, turno } = nuevoEntorno();
      const r = cancelarTurno(deps, recepcion, { turnoId: turno.id, motivo });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.tipo).toBe('entrada');
      expect(deps.turnos.buscarPorId(turno.id)?.estado).toBe('reservado');
    },
  );

  it('dado un id inexistente cuando recepcion cancela con motivo entonces falla con no-encontrado', () => {
    const { deps } = nuevoEntorno();
    const r = cancelarTurno(deps, recepcion, { turnoId: 'nada', motivo: MOTIVO });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('no-encontrado');
  });
});

describe('cancelarTurno - ventana de 24 h (RN-AG-06)', () => {
  it('dado T reservado y reloj a 25 h cuando el paciente cancela entonces queda cancelado', () => {
    const { deps, turno } = nuevoEntorno('2026-11-30T09:00:00-03:00');
    const r = cancelarTurno(deps, paciente, { turnoId: turno.id, motivo: 'No puedo asistir' });
    expect(r.ok && r.valor.turno.estado).toBe('cancelado');
  });

  it('dado T confirmado y reloj a exactamente 24 h cuando el paciente cancela entonces queda cancelado', () => {
    const { deps, turno } = nuevoEntorno('2026-11-30T10:00:00-03:00');
    cambiarEstadoTurno(deps, recepcion, { turnoId: turno.id, accion: 'confirmar' });
    const r = cancelarTurno(deps, paciente, { turnoId: turno.id, motivo: 'No puedo asistir' });
    expect(r.ok && r.valor.turno.estado).toBe('cancelado');
  });

  it('dado T reservado y reloj a 23 h cuando el paciente cancela entonces falla con RN-AG-06 y el turno sigue reservado', () => {
    const { deps, turno } = nuevoEntorno('2026-11-30T11:00:00-03:00');
    const r = cancelarTurno(deps, paciente, { turnoId: turno.id, motivo: 'No puedo asistir' });
    expect(r.ok).toBe(false);
    if (r.ok || r.error.tipo !== 'regla') throw new Error('se esperaba error de regla');
    expect(r.error.error.regla).toBe('RN-AG-06');
    expect(deps.turnos.buscarPorId(turno.id)?.estado).toBe('reservado');
  });

  it('dado T reservado y reloj a 1 h cuando recepcion cancela entonces queda cancelado', () => {
    const { deps, turno } = nuevoEntorno('2026-12-01T09:00:00-03:00');
    const r = cancelarTurno(deps, recepcion, { turnoId: turno.id, motivo: MOTIVO });
    expect(r.ok && r.valor.turno.estado).toBe('cancelado');
  });

  it('dado T confirmado ya iniciado cuando admin cancela entonces queda cancelado', () => {
    const { deps, turno } = nuevoEntorno('2026-12-01T10:10:00-03:00');
    cambiarEstadoTurno(deps, recepcion, { turnoId: turno.id, accion: 'confirmar' });
    const r = cancelarTurno(deps, admin, { turnoId: turno.id, motivo: 'Corte de luz' });
    expect(r.ok && r.valor.turno.estado).toBe('cancelado');
  });

  it('dado T atendido y reloj fuera de ventana cuando el paciente cancela entonces falla con RN-AG-09 y no con RN-AG-06', () => {
    const { deps, turno } = nuevoEntorno('2026-11-30T11:00:00-03:00');
    cambiarEstadoTurno(deps, recepcion, { turnoId: turno.id, accion: 'atender' });
    const r = cancelarTurno(deps, paciente, { turnoId: turno.id, motivo: 'No puedo asistir' });
    expect(r.ok).toBe(false);
    if (r.ok || r.error.tipo !== 'regla') throw new Error('se esperaba error de regla');
    expect(r.error.error.regla).toBe('RN-AG-09');
  });

  it('dado T atendido cuando recepcion lo cancela entonces falla con RN-AG-09 y el turno sigue atendido', () => {
    const { deps, turno } = nuevoEntorno();
    cambiarEstadoTurno(deps, recepcion, { turnoId: turno.id, accion: 'atender' });
    const r = cancelarTurno(deps, recepcion, { turnoId: turno.id, motivo: 'Pedido del paciente' });
    expect(r.ok).toBe(false);
    if (!r.ok && r.error.tipo === 'regla') expect(r.error.error.regla).toBe('RN-AG-09');
    expect(deps.turnos.buscarPorId(turno.id)?.estado).toBe('atendido');
  });
});

describe('cancelarTurno - permisos', () => {
  it('dado T reservado cuando u-odonto-1 cancela entonces falla con permiso y el turno sigue reservado', () => {
    const { deps, turno } = nuevoEntorno();
    const r = cancelarTurno(deps, odonto1, { turnoId: turno.id, motivo: 'Me enfermé' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('permiso');
    expect(deps.turnos.buscarPorId(turno.id)?.estado).toBe('reservado');
  });

  it('dado T atendido cuando u-odonto-1 cancela entonces falla con permiso y no con RN-AG-09', () => {
    const { deps, turno } = nuevoEntorno();
    cambiarEstadoTurno(deps, recepcion, { turnoId: turno.id, accion: 'atender' });
    const r = cancelarTurno(deps, odonto1, { turnoId: turno.id, motivo: 'Me enfermé' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('permiso');
  });

  it('dado un request sin usuario cuando cancela entonces falla con permiso', () => {
    const { deps, turno } = nuevoEntorno();
    const r = cancelarTurno(deps, undefined, { turnoId: turno.id, motivo: MOTIVO });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.tipo).toBe('permiso');
  });
});

describe('cancelarTurno - liberacion y evento turnoLiberado', () => {
  it('dado T cancelado cuando recepcion crea otro turno para pac-02 con prof-1 y sillon-1 a las 10:00 entonces se crea reservado', () => {
    const { deps, base, turno } = nuevoEntorno();
    cancelarTurno(deps, recepcion, { turnoId: turno.id, motivo: MOTIVO });
    const r = crearTurno(base, recepcion, {
      pacienteId: 'pac-02',
      prestacionId: 'prest-control',
      profesionalId: 'prof-1',
      sillonId: 'sillon-1',
      inicio: INICIO,
    });
    expect(r.ok && r.valor.estado).toBe('reservado');
  });

  it('dado T reservado cuando recepcion cancela entonces el resultado trae turnoLiberado con id, prof-1, sillon-1, inicio y fin y se publica una sola vez', () => {
    const { deps, turno, publicados } = nuevoEntorno();
    const r = cancelarTurno(deps, recepcion, { turnoId: turno.id, motivo: MOTIVO });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const esperado = {
      tipo: 'turnoLiberado',
      turnoId: turno.id,
      profesionalId: 'prof-1',
      sillonId: 'sillon-1',
      inicio: INICIO,
      fin: new Date('2026-12-01T10:30:00-03:00'),
      fecha: AHORA,
    };
    expect(r.valor.evento).toEqual(esperado);
    expect(publicados).toEqual([esperado]);
  });

  it('dado que no hay publicador cuando recepcion cancela entonces igual devuelve el evento', () => {
    const { deps, turno } = nuevoEntorno();
    const { eventos: _omitido, ...sinPublicador } = deps;
    const r = cancelarTurno(sinPublicador, recepcion, { turnoId: turno.id, motivo: MOTIVO });
    expect(r.ok && r.valor.evento.tipo).toBe('turnoLiberado');
  });

  it('dado T reservado y cancelacion del paciente rechazada por RN-AG-06 cuando se reintenta crear en el mismo horario entonces no se publica evento y el alta falla con RN-AG-02', () => {
    const { deps, base, turno, publicados } = nuevoEntorno('2026-11-30T11:00:00-03:00');
    const c = cancelarTurno(deps, paciente, { turnoId: turno.id, motivo: 'No puedo asistir' });
    expect(c.ok).toBe(false);
    expect(publicados).toHaveLength(0);
    const r = crearTurno(base, recepcion, {
      pacienteId: 'pac-02',
      prestacionId: 'prest-control',
      profesionalId: 'prof-1',
      sillonId: 'sillon-2',
      inicio: INICIO,
    });
    expect(r.ok).toBe(false);
    if (!r.ok && r.error.tipo === 'regla') expect(r.error.error.regla).toBe('RN-AG-02');
  });
});

describe('cancelarTurno - auditoria (RN-AU-01)', () => {
  it('dado T reservado cuando u-recepcion cancela entonces registra un evento cancelar con antes reservado y despues cancelado con motivo', () => {
    const { deps, turno, auditoria, eventosPrevios } = nuevoEntorno();
    cancelarTurno(deps, recepcion, { turnoId: turno.id, motivo: MOTIVO });
    const nuevos = auditoria.eventos().slice(eventosPrevios);
    expect(nuevos).toHaveLength(1);
    const [evento] = nuevos;
    expect(evento).toMatchObject({
      accion: 'cancelar',
      usuarioId: 'u-recepcion',
      rol: 'recepcion',
      fecha: AHORA,
      entidad: 'turno',
      entidadId: turno.id,
    });
    const detalle = JSON.parse(evento?.detalle ?? '{}') as {
      antes: { estado: string };
      despues: { estado: string; motivoCancelacion: string };
    };
    expect(detalle.antes.estado).toBe('reservado');
    expect(detalle.despues).toMatchObject({ estado: 'cancelado', motivoCancelacion: MOTIVO });
  });

  it('dado T atendido cuando recepcion intenta cancelar y se rechaza entonces no se registra ningun evento nuevo', () => {
    const { deps, turno, auditoria } = nuevoEntorno();
    cambiarEstadoTurno(deps, recepcion, { turnoId: turno.id, accion: 'atender' });
    const antes = auditoria.eventos().length;
    cancelarTurno(deps, recepcion, { turnoId: turno.id, motivo: 'Error de carga' });
    expect(auditoria.eventos()).toHaveLength(antes);
  });
});
