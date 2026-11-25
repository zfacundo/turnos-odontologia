import { fallo, ok, type ErrorDeRegla, type Result } from '../shared/result';

/** Entrada del historial clínico simple y ficticio (solo inserción). */
export interface EntradaHistoria {
  readonly id: string;
  readonly pacienteId: string;
  readonly fecha: Date;
  readonly profesionalId: string;
  readonly profesionalNombre: string;
  readonly procedimiento: string;
  readonly notas: string;
  readonly turnoId?: string;
  readonly creadoPor: string;
  readonly creadoEn: Date;
  readonly simulado: true;
}

/** Datos de una entrada ya validados (sin identidad ni auditoría). */
export interface DatosEntrada {
  readonly fecha: Date;
  readonly procedimiento: string;
  readonly notas: string;
  readonly turnoId?: string;
}

export type ErrorEntradaHistoria =
  | { readonly tipo: 'entrada'; readonly mensaje: string }
  | { readonly tipo: 'regla'; readonly error: ErrorDeRegla };

export const PROCEDIMIENTO_MAX = 120;
export const NOTAS_MAX = 1000;

const ISO_CON_ZONA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

const entrada = (mensaje: string) => fallo<ErrorEntradaHistoria>({ tipo: 'entrada', mensaje });

/** Valida el cuerpo del alta. `ahora` llega inyectado: el dominio no lee el reloj. */
export function validarEntrada(input: unknown, ahora: Date): Result<DatosEntrada, ErrorEntradaHistoria> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return entrada('El cuerpo debe ser un objeto JSON.');
  }
  const c = input as Record<string, unknown>;

  if (typeof c.fecha !== 'string' || !ISO_CON_ZONA.test(c.fecha)) {
    return entrada('fecha debe ser una fecha ISO 8601 con zona horaria explicita.');
  }
  const fecha = new Date(c.fecha);
  if (Number.isNaN(fecha.getTime())) return entrada('fecha no es una fecha valida.');

  if (typeof c.procedimiento !== 'string' || c.procedimiento === '') {
    return entrada('procedimiento es obligatorio.');
  }
  if (c.procedimiento.length > PROCEDIMIENTO_MAX) {
    return entrada(`procedimiento no puede superar ${PROCEDIMIENTO_MAX} caracteres.`);
  }

  const notas = c.notas === undefined ? '' : c.notas;
  if (typeof notas !== 'string') return entrada('notas debe ser un texto.');
  if (notas.length > NOTAS_MAX) return entrada(`notas no puede superar ${NOTAS_MAX} caracteres.`);

  if (c.turnoId !== undefined && typeof c.turnoId !== 'string') {
    return entrada('turnoId debe ser un texto.');
  }

  if (fecha.getTime() > ahora.getTime()) {
    return fallo({
      tipo: 'regla',
      error: { regla: 'RN-HC-02', mensaje: 'La fecha de la entrada no puede ser posterior al momento actual.' },
    });
  }

  return ok({
    fecha,
    procedimiento: c.procedimiento,
    notas,
    ...(c.turnoId !== undefined && { turnoId: c.turnoId }),
  });
}
