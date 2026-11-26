import type { Deps } from '../../api/deps';

export interface MensajeSimulado {
  readonly id: number;
  readonly texto: string;
}

const bandejas = new WeakMap<Deps, Map<string, MensajeSimulado[]>>();
let siguienteId = 1;

export function registrarMensajeSimulado(
  deps: Deps,
  telefono: string,
  texto: string
): void {
  let bandeja = bandejas.get(deps);
  if (!bandeja) {
    bandeja = new Map();
    bandejas.set(deps, bandeja);
  }

  const mensajes = bandeja.get(telefono) ?? [];
  mensajes.push({ id: siguienteId++, texto });
  bandeja.set(telefono, mensajes);
}

export function consultarMensajesSimulados(
  deps: Deps,
  telefono: string
): MensajeSimulado[] {
  return bandejas.get(deps)?.get(telefono) ?? [];
}
