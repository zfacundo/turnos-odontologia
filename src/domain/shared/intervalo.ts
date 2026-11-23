import { fallo, ok, type Result } from './result';
import { BLOQUE_MIN, estaAlineadoA15 } from './bloques';

/** Intervalo semiabierto [inicio, fin). */
export interface Intervalo {
  readonly inicio: Date;
  readonly fin: Date;
}

export function crearIntervalo(inicio: Date, fin: Date): Result<Intervalo> {
  if (!(inicio.getTime() < fin.getTime())) {
    return fallo({
      regla: 'RN-AG-01',
      mensaje: 'El inicio debe ser estrictamente anterior al fin.',
    });
  }
  return ok({ inicio, fin });
}

/** A y B se solapan sii A.inicio < B.fin y B.inicio < A.fin (nunca <=). */
export function seSolapan(a: Intervalo, b: Intervalo): boolean {
  return a.inicio.getTime() < b.fin.getTime() && b.inicio.getTime() < a.fin.getTime();
}

/** Como crearIntervalo, y ademas exige inicio y fin alineados a bloques de 15 min (RN-AG-03). */
export function crearIntervaloAlineado(inicio: Date, fin: Date): Result<Intervalo> {
  const base = crearIntervalo(inicio, fin);
  if (!base.ok) return base;
  if (!estaAlineadoA15(inicio) || !estaAlineadoA15(fin)) {
    return fallo({
      regla: 'RN-AG-03',
      mensaje: `Inicio y fin deben estar alineados a bloques de ${BLOQUE_MIN} minutos.`,
    });
  }
  return base;
}
