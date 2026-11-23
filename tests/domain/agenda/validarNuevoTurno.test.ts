import { describe, it, expect } from 'vitest';
import { validarNuevoTurno } from '../../../src/domain/agenda/validarNuevoTurno';
import type { TurnoExistente } from '../../../src/domain/agenda/turno';
import type { Bloqueo } from '../../../src/domain/configuracion/bloqueo';
import {
  PRESTACIONES,
  PROFESIONALES,
} from '../../../src/infrastructure/seed/datos-seed';

const prestacion = (id: string) => {
  const p = PRESTACIONES.find((x) => x.id === id);
  if (p === undefined) throw new Error(`prestacion ${id}`);
  return p;
};
const profesional = (id: string) => {
  const p = PROFESIONALES.find((x) => x.id === id);
  if (p === undefined) throw new Error(`profesional ${id}`);
  return p;
};

/** Hora local del consultorio (UTC-03:00); por defecto martes 2026-12-01. */
const en = (hhmm: string, fecha = '2026-12-01'): Date => new Date(`${fecha}T${hhmm}:00-03:00`);

const turno = (
  id: string,
  desde: string,
  hasta: string,
  extra: Partial<TurnoExistente> = {},
): TurnoExistente => ({
  id,
  profesionalId: 'prof-1',
  sillonId: 'sillon-1',
  pacienteId: 'pac-09',
  inicio: en(desde),
  fin: en(hasta),
  estado: 'reservado',
  ...extra,
});

const bloqueo = (id: string, desde: string, hasta: string, extra: Partial<Bloqueo> = {}): Bloqueo => ({
  id,
  motivo: 'bloqueo de prueba',
  intervalo: { inicio: en(desde), fin: en(hasta) },
  ...extra,
});

interface Opciones {
  prestacionId?: string;
  profesionalId?: string;
  sillonId?: string;
  pacienteId?: string;
  inicio: Date;
  turnos?: readonly TurnoExistente[];
  bloqueos?: readonly Bloqueo[];
}

const validar = (o: Opciones) =>
  validarNuevoTurno(
    {
      pacienteId: o.pacienteId ?? 'pac-01',
      prestacionId: o.prestacionId ?? 'prest-control',
      profesionalId: o.profesionalId ?? 'prof-1',
      sillonId: o.sillonId ?? 'sillon-1',
      inicio: o.inicio,
    },
    {
      prestacion: prestacion(o.prestacionId ?? 'prest-control'),
      profesional: profesional(o.profesionalId ?? 'prof-1'),
      bloqueos: o.bloqueos ?? [],
      turnos: o.turnos ?? [],
    },
  );

describe('validarNuevoTurno - fin calculado y alineacion (RN-AG-03)', () => {
  it('dado una agenda sin turnos cuando se valida un control de 30 minutos a las 10:00 entonces el fin calculado es 10:30', () => {
    const r = validar({ inicio: en('10:00') });
    expect(r).toEqual({ ok: true, valor: { inicio: en('10:00'), fin: en('10:30') } });
  });

  it('dado una agenda sin turnos cuando se valida un tratamiento de 60 minutos a las 10:00 entonces el fin calculado es 11:00', () => {
    const r = validar({ prestacionId: 'prest-trat', inicio: en('10:00') });
    expect(r).toEqual({ ok: true, valor: { inicio: en('10:00'), fin: en('11:00') } });
  });

  it('dado una agenda sin turnos cuando se valida un control con inicio 10:10 entonces falla con RN-AG-03', () => {
    const r = validar({ inicio: en('10:10') });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.regla).toBe('RN-AG-03');
  });

  it('dado una agenda sin turnos cuando se valida un control con inicio 10:15 entonces es exitoso con fin 10:45', () => {
    const r = validar({ inicio: en('10:15') });
    expect(r).toEqual({ ok: true, valor: { inicio: en('10:15'), fin: en('10:45') } });
  });

  it('dado una agenda sin turnos cuando se valida un control con inicio 10:00 y 30 segundos entonces falla con RN-AG-03', () => {
    const r = validar({ inicio: new Date('2026-12-01T10:00:30-03:00') });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.regla).toBe('RN-AG-03');
  });
});

