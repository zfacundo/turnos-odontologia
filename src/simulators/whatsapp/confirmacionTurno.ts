import type { Deps } from '../../api/deps';
import type { Turno } from '../../domain/agenda/turno';
import type { Usuario } from '../../domain/shared/rol';
import { registrarMensajeSimulado } from './bandejaSimulada';

export interface DatosConfirmacionTurno {
  readonly paciente: string;
  readonly profesional: string;
  readonly prestacion: string;
  readonly inicio: Date;
}

const FORMATO_FECHA = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  dateStyle: 'short',
  timeStyle: 'short',
});

/** Texto de la confirmación simulada. Pura: sin reloj ni acceso a repositorios. */
export function mensajeConfirmacionTurno(datos: DatosConfirmacionTurno): string {
  const fecha = FORMATO_FECHA.format(datos.inicio);
  return (
    `Hola, ${datos.paciente}. Tu turno del ${fecha} con ${datos.profesional} ` +
    `para ${datos.prestacion} fue agendado correctamente. ¡Te esperamos!`
  );
}

type Registrar = (deps: Deps, telefono: string, texto: string) => void;

/**
 * Registra la confirmación en el WhatsApp simulado del paciente cuando el turno lo
 * crea recepción o administración con origen recepción. Nunca lanza: una falla del
 * aviso no debe deshacer el alta. Devuelve true si registró el mensaje.
 */
export function registrarConfirmacionTurno(
  deps: Deps,
  turno: Turno,
  usuario: Usuario | undefined,
  registrar: Registrar = registrarMensajeSimulado
): boolean {
  try {
    if (turno.origen !== 'recepcion') return false;
    if (usuario?.rol !== 'recepcion' && usuario?.rol !== 'admin') return false;

    const paciente = deps.pacientes.buscarPorId(turno.pacienteId);
    if (!paciente?.telefono) return false;

    const profesional =
      deps.profesionales.buscarPorId(turno.profesionalId)?.nombre ?? turno.profesionalId;
    const prestacion =
      deps.prestaciones.buscarPorId(turno.prestacionId)?.nombre ?? turno.prestacionId;

    registrar(
      deps,
      paciente.telefono,
      mensajeConfirmacionTurno({
        paciente: paciente.nombre,
        profesional,
        prestacion,
        inicio: turno.inicio,
      })
    );
    return true;
  } catch (error) {
    console.error('No se pudo registrar la confirmación simulada:', error);
    return false;
  }
}
