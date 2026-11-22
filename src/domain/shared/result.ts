export interface ErrorDeRegla {
  /** Codigo de regla de negocio, p. ej. 'RN-AG-01'. */
  regla: string;
  /** Mensaje legible para la UI. */
  mensaje: string;
  dimension?: 'profesional' | 'sillon' | 'paciente';
  conflicto?: { turnoId: string };
}

export type Result<T, E = ErrorDeRegla> =
  | { readonly ok: true; readonly valor: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(valor: T): Result<T, never> {
  return { ok: true, valor };
}

export function fallo<E = ErrorDeRegla>(error: E): Result<never, E> {
  return { ok: false, error };
}