describe('validarNuevoTurno - horario de atencion (RN-AG-04)', () => {
  const regla = (r: ReturnType<typeof validar>) => (r.ok ? undefined : r.error.regla);

  it('dado prof-1 con franjas 09-13 y 14-19 cuando se valida un tratamiento de 60 minutos a las 12:30 entonces falla con RN-AG-04 por cruzar el almuerzo', () => {
    expect(regla(validar({ prestacionId: 'prest-trat', inicio: en('12:30') }))).toBe('RN-AG-04');
  });

  it('dado prof-1 con franja 09-13 cuando se valida un control de 30 minutos a las 12:30 entonces es exitoso con fin 13:00', () => {
    const r = validar({ inicio: en('12:30') });
    expect(r).toEqual({ ok: true, valor: { inicio: en('12:30'), fin: en('13:00') } });
  });

  it('dado prof-1 sin franjas los sabados cuando se valida un control el sabado 2026-12-05 a las 10:00 entonces falla con RN-AG-04', () => {
    expect(regla(validar({ inicio: en('10:00', '2026-12-05') }))).toBe('RN-AG-04');
  });

  it('dado prof-1 con franja que abre 09:00 cuando se valida un control a las 08:45 entonces falla con RN-AG-04', () => {
    expect(regla(validar({ inicio: en('08:45') }))).toBe('RN-AG-04');
  });

  it('dado prof-1 con franja que abre 09:00 cuando se valida un control a las 09:00 entonces es exitoso', () => {
    expect(validar({ inicio: en('09:00') }).ok).toBe(true);
  });

  it('dado prof-1 con franja de tarde 14-19 cuando se valida un control a las 13:30 entonces falla con RN-AG-04 por caer en el almuerzo', () => {
    expect(regla(validar({ inicio: en('13:30') }))).toBe('RN-AG-04');
  });
});

describe('validarNuevoTurno - bloqueos (RN-AG-04)', () => {
  const urgencias = bloqueo('b-urg', '18:30', '19:00', { motivo: 'reservado urgencias' });

  it('dado el bloqueo global de urgencias 18:30-19:00 cuando se valida un control a las 18:30 entonces falla con RN-AG-04', () => {
    const r = validar({ inicio: en('18:30'), bloqueos: [urgencias] });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.regla).toBe('RN-AG-04');
      expect(r.error.mensaje).toContain('reservado urgencias');
    }
  });

  it('dado un bloqueo de prof-1 de 10:00 a 11:00 cuando se valida un control de prof-1 a las 10:30 entonces falla con RN-AG-04', () => {
    const r = validar({ inicio: en('10:30'), bloqueos: [bloqueo('b-1', '10:00', '11:00', { profesionalId: 'prof-1' })] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.regla).toBe('RN-AG-04');
  });

  it('dado un bloqueo de prof-1 cuando se valida un control de prof-2 en ese horario entonces es exitoso', () => {
    const r = validar({
      profesionalId: 'prof-2',
      inicio: en('10:30'),
      bloqueos: [bloqueo('b-1', '10:00', '11:00', { profesionalId: 'prof-1' })],
    });
    expect(r.ok).toBe(true);
  });

  it('dado un bloqueo de sillon-1 cuando se valida un control en sillon-1 en ese horario entonces falla con RN-AG-04', () => {
    const r = validar({ inicio: en('10:30'), bloqueos: [bloqueo('b-1', '10:00', '11:00', { sillonId: 'sillon-1' })] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.regla).toBe('RN-AG-04');
  });

  it('dado un bloqueo de sillon-2 de 10:00 a 11:00 cuando se valida un control en sillon-1 a las 10:00 entonces es exitoso', () => {
    const r = validar({ inicio: en('10:00'), bloqueos: [bloqueo('b-1', '10:00', '11:00', { sillonId: 'sillon-2' })] });
    expect(r.ok).toBe(true);
  });

  it('dado el bloqueo global 18:30-19:00 cuando se valida un control a las 18:00 entonces es exitoso con fin 18:30', () => {
    const r = validar({ inicio: en('18:00'), bloqueos: [urgencias] });
    expect(r).toEqual({ ok: true, valor: { inicio: en('18:00'), fin: en('18:30') } });
  });
});

