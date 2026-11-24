import { describe, it, expect } from 'vitest';
import type { EstadoTurno, Turno } from '../../../src/domain/agenda/turno';
import type { Rol, Usuario } from '../../../src/domain/shared/rol';
import { TurnoRepositoryEnMemoria } from '../../../src/infrastructure/memory/turno-repository';
import { AuditoriaEnMemoria } from '../../../src/infrastructure/memory/auditoria-en-memoria';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';
import { MONTO_SENA_SIMULADA } from '../../../src/simulators/mercadopago/pagoSena';
import { PagoSenaRepositoryEnMemoria } from '../../../src/simulators/mercadopago/pagoSenaRepository';
import { pagarSena, type DepsPagarSena } from '../../../src/simulators/mercadopago/pagarSena';

const AHORA = new Date('2026-11-30T09:00:00-03:00');
const PACIENTE: Usuario = { id: 'pac-usuario', nombre: 'pac-usuario', rol: 'paciente' };
const usuarioCon = (rol: Rol): Usuario => ({ id: `u-${rol}`, nombre: `u-${rol}`, rol });

/** Turno de referencia T del spec (datos ficticios). */
const turnoT = (estado: EstadoTurno = 'reservado', senado = false): Turno => ({
  id: 'turno-T',
  pacienteId: 'pac-01',
  prestacionId: 'prest-control',
  profesionalId: 'prof-1',
  sillonId: 'sillon-1',
  inicio: new Date('2026-12-01T10:00:00-03:00'),
  fin: new Date('2026-12-01T10:30:00-03:00'),
  estado,
  senado,
  esSobreturno: false,
  origen: 'recepcion',
  creadoPor: 'u-recepcion',
  creadoEn: new Date('2026-11-29T12:00:00-03:00'),
});

interface Escenario {
  deps: DepsPagarSena;
  turnos: TurnoRepositoryEnMemoria<Turno>;
  pagos: PagoSenaRepositoryEnMemoria;
  auditoria: AuditoriaEnMemoria;
}

const escenario = (...iniciales: Turno[]): Escenario => {
  const turnos = new TurnoRepositoryEnMemoria<Turno>();
  for (const t of iniciales) turnos.guardar(t);
  const pagos = new PagoSenaRepositoryEnMemoria();
  const auditoria = new AuditoriaEnMemoria();
  return { deps: { turnos, pagos, auditoria, clock: new RelojFijo(AHORA) }, turnos, pagos, auditoria };
};

const accionesSena = (a: AuditoriaEnMemoria) =>
  a.eventos().filter((e) => e.accion === 'sena_aprobada' || e.accion === 'sena_rechazada');

/** Verifica que un fallo no dejo rastro: ni pago, ni auditoria, ni cambio en el turno. */
const sinEfectos = (e: Escenario, antes: Turno | undefined) => {
  expect(e.pagos.listarPorTurno('turno-T')).toEqual([]);
  expect(accionesSena(e.auditoria)).toEqual([]);
  expect(e.turnos.buscarPorId('turno-T')).toEqual(antes);
};

describe('pagarSena: pago aprobado', () => {
  for (const estado of ['reservado', 'confirmado'] as const) {
    it(`dado T ${estado} sin señar cuando el paciente paga aprobado entonces T queda señado, sigue ${estado} y se registra el pago`, () => {
      const e = escenario(turnoT(estado));
      const r = pagarSena(e.deps, PACIENTE, { turnoId: 'turno-T', resultado: 'aprobado' });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.valor.pago.estado).toBe('aprobado');
      expect(r.valor.turno.senado).toBe(true);
      const guardado = e.turnos.buscarPorId('turno-T');
      expect(guardado?.senado).toBe(true);
      expect(guardado?.estado).toBe(estado);
      expect(guardado?.actualizadoEn).toEqual(AHORA);
      expect(e.pagos.listarPorTurno('turno-T')).toHaveLength(1);
    });
  }

  it('dado T reservado cuando el paciente paga aprobado entonces el pago tiene id, turnoId, monto ficticio, estado, fecha del reloj y simulado', () => {
    const e = escenario(turnoT());
    const r = pagarSena(e.deps, PACIENTE, { turnoId: 'turno-T', resultado: 'aprobado' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.pago).toEqual({
      id: expect.any(String),
      turnoId: 'turno-T',
      monto: MONTO_SENA_SIMULADA,
      estado: 'aprobado',
      fecha: AHORA,
      simulado: true,
    });
    expect(r.valor.pago.id).not.toBe('');
    expect(e.pagos.listarPorTurno('turno-T')).toEqual([r.valor.pago]);
  });
});

