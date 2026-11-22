import type { Intervalo } from '../shared/intervalo';

/** Bloqueo de agenda. Sin profesionalId ni sillonId es global. */
export interface Bloqueo {
  readonly id: string;
  readonly intervalo: Intervalo;
  readonly motivo: string;
  readonly profesionalId?: string;
  readonly sillonId?: string;
}
