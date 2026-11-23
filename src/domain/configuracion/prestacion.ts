import { BLOQUE_MIN } from '../shared/bloques';
import { fallo, ok, type Result } from '../shared/result';

export interface Prestacion {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  /** Duracion unica de la prestacion (DD-12), multiplo de 15. */
  readonly duracionMin: number;
}

/** RN-CF-01: duracionMin entero > 0 y multiplo de 15. */
export function validarPrestacion(p: Prestacion): Result<Prestacion> {
  if (!Number.isInteger(p.duracionMin) || p.duracionMin <= 0 || p.duracionMin % BLOQUE_MIN !== 0) {
    return fallo({
      regla: 'RN-CF-01',
      mensaje: `La duracion debe ser un entero positivo multiplo de ${BLOQUE_MIN} minutos.`,
    });
  }
  return ok(p);
}
