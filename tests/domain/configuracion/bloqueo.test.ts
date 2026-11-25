import { describe, it, expect } from 'vitest';
import type { Bloqueo } from '../../../src/domain/configuracion/bloqueo';
import { validarBloqueo } from '../../../src/domain/configuracion/bloqueo';

const bloqueo = (inicio: string, fin: string): Bloqueo => ({
  id: 'b-1',
  motivo: 'Feriado',
  intervalo: {
    inicio: new Date(`2026-12-08T${inicio}:00-03:00`),
    fin: new Date(`2026-12-08T${fin}:00-03:00`),
  },
});

describe('validarBloqueo', () => {
  it('dado un bloqueo alineado de 09:00 a 10:00 cuando se valida entonces es exitoso y conserva el bloqueo', () => {
    const b = bloqueo('09:00', '10:00');
    const r = validarBloqueo(b);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valor).toEqual(b);
  });

  it('dado un bloqueo de 09:10 a 10:00 cuando se valida entonces falla con RN-AG-03', () => {
    const r = validarBloqueo(bloqueo('09:10', '10:00'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.regla).toBe('RN-AG-03');
  });

  it('dado un bloqueo con inicio igual al fin cuando se valida entonces falla con RN-AG-01', () => {
    const r = validarBloqueo(bloqueo('10:00', '10:00'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.regla).toBe('RN-AG-01');
  });
});
