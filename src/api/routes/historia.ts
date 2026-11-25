import { Router } from 'express';
import type { ErrorHistoria } from '../../application/historia/errores';
import { listarHistoria } from '../../application/historia/listarHistoria';
import { registrarEntrada } from '../../application/historia/registrarEntrada';
import type { Usuario } from '../../domain/shared/rol';
import type { Deps } from '../deps';
import { ErrorDeEntrada, ErrorDePermiso, FalloDeRegla } from '../middleware/errores';

/** Usuario completo: si deps.usuarios tiene el mismo id y rol usa ese (trae profesionalId). */
function resolverUsuario(deps: Deps, usuario: Usuario | undefined): Usuario | undefined {
  if (usuario === undefined) return undefined;
  return deps.usuarios.find((u) => u.id === usuario.id && u.rol === usuario.rol) ?? usuario;
}

/** 'no-encontrado' se responde 404 en la ruta; el resto pasa al manejador de errores. */
function aErrorHttp(error: Exclude<ErrorHistoria, { tipo: 'no-encontrado' }>): Error {
  switch (error.tipo) {
    case 'permiso':
      return new ErrorDePermiso(error.mensaje);
    case 'entrada':
      return new ErrorDeEntrada(error.mensaje);
    case 'regla':
      return new FalloDeRegla(error.error);
  }
}

/**
 * GET|POST /api/pacientes/:id/historia. No se registran PUT/PATCH/DELETE: caen en el 404
 * genérico de /api (historial de solo inserción).
 */
export function historiaRouter(deps: Deps): Router {
  const router = Router();

  router.get('/pacientes/:id/historia', (req, res, next) => {
    const usuario = resolverUsuario(deps, res.locals.usuario as Usuario | undefined);
    const r = listarHistoria(deps, usuario, req.params.id);
    if (!r.ok) {
      if (r.error.tipo === 'no-encontrado') {
        res.status(404).json({ error: { tipo: 'no-encontrado', mensaje: r.error.mensaje } });
        return;
      }
      next(aErrorHttp(r.error));
      return;
    }
    res.json({ entradas: r.valor, simulado: true });
  });

  router.post('/pacientes/:id/historia', (req, res, next) => {
    const usuario = resolverUsuario(deps, res.locals.usuario as Usuario | undefined);
    const r = registrarEntrada(deps, usuario, req.params.id, req.body as unknown);
    if (!r.ok) {
      if (r.error.tipo === 'no-encontrado') {
        res.status(404).json({ error: { tipo: 'no-encontrado', mensaje: r.error.mensaje } });
        return;
      }
      next(aErrorHttp(r.error));
      return;
    }
    res.status(201).json(r.valor);
  });

  return router;
}
