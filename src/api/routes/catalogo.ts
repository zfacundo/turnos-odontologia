import { Router } from 'express';
import type { Deps } from '../deps';

export function catalogoRouter(deps: Deps): Router {
  const router = Router();
  router.get('/catalogo', (_req, res) => {
    res.json({
      sillones: deps.sillones.listar(),
      prestaciones: deps.prestaciones.listar(),
      profesionales: deps.profesionales.listar(),
    });
  });
  return router;
}
