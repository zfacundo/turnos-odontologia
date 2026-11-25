import { randomUUID } from 'node:crypto';
import { validarPrestacion, type Prestacion } from '../../domain/configuracion/prestacion';
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

export interface DatosPrestacion {
  readonly codigo: unknown;
  readonly nombre: unknown;
  readonly duracionMin: unknown;
}

/** Alta de prestación: solo administrador (design D5). */
export function crearPrestacion(
  deps: DepsConfiguracion,
  usuario: Usuario | undefined,
  datos: DatosPrestacion,
): ResultadoConfiguracion<Prestacion> {
  if (!tieneRol(usuario, ['admin'])) {
    return fallo(permiso('Tu rol no puede crear prestaciones.'));
  }
  if (!textoValido(datos.codigo, 'codigo') || !textoValido(datos.nombre, 'nombre')) {
    return fallo(entrada('codigo y nombre son obligatorios.'));
  }
  if (typeof datos.duracionMin !== 'number' || !Number.isFinite(datos.duracionMin)) {
    return fallo(entrada('duracionMin debe ser un numero.'));
  }
  const prestacion: Prestacion = {
    id: randomUUID(),
    codigo: datos.codigo,
    nombre: datos.nombre,
    duracionMin: datos.duracionMin,
  };
  const validada = validarPrestacion(prestacion);
  if (!validada.ok) return fallo({ tipo: 'regla', error: validada.error });
  deps.prestaciones.guardar(validada.valor);
  return ok(validada.valor);
}
