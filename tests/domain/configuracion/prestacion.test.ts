import { describe, it, expect } from 'vitest';
import { validarPrestacion } from '../../../src/domain/configuracion/prestacion';

const datos = (duracionMin: number) => ({
  id: 'prest-x',
  codigo: 'x',
  nombre: 'Prestacion de prueba',
  duracionMin,
});

describe('validarPrestacion (RN-CF-01, DD-12)', () => {
  for (const dur of [30, 45, 15, 60]) {
    it(`dado duracionMin ${dur} cuando se valida la prestacion entonces es exitoso y conserva la duracion`, () => {
      const r = validarPrestacion(datos(dur));
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.valor.duracionMin).toBe(dur);
    });
  }

  for (const dur of [20, 0, -15, 22.5, Number.NaN]) {
    it(`dado duracionMin ${dur} cuando se valida la prestacion entonces falla con RN-CF-01`, () => {
      const r = validarPrestacion(datos(dur));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.regla).toBe('RN-CF-01');
    });
  }
});
