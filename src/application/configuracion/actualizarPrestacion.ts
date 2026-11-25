import { validarPrestacion, type Prestacion } from '../../domain/configuracion/prestacion';
import { fallo, ok } from '../../domain/shared/result';
import type { Usuario } from '../../domain/shared/rol';
import type { DepsConfiguracion } from './deps';
import type { DatosPrestacion } from './crearPrestacion';
import {
  entrada,
  noEncontrado,
  permiso,
  textoValido,
  tieneRol,
  type ResultadoConfiguracion,
} from './errores';

/** Edicion de prestación: solo administrador (design D5). */
export function actualizarPrestacion(
  deps: DepsConfiguracion,
  usuario: Usuario | undefined,
  prestacionId: string,
  datos: DatosPrestacion,
): ResultadoConfiguracion<Prestacion> {
  if (!tieneRol(usuario, ['admin'])) {
    return fallo(permiso('Tu rol no puede editar prestaciones.'));
  }
  if (!textoValido(datos.codigo, 'codigo') || !textoValido(datos.nombre, 'nombre')) {
    return fallo(entrada('codigo y nombre son obligatorios.'));
  }
  if (typeof datos.duracionMin !== 'number' || !Number.isFinite(datos.duracionMin)) {
    return fallo(entrada('duracionMin debe ser un numero.'));
  }
  const actual = deps.prestaciones.buscarPorId(prestacionId);
  if (actual === undefined) {
    return fallo(noEncontrado(`No existe la prestación ${prestacionId}.`));
  }
  const candidata: Prestacion = {
    id: actual.id,
    codigo: datos.codigo,
    nombre: datos.nombre,
    duracionMin: datos.duracionMin,
  };
  const validada = validarPrestacion(candidata);
  if (!validada.ok) return fallo({ tipo: 'regla', error: validada.error });
  const guardada = deps.prestaciones.actualizar(validada.valor);
  if (!guardada.ok) return fallo({ tipo: 'regla', error: guardada.error });
  return ok(guardada.valor);
}
