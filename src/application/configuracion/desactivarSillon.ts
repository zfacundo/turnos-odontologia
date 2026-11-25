import type { Sillon } from '../../domain/configuracion/sillon';
import { fallo, ok } from '../../domain/shared/result';
import type { Usuario } from '../../domain/shared/rol';
import type { DepsConfiguracion } from './deps';
import {
  noEncontrado,
  permiso,
  tieneRol,
  type ResultadoConfiguracion,
} from './errores';

/** Baja logica de sillón; conserva turnos y es idempotente (design D5). */
export function desactivarSillon(
  deps: DepsConfiguracion,
  usuario: Usuario | undefined,
  sillonId: string,
): ResultadoConfiguracion<Sillon> {
  if (!tieneRol(usuario, ['admin'])) {
    return fallo(permiso('Tu rol no puede desactivar sillones.'));
  }
  const sillon = deps.sillones.buscarPorId(sillonId);
  if (sillon === undefined) {
    return fallo(noEncontrado(`No existe el sillón ${sillonId}.`));
  }
  if (!sillon.activo) return ok(sillon);
  const desactivado: Sillon = { ...sillon, activo: false };
  const guardado = deps.sillones.actualizar(desactivado);
  if (!guardado.ok) return fallo({ tipo: 'regla', error: guardado.error });
  return ok(guardado.valor);
}