describe('validarNuevoTurno - solapamiento por profesional y sillon (RN-AG-02)', () => {
  const falla = (r: ReturnType<typeof validar>) => {
    if (r.ok) throw new Error('se esperaba un fallo');
    return r.error;
  };

  it('dado t-1 de prof-1 en sillon-1 de 10:00 a 10:30 cuando se valida un control de prof-1 en sillon-1 a las 10:30 entonces es exitoso (back-to-back)', () => {
    const r = validar({ inicio: en('10:30'), pacienteId: 'pac-02', turnos: [turno('t-1', '10:00', '10:30')] });
    expect(r).toEqual({ ok: true, valor: { inicio: en('10:30'), fin: en('11:00') } });
  });

  it('dado t-1 de prof-1 de 10:00 a 10:30 cuando se valida un control de prof-1 en sillon-2 a las 09:30 entonces es exitoso (back-to-back por el fin del candidato)', () => {
    const r = validar({ inicio: en('09:30'), pacienteId: 'pac-02', sillonId: 'sillon-2', turnos: [turno('t-1', '10:00', '10:30')] });
    expect(r.ok).toBe(true);
  });

  it('dado t-1 de prof-1 en sillon-1 de 10:00 a 11:00 cuando se valida un control de prof-1 en sillon-2 a las 10:30 entonces falla con RN-AG-02, dimension profesional y conflicto t-1', () => {
    const e = falla(validar({ inicio: en('10:30'), pacienteId: 'pac-02', sillonId: 'sillon-2', turnos: [turno('t-1', '10:00', '11:00')] }));
    expect(e.regla).toBe('RN-AG-02');
    expect(e.dimension).toBe('profesional');
    expect(e.conflicto).toEqual({ turnoId: 't-1' });
  });

  it('dado t-1 de prof-1 de 10:00 a 11:00 cuando se valida un control de prof-1 a las 10:15 entonces falla con RN-AG-02 y dimension profesional (contenido)', () => {
    const e = falla(validar({ inicio: en('10:15'), pacienteId: 'pac-02', turnos: [turno('t-1', '10:00', '11:00')] }));
    expect(e.regla).toBe('RN-AG-02');
    expect(e.dimension).toBe('profesional');
  });

  it('dado t-1 de prof-1 de 10:15 a 10:45 cuando se valida un control de prof-1 a las 10:00 entonces falla con RN-AG-02 (solapamiento parcial por el inicio de t-1)', () => {
    const e = falla(validar({ inicio: en('10:00'), pacienteId: 'pac-02', turnos: [turno('t-1', '10:15', '10:45')] }));
    expect(e.regla).toBe('RN-AG-02');
    expect(e.conflicto).toEqual({ turnoId: 't-1' });
  });

  it('dado t-1 de prof-1 en sillon-1 de 10:00 a 10:30 cuando se valida un control de prof-2 en sillon-1 a las 10:00 entonces falla con RN-AG-02, dimension sillon y conflicto t-1', () => {
    const e = falla(validar({ profesionalId: 'prof-2', inicio: en('10:00'), pacienteId: 'pac-02', turnos: [turno('t-1', '10:00', '10:30')] }));
    expect(e.regla).toBe('RN-AG-02');
    expect(e.dimension).toBe('sillon');
    expect(e.conflicto).toEqual({ turnoId: 't-1' });
  });

  it('dado t-1 de prof-1 en sillon-1 de 10:00 a 10:30 cuando se valida un control de prof-2 en sillon-2 a las 10:00 entonces es exitoso', () => {
    const r = validar({ profesionalId: 'prof-2', sillonId: 'sillon-2', inicio: en('10:00'), pacienteId: 'pac-02', turnos: [turno('t-1', '10:00', '10:30')] });
    expect(r.ok).toBe(true);
  });

  it('dado conflicto de profesional y de sillon a la vez cuando se valida el candidato entonces informa la dimension profesional', () => {
    const e = falla(validar({ inicio: en('10:00'), pacienteId: 'pac-02', turnos: [turno('t-1', '10:00', '10:30')] }));
    expect(e.dimension).toBe('profesional');
  });

  it('dado turnos t-2 (10:30-11:00) y t-1 (10:00-10:30) de prof-1 cuando se valida un tratamiento de 10:00 a 11:00 entonces falla con RN-AG-02 y conflicto con t-1 (inicio mas temprano)', () => {
    const e = falla(
      validar({
        prestacionId: 'prest-trat',
        inicio: en('10:00'),
        pacienteId: 'pac-02',
        turnos: [turno('t-2', '10:30', '11:00'), turno('t-1', '10:00', '10:30')],
      }),
    );
    expect(e.regla).toBe('RN-AG-02');
    expect(e.dimension).toBe('profesional');
    expect(e.conflicto).toEqual({ turnoId: 't-1' });
  });
});

