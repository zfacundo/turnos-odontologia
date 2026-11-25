import { describe, expect, it } from 'vitest';
import { crearTurno } from '../../../src/application/agenda/crearTurno';
import { resumenDelDia } from '../../../src/application/panel/resumenDelDia';
import type { Turno } from '../../../src/domain/agenda/turno';
import type { Usuario } from '../../../src/domain/shared/rol';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';

const ANTES = new Date('2026-11-30T09:00:00-03:00');

const admin: Usuario = { id: 'u-admin', nombre: 'Admin Ficticio', rol: 'admin' };
const recepcion: Usuario = { id: 'u-recepcion', nombre: 'Recepcionista Ficticia', rol: 'recepcion' };
const odonto1: Usuario = { id: 'u-odonto-1', nombre: 'Dra. Ficticia Perez', rol: 'odontologo', profesionalId: 'prof-1' };
const paciente: Usuario = { id: 'pac-usuario', nombre: 'Paciente Ficticio', rol: 'paciente' };

interface Carga {
  readonly inicio: string;
  readonly profesionalId?: string;
  readonly sillonId?: string;
  readonly pacienteId?: string;
  readonly estado?: Turno['estado'];
  readonly senado?: boolean;
}

/** Seed real, turnos creados con el reloj en ANTES; el resumen se pide con `ahora`. */
const entorno = (cargas: readonly Carga[], ahora: string = '2026-12-01T08:00:00-03:00') => {
  const base = cargarSeed(new RelojFijo(ANTES));
  const creados: Turno[] = [];
  for (const c of cargas) {
    const profesionalId = c.profesionalId ?? 'prof-1';
    const r = crearTurno(base, recepcion, {
      pacienteId: c.pacienteId ?? 'pac-01',
      prestacionId: 'prest-control',
      profesionalId,
      sillonId: c.sillonId ?? (profesionalId === 'prof-1' ? 'sillon-1' : 'sillon-2'),
      inicio: new Date(c.inicio),
    });
    if (!r.ok) throw new Error(`no se pudo crear el turno ${c.inicio}`);
    const t: Turno = { ...r.valor, ...(c.estado !== undefined && { estado: c.estado }), ...(c.senado !== undefined && { senado: c.senado }) };
    base.turnos.actualizar(t);
    creados.push(t);
  }
  return { deps: { ...base, clock: new RelojFijo(new Date(ahora)) }, creados };
};

describe('resumenDelDia - conteos', () => {
  it('dado 2 reservados, 1 confirmado y 1 cancelado el 2026-12-01 cuando admin pide el resumen entonces cuenta 3 sin la clave cancelado', () => {
    const { deps } = entorno([
      { inicio: '2026-12-01T10:00:00-03:00' },
      { inicio: '2026-12-01T10:30:00-03:00', pacienteId: 'pac-02' },
      { inicio: '2026-12-01T11:00:00-03:00', pacienteId: 'pac-03', estado: 'confirmado' },
      { inicio: '2026-12-01T11:30:00-03:00', pacienteId: 'pac-04', estado: 'cancelado' },
    ]);
    const r = resumenDelDia(deps, admin, '2026-12-01');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.fecha).toBe('2026-12-01');
    expect(r.valor.turnosDelDia).toBe(3);
    expect(r.valor.porEstado).toEqual({ reservado: 2, confirmado: 1, atendido: 0, ausente: 0 });
    expect('cancelado' in r.valor.porEstado).toBe(false);
  });

  it('dado un dia sin turnos cuando recepcion pide el resumen entonces todo vale 0 y proximos esta vacio', () => {
    const { deps } = entorno([{ inicio: '2026-12-01T10:00:00-03:00' }]);
    const r = resumenDelDia(deps, recepcion, '2026-12-06');
    expect(r.ok && r.valor.turnosDelDia).toBe(0);
    expect(r.ok && r.valor.porEstado).toEqual({ reservado: 0, confirmado: 0, atendido: 0, ausente: 0 });
    expect(r.ok && r.valor.senados).toBe(0);
    expect(r.ok && r.valor.proximos).toEqual([]);
  });

  it('dado el reloj en 23:30 del 2026-12-01 cuando se omite la fecha entonces usa la fecha local 2026-12-01', () => {
    const { deps } = entorno([], '2026-12-01T23:30:00-03:00');
    const r = resumenDelDia(deps, admin, undefined);
    expect(r.ok && r.valor.fecha).toBe('2026-12-01');
  });

  it('dado el reloj en 00:30 del 2026-12-02 cuando se omite la fecha entonces usa 2026-12-02', () => {
    const { deps } = entorno([], '2026-12-02T00:30:00-03:00');
    const r = resumenDelDia(deps, admin, undefined);
    expect(r.ok && r.valor.fecha).toBe('2026-12-02');
  });

  it('dado un turno que empieza 2026-12-02 00:00 cuando se pide el resumen del 2026-12-01 entonces no se cuenta', () => {
    const { deps } = entorno([{ inicio: '2026-12-02T09:00:00-03:00' }]);
    // Un turno del 02/12 a las 00:00 no cabe en la disponibilidad real: se inserta directo en el repo.
    const t = deps.turnos.listarActivos()[0];
    if (t === undefined) throw new Error('falta el turno');
    deps.turnos.guardar({
      ...t,
      id: 'borde',
      inicio: new Date('2026-12-02T00:00:00-03:00'),
      fin: new Date('2026-12-02T00:30:00-03:00'),
    });
    const r = resumenDelDia(deps, admin, '2026-12-01');
    expect(r.ok && r.valor.turnosDelDia).toBe(0);
    const dia2 = resumenDelDia(deps, admin, '2026-12-02');
    expect(dia2.ok && dia2.valor.turnosDelDia).toBe(2);
  });

  it('dado 2 turnos senados y 1 no senado mas un senado cancelado cuando se pide el resumen entonces senados vale 2', () => {
    const { deps } = entorno([
      { inicio: '2026-12-01T10:00:00-03:00', senado: true },
      { inicio: '2026-12-01T10:30:00-03:00', pacienteId: 'pac-02', senado: true },
      { inicio: '2026-12-01T11:00:00-03:00', pacienteId: 'pac-03' },
      { inicio: '2026-12-01T11:30:00-03:00', pacienteId: 'pac-04', senado: true, estado: 'cancelado' },
    ]);
    const r = resumenDelDia(deps, admin, '2026-12-01');
    expect(r.ok && r.valor.senados).toBe(2);
  });
});

