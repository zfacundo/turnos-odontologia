
import { Router } from 'express';
import type { Deps } from '../deps';
import type { Usuario } from '../../domain/shared/rol';

import {
  esPiezaValida,
  sonCarasValidas,
  sonSintomasValidos,
} from '../../domain/odontograma/piezas';

import {
  RepositorioPiezas,
  agregarPiezaAlTurno,
  marcarHecho,
} from '../../application/odontograma/gestionarPiezas';

import {
  ErrorDeEntrada,
  ErrorDePermiso,
} from '../middleware/errores';

export function odontogramaRouter(deps: Deps): Router {
  const router = Router();
  const repo = new RepositorioPiezas();

  function comprobarAcceso(usuario: Usuario | undefined) {
    // spec: panel-reemplaza-agenda-vieja (D4): solo el odontólogo, antes de buscar el turno.
    if (usuario?.rol !== 'odontologo') {
      throw new ErrorDePermiso('Solo el odontólogo puede usar el odontograma.');
    }
  }

  function comprobarTurno(turnoId: string): boolean {
    return deps.turnos.buscarPorId(turnoId) !== undefined;
  }

  router.get('/turnos/:id/piezas', (req, res, next) => {
    try {
      comprobarAcceso(res.locals.usuario);

      if (!comprobarTurno(req.params.id)) {
        res.status(404).json({
          error: { tipo: 'no-encontrado', mensaje: 'Turno inexistente.' },
        });
        return;
      }

      res.json({ piezas: repo.listar(req.params.id) });
    } catch (error) {
      next(error);
    }
  });

  router.put('/turnos/:id/piezas', (req, res, next) => {
    try {
      const usuario = res.locals.usuario as Usuario | undefined;
      comprobarAcceso(usuario);

      if (!comprobarTurno(req.params.id)) {
        res.status(404).json({
          error: { tipo: 'no-encontrado', mensaje: 'Turno inexistente.' },
        });
        return;
      }

      const { pieza, sintomas, caras, estado } = req.body ?? {};

      if (typeof pieza !== 'number' || !esPiezaValida(pieza)) {
        throw new ErrorDeEntrada('Pieza FDI inválida.');
      }

      // Solo un odontólogo puede marcar un tratamiento realizado.
      if (estado === 'hecho') {
        if (usuario?.rol !== 'odontologo') {
          throw new ErrorDePermiso(
            'Solo el odontólogo puede marcar una pieza como hecha.',
          );
        }

        const resultado = marcarHecho(repo, req.params.id, pieza);

        if (!resultado) {
          res.status(404).json({
            error: {
              tipo: 'no-encontrado',
              mensaje: 'La pieza todavía no está marcada.',
            },
          });
          return;
        }

        res.json(resultado);
        return;
      }

      if (estado !== undefined && estado !== 'a_revisar') {
        throw new ErrorDeEntrada('Estado de pieza inválido.');
      }

      if (!sonSintomasValidos(sintomas) || sintomas.length === 0) {
        throw new ErrorDeEntrada('Seleccioná al menos un síntoma válido.');
      }

      if (caras !== undefined && !sonCarasValidas(caras)) {
        throw new ErrorDeEntrada('Las caras dentales son inválidas.');
      }

      const existente = repo.buscar(req.params.id, pieza);

      if (existente?.estado === 'hecho') {
        res.status(409).json({
          error: {
            tipo: 'regla',
            regla: 'RN-OD-04',
            mensaje: 'La pieza ya está marcada como hecha.',
          },
        });
        return;
      }

      const resultado = agregarPiezaAlTurno(
        repo,
        req.params.id,
        pieza,
        sintomas,
        caras ?? [],
      );

      res.json(resultado);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
