import { describe, it, expect } from 'vitest';
import { cambiarEstadoTurno } from '../../../src/application/agenda/cambiarEstadoTurno';
import { cancelarTurno, type TurnoLiberado } from '../../../src/application/agenda/cancelarTurno';
import { crearTurno } from '../../../src/application/agenda/crearTurno';
import { reprogramarTurno } from '../../../src/application/agenda/reprogramarTurno';
import type { Turno } from '../../../src/domain/agenda/turno';
import type { Usuario } from '../../../src/domain/shared/rol';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';
import { AuditoriaEnMemoria } from '../../../src/infrastructure/memory/auditoria-en-memoria';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';

const AHORA = new Date('2026-11-30T09:00:00-03:00');
const INICIO = new Date('2026-12-01T10:00:00-03:00');
const FIN = new Date('2026-12-01T10:30:00-03:00');

const admin: Usuario = { id: 'u-admin', nombre: 'Admin Ficticio', rol: 'admin' };
const recepcion: Usuario = { id: 'u-recepcion', nombre: 'Recepcionista Ficticia', rol: 'recepcion' };
const odonto1: Usuario = { id: 'u-odonto-1', nombre: 'Dra. Ficticia Perez', rol: 'odontologo', profesionalId: 'prof-1' };
const paciente: Usuario = { id: 'pac-usuario', nombre: 'Paciente Ficticio', rol: 'paciente' };

/** Hora local del consultorio (UTC-03:00), por defecto el 2026-12-01. */
const h = (hhmm: string, dia = '2026-12-01'): Date => new Date(`${dia}T${hhmm}:00-03:00`);

const nuevoEntorno = (reloj: Date = AHORA) => {
  const base = cargarSeed(new RelojFijo(AHORA));
  const crear = (pacienteId: string, profesionalId: string, sillonId: string, inicio: Date): Turno => {
    const r = crearTurno(base, recepcion, {
      pacienteId,
      prestacionId: 'prest-control',
      profesionalId,
      sillonId,
      inicio,
    });
    if (!r.ok) throw new Error(`No se pudo crear el turno: ${JSON.stringify(r.error)}`);
    return r.valor;
  };
  const turno = crear('pac-01', 'prof-1', 'sillon-1', INICIO);
  const publicados: TurnoLiberado[] = [];
  const deps = {
    ...base,
    clock: new RelojFijo(reloj),
    eventos: { publicar: (e: TurnoLiberado): void => void publicados.push(e) },
  };
  const auditoria = base.auditoria as AuditoriaEnMemoria;
  return { base, deps, turno, crear, auditoria, publicados, eventosPrevios: auditoria.eventos().length };
};

type Entorno = ReturnType<typeof nuevoEntorno>;

const sinCambios = (deps: Entorno['deps'], turno: Turno): void => {
  expect(deps.turnos.buscarPorId(turno.id)).toEqual(turno);
};

describe('reprogramarTurno - camino feliz y exclusion del propio turno', () => {
  it('dado T de 10:00 a 10:30 cuando recepcion reprograma a 10:15 entonces queda de 10:15 a 10:45 con el mismo id y persistido', () => {
    const { deps, turno } = nuevoEntorno();
    const r = reprogramarTurno(deps, recepcion, { turnoId: turno.id, inicio: h('10:15') });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.turno).toMatchObject({ id: turno.id, inicio: h('10:15'), fin: h('10:45') });
    expect(deps.turnos.buscarPorId(turno.id)).toEqual(r.valor.turno);
  });

  it('dado T cuando recepcion reprograma a 11:00 entonces conserva id, paciente, prestacion, estado y creador y fija actualizadoEn del reloj', () => {
    const { deps, turno } = nuevoEntorno();
    const r = reprogramarTurno(deps, recepcion, { turnoId: turno.id, inicio: h('11:00') });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.turno).toMatchObject({
      id: turno.id,
      pacienteId: 'pac-01',
      prestacionId: 'prest-control',
      estado: 'reservado',
      origen: turno.origen,
      creadoPor: 'u-recepcion',
      creadoEn: turno.creadoEn,
      inicio: h('11:00'),
      fin: h('11:30'),
      actualizadoEn: AHORA,
    });
  });

  it('dado T cuando recepcion lo reprograma al miercoles 2026-12-02 15:00 entonces queda de 15:00 a 15:30 ese dia', () => {
    const { deps, turno } = nuevoEntorno();
    const r = reprogramarTurno(deps, recepcion, { turnoId: turno.id, inicio: h('15:00', '2026-12-02') });
    expect(r.ok && [r.valor.turno.inicio, r.valor.turno.fin]).toEqual([
      h('15:00', '2026-12-02'),
      h('15:30', '2026-12-02'),
    ]);
  });

  it('dado T y U en sillon-1 de 11:00 a 11:30 cuando recepcion reprograma T a 10:30 (termina justo a las 11:00) entonces se acepta', () => {
    const { deps, turno, crear } = nuevoEntorno();
    crear('pac-02', 'prof-2', 'sillon-1', h('11:00'));
    const r = reprogramarTurno(deps, recepcion, { turnoId: turno.id, inicio: h('10:30') });
    expect(r.ok && [r.valor.turno.inicio, r.valor.turno.fin]).toEqual([h('10:30'), h('11:00')]);
  });
});

