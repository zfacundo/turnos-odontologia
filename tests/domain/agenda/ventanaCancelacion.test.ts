import { describe, it, expect } from 'vitest';
import {
  VENTANA_PACIENTE_MS,
  validarVentanaCancelacion,
} from '../../../src/domain/agenda/ventanaCancelacion';

const TURNO = { id: 't-1', inicio: new Date('2026-12-01T10:00:00-03:00') };
const hace = (ms: number): Date => new Date(TURNO.inicio.getTime() - ms);
const HORA = 60 * 60 * 1000;

describe('validarVentanaCancelacion - paciente (RN-AG-06)', () => {
  it('dado un turno a 25 h cuando el paciente cancela entonces es valido', () => {
    expect(validarVentanaCancelacion(TURNO, 'paciente', hace(25 * HORA)).ok).toBe(true);
  });

  it('dado un turno a 23 h cuando el paciente cancela entonces falla con RN-AG-06 y conflicto con el id del turno', () => {
    const r = validarVentanaCancelacion(TURNO, 'paciente', hace(23 * HORA));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.regla).toBe('RN-AG-06');
    expect(r.error.conflicto).toEqual({ turnoId: 't-1' });
  });

  it('dado un turno a exactamente 24 h cuando el paciente cancela entonces es valido', () => {
    expect(validarVentanaCancelacion(TURNO, 'paciente', hace(24 * HORA)).ok).toBe(true);
  });

  it('dado un turno a 23 h 59 min cuando el paciente cancela entonces falla con RN-AG-06', () => {
    const r = validarVentanaCancelacion(TURNO, 'paciente', hace(24 * HORA - 60 * 1000));
    expect(r.ok).toBe(false);
  });

  it('dado un turno ya iniciado cuando el paciente cancela entonces falla con RN-AG-06', () => {
    const r = validarVentanaCancelacion(TURNO, 'paciente', hace(-10 * 60 * 1000));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.regla).toBe('RN-AG-06');
  });
});

describe('validarVentanaCancelacion - otros roles', () => {
  it('dado un turno a 1 h cuando recepcion cancela entonces es valido', () => {
    expect(validarVentanaCancelacion(TURNO, 'recepcion', hace(HORA)).ok).toBe(true);
  });

  it('dado un turno ya iniciado cuando admin cancela entonces es valido', () => {
    expect(validarVentanaCancelacion(TURNO, 'admin', hace(-10 * 60 * 1000)).ok).toBe(true);
  });

  it('dado un turno a 48 h cuando un odontologo llega a la ventana entonces falla con RN-AG-06 por robustez', () => {
    const r = validarVentanaCancelacion(TURNO, 'odontologo', hace(48 * HORA));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.regla).toBe('RN-AG-06');
  });

  it('dada la constante de ventana cuando se lee entonces vale 24 horas en milisegundos', () => {
    expect(VENTANA_PACIENTE_MS).toBe(24 * HORA);
  });
});
