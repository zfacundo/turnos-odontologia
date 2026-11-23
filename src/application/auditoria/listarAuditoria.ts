
import type {
  Auditoria,
  EventoAuditoria,
} from '../ports/auditoria';

export interface AuditoriaConsultable extends Auditoria {
  eventos(): readonly EventoAuditoria[];
}

export function esAuditoriaConsultable(
  auditoria: Auditoria,
): auditoria is AuditoriaConsultable {
  return 'eventos' in auditoria
    && typeof auditoria.eventos === 'function';
}

export function listarAuditoria(
  auditoria: AuditoriaConsultable,
): EventoAuditoria[] {
  return [...auditoria.eventos()].sort(
    (a, b) => a.fecha.getTime() - b.fecha.getTime(),
  );
}