describe('reprogramarTurno - reglas de agenda (RN-AG-01..05)', () => {
  it('dado T y U de pac-02 con prof-2 en sillon-1 a las 11:00 cuando recepcion reprograma T a 11:00 entonces RN-AG-02 sillon con conflicto U y T no cambia', () => {
    const { deps, turno, crear } = nuevoEntorno();
    const u = crear('pac-02', 'prof-2', 'sillon-1', h('11:00'));
    const r = reprogramarTurno(deps, recepcion, { turnoId: turno.id, inicio: h('11:00') });
    expect(!r.ok && r.error.tipo === 'regla' && r.error.error).toMatchObject({
      regla: 'RN-AG-02',
      dimension: 'sillon',
      conflicto: { turnoId: u.id },
    });
    sinCambios(deps, turno);
  });

  it('dado T y U de prof-1 en sillon-2 a las 11:00 cuando recepcion reprograma T a 11:15 entonces RN-AG-02 profesional con conflicto U', () => {
    const { deps, turno, crear } = nuevoEntorno();
    const u = crear('pac-02', 'prof-1', 'sillon-2', h('11:00'));
    const r = reprogramarTurno(deps, recepcion, { turnoId: turno.id, inicio: h('11:15') });
    expect(!r.ok && r.error.tipo === 'regla' && r.error.error).toMatchObject({
      regla: 'RN-AG-02',
      dimension: 'profesional',
      conflicto: { turnoId: u.id },
    });
    sinCambios(deps, turno);
  });

  it('dado T y V de pac-01 con prof-2 en sillon-2 a las 11:00 cuando recepcion reprograma T a 11:00 entonces RN-AG-05 paciente con conflicto V', () => {
    const { deps, turno, crear } = nuevoEntorno();
    const v = crear('pac-01', 'prof-2', 'sillon-2', h('11:00'));
    const r = reprogramarTurno(deps, recepcion, { turnoId: turno.id, inicio: h('11:00') });
    expect(!r.ok && r.error.tipo === 'regla' && r.error.error).toMatchObject({
      regla: 'RN-AG-05',
      dimension: 'paciente',
      conflicto: { turnoId: v.id },
    });
    sinCambios(deps, turno);
  });

  it.each([
    ['12:45 (fuera de la franja 09:00-13:00)', '12:45', 'RN-AG-04'],
    ['18:30 (bloqueo de urgencias)', '18:30', 'RN-AG-04'],
    ['10:10 (no alineado a 15 minutos)', '10:10', 'RN-AG-03'],
  ])('dado T cuando recepcion reprograma a %s entonces se rechaza con %s y T no cambia', (_d, hora, regla) => {
    const { deps, turno } = nuevoEntorno();
    const r = reprogramarTurno(deps, recepcion, { turnoId: turno.id, inicio: h(hora) });
    expect(!r.ok && r.error.tipo === 'regla' && r.error.error.regla).toBe(regla);
    sinCambios(deps, turno);
  });
});

