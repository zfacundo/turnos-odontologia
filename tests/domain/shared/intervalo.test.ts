import { describe, it, expect } from 'vitest';
import { crearIntervalo, crearIntervaloAlineado, seSolapan, type Intervalo } from '../../../src/domain/shared/intervalo';

const d = (iso: string): Date => new Date(iso);

describe('crearIntervalo (RN-AG-01)', () => {
  it('dado inicio anterior al fin cuando se crea el intervalo entonces es exitoso y conserva inicio y fin', () => {
    const r = crearIntervalo(d('2026-12-01T09:00:00-03:00'), d('2026-12-01T09:30:00-03:00'));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.valor.inicio.toISOString()).toBe('2026-12-01T12:00:00.000Z');
      expect(r.valor.fin.toISOString()).toBe('2026-12-01T12:30:00.000Z');
    }
  });

  it('dado inicio igual al fin cuando se crea el intervalo entonces falla con RN-AG-01', () => {
    const r = crearIntervalo(d('2026-12-01T09:00:00-03:00'), d('2026-12-01T09:00:00-03:00'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.regla).toBe('RN-AG-01');
  });

  it('dado inicio posterior al fin cuando se crea el intervalo entonces falla con RN-AG-01', () => {
    const r = crearIntervalo(d('2026-12-01T10:00:00-03:00'), d('2026-12-01T09:00:00-03:00'));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.regla).toBe('RN-AG-01');
      expect(r.error.mensaje.length).toBeGreaterThan(0);
    }
  });

  it('dado una fecha invalida cuando se crea el intervalo entonces falla con RN-AG-01', () => {
    const r = crearIntervalo(new Date('no-es-fecha'), d('2026-12-01T09:00:00-03:00'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.regla).toBe('RN-AG-01');
  });
});

describe('seSolapan (RN-AG-01, semiabierto)', () => {
  const iv = (ini: string, fin: string): Intervalo => {
    const r = crearIntervalo(d(`2026-12-01T${ini}:00-03:00`), d(`2026-12-01T${fin}:00-03:00`));
    if (!r.ok) throw new Error('fixture invalida');
    return r.valor;
  };
  const casos: Array<[string, Intervalo, Intervalo, boolean]> = [
    ['contiguos', iv('09:00', '09:30'), iv('09:30', '10:00'), false],
    ['contenido', iv('09:00', '10:00'), iv('09:30', '09:45'), true],
    ['solapamiento parcial', iv('09:00', '09:45'), iv('09:30', '10:15'), true],
    ['separados', iv('09:00', '09:30'), iv('10:00', '10:30'), false],
    ['identicos', iv('09:00', '09:30'), iv('09:00', '09:30'), true],
  ];

  for (const [nombre, a, b, esperado] of casos) {
    it(`dado intervalos ${nombre} cuando se evalua seSolapan entonces es ${esperado} y simetrico`, () => {
      expect(seSolapan(a, b)).toBe(esperado);
      expect(seSolapan(b, a)).toBe(esperado);
    });
  }
});

describe('crearIntervaloAlineado (RN-AG-03)', () => {
  it('dado inicio 09:15 y fin 10:00 cuando se crea alineado entonces es exitoso', () => {
    const r = crearIntervaloAlineado(d('2026-12-01T09:15:00-03:00'), d('2026-12-01T10:00:00-03:00'));
    expect(r.ok).toBe(true);
  });

  it('dado inicio desalineado 09:10 cuando se crea alineado entonces falla con RN-AG-03', () => {
    const r = crearIntervaloAlineado(d('2026-12-01T09:10:00-03:00'), d('2026-12-01T09:40:00-03:00'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.regla).toBe('RN-AG-03');
  });

  it('dado fin desalineado 09:20 cuando se crea alineado entonces falla con RN-AG-03', () => {
    const r = crearIntervaloAlineado(d('2026-12-01T09:00:00-03:00'), d('2026-12-01T09:20:00-03:00'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.regla).toBe('RN-AG-03');
  });

  it('dado inicio igual al fin cuando se crea alineado entonces falla con RN-AG-01', () => {
    const r = crearIntervaloAlineado(d('2026-12-01T09:00:00-03:00'), d('2026-12-01T09:00:00-03:00'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.regla).toBe('RN-AG-01');
  });
});