describe('validarNuevoTurno - paciente, cancelados y lista provista (RN-AG-05, RN-AG-10, RN-AG-12)', () => {
  const tPac = (id: string, desde: string, hasta: string, extra: Partial<TurnoExistente> = {}) =>
    turno(id, desde, hasta, { pacienteId: 'pac-01', ...extra });

  it('dado t-1 de pac-01 con prof-1 en sillon-1 de 10:00 a 10:30 cuando se valida un turno de pac-01 con prof-2 en sillon-2 a las 10:00 entonces falla con RN-AG-05, dimension paciente y conflicto t-1', () => {
    const r = validar({ profesionalId: 'prof-2', sillonId: 'sillon-2', inicio: en('10:00'), turnos: [tPac('t-1', '10:00', '10:30')] });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.regla).toBe('RN-AG-05');
      expect(r.error.dimension).toBe('paciente');
      expect(r.error.conflicto).toEqual({ turnoId: 't-1' });
    }
  });

  it('dado t-1 de pac-01 de 10:00 a 10:30 cuando se valida un turno de pac-01 con prof-2 en sillon-2 a las 10:30 entonces es exitoso (contiguo)', () => {
    const r = validar({ profesionalId: 'prof-2', sillonId: 'sillon-2', inicio: en('10:30'), turnos: [tPac('t-1', '10:00', '10:30')] });
    expect(r.ok).toBe(true);
  });

  it('dado t-1 de pac-02 de 10:00 a 10:30 cuando se valida un turno de pac-01 con prof-2 en sillon-2 a las 10:00 entonces es exitoso (otro paciente)', () => {
    const r = validar({
      profesionalId: 'prof-2',
      sillonId: 'sillon-2',
      inicio: en('10:00'),
      turnos: [tPac('t-1', '10:00', '10:30', { pacienteId: 'pac-02' })],
    });
    expect(r.ok).toBe(true);
  });

  it('dado t-1 de pac-01 con prof-1 en sillon-1 de 10:00 a 10:30 en estado cancelado cuando se valida un turno de pac-01 con prof-1 en sillon-1 a las 10:00 entonces es exitoso', () => {
    const r = validar({ inicio: en('10:00'), turnos: [tPac('t-1', '10:00', '10:30', { estado: 'cancelado' })] });
    expect(r.ok).toBe(true);
  });

  it('dado un turno cancelado y otro activo en el mismo horario cuando se valida el candidato entonces el conflicto informado es el activo', () => {
    const r = validar({
      inicio: en('10:00'),
      turnos: [tPac('t-c', '10:00', '10:30', { estado: 'cancelado' }), tPac('t-a', '10:00', '10:30')],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.conflicto).toEqual({ turnoId: 't-a' });
  });

  it('dado un candidato de prof-1 de 10:00 a 10:30 y una lista que no incluye a t-1 cuando se valida entonces es exitoso', () => {
    const r = validar({ inicio: en('10:00'), turnos: [] });
    expect(r.ok).toBe(true);
  });

  it('dado la misma lista con t-1 incluido cuando se valida el mismo candidato entonces falla (la lista provista decide)', () => {
    const r = validar({ inicio: en('10:00'), turnos: [tPac('t-1', '10:00', '10:30')] });
    expect(r.ok).toBe(false);
  });
});