describe('reprogramarTurno - otro profesional o sillon', () => {
  it('dado T en sillon-1 cuando recepcion lo reprograma a 10:00 en sillon-2 entonces queda en sillon-2 con prof-1', () => {
    const { deps, turno } = nuevoEntorno();
    const r = reprogramarTurno(deps, recepcion, { turnoId: turno.id, inicio: INICIO, sillonId: 'sillon-2' });
    expect(r.ok && r.valor.turno).toMatchObject({
      sillonId: 'sillon-2',
      profesionalId: 'prof-1',
      inicio: INICIO,
      fin: FIN,
    });
  });

  it('dado T con prof-1 cuando recepcion lo reprograma a 11:00 con prof-2 entonces queda con prof-2 en sillon-1 de 11:00 a 11:30', () => {
    const { deps, turno } = nuevoEntorno();
    const r = reprogramarTurno(deps, recepcion, { turnoId: turno.id, inicio: h('11:00'), profesionalId: 'prof-2' });
    expect(r.ok && r.valor.turno).toMatchObject({
      profesionalId: 'prof-2',
      sillonId: 'sillon-1',
      inicio: h('11:00'),
      fin: h('11:30'),
    });
  });

  it('dado T y U con prof-2 en sillon-2 a las 10:00 cuando recepcion reprograma T a 10:00 con prof-2 entonces RN-AG-02 profesional con conflicto U', () => {
    const { deps, turno, crear } = nuevoEntorno();
    const u = crear('pac-02', 'prof-2', 'sillon-2', INICIO);
    const r = reprogramarTurno(deps, recepcion, { turnoId: turno.id, inicio: INICIO, profesionalId: 'prof-2' });
    expect(!r.ok && r.error.tipo === 'regla' && r.error.error).toMatchObject({
      regla: 'RN-AG-02',
      dimension: 'profesional',
      conflicto: { turnoId: u.id },
    });
  });

  it.each([
    ['profesionalId inexistente', { profesionalId: 'prof-inexistente' }],
    ['sillonId inexistente', { sillonId: 'sillon-inexistente' }],
    ['sillonId vacio', { sillonId: '' }],
    ['profesionalId vacio', { profesionalId: '' }],
  ])('dado T cuando recepcion reprograma a 11:00 con %s entonces falla con entrada y T no cambia', (_d, extra) => {
    const { deps, turno } = nuevoEntorno();
    const r = reprogramarTurno(deps, recepcion, { turnoId: turno.id, inicio: h('11:00'), ...extra });
    expect(!r.ok && r.error.tipo).toBe('entrada');
    sinCambios(deps, turno);
  });
});

describe('reprogramarTurno - permisos', () => {
  it('dado T cuando u-admin reprograma a 11:00 entonces se acepta', () => {
    const { deps, turno } = nuevoEntorno();
    expect(reprogramarTurno(deps, admin, { turnoId: turno.id, inicio: h('11:00') }).ok).toBe(true);
  });

  it('dado T de prof-1 cuando u-odonto-1 reprograma entonces falla con permiso y T no cambia', () => {
    const { deps, turno } = nuevoEntorno();
    const r = reprogramarTurno(deps, odonto1, { turnoId: turno.id, inicio: h('11:00') });
    expect(!r.ok && r.error.tipo).toBe('permiso');
    sinCambios(deps, turno);
  });

  it('dado T cuando un usuario undefined reprograma entonces falla con permiso', () => {
    const { deps, turno } = nuevoEntorno();
    const r = reprogramarTurno(deps, undefined, { turnoId: turno.id, inicio: h('11:00') });
    expect(!r.ok && r.error.tipo).toBe('permiso');
  });

  it('dado T atendido cuando u-odonto-1 reprograma entonces falla con permiso (no RN-AG-09)', () => {
    const { deps, turno } = nuevoEntorno();
    cambiarEstadoTurno(deps, recepcion, { turnoId: turno.id, accion: 'atender' });
    const r = reprogramarTurno(deps, odonto1, { turnoId: turno.id, inicio: h('11:00') });
    expect(!r.ok && r.error.tipo).toBe('permiso');
  });

  it('dado un id inexistente y un odontologo cuando reprograma entonces falla con permiso antes que no-encontrado', () => {
    const { deps } = nuevoEntorno();
    const r = reprogramarTurno(deps, odonto1, { turnoId: 'nada', inicio: h('11:00') });
    expect(!r.ok && r.error.tipo).toBe('permiso');
  });

  it('dado un id inexistente y un inicio ausente cuando un odontologo reprograma entonces falla con permiso antes que entrada', () => {
    const { deps } = nuevoEntorno();
    const r = reprogramarTurno(deps, odonto1, { turnoId: 'nada', inicio: undefined });
    expect(!r.ok && r.error.tipo).toBe('permiso');
  });
});

