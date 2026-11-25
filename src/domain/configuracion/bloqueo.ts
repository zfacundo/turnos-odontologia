import { crearIntervaloAlineado, type Intervalo } from '../shared/intervalo';
import { fallo, ok, type Result } from '../shared/result';

/** Bloqueo de agenda. Sin profesionalId ni sillonId es global. */
export interface Bloqueo {
  readonly id: string;
  readonly intervalo: Intervalo;
  readonly motivo: string;
  readonly profesionalId?: string;
  readonly sillonId?: string;
}

/** Valida el intervalo del bloqueo reutilizando RN-AG-01/RN-AG-03. */
export function validarBloqueo(b: Bloqueo): Result<Bloqueo> {
  const intervalo = crearIntervaloAlineado(b.intervalo.inicio, b.intervalo.fin);
  if (!intervalo.ok) return fallo(intervalo.error);
  return ok(b);
}
