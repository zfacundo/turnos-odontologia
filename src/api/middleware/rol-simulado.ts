import type { RequestHandler } from 'express';
import { esRol, type Usuario } from '../../domain/shared/rol';
import { ErrorDeEntrada } from './errores';

/** Autenticacion simulada (DD-09): X-Usuario / X-Rol. Deja res.locals.usuario (o undefined). */
export const rolSimulado: RequestHandler = (req, res, next) => {
  const rol = req.header('X-Rol');
  const usuarioId = req.header('X-Usuario');
  if (rol === undefined) {
    res.locals.usuario = undefined;
    next();
    return;
  }
  if (!esRol(rol)) {
    next(new ErrorDeEntrada('El header X-Rol debe ser admin, recepcion, odontologo o paciente.'));
    return;
  }
  const usuario: Usuario = { id: usuarioId ?? '', nombre: usuarioId ?? '', rol };
  res.locals.usuario = usuario;
  next();
};
