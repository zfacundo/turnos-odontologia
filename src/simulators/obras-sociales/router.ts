import { Router, type NextFunction, type Request, type Response } from 'express';
import type { Deps } from '../../api/deps';
import { ErrorDeEntrada, ErrorDePermiso, FalloDeRegla } from '../../api/middleware/errores';
import type { Usuario } from '../../domain/shared/rol';
import { AVISO_SIMULACION } from './afiliado';
import { consultarAfiliado, type ErrorConsultarAfiliado } from './consultarAfiliado';
import {
  PadronObraSocialEnMemoria,
  type PadronObraSocialRepository,
} from './padronRepository';

function responderError(error: ErrorConsultarAfiliado, res: Response, next: NextFunction): void {
  switch (error.tipo) {
    case 'entrada':
      next(new ErrorDeEntrada(error.mensaje));
      return;
    case 'regla':
      next(new FalloDeRegla(error.error));
      return;
    case 'no-encontrado':
      res.status(404).json({ error: { tipo: 'no-encontrado', mensaje: error.mensaje } });
      return;
  }
}

export function obrasSocialesRouter(
  deps: Deps,
  afiliados: PadronObraSocialRepository = new PadronObraSocialEnMemoria(),
): Router {
  const router = Router();
  void deps;

  const consultar = (nro: string | undefined, req: Request, res: Response, next: NextFunction): void => {
    const usuario = res.locals.usuario as Usuario | undefined;
    if (usuario === undefined) {
      next(new ErrorDePermiso('Tu rol no puede consultar la cobertura simulada.'));
      return;
    }
    const resultado = consultarAfiliado(afiliados, nro);
    if (!resultado.ok) {
      responderError(resultado.error, res, next);
      return;
    }
    res.json({ ...resultado.valor, simulado: true, aviso: AVISO_SIMULACION });
  };

  router.get('/sim/obras-sociales/afiliados', (req, res, next) => {
    consultar(undefined, req, res, next);
  });

  router.get('/sim/obras-sociales/afiliados/:nro', (req, res, next) => {
    consultar(req.params.nro, req, res, next);
  });

  return router;
}
