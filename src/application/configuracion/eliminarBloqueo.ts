import { fallo, ok } from '../../domain/shared/result';
import type { Usuario } from '../../domain/shared/rol';
import type { DepsConfiguracion } from './deps';
import { noEncontrado, permiso, tieneRol, type ResultadoConfiguracion } from './errores';

/** Baja de bloqueo; el odontólogo solo puede borrar los suyos (design D5). */
export function eliminarBloqueo(
  deps: DepsConfiguracion,
  usuario: Usuario | undefined,
  bloqueoId: string,
): ResultadoConfiguracion<void> {
  const esAdminORepcion = tieneRol(usuario, ['admin', 'recepcion']);
  if (!esAdminORepcion && usuario?.rol !== 'odontologo') {
    return fallo(permiso('Tu rol no puede eliminar bloqueos.'));
  }
  const bloqueo = deps.bloqueos.buscarPorId(bloqueoId);
  if (bloqueo === undefined) {
    return fallo(noEncontrado(`No existe el bloqueo ${bloqueoId}.`));
  }
  if (!esAdminORepcion && bloqueo.profesionalId !== usuario?.profesionalId) {
    return fallo(permiso('Ese bloqueo no pertenece a tu profesional.'));
  }
  const eliminado = deps.bloqueos.eliminar(bloqueoId);
  if (!eliminado.ok) return fallo({ tipo: 'regla', error: eliminado.error });
  return ok(undefined);
}
