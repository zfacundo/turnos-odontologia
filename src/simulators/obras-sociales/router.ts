import { Router, type NextFunction, type Response } from 'express';
import type { Deps } from '../../api/deps';
import { ErrorDeEntrada, ErrorDePermiso } from '../../api/middleware/errores';
import type { Usuario } from '../../domain/shared/rol';
import { AVISO_SIMULACION, type ResultadoRegistroPadron } from './afiliado';
import { consultarAfiliado } from './consultarAfiliado';
import { PadronObraSocialEnMemoria, type PadronObraSocialRepository } from './padronRepository';

const ROLES_LECTURA = ['admin', 'recepcion', 'odontologo', 'paciente'];
const ROLES_OS = ['admin'];
const ROLES_AFILIADO = ['admin', 'recepcion'];

function autorizado(usuario: Usuario | undefined, roles: readonly string[]): boolean {
  return usuario !== undefined && roles.includes(usuario.rol);
}

function responderRegistro<T>(
  resultado: ResultadoRegistroPadron<T>,
  res: Response,
  next: NextFunction,
  clave: string,
): void {
  if (resultado.ok) {
    res.status(201).json({ [clave]: resultado.valor, simulado: true, aviso: AVISO_SIMULACION });
    return;
  }
  if (resultado.error.tipo === 'entrada') {
    next(new ErrorDeEntrada(resultado.error.mensaje));
    return;
  }
  res.status(409).json({ error: { tipo: 'duplicado', mensaje: resultado.error.mensaje } });
}

/** Rutas del padrón SIMULADO. Nunca contacta obras sociales reales (RN-SM-04). */
export function obrasSocialesRouter(
  deps: Deps,
  padron: PadronObraSocialRepository = deps.padron ?? new PadronObraSocialEnMemoria(),
): Router {
  const router = Router();

  router.get('/sim/obras-sociales/padron', (req, res, next) => {
    const usuario = res.locals.usuario as Usuario | undefined;
    if (!autorizado(usuario, ROLES_LECTURA)) {
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

  router.get('/sim/obras-sociales/obras-sociales', (req, res, next) => {
    const usuario = res.locals.usuario as Usuario | undefined;
    if (!autorizado(usuario, ROLES_LECTURA)) {
      next(new ErrorDePermiso('Tu rol no puede consultar el padrón simulado.'));
      return;
    }
    res.json({ obrasSociales: padron.listarObrasSociales(), simulado: true, aviso: AVISO_SIMULACION });
  });

  router.post('/sim/obras-sociales/obras-sociales', (req, res, next) => {
    const usuario = res.locals.usuario as Usuario | undefined;
    if (!autorizado(usuario, ROLES_OS)) {
      next(new ErrorDePermiso('Tu rol no puede registrar obras sociales.'));
      return;
    }
    const cuerpo: unknown = req.body;
    responderRegistro(
      typeof cuerpo === 'object' && cuerpo !== null && !Array.isArray(cuerpo)
        ? padron.registrarObraSocial(cuerpo as { codigo: unknown; nombre: unknown; planes: unknown })
        : padron.registrarObraSocial({ codigo: undefined, nombre: undefined, planes: undefined }),
      res,
      next,
      'obraSocial',
    );
  });

  router.post('/sim/obras-sociales/afiliados', (req, res, next) => {
    const usuario = res.locals.usuario as Usuario | undefined;
    if (!autorizado(usuario, ROLES_AFILIADO)) {
      next(new ErrorDePermiso('Tu rol no puede registrar afiliados.'));
      return;
    }
    const cuerpo: unknown = req.body;
    responderRegistro(
      typeof cuerpo === 'object' && cuerpo !== null && !Array.isArray(cuerpo)
        ? padron.registrarAfiliado(cuerpo as {
            nroAfiliado: unknown;
            obraSocial: unknown;
            plan: unknown;
            cobertura: unknown;
            copagoPct: unknown;
            estado: unknown;
          })
        : padron.registrarAfiliado({
            nroAfiliado: undefined,
            obraSocial: undefined,
            plan: undefined,
            cobertura: undefined,
            copagoPct: undefined,
            estado: undefined,
          }),
      res,
      next,
      'afiliado',
    );
  });

  router.get('/sim/obras-sociales/afiliados', () => {
    throw new ErrorDeEntrada('Falta el número de afiliado.');
  });

  router.get('/sim/obras-sociales/afiliados/:nro', (req, res, next) => {
    const usuario = res.locals.usuario as Usuario | undefined;
    if (!autorizado(usuario, ROLES_LECTURA)) {
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
