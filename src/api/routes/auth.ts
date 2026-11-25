import { Router } from 'express';
import { cerrarSesion } from '../../application/auth/cerrarSesion';
import { consultarSesion } from '../../application/auth/consultarSesion';
import type { ErrorAuth } from '../../application/auth/errores';
import { iniciarSesion } from '../../application/auth/iniciarSesion';
import type { Deps } from '../deps';
import { ErrorDeAutenticacion, ErrorDeEntrada } from '../middleware/errores';
import { extraerToken } from '../middleware/identidad';

function aErrorHttp(error: ErrorAuth): Error {
  return error.tipo === 'entrada'
    ? new ErrorDeEntrada(error.mensaje)
    : new ErrorDeAutenticacion(error.mensaje);
}

/** Rutas de autenticación simulada: lista pública de usuarios, login, sesión y logout. */
export function authRouter(deps: Deps): Router {
  const router = Router();

  router.get('/auth/usuarios', (_req, res) => {
    const usuarios = deps.usuarios
      .filter((u) => u.rol !== 'paciente')
      .map((u) => ({ id: u.id, nombre: u.nombre, rol: u.rol }));
    res.json({ usuarios, simulado: true });
  });

  router.post('/auth/login', (req, res) => {
    const r = iniciarSesion(deps, req.body as unknown);
    if (!r.ok) throw aErrorHttp(r.error);
    res.status(201).json({
      token: r.valor.token,
      expiraEn: r.valor.expiraEn.toISOString(),
      usuario: r.valor.usuario,
      simulado: true,
    });
  });

  router.get('/auth/sesion', (req, res) => {
    const r = consultarSesion(deps, extraerToken(req.header('Authorization')));
    if (!r.ok) throw aErrorHttp(r.error);
    res.json({ usuario: r.valor.usuario, expiraEn: r.valor.expiraEn.toISOString(), simulado: true });
  });

  router.post('/auth/logout', (req, res) => {
    const r = cerrarSesion(deps, extraerToken(req.header('Authorization')));
    if (!r.ok) throw aErrorHttp(r.error);
    res.status(204).end();
  });

  return router;
}
