
import { Router } from 'express';
import type { Usuario } from '../../domain/shared/rol';
import type { Deps } from '../deps';
import { ErrorDePermiso } from '../middleware/errores';

import {
  esAuditoriaConsultable,
  listarAuditoria,
} from '../../application/auditoria/listarAuditoria';

import {
  registroLegible,
} from '../../application/auditoria/registroLegible';

export function auditoriaRouter(deps: Deps): Router {
  const router = Router();

  function consultarEventos(usuario: Usuario | undefined) {
    if (
      usuario === undefined ||
      !['admin', 'recepcion'].includes(usuario.rol)
    ) {
      throw new ErrorDePermiso(
        'No tenés permiso para consultar la auditoría.',
      );
    }

    if (!esAuditoriaConsultable(deps.auditoria)) {
      throw new Error('La auditoría no permite consultas.');
    }

    return listarAuditoria(deps.auditoria);
  }

  router.get('/auditoria', (_req, res, next) => {
    try {
      const eventos = consultarEventos(res.locals.usuario);
      res.json({ eventos });
    } catch (error) {
      next(error);
    }
  });

  router.get('/registro', (_req, res, next) => {
    try {
      const eventos = consultarEventos(res.locals.usuario);
      res.json({ registro: registroLegible(eventos) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
