import type { Turno } from '../../domain/agenda/turno';
import { fallo, ok, type ErrorDeRegla, type Result } from '../../domain/shared/result';

/**
 * Dominio puro del simulador de Mercado Pago (C-11, design D1-D5).
 * Sin Express, fs ni reloj: la fecha y el id llegan desde la capa de aplicacion.
 */

export const AVISO_SIMULACION = 'SIMULACIÓN — no es Mercado Pago real';

/** Monto ficticio fijo de la seña simulada (design D3; pregunta abierta). No es dinero real. */
export const MONTO_SENA_SIMULADA = 5000;

export type EstadoPagoSena = 'aprobado' | 'rechazado';

export interface PagoSena {
  readonly id: string;
  readonly turnoId: string;
  readonly monto: number;
  readonly estado: EstadoPagoSena;
  readonly fecha: Date;
  readonly simulado: true;
}

const ESTADOS_QUE_SE_SENAN: readonly Turno['estado'][] = ['reservado', 'confirmado'];

/** RN-SM-01: solo turnos reservados/confirmados (SU-07) y no señados. El estado se chequea primero. */
export function validarPagoSena(
  turno: Pick<Turno, 'id' | 'estado' | 'senado'>,
): Result<true, ErrorDeRegla> {
  if (!ESTADOS_QUE_SE_SENAN.includes(turno.estado)) {
    return fallo({
      regla: 'RN-SM-01',
      mensaje: `Solo se puede señar un turno reservado o confirmado (SU-07); el turno está ${turno.estado}.`,
      conflicto: { turnoId: turno.id },
    });
  }
  if (turno.senado) {
    return fallo({
      regla: 'RN-SM-01',
      mensaje: 'No se puede pagar la seña: turno ya señado.',
      conflicto: { turnoId: turno.id },
    });
  }
  return ok(true);
}
