import type { Rol } from '../../domain/shared/rol';

export interface EventoAuditoria {
  readonly fecha: Date;
  readonly usuarioId: string;
  readonly rol: Rol;
  readonly accion: string;
  readonly entidad: string;
  readonly entidadId: string;
  readonly detalle?: string;
}

/** Solo inserción: no hay operaciones de edición ni borrado. */
export interface Auditoria {
  registrar(evento: EventoAuditoria): void;
}
