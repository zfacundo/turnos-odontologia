import { Router, type NextFunction, type Response } from 'express';
import {
  actualizarPaciente,
  type ErrorActualizarPaciente,
} from '../../application/pacientes/actualizarPaciente';
import {
  buscarPaciente,
  listarPacientes,
  type ErrorBuscarPaciente,
} from '../../application/pacientes/buscarPacientes';
import { pacientePublico } from '../../application/pacientes/pacientePublico';
import {
  registrarPaciente,
  type ErrorRegistrarPaciente,
} from '../../application/pacientes/registrarPaciente';
import type { PacienteRepository } from '../../application/ports/repositorios';
import type { ErrorDeRegla } from '../../domain/shared/result';
import type { Rol, Usuario } from '../../domain/shared/rol';
import { PacienteRepositoryEnMemoria } from '../../infrastructure/memory/paciente-repository';
import type { Deps } from '../deps';
import { ErrorDeEntrada, ErrorDePermiso, FalloDeRegla } from '../middleware/errores';

type ErrorRutaPaciente =
  | { readonly tipo: 'entrada'; readonly mensaje: string }
  | { readonly tipo: 'regla'; readonly error: ErrorDeRegla }
  | { readonly tipo: 'no-encontrado'; readonly mensaje: string };

type UnionesDeError = ErrorRegistrarPaciente | ErrorActualizarPaciente | ErrorBuscarPaciente;

const ROLES_ESCRITURA: readonly Rol[] = ['admin', 'recepcion'];
const ROLES_LECTURA: readonly Rol[] = ['admin', 'recepcion', 'odontologo'];

function autorizado(usuario: Usuario | undefined, roles: readonly Rol[]): boolean {
  return usuario !== undefined && roles.includes(usuario.rol);
}

function responderError(error: UnionesDeError, res: Response, next: NextFunction): void {
  const ruta: ErrorRutaPaciente = error;
  switch (ruta.tipo) {
    case 'entrada':
      next(new ErrorDeEntrada(ruta.mensaje));
      return;
    case 'regla':
      next(new FalloDeRegla(ruta.error));
      return;
    case 'no-encontrado':
      res.status(404).json({ error: { tipo: 'no-encontrado', mensaje: ruta.mensaje } });
      return;
  }
}

export function pacientesRouter(
  deps: Deps,
  repo: PacienteRepository = new PacienteRepositoryEnMemoria(),
): Router {
  const router = Router();
  void deps;

  router.post('/pacientes', (req, res, next) => {
    const usuario = res.locals.usuario as Usuario | undefined;
    if (!autorizado(usuario, ROLES_ESCRITURA)) {
      next(new ErrorDePermiso('Tu rol no puede dar de alta pacientes.'));
      return;
    }
    const resultado = registrarPaciente(repo, req.body as unknown);
    if (!resultado.ok) {
      responderError(resultado.error, res, next);
      return;
    }
    res.status(201).json(resultado.valor);
  });

  router.put('/pacientes/:id', (req, res, next) => {
    const usuario = res.locals.usuario as Usuario | undefined;
    if (!autorizado(usuario, ROLES_ESCRITURA)) {
      next(new ErrorDePermiso('Tu rol no puede actualizar pacientes.'));
      return;
    }
    const resultado = actualizarPaciente(repo, req.params.id, req.body as unknown);
    if (!resultado.ok) {
      responderError(resultado.error, res, next);
      return;
    }
    res.status(200).json(pacientePublico(resultado.valor));
  });

  router.get('/pacientes', (req, res, next) => {
    const usuario = res.locals.usuario as Usuario | undefined;
    if (!autorizado(usuario, ROLES_LECTURA)) {
      next(new ErrorDePermiso('Tu rol no puede consultar pacientes.'));
      return;
    }
    res.json({ pacientes: listarPacientes(repo).map(pacientePublico) });
  });

  router.get('/pacientes/:id', (req, res, next) => {
    const usuario = res.locals.usuario as Usuario | undefined;
    if (!autorizado(usuario, ROLES_LECTURA)) {
      next(new ErrorDePermiso('Tu rol no puede consultar pacientes.'));
      return;
    }
    const resultado = buscarPaciente(repo, req.params.id);
    if (!resultado.ok) {
      responderError(resultado.error, res, next);
      return;
    }
    res.json(pacientePublico(resultado.valor));
  });

  return router;
}
