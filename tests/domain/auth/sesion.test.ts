import { describe, expect, it } from 'vitest';
import { crearSesion, DURACION_SESION_MS, estaVigente } from '../../../src/domain/auth/sesion';

const CREADA = new Date('2026-12-01T09:00:00-03:00');

describe('crearSesion', () => {
  it('dado un login a las 09:00 cuando se crea la sesion entonces expiraEn es creadaEn mas 8 horas', () => {
    const s = crearSesion('tok-1', 'u-admin', CREADA);
    expect(s.token).toBe('tok-1');
    expect(s.usuarioId).toBe('u-admin');
    expect(s.creadaEn.toISOString()).toBe(CREADA.toISOString());
    expect(s.expiraEn.toISOString()).toBe(new Date('2026-12-01T17:00:00-03:00').toISOString());
    expect(DURACION_SESION_MS).toBe(8 * 60 * 60 * 1000);
  });

  it('dado otro instante de login cuando se crea la sesion entonces expiraEn sigue siendo +8 h', () => {
    const s = crearSesion('tok-2', 'u-recepcion', new Date('2026-12-02T23:00:00-03:00'));
    expect(s.expiraEn.toISOString()).toBe(new Date('2026-12-03T07:00:00-03:00').toISOString());
  });
});

describe('estaVigente', () => {
  const sesion = crearSesion('tok-1', 'u-admin', CREADA);

  it('dado una sesion creada a las 09:00 cuando el reloj marca 16:59 entonces esta vigente', () => {
    expect(estaVigente(sesion, new Date('2026-12-01T16:59:00-03:00'))).toBe(true);
  });

  it('dado una sesion creada a las 09:00 cuando el reloj marca exactamente 17:00 entonces ya no esta vigente', () => {
    expect(estaVigente(sesion, new Date('2026-12-01T17:00:00-03:00'))).toBe(false);
  });

  it('dado una sesion creada a las 09:00 cuando el reloj marca despues de las 17:00 entonces no esta vigente', () => {
    expect(estaVigente(sesion, new Date('2026-12-01T17:00:01-03:00'))).toBe(false);
  });

  it('dado una sesion cuando el reloj marca el instante exacto de creacion entonces esta vigente', () => {
    expect(estaVigente(sesion, CREADA)).toBe(true);
  });
});
