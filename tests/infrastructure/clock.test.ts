import { describe, it, expect } from 'vitest';
import {
  RelojDeSistema,
  RelojFijo,
  relojDesdeEnv,
} from '../../src/infrastructure/clock/clock';

describe('relojDesdeEnv (SIM_NOW)', () => {
  it('dado SIM_NOW 2026-10-14T12:30:00-03:00 cuando se consulta la hora dos veces entonces ambas son 2026-10-14T15:30:00Z', () => {
    const reloj = relojDesdeEnv('2026-10-14T12:30:00-03:00');
    expect(reloj.ahora().toISOString()).toBe('2026-10-14T15:30:00.000Z');
    expect(reloj.ahora().toISOString()).toBe('2026-10-14T15:30:00.000Z');
  });

  it('dado SIM_NOW en UTC cuando se consulta la hora entonces devuelve ese instante', () => {
    expect(relojDesdeEnv('2026-12-01T10:00:00Z').ahora().toISOString()).toBe('2026-12-01T10:00:00.000Z');
  });

  it('dado SIM_NOW no-es-fecha cuando se construye el reloj entonces falla mencionando SIM_NOW', () => {
    expect(() => relojDesdeEnv('no-es-fecha')).toThrow(/SIM_NOW/);
  });

  it('dado SIM_NOW vacio o ausente cuando se construye el reloj entonces devuelve el reloj de sistema', () => {
    expect(relojDesdeEnv(undefined)).toBeInstanceOf(RelojDeSistema);
    expect(relojDesdeEnv('')).toBeInstanceOf(RelojDeSistema);
  });
});

describe('RelojFijo y RelojDeSistema', () => {
  it('dado un RelojFijo cuando se mutan las fechas devueltas entonces el instante no cambia', () => {
    const reloj = new RelojFijo(new Date('2026-12-01T10:00:00-03:00'));
    reloj.ahora().setFullYear(1999);
    expect(reloj.ahora().toISOString()).toBe('2026-12-01T13:00:00.000Z');
  });

  it('dado un RelojDeSistema cuando se consulta entonces devuelve un instante cercano al actual', () => {
    const antes = Date.now();
    const t = new RelojDeSistema().ahora().getTime();
    expect(t).toBeGreaterThanOrEqual(antes);
    expect(t).toBeLessThanOrEqual(Date.now());
  });
});
