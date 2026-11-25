import type { ErrorDeRegla, Result } from '../../domain/shared/result';
import type { Usuario } from '../../domain/shared/rol';
import type { Rol } from '../../domain/shared/rol';

export type ErrorConfiguracion =
  | { readonly tipo: 'permiso' | 'entrada' | 'no-encontrado'; readonly mensaje: string }
  | { readonly tipo: 'regla'; readonly error: ErrorDeRegla };

export type ResultadoConfiguracion<T> = Result<T, ErrorConfiguracion>;

export const entrada = (mensaje: string): ErrorConfiguracion => ({ tipo: 'entrada', mensaje });
export const permiso = (mensaje: string): ErrorConfiguracion => ({ tipo: 'permiso', mensaje });
export const noEncontrado = (mensaje: string): ErrorConfiguracion => ({ tipo: 'no-encontrado', mensaje });

export function tieneRol(usuario: Usuario | undefined, roles: readonly Rol[]): boolean {
  return usuario !== undefined && roles.includes(usuario.rol);
}

/** Texto obligatorio: no vacio ni compuesto solo por espacios. */
export function textoValido(valor: unknown, campo: string): valor is string {
  return typeof valor === 'string' && valor.trim() !== '';
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Forma HH:mm; la alineacion a 15 min es regla de dominio (RN-CF-02/RN-AG-03). */
export function horaValida(valor: unknown): valor is string {
  return typeof valor === 'string' && HORA.test(valor);
}

/** Dia ISO entero 1..7. */
export function diaValido(valor: unknown): valor is 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 1 && valor <= 7;
}