describe('reprogramarTurno - estados que admiten reprogramacion (RN-AG-09)', () => {
  it('dado T confirmado cuando recepcion reprograma a 11:00 entonces se acepta y sigue confirmado', () => {
    const { deps, turno } = nuevoEntorno();
    cambiarEstadoTurno(deps, recepcion, { turnoId: turno.id, accion: 'confirmar' });
    const r = reprogramarTurno(deps, recepcion, { turnoId: turno.id, inicio: h('11:00') });
    expect(r.ok && r.valor.turno).toMatchObject({ estado: 'confirmado', inicio: h('11:00'), fin: h('11:30') });
  });

  it.each([
    ['cancelado', (e: Entorno) => cancelarTurno(e.deps, recepcion, { turnoId: e.turno.id, motivo: 'Aviso' })],
    ['atendido', (e: Entorno) => cambiarEstadoTurno(e.deps, recepcion, { turnoId: e.turno.id, accion: 'atender' })],
    ['ausente', (e: Entorno) => cambiarEstadoTurno(e.deps, recepcion, { turnoId: e.turno.id, accion: 'ausente' })],
  ])('dado T %s cuando recepcion reprograma a 11:00 entonces RN-AG-09 con conflicto T y T no cambia', (_estado, llevar) => {
    const entorno = nuevoEntorno();
    llevar(entorno);
    const { deps, turno } = entorno;
    const final = deps.turnos.buscarPorId(turno.id);
    const r = reprogramarTurno(deps, recepcion, { turnoId: turno.id, inicio: h('11:00') });
    expect(!r.ok && r.error.tipo === 'regla' && r.error.error).toMatchObject({
      regla: 'RN-AG-09',
      conflicto: { turnoId: turno.id },
    });
    expect(deps.turnos.buscarPorId(turno.id)).toEqual(final);
  });

  it('dado T ausente cuando recepcion reprograma a 12:45 entonces RN-AG-09 (no RN-AG-04)', () => {
    const entorno = nuevoEntorno();
    cambiarEstadoTurno(entorno.deps, recepcion, { turnoId: entorno.turno.id, accion: 'ausente' });
    const r = reprogramarTurno(entorno.deps, recepcion, { turnoId: entorno.turno.id, inicio: h('12:45') });
    expect(!r.ok && r.error.tipo === 'regla' && r.error.error.regla).toBe('RN-AG-09');
  });

  it('dado T cancelado cuando el paciente a 23 h reprograma entonces RN-AG-09 antes que RN-AG-06', () => {
    const entorno = nuevoEntorno(new Date('2026-11-30T11:00:00-03:00'));
    cancelarTurno({ ...entorno.deps, clock: new RelojFijo(AHORA) }, recepcion, {
      turnoId: entorno.turno.id,
      motivo: 'Aviso',
    });
    const r = reprogramarTurno(entorno.deps, paciente, { turnoId: entorno.turno.id, inicio: h('11:00') });
    expect(!r.ok && r.error.tipo === 'regla' && r.error.error.regla).toBe('RN-AG-09');
  });
});