describe('resumenDelDia - huecos libres', () => {
  it('dado el resumen de un dia habil cuando se crea un turno valido ese dia entonces huecosLibres baja', () => {
    const { deps } = entorno([]);
    const antes = resumenDelDia(deps, admin, '2026-12-01');
    expect(antes.ok && antes.valor.huecosLibres).toBeGreaterThan(0);
    const r = crearTurno(deps, recepcion, {
      pacienteId: 'pac-01',
      prestacionId: 'prest-control',
      profesionalId: 'prof-1',
      sillonId: 'sillon-1',
      inicio: new Date('2026-12-01T10:00:00-03:00'),
    });
    expect(r.ok).toBe(true);
    const despues = resumenDelDia(deps, admin, '2026-12-01');
    expect(antes.ok && despues.ok && despues.valor.huecosLibres < antes.valor.huecosLibres).toBe(true);
  });

  it('dado un fin de semana sin disponibilidad cuando se pide el resumen entonces huecosLibres es 0', () => {
    const { deps } = entorno([]);
    const r = resumenDelDia(deps, admin, '2026-12-06');
    expect(r.ok && r.valor.huecosLibres).toBe(0);
  });

  it('dado un odontologo cuando pide el resumen entonces sus huecos son menores que los del admin', () => {
    const { deps } = entorno([]);
    const a = resumenDelDia(deps, admin, '2026-12-01');
    const o = resumenDelDia(deps, odonto1, '2026-12-01');
    expect(a.ok && o.ok && o.valor.huecosLibres > 0 && o.valor.huecosLibres < a.valor.huecosLibres).toBe(true);
  });
});

