import { describe, it, expect } from 'vitest';
import type { Franja } from '../../../src/domain/configuracion/profesional';
import { validarDisponibilidad } from '../../../src/domain/configuracion/disponibilidad';

const franja = (diaSemana: Franja['diaSemana'], desde: string, hasta: string): Franja => ({
  diaSemana,
  desde,
  hasta,
});

describe('validarDisponibilidad (RN-CF-02)', () => {
  it('dado lunes 09:00-13:00 y lunes 12:00-15:00 cuando se valida entonces falla con RN-CF-02', () => {
    const r = validarDisponibilidad([franja(1, '09:00', '13:00'), franja(1, '12:00', '15:00')]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.regla).toBe('RN-CF-02');
  });

  it('dado lunes 09:00-13:00 y lunes 13:00-15:00 cuando se valida entonces es exitoso porque son contiguas', () => {
    const r = validarDisponibilidad([franja(1, '09:00', '13:00'), franja(1, '13:00', '15:00')]);
    expect(r.ok).toBe(true);
  });

  it('dado una franja desde 09:10 cuando se valida entonces falla con RN-CF-02 por desalineada', () => {
    const r = validarDisponibilidad([franja(1, '09:10', '13:00')]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.regla).toBe('RN-CF-02');
  });

  it('dado una franja desde 13:00 hasta 09:00 cuando se valida entonces falla con RN-CF-02', () => {
    const r = validarDisponibilidad([franja(1, '13:00', '09:00')]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.regla).toBe('RN-CF-02');
  });

  it('dado lunes y martes con el mismo horario cuando se valida entonces es exitoso', () => {
    const r = validarDisponibilidad([franja(1, '09:00', '13:00'), franja(2, '09:00', '13:00')]);
    expect(r.ok).toBe(true);
  });

  it('dado un arreglo vacio cuando se valida entonces es exitoso', () => {
    expect(validarDisponibilidad([]).ok).toBe(true);
  });
});
