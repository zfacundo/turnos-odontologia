import type { Auditoria, EventoAuditoria } from '../../application/ports/auditoria';

export class AuditoriaEnMemoria implements Auditoria {
  private readonly registro: EventoAuditoria[] = [];

  registrar(evento: EventoAuditoria): void {
    this.registro.push(structuredClone(evento));
  }

  /** Solo en la implementacion (fuera del puerto): copia de los eventos en orden de llegada. */
  eventos(): readonly EventoAuditoria[] {
    return this.registro.map((e) => structuredClone(e));
  }
}
