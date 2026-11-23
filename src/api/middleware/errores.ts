import type { ErrorRequestHandler } from 'express';
import type { ErrorDeRegla, Result } from '../../domain/shared/result';

export class ErrorDeEntrada extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorDeEntrada';
  }
}

export class ErrorDePermiso extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorDePermiso';
  }
}

export class FalloDeRegla extends Error {
  constructor(readonly detalle: ErrorDeRegla) {
    super(detalle.mensaje);
    this.name = 'FalloDeRegla';
  }
}

/** Devuelve el valor de un Result exitoso o lanza FalloDeRegla (409 en el manejador). */
export function lanzarSiFallo<T>(resultado: Result<T>): T {
  if (!resultado.ok) throw new FalloDeRegla(resultado.error);
  return resultado.valor;
}

function esFalloDeParseo(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    (err as { type: unknown }).type === 'entity.parse.failed'
  );
}

export const manejadorDeErrores: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (err instanceof FalloDeRegla) {
    const { regla, mensaje, dimension, conflicto } = err.detalle;
    res.status(409).json({
      error: {
        tipo: 'regla',
        regla,
        mensaje,
        ...(dimension !== undefined && { dimension }),
        ...(conflicto !== undefined && { conflicto }),
      },
    });
    return;
  }
  if (err instanceof ErrorDeEntrada) {
    res.status(400).json({ error: { tipo: 'entrada', mensaje: err.message } });
    return;
  }
  if (esFalloDeParseo(err)) {
    res.status(400).json({ error: { tipo: 'entrada', mensaje: 'JSON malformado' } });
    return;
  }
  if (err instanceof ErrorDePermiso) {
    res.status(403).json({ error: { tipo: 'permiso', mensaje: err.message } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { tipo: 'interno', mensaje: 'Error interno' } });
};