describe('resumenDelDia - proximos', () => {
  const SIETE: readonly Carga[] = [
    { inicio: '2026-12-01T14:00:00-03:00' },
    { inicio: '2026-12-01T09:00:00-03:00', pacienteId: 'pac-02' },
    { inicio: '2026-12-01T11:00:00-03:00', pacienteId: 'pac-03' },
    { inicio: '2026-12-01T10:00:00-03:00', pacienteId: 'pac-04' },
    { inicio: '2026-12-01T09:30:00-03:00', pacienteId: 'pac-05', profesionalId: 'prof-2' },
    { inicio: '2026-12-01T10:30:00-03:00', pacienteId: 'pac-06' },
    { inicio: '2026-12-01T11:30:00-03:00', pacienteId: 'pac-07' },
  ];

  it('dado 7 turnos futuros el 2026-12-01 cuando se pide el resumen a las 08:00 entonces proximos tiene 5 ordenados por inicio', () => {
    const { deps } = entorno(SIETE, '2026-12-01T08:00:00-03:00');
    const r = resumenDelDia(deps, admin, '2026-12-01');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.turnosDelDia).toBe(7);
    expect(r.valor.proximos.map((p) => p.inicio.toISOString())).toEqual(
      [
        '2026-12-01T09:00:00-03:00',
        '2026-12-01T09:30:00-03:00',
        '2026-12-01T10:00:00-03:00',
        '2026-12-01T10:30:00-03:00',
        '2026-12-01T11:00:00-03:00',
      ].map((s) => new Date(s).toISOString()),
    );
  });

  it('dado el reloj en 12:00 y un turno a las 10:00 cuando se pide el resumen entonces el de las 10:00 no esta en proximos pero si cuenta en el dia', () => {
    const { deps, creados } = entorno(
      [{ inicio: '2026-12-01T10:00:00-03:00' }, { inicio: '2026-12-01T12:00:00-03:00', pacienteId: 'pac-02' }],
      '2026-12-01T12:00:00-03:00',
    );
    const r = resumenDelDia(deps, admin, '2026-12-01');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.turnosDelDia).toBe(2);
    expect(r.valor.proximos.map((p) => p.id)).toEqual([creados[1]?.id]);
  });

  it('dado un turno futuro cuando se pide el resumen entonces cada proximo trae nombres de paciente, profesional, sillon y prestacion', () => {
    const { deps } = entorno([{ inicio: '2026-12-01T10:00:00-03:00', pacienteId: 'pac-03' }]);
    const r = resumenDelDia(deps, admin, '2026-12-01');
    expect(r.ok && r.valor.proximos[0]).toMatchObject({
      estado: 'reservado',
      pacienteNombre: 'Paciente Ficticio Tres',
      profesionalNombre: 'Dra. Ficticia Perez',
      sillonNombre: 'Sillon 1',
      prestacionNombre: 'Control y limpieza',
    });
    const p = r.ok ? r.valor.proximos[0] : undefined;
    expect(p?.inicio).toBeInstanceOf(Date);
    expect(p?.fin).toBeInstanceOf(Date);
  });

  it('dado un turno que empieza exactamente en el instante del reloj cuando se pide el resumen entonces si aparece en proximos', () => {
    const { deps } = entorno([{ inicio: '2026-12-01T10:00:00-03:00' }], '2026-12-01T10:00:00-03:00');
    const r = resumenDelDia(deps, admin, '2026-12-01');
    expect(r.ok && r.valor.proximos).toHaveLength(1);
  });
});

describe('resumenDelDia - permisos y alcance', () => {
  it('dado 2 turnos de prof-1 y 3 de prof-2 cuando u-odonto-1 pide el resumen entonces turnosDelDia es 2 y proximos solo de prof-1', () => {
    const { deps } = entorno([
      { inicio: '2026-12-01T09:00:00-03:00' },
      { inicio: '2026-12-01T09:30:00-03:00', pacienteId: 'pac-02' },
      { inicio: '2026-12-01T09:00:00-03:00', pacienteId: 'pac-03', profesionalId: 'prof-2' },
      { inicio: '2026-12-01T09:30:00-03:00', pacienteId: 'pac-04', profesionalId: 'prof-2' },
      { inicio: '2026-12-01T10:00:00-03:00', pacienteId: 'pac-05', profesionalId: 'prof-2' },
    ]);
    const r = resumenDelDia(deps, odonto1, '2026-12-01');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.turnosDelDia).toBe(2);
    expect(r.valor.porEstado.reservado).toBe(2);
    expect(r.valor.proximos.every((p) => p.profesionalNombre === 'Dra. Ficticia Perez')).toBe(true);
    const todo = resumenDelDia(deps, admin, '2026-12-01');
    expect(todo.ok && todo.valor.turnosDelDia).toBe(5);
  });

  it('dado paciente o sin usuario cuando pide el resumen entonces falla con permiso', () => {
    const { deps } = entorno([]);
    for (const u of [paciente, undefined]) {
      const r = resumenDelDia(deps, u, '2026-12-01');
      expect(!r.ok && r.error.tipo).toBe('permiso');
    }
  });

  it('dado un odontologo sin profesionalId cuando pide el resumen entonces falla con permiso', () => {
    const { deps } = entorno([]);
    const r = resumenDelDia(deps, { id: 'x', nombre: 'x', rol: 'odontologo' }, '2026-12-01');
    expect(!r.ok && r.error.tipo).toBe('permiso');
  });

  it('dado una fecha con formato invalido o inexistente cuando se pide el resumen entonces falla con entrada', () => {
    const { deps } = entorno([]);
    for (const f of ['01-12-2026', '2026-02-30', '2026-13-01', 'hoy', '']) {
      const r = resumenDelDia(deps, admin, f);
      expect(!r.ok && r.error.tipo).toBe('entrada');
    }
  });

  it('dado un resumen cuando se pide entonces no se modifican turnos ni se registra auditoria', () => {
    const { deps } = entorno([{ inicio: '2026-12-01T10:00:00-03:00' }]);
    const eventosAntes = (deps.auditoria as unknown as { eventos(): unknown[] }).eventos().length;
    const turnosAntes = JSON.stringify(deps.turnos.listarActivos());
    resumenDelDia(deps, admin, '2026-12-01');
    expect((deps.auditoria as unknown as { eventos(): unknown[] }).eventos().length).toBe(eventosAntes);
    expect(JSON.stringify(deps.turnos.listarActivos())).toBe(turnosAntes);
  });
});
