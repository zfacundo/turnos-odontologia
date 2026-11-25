import { Router, type NextFunction, type Request, type Response } from 'express';
import type { OrigenTurno } from '../../domain/agenda/turno';
import type { Usuario } from '../../domain/shared/rol';
import {
  crearTurno,
  type EntradaCrearTurno,
  type ErrorCrearTurno,
} from '../../application/agenda/crearTurno';
import {
  cambiarEstadoTurno,
  type AccionCambioEstado,
  type ErrorCambioEstado,
} from '../../application/agenda/cambiarEstadoTurno';
import { cancelarTurno } from '../../application/agenda/cancelarTurno';
import {
  reprogramarTurno,
  type EntradaReprogramarTurno,
} from '../../application/agenda/reprogramarTurno';
import type { FiltroTurnos } from '../../application/ports/repositorios';
import type { Deps } from '../deps';
import { ErrorDeEntrada, ErrorDePermiso, FalloDeRegla } from '../middleware/errores';

/** Traduce el error del caso de uso a los errores del middleware (400 / 403 / 409). */
function aErrorHttp(error: ErrorCrearTurno): Error {
  switch (error.tipo) {
    case 'permiso':
      return new ErrorDePermiso(error.mensaje);
    case 'entrada':
      return new ErrorDeEntrada(error.mensaje);
    case 'regla':
      return new FalloDeRegla(error.error);
  }
}

const ORIGENES: readonly OrigenTurno[] = ['recepcion', 'whatsapp', 'telefono'];
const ISO_CON_ZONA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/** Fecha ISO 8601 con zona explicita (design D7); no depende del TZ del proceso. */
function parsearFechaConZona(valor: unknown, campo: string): Date {
  if (typeof valor !== 'string' || !ISO_CON_ZONA.test(valor)) {
    throw new ErrorDeEntrada(`${campo} debe ser una fecha ISO 8601 con zona horaria explicita.`);
  }
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) throw new ErrorDeEntrada(`${campo} no es una fecha valida.`);
  return fecha;
}

function texto(cuerpo: Record<string, unknown>, campo: string): string {
  const valor = cuerpo[campo];
  if (typeof valor !== 'string' || valor === '') {
    throw new ErrorDeEntrada(`Falta ${campo} o no es un texto.`);
  }
  return valor;
}

function parsearEntrada(cuerpo: unknown): EntradaCrearTurno {
  if (!esObjeto(cuerpo)) throw new ErrorDeEntrada('El cuerpo debe ser un objeto JSON.');
  const pacienteId = texto(cuerpo, 'pacienteId');
  const prestacionId = texto(cuerpo, 'prestacionId');
  const profesionalId = texto(cuerpo, 'profesionalId');
  const sillonId = texto(cuerpo, 'sillonId');
  const inicio = parsearFechaConZona(cuerpo.inicio, 'inicio');
  const origen = cuerpo.origen;
  if (origen === undefined) return { pacienteId, prestacionId, profesionalId, sillonId, inicio };
  if (typeof origen !== 'string' || !(ORIGENES as readonly string[]).includes(origen)) {
    throw new ErrorDeEntrada('origen debe ser recepcion, whatsapp o telefono.');
  }
  return { pacienteId, prestacionId, profesionalId, sillonId, inicio, origen: origen as OrigenTurno };
}

function textoOpcional(query: Request['query'], campo: string): string | undefined {
  const valor = query[campo];
  if (valor === undefined) return undefined;
  if (typeof valor !== 'string' || valor === '') {
    throw new ErrorDeEntrada(`${campo} debe ser un texto.`);
  }
  return valor;
}

/** desde y hasta van juntos, con zona explicita y desde < hasta (design D7). */
function parsearFiltro(query: Request['query']): FiltroTurnos {
  const profesionalId = textoOpcional(query, 'profesionalId');
  const sillonId = textoOpcional(query, 'sillonId');
  const desde = textoOpcional(query, 'desde');
  const hasta = textoOpcional(query, 'hasta');
  if ((desde === undefined) !== (hasta === undefined)) {
    throw new ErrorDeEntrada('desde y hasta deben enviarse juntos.');
  }
  const base = {
    ...(profesionalId !== undefined && { profesionalId }),
    ...(sillonId !== undefined && { sillonId }),
  };
  if (desde === undefined || hasta === undefined) return base;
  const inicio = parsearFechaConZona(desde, 'desde');
  const fin = parsearFechaConZona(hasta, 'hasta');
  if (!(inicio.getTime() < fin.getTime())) throw new ErrorDeEntrada('desde debe ser anterior a hasta.');
  return { ...base, rango: { inicio, fin } };
}

