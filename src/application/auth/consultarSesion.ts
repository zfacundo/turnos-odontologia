import { ok, type Result } from '../../domain/shared/result';
import type { Usuario } from '../../domain/shared/rol';
import type { ErrorAuth } from './errores';
import { resolverSesion, type DepsResolverSesion } from './resolverSesion';

export interface SesionConsultada {
  readonly usuario: Usuario;
  readonly expiraEn: Date;
}

export function consultarSesion(
  deps: DepsResolverSesion,
  token: string | undefined,
): Result<SesionConsultada, ErrorAuth> {
  const r = resolverSesion(deps, token);
  if (!r.ok) return r;
  return ok({ usuario: r.valor.usuario, expiraEn: r.valor.sesion.expiraEn });
}
