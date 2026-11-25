import { Router, type NextFunction, type Request, type Response } from 'express';
import { crearSillon } from '../../application/configuracion/crearSillon';
import { desactivarSillon } from '../../application/configuracion/desactivarSillon';
import { crearPrestacion } from '../../application/configuracion/crearPrestacion';
import { actualizarPrestacion } from '../../application/configuracion/actualizarPrestacion';
import { definirDisponibilidad } from '../../application/configuracion/definirDisponibilidad';
import { crearBloqueo } from '../../application/configuracion/crearBloqueo';
import { eliminarBloqueo } from '../../application/configuracion/eliminarBloqueo';
import type { ErrorConfiguracion } from '../../application/configuracion/errores';
import type { Usuario } from '../../domain/shared/rol';
import type { Deps } from '../deps';
import { ErrorDeEntrada, ErrorDePermiso, FalloDeRegla } from '../middleware/errores';

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

const ISO_CON_ZONA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

function parsearFechaConZona(valor: unknown, campo: string): Date {
  if (typeof valor !== 'string' || !ISO_CON_ZONA.test(valor)) {
    throw new ErrorDeEntrada(`${campo} debe ser una fecha ISO 8601 con zona horaria explicita.`);
  }
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) throw new ErrorDeEntrada(`${campo} no es una fecha valida.`);
  return fecha;
}

function textoOpcional(query: Request['query'], campo: string): string | undefined {
  const valor = query[campo];
  if (valor === undefined) return undefined;
  if (typeof valor !== 'string' || valor === '') {
    throw new ErrorDeEntrada(`${campo} debe ser un texto.`);
  }
  return valor;
}

function rangoDe(query: Request['query']): { inicio: Date; fin: Date } | undefined {
  const desde = textoOpcional(query, 'desde');
  const hasta = textoOpcional(query, 'hasta');
  if ((desde === undefined) !== (hasta === undefined)) {
    throw new ErrorDeEntrada('desde y hasta deben enviarse juntos.');
  }
  if (desde === undefined || hasta === undefined) return undefined;
  const inicio = parsearFechaConZona(desde, 'desde');
  const fin = parsearFechaConZona(hasta, 'hasta');
  if (!(inicio.getTime() < fin.getTime())) throw new ErrorDeEntrada('desde debe ser anterior a hasta.');
  return { inicio, fin };
}

/** Usuario simulado del seed: conserva profesionalId para el RBAC de bloqueos (design D7). */
function resolverUsuario(deps: Deps, res: Response): Usuario | undefined {
  const usuario = res.locals.usuario as Usuario | undefined;
  if (usuario === undefined) return undefined;
  return deps.usuarios.find((u) => u.id === usuario.id && u.rol === usuario.rol) ?? usuario;
}

function responderError(error: ErrorConfiguracion, res: Response, next: NextFunction): void {
  switch (error.tipo) {
    case 'permiso':
      next(new ErrorDePermiso(error.mensaje));
      return;
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

export function configuracionRouter(deps: Deps): Router {
  const router = Router();

  router.get('/bloqueos', (req, res, next) => {
    const usuario = res.locals.usuario as Usuario | undefined;
    if (usuario === undefined || !['admin', 'recepcion', 'odontologo'].includes(usuario.rol)) {
      next(new ErrorDePermiso('Tu rol no puede consultar bloqueos.'));
      return;
    }
    try {
      const rango = rangoDe(req.query);
      const profesionalId = textoOpcional(req.query, 'profesionalId');
      const sillonId = textoOpcional(req.query, 'sillonId');
      const bloqueos = (rango === undefined ? deps.bloqueos.listar() : deps.bloqueos.listarEn(rango)).filter(
        (b) =>
          (profesionalId === undefined || b.profesionalId === undefined || b.profesionalId === profesionalId) &&
          (sillonId === undefined || b.sillonId === undefined || b.sillonId === sillonId),
      );
      res.json({ bloqueos });
    } catch (error) {
      next(error);
    }
  });

  router.post('/sillones', (req, res, next) => {
    const cuerpo: unknown = req.body;
    const resultado = crearSillon(deps, resolverUsuario(deps, res), {
      nombre: esObjeto(cuerpo) ? cuerpo.nombre : undefined,
    });
    if (!resultado.ok) {
      responderError(resultado.error, res, next);
      return;
    }
    res.status(201).json(resultado.valor);
  });

  router.delete('/sillones/:id', (req, res, next) => {
    const resultado = desactivarSillon(deps, resolverUsuario(deps, res), req.params.id);
    if (!resultado.ok) {
      responderError(resultado.error, res, next);
      return;
    }
    res.status(200).json(resultado.valor);
  });

  router.post('/prestaciones', (req, res, next) => {
    const cuerpo: unknown = req.body;
    const datos = esObjeto(cuerpo) ? cuerpo : {};
    const resultado = crearPrestacion(deps, resolverUsuario(deps, res), {
      codigo: datos.codigo,
      nombre: datos.nombre,
      duracionMin: datos.duracionMin,
    });
    if (!resultado.ok) {
      responderError(resultado.error, res, next);
      return;
    }
    res.status(201).json(resultado.valor);
  });

  router.put('/prestaciones/:id', (req, res, next) => {
    const cuerpo: unknown = req.body;
    const datos = esObjeto(cuerpo) ? cuerpo : {};
    const resultado = actualizarPrestacion(deps, resolverUsuario(deps, res), req.params.id, {
      codigo: datos.codigo,
      nombre: datos.nombre,
      duracionMin: datos.duracionMin,
    });
    if (!resultado.ok) {
      responderError(resultado.error, res, next);
      return;
    }
    res.status(200).json(resultado.valor);
  });

  router.post('/bloqueos', (req, res, next) => {
    const cuerpo: unknown = req.body;
    const datos = esObjeto(cuerpo) ? cuerpo : {};
    try {
      const resultado = crearBloqueo(deps, resolverUsuario(deps, res), {
        motivo: datos.motivo,
        desde: parsearFechaConZona(datos.desde, 'desde'),
        hasta: parsearFechaConZona(datos.hasta, 'hasta'),
        profesionalId: datos.profesionalId,
        sillonId: datos.sillonId,
      });
      if (!resultado.ok) {
        responderError(resultado.error, res, next);
        return;
      }
      res.status(201).json(resultado.valor);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/bloqueos/:id', (req, res, next) => {
    const resultado = eliminarBloqueo(deps, resolverUsuario(deps, res), req.params.id);
    if (!resultado.ok) {
      responderError(resultado.error, res, next);
      return;
    }
    res.status(204).send();
  });

  router.put('/profesionales/:id/disponibilidad', (req, res, next) => {
    const resultado = definirDisponibilidad(
      deps,
      resolverUsuario(deps, res),
      req.params.id,
      req.body as unknown,
    );
    if (!resultado.ok) {
      responderError(resultado.error, res, next);
      return;
    }
    res.status(200).json(resultado.valor);
  });

  return router;
}
