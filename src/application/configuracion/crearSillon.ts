import { randomUUID } from 'node:crypto';
import type { Sillon } from '../../domain/configuracion/sillon';
import { fallo, ok } from '../../domain/shared/result';
import type { Usuario } from '../../domain/shared/rol';
import type { DepsConfiguracion } from './deps';
import {
  entrada,
  permiso,
  textoValido,
  tieneRol,
  type ResultadoConfiguracion,
} from './errores';

/** Alta de sillón: solo administrador (design D5). */
export function crearSillon(
  deps: DepsConfiguracion,
  usuario: Usuario | undefined,
  datos: { readonly nombre: unknown },
): ResultadoConfiguracion<Sillon> {
  if (!tieneRol(usuario, ['admin'])) {
    return fallo(permiso('Tu rol no puede crear sillones.'));
  }
  if (!textoValido(datos.nombre, 'nombre')) {
    return fallo(entrada('nombre no puede estar vacio.'));
  }
  const sillon: Sillon = { id: randomUUID(), nombre: datos.nombre, activo: true };
  deps.sillones.guardar(sillon);
  return ok(sillon);
}