describe('pagarSena: pago rechazado', () => {
  it('dado T reservado cuando el paciente paga rechazado entonces se registra el pago rechazado y T no cambia', () => {
    const antes = turnoT();
    const e = escenario(antes);
    const r = pagarSena(e.deps, PACIENTE, { turnoId: 'turno-T', resultado: 'rechazado' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.pago.estado).toBe('rechazado');
    expect(r.valor.turno.senado).toBe(false);
    expect(e.turnos.buscarPorId('turno-T')).toEqual(antes);
    expect(e.pagos.listarPorTurno('turno-T').map((p) => p.estado)).toEqual(['rechazado']);
  });

  it('dado T con un pago rechazado previo cuando el paciente paga aprobado entonces T queda señado y hay dos pagos', () => {
    const e = escenario(turnoT());
    pagarSena(e.deps, PACIENTE, { turnoId: 'turno-T', resultado: 'rechazado' });
    const r = pagarSena(e.deps, PACIENTE, { turnoId: 'turno-T', resultado: 'aprobado' });
    expect(r.ok).toBe(true);
    expect(e.turnos.buscarPorId('turno-T')?.senado).toBe(true);
    expect(e.pagos.listarPorTurno('turno-T').map((p) => p.estado)).toEqual(['rechazado', 'aprobado']);
  });
});

describe('pagarSena: solo turnos reservados o confirmados (SU-07)', () => {
  for (const estado of ['cancelado', 'atendido', 'ausente'] as const) {
    it(`dado T ${estado} cuando el paciente paga aprobado entonces falla con RN-SM-01 y no deja efectos`, () => {
      const antes = turnoT(estado);
      const e = escenario(antes);
      const r = pagarSena(e.deps, PACIENTE, { turnoId: 'turno-T', resultado: 'aprobado' });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error).toEqual({
        tipo: 'regla',
        error: expect.objectContaining({ regla: 'RN-SM-01', conflicto: { turnoId: 'turno-T' } }),
      });
      sinEfectos(e, antes);
    });
  }

  it('dado T cancelado cuando el paciente paga rechazado entonces tambien falla con RN-SM-01', () => {
    const antes = turnoT('cancelado');
    const e = escenario(antes);
    const r = pagarSena(e.deps, PACIENTE, { turnoId: 'turno-T', resultado: 'rechazado' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.tipo).toBe('regla');
    sinEfectos(e, antes);
  });
});

describe('pagarSena: turno ya señado', () => {
  it('dado T señado por un pago aprobado previo cuando el paciente paga aprobado otra vez entonces falla "turno ya señado" y sigue habiendo un solo aprobado', () => {
    const e = escenario(turnoT());
    pagarSena(e.deps, PACIENTE, { turnoId: 'turno-T', resultado: 'aprobado' });
    const r = pagarSena(e.deps, PACIENTE, { turnoId: 'turno-T', resultado: 'aprobado' });
    expect(r.ok).toBe(false);
    if (r.ok || r.error.tipo !== 'regla') throw new Error('se esperaba un error de regla');
    expect(r.error.error.regla).toBe('RN-SM-01');
    expect(r.error.error.mensaje).toContain('turno ya señado');
    expect(e.pagos.listarPorTurno('turno-T').filter((p) => p.estado === 'aprobado')).toHaveLength(1);
    expect(accionesSena(e.auditoria)).toHaveLength(1);
  });

  it('dado T ya señado cuando el paciente paga rechazado entonces falla con RN-SM-01 y T sigue señado', () => {
    const antes = turnoT('reservado', true);
    const e = escenario(antes);
    const r = pagarSena(e.deps, PACIENTE, { turnoId: 'turno-T', resultado: 'rechazado' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.tipo).toBe('regla');
    sinEfectos(e, antes);
  });
});

describe('pagarSena: turno inexistente', () => {
  it('dado que no existe turno-inexistente cuando el paciente lo paga entonces falla con no-encontrado sin registrar pagos', () => {
    const e = escenario();
    const r = pagarSena(e.deps, PACIENTE, { turnoId: 'turno-inexistente', resultado: 'aprobado' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.tipo).toBe('no-encontrado');
    expect(e.pagos.listarPorTurno('turno-inexistente')).toEqual([]);
    expect(accionesSena(e.auditoria)).toEqual([]);
  });
});

describe('pagarSena: permisos', () => {
  for (const rol of ['admin', 'recepcion', 'odontologo'] as const) {
    it(`dado T reservado cuando ${rol} paga aprobado entonces falla con permiso y no deja efectos`, () => {
      const antes = turnoT();
      const e = escenario(antes);
      const r = pagarSena(e.deps, usuarioCon(rol), { turnoId: 'turno-T', resultado: 'aprobado' });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.tipo).toBe('permiso');
      sinEfectos(e, antes);
    });
  }

  it('dado T reservado cuando se paga sin usuario entonces falla con permiso', () => {
    const antes = turnoT();
    const e = escenario(antes);
    const r = pagarSena(e.deps, undefined, { turnoId: 'turno-T', resultado: 'aprobado' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.tipo).toBe('permiso');
    sinEfectos(e, antes);
  });

  it('dado un rol no habilitado y un cuerpo invalido cuando paga entonces el permiso se informa primero', () => {
    const e = escenario(turnoT());
    const r = pagarSena(e.deps, usuarioCon('recepcion'), { resultado: 'pendiente' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.tipo).toBe('permiso');
  });
});

describe('pagarSena: entrada', () => {
  const invalidas: readonly [string, unknown][] = [
    ['resultado pendiente', { turnoId: 'turno-T', resultado: 'pendiente' }],
    ['sin turnoId', { resultado: 'aprobado' }],
    ['turnoId vacio', { turnoId: '', resultado: 'aprobado' }],
    ['un arreglo', ['aprobado']],
    ['null', null],
  ];
  for (const [nombre, cuerpo] of invalidas) {
    it(`dado T reservado cuando el paciente envia ${nombre} entonces falla con entrada y no deja efectos`, () => {
      const antes = turnoT();
      const e = escenario(antes);
      const r = pagarSena(e.deps, PACIENTE, cuerpo);
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.tipo).toBe('entrada');
      sinEfectos(e, antes);
    });
  }
});

describe('pagarSena: auditoria', () => {
  it('dado T reservado cuando el paciente paga aprobado entonces se audita sena_aprobada sobre el turno', () => {
    const e = escenario(turnoT());
    const r = pagarSena(e.deps, PACIENTE, { turnoId: 'turno-T', resultado: 'aprobado' });
    if (!r.ok) throw new Error('se esperaba exito');
    const eventos = accionesSena(e.auditoria);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      accion: 'sena_aprobada',
      entidad: 'turno',
      entidadId: 'turno-T',
      usuarioId: 'pac-usuario',
      rol: 'paciente',
      fecha: AHORA,
    });
    expect(JSON.parse(eventos[0]?.detalle ?? '{}')).toMatchObject({ pagoId: r.valor.pago.id, simulado: true });
  });

  it('dado T reservado cuando el paciente paga rechazado entonces se audita sena_rechazada', () => {
    const e = escenario(turnoT());
    pagarSena(e.deps, PACIENTE, { turnoId: 'turno-T', resultado: 'rechazado' });
    expect(accionesSena(e.auditoria).map((ev) => ev.accion)).toEqual(['sena_rechazada']);
  });

  it('dado T atendido cuando el paciente paga aprobado entonces no se audita nada de seña', () => {
    const e = escenario(turnoT('atendido'));
    pagarSena(e.deps, PACIENTE, { turnoId: 'turno-T', resultado: 'aprobado' });
    expect(accionesSena(e.auditoria)).toEqual([]);
  });
});
