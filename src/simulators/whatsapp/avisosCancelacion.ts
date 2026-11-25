
import type { Deps } from '../../api/deps';

export interface AvisoCancelacion {
  readonly id: number;
  readonly texto: string;
}

const bandejas = new WeakMap<Deps, Map<string, AvisoCancelacion[]>>();
let siguienteId = 1;

export function registrarAvisoCancelacion(
  deps: Deps,
  telefono: string,
  texto: string
): void {
  let bandeja = bandejas.get(deps);
  if (!bandeja) {
    bandeja = new Map();
    bandejas.set(deps, bandeja);
  }

  const avisos = bandeja.get(telefono) ?? [];
  avisos.push({ id: siguienteId++, texto });
  bandeja.set(telefono, avisos);
}

export function consultarAvisosCancelacion(
  deps: Deps,
  telefono: string
): AvisoCancelacion[] {
  return bandejas.get(deps)?.get(telefono) ?? [];
}