/** Traduce ErrorCambioEstado: 403 / 400 / 409 por el middleware; 404 directo (design D6). */
function aErrorHttpEstado(error: ErrorCambioEstado): Error | { noEncontrado: string } {
  switch (error.tipo) {
    case 'permiso':
      return new ErrorDePermiso(error.mensaje);
    case 'entrada':
      return new ErrorDeEntrada(error.mensaje);
    case 'regla':
      return new FalloDeRegla(error.error);
    case 'no-encontrado':
      return { noEncontrado: error.mensaje };
  }
}

/** Usuario completo: si deps.usuarios tiene el mismo id y rol, usa ese (trae profesionalId; design D4). */
function resolverUsuario(deps: Deps, usuario: Usuario | undefined): Usuario | undefined {
  if (usuario === undefined) return undefined;
  return deps.usuarios.find((u) => u.id === usuario.id && u.rol === usuario.rol) ?? usuario;
}

function responderErrorEstado(error: ErrorCambioEstado, res: Response, next: NextFunction): void {
  const http = aErrorHttpEstado(error);
  if (http instanceof Error) {
    next(http);
    return;
  }
  res.status(404).json({ error: { tipo: 'no-encontrado', mensaje: http.noEncontrado } });
}

/**
 * Parsea el cuerpo de reprogramar SIN lanzar: el rol se valida antes que la entrada (design D6).
 * Lo invalido llega al caso de uso como inicio ausente o id vacio y este lo rechaza como entrada.
 */
function parsearReprogramacion(turnoId: string, cuerpo: unknown): EntradaReprogramarTurno {
  if (!esObjeto(cuerpo)) return { turnoId, inicio: undefined };
  const crudo = cuerpo.inicio;
  const fecha = typeof crudo === 'string' && ISO_CON_ZONA.test(crudo) ? new Date(crudo) : undefined;
  const inicio = fecha !== undefined && !Number.isNaN(fecha.getTime()) ? fecha : undefined;
  const idOpcional = (valor: unknown): string | undefined =>
    valor === undefined ? undefined : typeof valor === 'string' ? valor : '';
  const profesionalId = idOpcional(cuerpo.profesionalId);
  const sillonId = idOpcional(cuerpo.sillonId);
  return {
    turnoId,
    inicio,
    ...(profesionalId !== undefined && { profesionalId }),
    ...(sillonId !== undefined && { sillonId }),
  };
}

export function turnosRouter(deps: Deps): Router {
  const router = Router();

  router.post('/turnos', (req, res, next) => {
    const usuario = res.locals.usuario as Usuario | undefined;
    const resultado = crearTurno(deps, usuario, parsearEntrada(req.body));
    if (!resultado.ok) {
      next(aErrorHttp(resultado.error));
      return;
    }
    res.status(201).json(resultado.valor);
  });

  router.get('/turnos', (req, res) => {
    const filtro = parsearFiltro(req.query);
    const turnos = deps.turnos
      .listarActivos(filtro)
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
    res.json({ turnos });
  });

  for (const accion of ['confirmar', 'atender', 'ausente'] as const satisfies readonly AccionCambioEstado[]) {
    router.post(`/turnos/:id/${accion}`, (req, res, next) => {
      const usuario = resolverUsuario(deps, res.locals.usuario as Usuario | undefined);
      const resultado = cambiarEstadoTurno(deps, usuario, { turnoId: req.params.id, accion });
      if (!resultado.ok) {
        responderErrorEstado(resultado.error, res, next);
        return;
      }
      res.status(200).json(resultado.valor);
    });
  }

  router.post('/turnos/:id/cancelar', (req, res, next) => {
    const usuario = resolverUsuario(deps, res.locals.usuario as Usuario | undefined);
    const cuerpo: unknown = req.body;
    // El caso de uso valida rol -> motivo (design D3); un motivo no textual llega como ausente.
    const crudo = esObjeto(cuerpo) ? cuerpo.motivo : undefined;
    const motivo = typeof crudo === 'string' ? crudo : undefined;
    const resultado = cancelarTurno(deps, usuario, { turnoId: req.params.id, motivo });
    if (!resultado.ok) {
      responderErrorEstado(resultado.error, res, next);
      return;
    }
    res.status(200).json(resultado.valor.turno);
  });

  router.post('/turnos/:id/reprogramar', (req, res, next) => {
    const usuario = resolverUsuario(deps, res.locals.usuario as Usuario | undefined);
    const resultado = reprogramarTurno(deps, usuario, parsearReprogramacion(req.params.id, req.body));
    if (!resultado.ok) {
      responderErrorEstado(resultado.error, res, next);
      return;
    }
    res.status(200).json(resultado.valor.turno);
  });

  return router;
}
