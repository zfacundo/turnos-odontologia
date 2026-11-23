import type { ErrorDeRegla, Result } from '../shared/result';
import { fallo, ok } from '../shared/result';
import type { Rol } from '../shared/rol';
import type { Turno } from './turno';

/** Anticipacion minima con la que el paciente puede cancelar (RN-AG-06). */
export const VENTANA_PACIENTE_MS = 24 * 60 * 60 * 1000;

/** `ahora` llega por argumento: el dominio no lee el reloj. Exactamente 24 h es valido. */
export function validarVentanaCancelacion(
  turno: Pick<Turno, 'id' | 'inicio'>,
  rol: Rol,
  ahora: Date,
): Result<true, ErrorDeRegla> {
  if (rol === 'recepcion' || rol === 'admin') return ok(true);
  if (rol === 'paciente' && turno.inicio.getTime() - ahora.getTime() >= VENTANA_PACIENTE_MS) {
    return ok(true);
  }
  return fallo({
    regla: 'RN-AG-06',
    mensaje: 'Solo se puede cancelar con 24 horas o mas de anticipacion.',
    conflicto: { turnoId: turno.id },
  });
}
