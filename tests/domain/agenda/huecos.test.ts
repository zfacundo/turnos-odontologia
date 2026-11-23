import { describe, it, expect } from 'vitest';
import { calcularHuecos, type ContextoHuecos, type Hueco } from '../../../src/domain/agenda/huecos';
import type { TurnoExistente } from '../../../src/domain/agenda/turno';
import { validarNuevoTurno } from '../../../src/domain/agenda/validarNuevoTurno';
import type { Bloqueo } from '../../../src/domain/configuracion/bloqueo';
import { PRESTACIONES, PROFESIONALES, SILLONES } from '../../../src/infrastructure/seed/datos-seed';

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

const FECHA = '2026-12-01'; // martes
/** Hora local del consultorio (UTC-03:00). */
const en = (hhmm: string, fecha = FECHA): Date => new Date(`${fecha}T${hhmm}:00-03:00`);
/** 'HH:mm' local de un instante. */
const hhmm = (d: Date): string => new Date(d.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(11, 16);
const inicios = (hs: readonly Hueco[]): string[] => hs.map((h) => hhmm(h.inicio));

/** Inicios 'HH:mm' cada 15' de desde a hasta inclusive. */
const cada15 = (desde: string, hasta: string): string[] => {
  const out: string[] = [];
  for (let t = en(desde).getTime(); t <= en(hasta).getTime(); t += 15 * 60 * 1000) out.push(hhmm(new Date(t)));
  return out;
};

const urgencias = (fecha = FECHA): Bloqueo => ({
  id: `bloq-urg-${fecha}`,
  intervalo: { inicio: en('18:30', fecha), fin: en('19:00', fecha) },
  motivo: 'reservado urgencias',
});

const turno = (
  id: string,
  desde: string,
  hasta: string,
  extra: Partial<TurnoExistente> = {},
): TurnoExistente => ({
  id,
  profesionalId: 'prof-1',
  sillonId: 'sillon-1',
  pacienteId: 'pac-01',
  inicio: en(desde),
  fin: en(hasta),
  estado: 'reservado',
  ...extra,
});

const ctx = (extra: Partial<ContextoHuecos> = {}): ContextoHuecos => ({
  fecha: FECHA,
  desde: new Date('2026-11-30T09:00:00-03:00'),
  prestacion: prestacion('prest-control'),
  profesional: profesional('prof-1'),
  sillonIds: ['sillon-1', 'sillon-2'],
  bloqueos: [urgencias()],
  turnos: [],
  ...extra,
});

describe('calcularHuecos - franjas del profesional', () => {
  it('dado un dia sin turnos cuando se calculan huecos de tratamiento 60 entonces el ultimo de la manana es 12:00 y no aparece 12:15', () => {
    const hs = inicios(calcularHuecos(ctx({ prestacion: prestacion('prest-trat') })));
    const manana = hs.filter((h) => h < '13:00');
    expect(manana).toEqual(cada15('09:00', '12:00'));
    expect(hs).not.toContain('12:15');
  });

  it('dado un dia sin turnos cuando se calculan huecos de control 30 entonces son 09:00 a 12:30 y 14:00 a 18:00 (32 huecos)', () => {
    const hs = inicios(calcularHuecos(ctx()));
    expect(hs).toEqual([...cada15('09:00', '12:30'), ...cada15('14:00', '18:00')]);
    expect(hs).toHaveLength(32);
  });

  it('dado un dia sin turnos cuando se calculan huecos de control entonces ninguno empieza entre 12:45 y 13:45', () => {
    const hs = inicios(calcularHuecos(ctx()));
    for (const h of cada15('12:45', '13:45')) expect(hs).not.toContain(h);
  });

  it('dado un sabado sin franjas cuando se calculan huecos entonces la lista esta vacia', () => {
    expect(calcularHuecos(ctx({ fecha: '2026-12-05', bloqueos: [] }))).toEqual([]);
  });

  it('dado un hueco cuando se calcula entonces fin es inicio mas la duracion de la prestacion', () => {
    const [primero] = calcularHuecos(ctx({ prestacion: prestacion('prest-trat') }));
    expect(primero).toEqual({ inicio: en('09:00'), fin: en('10:00'), sillonId: 'sillon-1' });
  });
});

describe('calcularHuecos - bloqueos (RN-AG-04)', () => {
  it('dado el bloqueo global de urgencias 18:30-19:00 cuando se calculan huecos de control entonces 18:00 es hueco y no aparecen 18:15, 18:30 ni 18:45', () => {
    const hs = inicios(calcularHuecos(ctx()));
    expect(hs).toContain('18:00');
    for (const h of ['18:15', '18:30', '18:45']) expect(hs).not.toContain(h);
  });

  it('dado el bloqueo de urgencias cuando se calculan huecos de tratamiento 60 entonces el ultimo de la tarde es 17:30', () => {
    const hs = inicios(calcularHuecos(ctx({ prestacion: prestacion('prest-trat') })));
    expect(hs.at(-1)).toBe('17:30');
  });

  it('dado un bloqueo de prof-2 09:00-13:00 cuando se calculan huecos de prof-1 entonces su manana queda igual', () => {
    const bloqueoProf2: Bloqueo = {
      id: 'b-prof2',
      intervalo: { inicio: en('09:00'), fin: en('13:00') },
      motivo: 'licencia ficticia',
      profesionalId: 'prof-2',
    };
    const hs = inicios(calcularHuecos(ctx({ bloqueos: [urgencias(), bloqueoProf2] })));
    expect(hs.filter((h) => h < '13:00')).toEqual(cada15('09:00', '12:30'));
  });

  it('dado un bloqueo de prof-2 09:00-13:00 cuando se calculan huecos de prof-2 entonces su manana queda vacia', () => {
    const bloqueoProf2: Bloqueo = {
      id: 'b-prof2',
      intervalo: { inicio: en('09:00'), fin: en('13:00') },
      motivo: 'licencia ficticia',
      profesionalId: 'prof-2',
    };
    const hs = inicios(
      calcularHuecos(ctx({ profesional: profesional('prof-2'), bloqueos: [urgencias(), bloqueoProf2] })),
    );
    expect(hs.filter((h) => h < '13:00')).toEqual([]);
  });

  it('dado un bloqueo de sillon-1 09:00-10:00 cuando se calculan huecos de control entonces 09:00 a 09:45 van a sillon-2 y 10:00 a sillon-1', () => {
    const bloqueoSillon: Bloqueo = {
      id: 'b-s1',
      intervalo: { inicio: en('09:00'), fin: en('10:00') },
      motivo: 'mantenimiento ficticio',
      sillonId: 'sillon-1',
    };
    const hs = calcularHuecos(ctx({ bloqueos: [urgencias(), bloqueoSillon] }));
    const porHora = new Map(hs.map((h) => [hhmm(h.inicio), h.sillonId]));
    for (const h of ['09:00', '09:15', '09:30', '09:45']) expect(porHora.get(h)).toBe('sillon-2');
    expect(porHora.get('10:00')).toBe('sillon-1');
  });
});

describe('calcularHuecos - solapamientos (RN-AG-01/02, RN-AG-10)', () => {
  it('dado un turno de prof-1 10:00-10:30 cuando se calculan sus huecos de control entonces 09:30 y 10:30 son huecos y no aparecen 09:45, 10:00 ni 10:15', () => {
    const hs = inicios(calcularHuecos(ctx({ turnos: [turno('t1', '10:00', '10:30')] })));
    expect(hs).toContain('09:30');
    expect(hs).toContain('10:30');
    for (const h of ['09:45', '10:00', '10:15']) expect(hs).not.toContain(h);
  });

  it('dado sillon-1 ocupado por prof-2 10:00-10:30 cuando se calculan huecos de prof-1 entonces 10:00 se ofrece en sillon-2', () => {
    const hs = calcularHuecos(ctx({ turnos: [turno('t1', '10:00', '10:30', { profesionalId: 'prof-2' })] }));
    expect(hs.find((h) => hhmm(h.inicio) === '10:00')?.sillonId).toBe('sillon-2');
  });

  it('dado turnos 10:00-10:30 de prof-2 en sillon-1 y de prof-1 en sillon-2 cuando se calculan huecos de prof-1 entonces se eliminan los que solapan y 09:30 y 10:30 siguen libres', () => {
    const turnos = [
      turno('t1', '10:00', '10:30', { profesionalId: 'prof-2', sillonId: 'sillon-1' }),
      turno('t2', '10:00', '10:30', { profesionalId: 'prof-1', sillonId: 'sillon-2', pacienteId: 'pac-02' }),
    ];
    const hs = inicios(calcularHuecos(ctx({ turnos })));
    for (const h of ['09:45', '10:00', '10:15']) expect(hs).not.toContain(h);
    expect(hs).toContain('09:30');
    expect(hs).toContain('10:30');
  });

  it('dado prof-2 en sillon-1 y prof-3 ficticio en sillon-2 de 10:00 a 10:30 cuando se calculan huecos de prof-1 entonces no aparecen 09:45, 10:00 ni 10:15 y 10:30 sigue libre', () => {
    const turnos = [
      turno('t1', '10:00', '10:30', { profesionalId: 'prof-2', sillonId: 'sillon-1' }),
      turno('t2', '10:00', '10:30', { profesionalId: 'prof-3', sillonId: 'sillon-2', pacienteId: 'pac-02' }),
    ];
    const hs = inicios(calcularHuecos(ctx({ turnos })));
    for (const h of ['09:45', '10:00', '10:15']) expect(hs).not.toContain(h);
    expect(hs).toContain('10:30');
  });

  it('dado un turno cancelado de prof-1 10:00-10:30 cuando se calculan huecos entonces 10:00 es hueco en sillon-1', () => {
    const hs = calcularHuecos(ctx({ turnos: [turno('t1', '10:00', '10:30', { estado: 'cancelado' })] }));
    expect(hs.find((h) => hhmm(h.inicio) === '10:00')?.sillonId).toBe('sillon-1');
  });
});

describe('calcularHuecos - sillon preferido y limite desde', () => {
  it('dado ambos sillones libres cuando se calculan huecos entonces cada inicio aparece una vez y todos en sillon-1', () => {
    const hs = calcularHuecos(ctx());
    expect(new Set(inicios(hs)).size).toBe(hs.length);
    expect(hs.every((h) => h.sillonId === 'sillon-1')).toBe(true);
  });

  it('dado sillon-1 inactivo (fuera de sillonIds) cuando se calculan huecos entonces todos van a sillon-2', () => {
    const hs = calcularHuecos(ctx({ sillonIds: ['sillon-2'] }));
    expect(hs.length).toBeGreaterThan(0);
    expect(hs.every((h) => h.sillonId === 'sillon-2')).toBe(true);
  });

  it('dado desde 10:10 del mismo dia cuando se calculan huecos entonces el primero es 10:15', () => {
    expect(inicios(calcularHuecos(ctx({ desde: en('10:10') })))[0]).toBe('10:15');
  });

  it('dado desde 10:00 exacto cuando se calculan huecos entonces el primero es 10:00', () => {
    expect(inicios(calcularHuecos(ctx({ desde: en('10:00') })))[0]).toBe('10:00');
  });

  it('dado desde posterior a todo el dia cuando se calculan huecos entonces la lista esta vacia', () => {
    expect(calcularHuecos(ctx({ desde: en('09:00', '2026-12-02') }))).toEqual([]);
  });

  it('dado un turno de pac-01 a la misma hora con otro profesional y sillon cuando se calculan huecos entonces la consulta no aplica RN-AG-05 y el horario se ofrece', () => {
    const turnos = [turno('t1', '10:00', '10:30', { profesionalId: 'prof-2', sillonId: 'sillon-1', pacienteId: 'pac-01' })];
    const hs = calcularHuecos(ctx({ sillonIds: ['sillon-2'], turnos }));
    expect(inicios(hs)).toContain('10:00');
  });
});

describe('calcularHuecos - consistencia con validarNuevoTurno (US-014, RN-WA-01)', () => {
  const DESDE = en('11:10');
  const PACIENTE_LIBRE = 'pac-10';
  const sillonIds = SILLONES.filter((s) => s.activo).map((s) => s.id).sort();
  const turnosSeed: TurnoExistente[] = [
    turno('c1', '09:00', '09:30', { profesionalId: 'prof-1', sillonId: 'sillon-1', pacienteId: 'pac-01' }),
    turno('c2', '09:30', '10:30', { profesionalId: 'prof-2', sillonId: 'sillon-1', pacienteId: 'pac-02' }),
    turno('c3', '11:00', '11:45', { profesionalId: 'prof-1', sillonId: 'sillon-2', pacienteId: 'pac-03' }),
    turno('c4', '11:15', '12:15', { profesionalId: 'prof-2', sillonId: 'sillon-1', pacienteId: 'pac-04' }),
    turno('c5', '14:00', '15:00', { profesionalId: 'prof-2', sillonId: 'sillon-2', pacienteId: 'pac-05' }),
    turno('c6', '15:00', '15:30', { profesionalId: 'prof-1', sillonId: 'sillon-1', pacienteId: 'pac-06', estado: 'cancelado' }),
    turno('c7', '16:00', '16:45', { profesionalId: 'prof-1', sillonId: 'sillon-1', pacienteId: 'pac-07', estado: 'confirmado' }),
    turno('c8', '16:15', '17:15', { profesionalId: 'prof-2', sillonId: 'sillon-2', pacienteId: 'pac-08' }),
  ];
  const combinaciones = PRESTACIONES.flatMap((p) => PROFESIONALES.map((prof) => ({ p, prof })));
  const ctxSeed = (p: (typeof PRESTACIONES)[number], prof: (typeof PROFESIONALES)[number]): ContextoHuecos =>
    ctx({ desde: DESDE, prestacion: p, profesional: prof, sillonIds, turnos: turnosSeed });
  const valida = (p: (typeof PRESTACIONES)[number], prof: (typeof PROFESIONALES)[number], sillonId: string, inicio: Date) =>
    validarNuevoTurno(
      { pacienteId: PACIENTE_LIBRE, prestacionId: p.id, profesionalId: prof.id, sillonId, inicio },
      { prestacion: p, profesional: prof, bloqueos: [urgencias()], turnos: turnosSeed },
    ).ok;

  it('dado el seed con turnos activos y cancelados cuando se calculan huecos de cada prestacion y profesional entonces cada hueco es aceptado por validarNuevoTurno', () => {
    for (const { p, prof } of combinaciones) {
      const hs = calcularHuecos(ctxSeed(p, prof));
      expect(hs.length).toBeGreaterThan(0);
      for (const h of hs) expect(valida(p, prof, h.sillonId, h.inicio)).toBe(true);
    }
  });

  it('dado el mismo seed cuando se prueban todos los inicios alineados del dia en cada sillon entonces cada inicio aceptado y no anterior a desde figura entre los huecos', () => {
    const inicioDia = new Date(`${FECHA}T00:00:00-03:00`).getTime();
    for (const { p, prof } of combinaciones) {
      const ofrecidos = new Set(calcularHuecos(ctxSeed(p, prof)).map((h) => h.inicio.getTime()));
      for (let t = inicioDia; t < inicioDia + 24 * 60 * 60 * 1000; t += 15 * 60 * 1000) {
        if (t < DESDE.getTime()) continue;
        const aceptado = sillonIds.some((s) => valida(p, prof, s, new Date(t)));
        expect(ofrecidos.has(t)).toBe(aceptado);
      }
    }
  });
});
