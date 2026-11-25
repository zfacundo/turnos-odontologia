import { estaVigente, type Sesion } from '../../domain/auth/sesion';
import { fallo, ok, type Result } from '../../domain/shared/result';
import type { Usuario } from '../../domain/shared/rol';
import type { Clock } from '../ports/clock';
import { MENSAJE_SESION_INVALIDA, type ErrorAuth } from './errores';
import type { SesionRepository } from './puertos';

export interface DepsResolverSesion {
  readonly usuarios: readonly Usuario[];
  readonly sesiones: SesionRepository;
  readonly clock: Clock;
}

/** Busca la sesión por token, valida vigencia y resuelve el usuario completo (con profesionalId). */
export function resolverSesion(
  deps: DepsResolverSesion,
  token: string | undefined,
): Result<{ sesion: Sesion; usuario: Usuario }, ErrorAuth> {
  const invalida = fallo<ErrorAuth>({ tipo: 'autenticacion', mensaje: MENSAJE_SESION_INVALIDA });
  if (token === undefined || token === '') return invalida;
  const sesion = deps.sesiones.buscar(token);
  if (sesion === undefined || !estaVigente(sesion, deps.clock.ahora())) return invalida;
  const usuario = deps.usuarios.find((u) => u.id === sesion.usuarioId);
  if (usuario === undefined) return invalida;
  return ok({ sesion, usuario });
}
