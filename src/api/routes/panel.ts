import { Router } from 'express';
import { resumenDelDia } from '../../application/panel/resumenDelDia';
import type { Usuario } from '../../domain/shared/rol';
import type { Deps } from '../deps';
import { ErrorDeEntrada, ErrorDePermiso } from '../middleware/errores';

/** Usuario completo: si deps.usuarios tiene el mismo id y rol usa ese (trae profesionalId). */
function resolverUsuario(deps: Deps, usuario: Usuario | undefined): Usuario | undefined {
  if (usuario === undefined) return undefined;
  return deps.usuarios.find((u) => u.id === usuario.id && u.rol === usuario.rol) ?? usuario;
}

/** GET /api/panel/resumen?fecha=YYYY-MM-DD (200 / 400 / 403). Solo lectura, sin auditoría. */
export function panelRouter(deps: Deps): Router {
  const router = Router();

  router.get('/panel/resumen', (req, res) => {
    const crudo: unknown = req.query.fecha;
    if (crudo !== undefined && typeof crudo !== 'string') {
      throw new ErrorDeEntrada('fecha debe enviarse una sola vez, con el formato YYYY-MM-DD.');
    }
    const usuario = resolverUsuario(deps, res.locals.usuario as Usuario | undefined);
    const r = resumenDelDia(deps, usuario, crudo);
    if (!r.ok) {
      throw r.error.tipo === 'permiso' ? new ErrorDePermiso(r.error.mensaje) : new ErrorDeEntrada(r.error.mensaje);
    }
    res.json({ ...r.valor, simulado: true });
  });

  return router;
}
