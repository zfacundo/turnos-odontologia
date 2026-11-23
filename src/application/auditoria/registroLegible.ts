
import type { EventoAuditoria } from '../ports/auditoria';

function describirEvento(evento: EventoAuditoria): string {
  if (evento.accion === 'crear' && evento.entidad === 'turno') {
    try {
      const turno = JSON.parse(evento.detalle ?? '{}');

      if (
        typeof turno.pacienteId === 'string' &&
        typeof turno.inicio === 'string'
      ) {
        const fecha = new Date(turno.inicio);

        if (!Number.isNaN(fecha.getTime())) {
          const horario = new Intl.DateTimeFormat('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).format(fecha);

          return `Turno creado: paciente ${turno.pacienteId}, ${horario}.`;
        }
      }
    } catch {
      // Si el detalle no es JSON, mostramos un mensaje genérico.
    }

    return `Turno creado: ${evento.entidadId}.`;
  }

  return `${evento.accion}: ${evento.entidad} ${evento.entidadId}.`;
}

export function registroLegible(
  eventos: readonly EventoAuditoria[],
) {
  return eventos.map(evento => ({
    fecha: evento.fecha,
    usuarioId: evento.usuarioId,
    rol: evento.rol,
    mensaje: describirEvento(evento),
  }));
}
