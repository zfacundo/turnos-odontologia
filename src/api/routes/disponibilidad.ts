import { Router } from 'express';
import type { Usuario } from '../../domain/shared/rol';
import {
  consultarHuecos,
  type EntradaConsultarHuecos,
  type ErrorConsultarHuecos,
} from '../../application/agenda/consultarHuecos';
import type { Deps } from '../deps';
import { ErrorDeEntrada, ErrorDePermiso } from '../middleware/errores';

function aErrorHttp(error: ErrorConsultarHuecos): Error {
  return error.tipo === 'permiso' ? new ErrorDePermiso(error.mensaje) : new ErrorDeEntrada(error.mensaje);
}

const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Un parametro de query presente una sola vez y no vacio (design D7). */
function parametro(query: Record<string, unknown>, campo: string): string {
  const valor = query[campo];
  if (typeof valor !== 'string' || valor === '') {
    throw new ErrorDeEntrada(`Falta ${campo}, esta vacio o se envio mas de una vez.`);
  }
  return valor;
}

/** 'YYYY-MM-DD' que ademas es una fecha de calendario real (2026-02-30 se rechaza). */
function parsearFecha(valor: string): string {
  const m = FECHA.exec(valor);
  if (m === null) throw new ErrorDeEntrada('fecha debe tener el formato YYYY-MM-DD.');
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = new Date(Date.UTC(a, mes - 1, d));
  if (f.getUTCFullYear() !== a || f.getUTCMonth() !== mes - 1 || f.getUTCDate() !== d) {
    throw new ErrorDeEntrada(`fecha ${valor} no es una fecha valida.`);
  }
  return valor;
}

function parsearEntrada(query: Record<string, unknown>): EntradaConsultarHuecos {
  return {
    prestacionId: parametro(query, 'prestacionId'),
    profesionalId: parametro(query, 'profesionalId'),
    fecha: parsearFecha(parametro(query, 'fecha')),
  };
}

/** GET /api/disponibilidad?prestacionId&profesionalId&fecha (200 / 400 / 403). */
export function disponibilidadRouter(deps: Deps): Router {
  const router = Router();

  router.get('/disponibilidad', (req, res) => {
    const entrada = parsearEntrada(req.query);
    const usuario = res.locals.usuario as Usuario | undefined;
    const resultado = consultarHuecos(deps, usuario, entrada);
    if (!resultado.ok) throw aErrorHttp(resultado.error);
    res.json({ huecos: resultado.valor });
  });

  return router;
}
