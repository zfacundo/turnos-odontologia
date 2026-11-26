import type { Deps } from '../../api/deps';
import {
  consultarMensajesSimulados,
  registrarMensajeSimulado,
  type MensajeSimulado,
} from './bandejaSimulada';

export type AvisoCancelacion = MensajeSimulado;

export function registrarAvisoCancelacion(
  deps: Deps,
  telefono: string,
  texto: string
): void {
  registrarMensajeSimulado(deps, telefono, texto);
}

export function consultarAvisosCancelacion(
  deps: Deps,
  telefono: string
): AvisoCancelacion[] {
  return consultarMensajesSimulados(deps, telefono);
}
