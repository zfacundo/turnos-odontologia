import { describe, it, expect } from 'vitest';
import type { EstadoTurno } from '../../../src/domain/agenda/turno';
import {
  AVISO_SIMULACION,
  DIAS_VENCIMIENTO_CAE,
  EMISOR_SIMULADO,
  IMPORTE_FACTURA_SIMULADA,
  PUNTO_DE_VENTA,
  fechaArgentina,
  formatearNumero,
  generarCae,
  sumarDias,
  validarEmisionFacturaC,
} from '../../../src/simulators/arca/facturaC';

const turno = (estado: EstadoTurno) => ({ id: 'turno-T', estado });

describe('validarEmisionFacturaC (RN-SM-03, SU-07)', () => {
  it('dado un turno atendido cuando se valida la emision entonces es valida', () => {
    expect(validarEmisionFacturaC(turno('atendido')).ok).toBe(true);
  });

  for (const estado of ['reservado', 'confirmado', 'cancelado', 'ausente'] as const) {
    it(`dado un turno ${estado} cuando se valida la emision entonces falla con RN-SM-03 citando SU-07`, () => {
      const r = validarEmisionFacturaC(turno(estado));
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.regla).toBe('RN-SM-03');
      expect(r.error.mensaje).toContain('SU-07');
      expect(r.error.mensaje).toContain(estado);
      expect(r.error.conflicto).toEqual({ turnoId: 'turno-T' });
    });
  }
});

describe('constantes del simulador de ARCA', () => {
  it('dado el simulador cuando se leen sus constantes entonces son ficticias y fijas', () => {
    expect(AVISO_SIMULACION).toBe('SIMULACIÓN — sin validez fiscal');
    expect(PUNTO_DE_VENTA).toBe('00001');
    expect(DIAS_VENCIMIENTO_CAE).toBe(10);
    expect(Number.isInteger(IMPORTE_FACTURA_SIMULADA)).toBe(true);
    expect(IMPORTE_FACTURA_SIMULADA).toBeGreaterThan(0);
    expect(EMISOR_SIMULADO).toEqual({
      razonSocial: 'Consultorio Ficticio',
      cuit: '20-99999999-0',
      condicionIva: 'Monotributo',
    });
  });
});

describe('formatearNumero (numeración correlativa)', () => {
  it('dado el numero 1 cuando se formatea entonces es 00001-00000001', () => {
    expect(formatearNumero(1)).toBe('00001-00000001');
  });

  it('dado el numero 12 cuando se formatea entonces es 00001-00000012', () => {
    expect(formatearNumero(12)).toBe('00001-00000012');
  });
});

describe('generarCae (CAE ficticio determinístico)', () => {
  it('dado la fecha 2026-12-01 y el numero 1 cuando se genera el CAE entonces es 26120101000001', () => {
    expect(generarCae('2026-12-01', 1)).toBe('26120101000001');
  });

  it('dado la fecha 2026-12-01 y el numero 2 cuando se genera el CAE entonces es 26120101000002', () => {
    expect(generarCae('2026-12-01', 2)).toBe('26120101000002');
  });

  it('dado los mismos datos cuando se genera el CAE dos veces entonces es identico y tiene 14 digitos', () => {
    const a = generarCae('2026-11-30', 123456);
    expect(a).toBe(generarCae('2026-11-30', 123456));
    expect(a).toMatch(/^\d{14}$/);
    expect(a).toBe('26113001123456');
  });
});

describe('fechaArgentina y sumarDias (fechas de calendario en Argentina)', () => {
  it('dado el mediodia del 2026-12-01 en Argentina cuando se toma la fecha entonces es 2026-12-01', () => {
    expect(fechaArgentina(new Date('2026-12-01T12:00:00-03:00'))).toBe('2026-12-01');
  });

  it('dado las 23:59 del 2026-11-30 en Argentina (ya 2026-12-01 en UTC) cuando se toma la fecha entonces es 2026-11-30', () => {
    expect(fechaArgentina(new Date('2026-11-30T23:59:00-03:00'))).toBe('2026-11-30');
  });

  it('dado el 2026-12-01 cuando se suman 10 dias entonces es 2026-12-11', () => {
    expect(sumarDias('2026-12-01', 10)).toBe('2026-12-11');
  });

  it('dado el 2026-12-28 cuando se suman 10 dias entonces cruza el año y es 2027-01-07', () => {
    expect(sumarDias('2026-12-28', 10)).toBe('2027-01-07');
  });
});
