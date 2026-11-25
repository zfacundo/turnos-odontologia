import { describe, expect, it } from 'vitest';
import { validarEntrada } from '../../../src/domain/historia/entrada';

const AHORA = new Date('2026-12-01T10:00:00-03:00');
const BASE = { fecha: '2026-11-30T10:00:00-03:00', procedimiento: 'Control y limpieza' };

describe('validarEntrada - entrada invalida (400)', () => {
  it('dado una fecha sin zona cuando se valida entonces falla con entrada', () => {
    const r = validarEntrada({ ...BASE, fecha: '2026-11-30T10:00:00' }, AHORA);
    expect(!r.ok && r.error.tipo).toBe('entrada');
  });

  it('dado una fecha no textual o ausente cuando se valida entonces falla con entrada', () => {
    for (const fecha of [undefined, 42, null]) {
      const r = validarEntrada({ ...BASE, fecha }, AHORA);
      expect(!r.ok && r.error.tipo).toBe('entrada');
    }
  });

  it('dado un procedimiento vacio cuando se valida entonces falla con entrada', () => {
    const r = validarEntrada({ ...BASE, procedimiento: '' }, AHORA);
    expect(!r.ok && r.error.tipo).toBe('entrada');
  });

  it('dado un procedimiento de 121 caracteres cuando se valida entonces falla con entrada', () => {
    const r = validarEntrada({ ...BASE, procedimiento: 'a'.repeat(121) }, AHORA);
    expect(!r.ok && r.error.tipo).toBe('entrada');
  });

  it('dado un procedimiento de 120 caracteres cuando se valida entonces es valido', () => {
    expect(validarEntrada({ ...BASE, procedimiento: 'a'.repeat(120) }, AHORA).ok).toBe(true);
  });

  it('dado notas de 1001 caracteres cuando se valida entonces falla con entrada', () => {
    const r = validarEntrada({ ...BASE, notas: 'n'.repeat(1001) }, AHORA);
    expect(!r.ok && r.error.tipo).toBe('entrada');
  });

  it('dado notas de 1000 caracteres cuando se valida entonces es valido', () => {
    expect(validarEntrada({ ...BASE, notas: 'n'.repeat(1000) }, AHORA).ok).toBe(true);
  });

  it('dado un turnoId no textual cuando se valida entonces falla con entrada', () => {
    const r = validarEntrada({ ...BASE, turnoId: 7 }, AHORA);
    expect(!r.ok && r.error.tipo).toBe('entrada');
  });

  it('dado un cuerpo que no es objeto cuando se valida entonces falla con entrada', () => {
    for (const cuerpo of [null, undefined, 'x', []]) {
      const r = validarEntrada(cuerpo, AHORA);
      expect(!r.ok && r.error.tipo).toBe('entrada');
    }
  });
});

describe('validarEntrada - RN-HC-02 (fecha futura)', () => {
  it('dado el reloj en 2026-12-01 10:00 cuando la fecha es 2026-12-02 entonces falla con la regla RN-HC-02', () => {
    const r = validarEntrada({ ...BASE, fecha: '2026-12-02T10:00:00-03:00' }, AHORA);
    expect(r.ok).toBe(false);
    if (r.ok || r.error.tipo !== 'regla') throw new Error('se esperaba una regla');
    expect(r.error.error.regla).toBe('RN-HC-02');
  });

  it('dado la fecha un milisegundo posterior al reloj cuando se valida entonces falla con RN-HC-02', () => {
    const r = validarEntrada({ ...BASE, fecha: '2026-12-01T10:00:00.001-03:00' }, AHORA);
    expect(!r.ok && r.error.tipo).toBe('regla');
  });

  it('dado una fecha igual al instante actual cuando se valida entonces es valida', () => {
    const r = validarEntrada({ ...BASE, fecha: '2026-12-01T10:00:00-03:00' }, AHORA);
    expect(r.ok).toBe(true);
  });
});

describe('validarEntrada - entrada valida', () => {
  it('dado notas vacias o ausentes cuando se valida entonces es valida con notas vacias', () => {
    const a = validarEntrada({ ...BASE, notas: '' }, AHORA);
    const b = validarEntrada(BASE, AHORA);
    expect(a.ok && a.valor.notas).toBe('');
    expect(b.ok && b.valor.notas).toBe('');
  });

  it('dado un cuerpo completo cuando se valida entonces devuelve fecha como Date, procedimiento, notas y turnoId', () => {
    const r = validarEntrada({ ...BASE, notas: 'Sin hallazgos (dato ficticio)', turnoId: 't-1' }, AHORA);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.fecha.toISOString()).toBe(new Date('2026-11-30T10:00:00-03:00').toISOString());
    expect(r.valor.procedimiento).toBe('Control y limpieza');
    expect(r.valor.notas).toBe('Sin hallazgos (dato ficticio)');
    expect(r.valor.turnoId).toBe('t-1');
  });

  it('dado un cuerpo sin turnoId cuando se valida entonces el resultado no trae turnoId', () => {
    const r = validarEntrada(BASE, AHORA);
    expect(r.ok && 'turnoId' in r.valor).toBe(false);
  });
});
