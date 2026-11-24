import { describe, it, expect } from 'vitest';
import type { EstadoTurno } from '../../../src/domain/agenda/turno';
import {
  AVISO_SIMULACION,
  MONTO_SENA_SIMULADA,
  validarPagoSena,
} from '../../../src/simulators/mercadopago/pagoSena';

const turno = (estado: EstadoTurno, senado = false) => ({ id: 'turno-T', estado, senado });

describe('validarPagoSena (RN-SM-01, SU-07)', () => {
  it('dado un turno reservado sin señar cuando se valida el pago entonces es valido', () => {
    expect(validarPagoSena(turno('reservado')).ok).toBe(true);
  });

  it('dado un turno confirmado sin señar cuando se valida el pago entonces es valido', () => {
    expect(validarPagoSena(turno('confirmado')).ok).toBe(true);
  });

  for (const estado of ['cancelado', 'atendido', 'ausente'] as const) {
    it(`dado un turno ${estado} cuando se valida el pago entonces falla con RN-SM-01 citando SU-07`, () => {
      const r = validarPagoSena(turno(estado));
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.regla).toBe('RN-SM-01');
      expect(r.error.mensaje).toContain('SU-07');
      expect(r.error.mensaje).toContain(estado);
      expect(r.error.conflicto).toEqual({ turnoId: 'turno-T' });
    });
  }

  it('dado un turno reservado ya señado cuando se valida el pago entonces falla con RN-SM-01 "turno ya señado"', () => {
    const r = validarPagoSena(turno('reservado', true));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.regla).toBe('RN-SM-01');
    expect(r.error.mensaje).toContain('turno ya señado');
    expect(r.error.conflicto).toEqual({ turnoId: 'turno-T' });
  });

  it('dado un turno cancelado y señado cuando se valida el pago entonces informa el estado antes que la marca', () => {
    const r = validarPagoSena(turno('cancelado', true));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.mensaje).toContain('SU-07');
    expect(r.error.mensaje).not.toContain('turno ya señado');
  });
});

describe('constantes del simulador', () => {
  it('dado el simulador cuando se lee el aviso entonces es el texto exacto de simulacion', () => {
    expect(AVISO_SIMULACION).toBe('SIMULACIÓN — no es Mercado Pago real');
  });

  it('dado el simulador cuando se lee el monto entonces es un entero positivo ficticio', () => {
    expect(Number.isInteger(MONTO_SENA_SIMULADA)).toBe(true);
    expect(MONTO_SENA_SIMULADA).toBeGreaterThan(0);
  });
});