describe('reprogramarTurno - ventana de 24 h del paciente (RN-AG-06)', () => {
  const DOS_DIC_10 = h('10:00', '2026-12-02');

  it.each([
    ['25 h', '2026-11-30T09:00:00-03:00'],
    ['24 h exactas', '2026-11-30T10:00:00-03:00'],
  ])('dado T y reloj a %s del inicio cuando el paciente reprograma al 2026-12-02 10:00 entonces se acepta', (_d, reloj) => {
    const { deps, turno } = nuevoEntorno(new Date(reloj));
    const r = reprogramarTurno(deps, paciente, { turnoId: turno.id, inicio: DOS_DIC_10 });
    expect(r.ok && r.valor.turno.inicio).toEqual(DOS_DIC_10);
  });

  it('dado T y reloj a 23 h cuando el paciente reprograma entonces RN-AG-06 con conflicto T, mensaje de reprogramar y T no cambia', () => {
    const { deps, turno } = nuevoEntorno(new Date('2026-11-30T11:00:00-03:00'));
    const r = reprogramarTurno(deps, paciente, { turnoId: turno.id, inicio: DOS_DIC_10 });
    expect(!r.ok && r.error.tipo === 'regla' && r.error.error).toMatchObject({
      regla: 'RN-AG-06',
      conflicto: { turnoId: turno.id },
      mensaje: 'Solo se puede reprogramar con 24 horas o más de anticipación.',
    });
    sinCambios(deps, turno);
  });

  it('dado T y reloj a 1 h cuando recepcion reprograma a 11:00 entonces se acepta', () => {
    const { deps, turno } = nuevoEntorno(new Date('2026-12-01T09:00:00-03:00'));
    const r = reprogramarTurno(deps, recepcion, { turnoId: turno.id, inicio: h('11:00') });
    expect(r.ok).toBe(true);
  });

  it('dado T y reloj a 23 h cuando el paciente reprograma a 12:45 entonces RN-AG-06 (no RN-AG-04)', () => {
    const { deps, turno } = nuevoEntorno(new Date('2026-11-30T11:00:00-03:00'));
    const r = reprogramarTurno(deps, paciente, { turnoId: turno.id, inicio: h('12:45') });
    expect(!r.ok && r.error.tipo === 'regla' && r.error.error.regla).toBe('RN-AG-06');
  });
});

describe('reprogramarTurno - entrada y no encontrado', () => {
  it('dado T cuando recepcion reprograma sin inicio entonces falla con entrada y T no cambia', () => {
    const { deps, turno } = nuevoEntorno();
    const r = reprogramarTurno(deps, recepcion, { turnoId: turno.id, inicio: undefined });
    expect(!r.ok && r.error.tipo).toBe('entrada');
    sinCambios(deps, turno);
  });

  it('dado T cuando recepcion reprograma con un inicio invalido (NaN) entonces falla con entrada', () => {
    const { deps, turno } = nuevoEntorno();
    const r = reprogramarTurno(deps, recepcion, { turnoId: turno.id, inicio: new Date(Number.NaN) });
    expect(!r.ok && r.error.tipo).toBe('entrada');
  });

  it('dado T cuando recepcion reprograma al mismo inicio, profesional y sillon entonces falla con entrada y no audita ni publica', () => {
    const { deps, turno, auditoria, eventosPrevios, publicados } = nuevoEntorno();
    const r = reprogramarTurno(deps, recepcion, {
      turnoId: turno.id,
      inicio: new Date(INICIO.getTime()),
      profesionalId: 'prof-1',
      sillonId: 'sillon-1',
    });
    expect(!r.ok && r.error.tipo).toBe('entrada');
    expect(auditoria.eventos()).toHaveLength(eventosPrevios);
    expect(publicados).toHaveLength(0);
  });

  it('dado T cuando recepcion reprograma al mismo inicio pero otro sillon entonces no es un no-op y se acepta', () => {
    const { deps, turno } = nuevoEntorno();
    const r = reprogramarTurno(deps, recepcion, { turnoId: turno.id, inicio: INICIO, sillonId: 'sillon-2' });
    expect(r.ok).toBe(true);
  });

  it('dado un id inexistente cuando recepcion reprograma entonces falla con no-encontrado', () => {
    const { deps } = nuevoEntorno();
    const r = reprogramarTurno(deps, recepcion, { turnoId: 'turno-inexistente', inicio: h('11:00') });
    expect(!r.ok && r.error.tipo).toBe('no-encontrado');
  });
});

