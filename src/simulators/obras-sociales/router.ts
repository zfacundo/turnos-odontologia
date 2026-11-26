import { Router, type NextFunction } from 'express';
import type { Deps } from '../../api/deps';
import { ErrorDeEntrada, ErrorDePermiso } from '../../api/middleware/errores';
import type { Usuario } from '../../domain/shared/rol';
import { AVISO_SIMULACION } from './afiliado';
import { consultarAfiliado } from './consultarAfiliado';
import { PadronObraSocialEnMemoria, type PadronObraSocialRepository } from './padronRepository';

const ROLES_LECTURA = ['admin', 'recepcion', 'odontologo', 'paciente'];

function autorizado(usuario: Usuario | undefined): boolean {
  return usuario !== undefined && ROLES_LECTURA.includes(usuario.rol);
}

/** Rutas de solo lectura del padrón SIMULADO. Nunca contacta obras sociales reales (RN-SM-04). */
export function obrasSocialesRouter(
  deps: Deps,
  padron: PadronObraSocialRepository = deps.padron ?? new PadronObraSocialEnMemoria(),
): Router {
  const router = Router();

  router.get('/sim/obras-sociales/padron', (_req, res, next: NextFunction) => {
    const usuario = res.locals.usuario as Usuario | undefined;
    if (!autorizado(usuario)) {
      next(new ErrorDePermiso('Tu rol no puede consultar el padrón simulado.'));
      return;
    }
    res.json({
      obrasSociales: padron.listarObrasSociales(),
      afiliados: padron.listar(),
      simulado: true,
      aviso: AVISO_SIMULACION,
    });
  });

  router.get('/sim/obras-sociales/obras-sociales', (_req, res, next: NextFunction) => {
    const usuario = res.locals.usuario as Usuario | undefined;
    if (!autorizado(usuario)) {
      next(new ErrorDePermiso('Tu rol no puede consultar el padrón simulado.'));
      return;
    }
    res.json({ obrasSociales: padron.listarObrasSociales(), simulado: true, aviso: AVISO_SIMULACION });
  });

  router.get('/sim/obras-sociales/afiliados', () => {
    throw new ErrorDeEntrada('Falta el número de afiliado.');
  });

  router.get('/sim/obras-sociales/afiliados/:nro', (req, res, next: NextFunction) => {
    const usuario = res.locals.usuario as Usuario | undefined;
    if (!autorizado(usuario)) {
      next(new ErrorDePermiso('Tu rol no puede consultar el padrón simulado.'));
      return;
    }
    const nro = req.params.nro?.trim() ?? '';
    if (nro === '') throw new ErrorDeEntrada('Falta el número de afiliado.');
    const resultado = consultarAfiliado(padron, nro);
    if (!resultado.ok) {
      if (resultado.error.tipo === 'regla') {
        res.status(409).json({ error: { tipo: 'regla', ...resultado.error.error } });
        return;
      }
      res.status(resultado.error.tipo === 'entrada' ? 400 : 404).json({ error: resultado.error });
      return;
    }
    res.json({ ...resultado.valor, simulado: true, aviso: AVISO_SIMULACION });
  });

  return router;
}
