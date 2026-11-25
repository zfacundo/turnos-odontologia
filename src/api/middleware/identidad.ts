import type { RequestHandler } from 'express';
import { resolverSesion } from '../../application/auth/resolverSesion';
import type { Deps } from '../deps';
import { ErrorDeAutenticacion } from './errores';
import { rolSimulado } from './rol-simulado';

const BEARER = /^Bearer ([^\s]+)$/;
const MENSAJE = 'Sesión inválida o vencida.';

/** Token de un header `Authorization: Bearer <token>`; undefined si falta o tiene otra forma. */
export function extraerToken(autorizacion: string | undefined): string | undefined {
  return autorizacion === undefined ? undefined : BEARER.exec(autorizacion)?.[1];
}

/**
 * Identidad de la request (D1): con `Authorization` se identifica SOLO por token de sesión
 * (se ignoran X-Usuario / X-Rol); sin él delega tal cual en `rolSimulado` (DD-09).
 */
export function identidad(deps: Pick<Deps, 'sesiones' | 'usuarios' | 'clock'>): RequestHandler {
  return (req, res, next) => {
    const autorizacion = req.header('Authorization');
    if (autorizacion === undefined) {
      rolSimulado(req, res, next);
      return;
    }
    const resultado = resolverSesion(deps, extraerToken(autorizacion));
    if (!resultado.ok) {
      next(new ErrorDeAutenticacion(MENSAJE));
      return;
    }
    res.locals.usuario = resultado.valor.usuario;
    next();
  };
}