describe('reprogramarTurno - liberacion del horario y evento turnoLiberado', () => {
  it('dado T reprogramado a 11:00 cuando recepcion crea un turno de pac-02 con prof-1 en sillon-1 a las 10:00 entonces se crea reservado', () => {
    const { deps, base, turno } = nuevoEntorno();
    reprogramarTurno(deps, recepcion, { turnoId: turno.id, inicio: h('11:00') });
    const r = crearTurno(base, recepcion, {
      pacienteId: 'pac-02',
      prestacionId: 'prest-control',
      profesionalId: 'prof-1',
      sillonId: 'sillon-1',
      inicio: INICIO,
    });
    expect(r.ok && r.valor.estado).toBe('reservado');
  });

  it('dado T cuando recepcion lo reprograma a 11:00 en sillon-2 entonces devuelve y publica una vez turnoLiberado con el horario anterior', () => {
    const { deps, turno, publicados } = nuevoEntorno();
    const r = reprogramarTurno(deps, recepcion, { turnoId: turno.id, inicio: h('11:00'), sillonId: 'sillon-2' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.evento).toEqual({
      tipo: 'turnoLiberado',
      turnoId: turno.id,
      profesionalId: 'prof-1',
      sillonId: 'sillon-1',
      inicio: INICIO,
      fin: FIN,
      fecha: AHORA,
    });
    expect(publicados).toEqual([r.valor.evento]);
  });

  it('dado T y deps sin publicador cuando recepcion reprograma entonces igual devuelve el evento', () => {
    const { base, turno } = nuevoEntorno();
    const r = reprogramarTurno(base, recepcion, { turnoId: turno.id, inicio: h('11:00') });
    expect(r.ok && r.valor.evento.turnoId).toBe(turno.id);
  });

  it('dado T y reloj a 23 h cuando el paciente reprograma y se rechaza por RN-AG-06 entonces no publica y el horario sigue ocupado (RN-AG-02)', () => {
    const { deps, base, turno, publicados } = nuevoEntorno(new Date('2026-11-30T11:00:00-03:00'));
    const r = reprogramarTurno(deps, paciente, { turnoId: turno.id, inicio: h('11:00') });
    expect(!r.ok && r.error.tipo === 'regla' && r.error.error.regla).toBe('RN-AG-06');
    expect(publicados).toHaveLength(0);
    const alta = crearTurno(base, recepcion, {
      pacienteId: 'pac-02',
      prestacionId: 'prest-control',
      profesionalId: 'prof-1',
      sillonId: 'sillon-1',
      inicio: INICIO,
    });
    expect(!alta.ok && alta.error.tipo === 'regla' && alta.error.error.regla).toBe('RN-AG-02');
  });
});

describe('reprogramarTurno - auditoria (RN-AU-01)', () => {
  it('dado T cuando u-recepcion lo reprograma a 11:00 en sillon-2 entonces audita reprogramar con antes y despues', () => {
    const { deps, turno, auditoria, eventosPrevios } = nuevoEntorno();
    const r = reprogramarTurno(deps, recepcion, { turnoId: turno.id, inicio: h('11:00'), sillonId: 'sillon-2' });
    expect(r.ok).toBe(true);
    const nuevos = auditoria.eventos().slice(eventosPrevios);
    expect(nuevos).toHaveLength(1);
    expect(nuevos[0]).toMatchObject({
      usuarioId: 'u-recepcion',
      rol: 'recepcion',
      accion: 'reprogramar',
      entidad: 'turno',
      entidadId: turno.id,
      fecha: AHORA,
    });
    const detalle = JSON.parse(nuevos[0]?.detalle ?? '{}') as {
      antes: { inicio: string; sillonId: string };
      despues: { inicio: string; sillonId: string };
    };
    expect(detalle.antes).toMatchObject({ inicio: INICIO.toISOString(), sillonId: 'sillon-1' });
    expect(detalle.despues).toMatchObject({ inicio: h('11:00').toISOString(), sillonId: 'sillon-2' });
  });

  it('dado T y U en sillon-1 a las 11:00 cuando recepcion reprograma T a 11:00 y falla por RN-AG-02 entonces no audita', () => {
    const { deps, turno, crear, auditoria } = nuevoEntorno();
    crear('pac-02', 'prof-2', 'sillon-1', h('11:00'));
    const previos = auditoria.eventos().length;
    const r = reprogramarTurno(deps, recepcion, { turnoId: turno.id, inicio: h('11:00') });
    expect(r.ok).toBe(false);
    expect(auditoria.eventos()).toHaveLength(previos);
  });
});
