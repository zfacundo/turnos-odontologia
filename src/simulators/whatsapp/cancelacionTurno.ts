import type { Deps } from '../../api/deps';
import type { Turno } from '../../domain/agenda/turno';
import { registrarAvisoCancelacion } from './avisosCancelacion';

export interface DatosAvisoCancelacion {
  readonly paciente: string;
  readonly profesional: string;
  readonly inicio: Date;
}

const FORMATO_FECHA = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  dateStyle: 'short',
  timeStyle: 'short',
});

/** Texto del aviso simulado de cancelación. Pura: sin reloj ni acceso a repositorios. */
export function mensajeCancelacionTurno(datos: DatosAvisoCancelacion): string {
  const fecha = FORMATO_FECHA.format(datos.inicio);
  return (
    `Hola, ${datos.paciente}. Te informamos que tu turno del ${fecha} ` +
    `con ${datos.profesional} fue cancelado. ` +
    'Para solicitar otro turno, comunicate con recepción.'
  );
}

type Registrar = (deps: Deps, telefono: string, texto: string) => void;

/**
 * Registra el aviso de cancelación en el WhatsApp simulado del paciente si tiene
 * teléfono. Nunca lanza: una falla del aviso no debe deshacer la cancelación.
 * Devuelve true si registró el mensaje.
 */
export function registrarAvisoCancelacionTurno(
  deps: Deps,
  turno: Turno,
  registrar: Registrar = registrarAvisoCancelacion
): boolean {
  try {
    const paciente = deps.pacientes.buscarPorId(turno.pacienteId);
    if (!paciente?.telefono) return false;

    const profesional =
      deps.profesionales.buscarPorId(turno.profesionalId)?.nombre ?? turno.profesionalId;

    registrar(
      deps,
      paciente.telefono,
      mensajeCancelacionTurno({ paciente: paciente.nombre, profesional, inicio: turno.inicio })
    );
    return true;
  } catch (error) {
    console.error('No se pudo registrar el aviso simulado:', error);
    return false;
  }
}
