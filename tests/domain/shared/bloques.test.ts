import { describe, it, expect } from 'vitest';
import { BLOQUE_MIN, estaAlineadoA15 } from '../../../src/domain/shared/bloques';

describe('estaAlineadoA15 (RN-AG-03)', () => {
  const casos: Array<[string, string, boolean]> = [
    ['09:10', '2026-12-01T09:10:00-03:00', false],
    ['09:15', '2026-12-01T09:15:00-03:00', true],
    ['14:00 en punto', '2026-12-01T14:00:00-03:00', true],
    ['09:15:30 con segundos', '2026-12-01T09:15:30-03:00', false],
    ['09:15:00.500 con milisegundos', '2026-12-01T09:15:00.500-03:00', false],
    ['18:45', '2026-12-01T18:45:00-03:00', true],
  ];
  for (const [nombre, iso, esperado] of casos) {
    it(`dado el instante ${nombre} cuando se evalua la alineacion entonces es ${esperado}`, () => {
      expect(estaAlineadoA15(new Date(iso))).toBe(esperado);
    });
  }

  it('dado la constante BLOQUE_MIN cuando se consulta entonces vale 15', () => {
    expect(BLOQUE_MIN).toBe(15);
  });
});
