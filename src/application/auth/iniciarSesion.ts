import { crearSesion } from '../../domain/auth/sesion';
import { fallo, ok, type Result } from '../../domain/shared/result';
import type { Usuario } from '../../domain/shared/rol';
import type { Auditoria } from '../ports/auditoria';
import type { Clock } from '../ports/clock';
import { MENSAJE_LOGIN_INVALIDO, type ErrorAuth } from './errores';
import type { GeneradorToken, SesionRepository } from './puertos';

export interface DepsIniciarSesion {
  readonly usuarios: readonly Usuario[];
  readonly sesiones: SesionRepository;
  readonly generadorToken: GeneradorToken;
  readonly clock: Clock;
  readonly auditoria: Auditoria;
}

export interface SesionIniciada {
  readonly token: string;
  readonly expiraEn: Date;
  readonly usuario: Usuario;
}

/** Login simulado (S-1): solo `usuarioId`; nunca pide ni acepta contraseña. */
export function iniciarSesion(deps: DepsIniciarSesion, cuerpo: unknown): Result<SesionIniciada, ErrorAuth> {
  const usuarioId =
    typeof cuerpo === 'object' && cuerpo !== null && !Array.isArray(cuerpo)
      ? (cuerpo as Record<string, unknown>).usuarioId
      : undefined;
  if (typeof usuarioId !== 'string' || usuarioId === '') {
    return fallo({ tipo: 'entrada', mensaje: 'Falta usuarioId o no es un texto.' });
  }
  const usuario = deps.usuarios.find((u) => u.id === usuarioId && u.rol !== 'paciente');
  if (usuario === undefined) return fallo({ tipo: 'autenticacion', mensaje: MENSAJE_LOGIN_INVALIDO });

  const ahora = deps.clock.ahora();
  const sesion = crearSesion(deps.generadorToken.generar(), usuario.id, ahora);
  deps.sesiones.guardar(sesion);
  deps.auditoria.registrar({
    fecha: ahora,
    usuarioId: usuario.id,
    rol: usuario.rol,
    accion: 'login',
    entidad: 'sesion',
    entidadId: usuario.id,
  });
  return ok({ token: sesion.token, expiraEn: sesion.expiraEn, usuario });
}
