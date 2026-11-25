import { BLOQUE_MIN } from '../shared/bloques';
import { fallo, ok, type Result } from '../shared/result';
import type { Franja } from './profesional';

function minutosDe(hhmm: string): number {
  const [horas = '0', minutos = '0'] = hhmm.split(':');
  return Number(horas) * 60 + Number(minutos);
}

const RECHAZO = (mensaje: string) => fallo({ regla: 'RN-CF-02', mensaje });

/**
 * RN-CF-02: sin solapamiento dentro de un mismo dia, horas alineadas a BLOQUE_MIN
 * y desde estrictamente anterior a hasta. Intervalos semiabiertos.
 * La forma (diaSemana 1..7, HH:mm) se valida antes, en aplicacion.
 */
export function validarDisponibilidad(franjas: readonly Franja[]): Result<readonly Franja[]> {
  for (const f of franjas) {
    const desde = minutosDe(f.desde);
    const hasta = minutosDe(f.hasta);
    if (!Number.isFinite(desde) || !Number.isFinite(hasta)) {
      return RECHAZO('Las horas de la franja no son validas.');
    }
    if (desde % BLOQUE_MIN !== 0 || hasta % BLOQUE_MIN !== 0) {
      return RECHAZO(`Las horas deben estar alineadas a ${BLOQUE_MIN} minutos.`);
    }
    if (desde >= hasta) {
      return RECHAZO('desde debe ser estrictamente anterior a hasta.');
    }
  }
  for (let i = 0; i < franjas.length; i++) {
    const a = franjas[i];
    if (a === undefined) continue;
    for (let j = i + 1; j < franjas.length; j++) {
      const b = franjas[j];
      if (b === undefined || a.diaSemana !== b.diaSemana) continue;
      if (a.desde < b.hasta && b.desde < a.hasta) {
        return RECHAZO('Las franjas del mismo dia no pueden solaparse.');
      }
    }
  }
  return ok(franjas);
}
