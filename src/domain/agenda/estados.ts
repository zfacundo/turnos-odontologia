import type { ErrorDeRegla, Result } from '../shared/result';
import { fallo, ok } from '../shared/result';
import type { EstadoTurno, Turno } from './turno';

/** Maquina de estados del turno (RN-AG-09). Los estados finales no tienen salidas. */
export const TRANSICIONES: Readonly<Record<EstadoTurno, readonly EstadoTurno[]>> = {
  reservado: ['confirmado', 'cancelado', 'ausente', 'atendido'],
  confirmado: ['cancelado', 'atendido', 'ausente'],
  cancelado: [],
  atendido: [],
  ausente: [],
};

export function esFinal(estado: EstadoTurno): boolean {
  return TRANSICIONES[estado].length === 0;
}

/** Valida la transicion; el "turno en conflicto" (DD-08) es el propio turno. */
export function validarTransicion(
  turno: Pick<Turno, 'id' | 'estado'>,
  destino: EstadoTurno,
): Result<EstadoTurno, ErrorDeRegla> {
  if (TRANSICIONES[turno.estado].includes(destino)) return ok(destino);
  return fallo({
    regla: 'RN-AG-09',
    mensaje: `No se puede pasar un turno de ${turno.estado} a ${destino}.`,
    conflicto: { turnoId: turno.id },
  });
}
