import { ok, type Result } from '../../domain/shared/result';
import type { Auditoria } from '../ports/auditoria';
import type { ErrorAuth } from './errores';
import { resolverSesion, type DepsResolverSesion } from './resolverSesion';

export interface DepsCerrarSesion extends DepsResolverSesion {
  readonly auditoria: Auditoria;
}

/** Elimina la sesión y audita `logout` (sin el token). Token inválido o vencido → autenticación. */
export function cerrarSesion(deps: DepsCerrarSesion, token: string | undefined): Result<void, ErrorAuth> {
  const r = resolverSesion(deps, token);
  if (!r.ok) return r;
  deps.sesiones.eliminar(r.valor.sesion.token);
  deps.auditoria.registrar({
    fecha: deps.clock.ahora(),
    usuarioId: r.valor.usuario.id,
    rol: r.valor.usuario.rol,
    accion: 'logout',
    entidad: 'sesion',
    entidadId: r.valor.usuario.id,
  });
  return ok(undefined);
}
