import { validarDisponibilidad } from '../../domain/configuracion/disponibilidad';
import type { Franja, Profesional } from '../../domain/configuracion/profesional';
import { fallo, ok } from '../../domain/shared/result';
import type { Usuario } from '../../domain/shared/rol';
import type { DepsConfiguracion } from './deps';
import { diaValido, entrada, horaValida, noEncontrado, permiso, tieneRol, type ResultadoConfiguracion } from './errores';

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/** Reemplazo total de la disponibilidad semanal de un profesional (design D5). */
export function definirDisponibilidad(
  deps: DepsConfiguracion,
  usuario: Usuario | undefined,
  profesionalId: string,
  franjas: unknown,
): ResultadoConfiguracion<Profesional> {
  if (!tieneRol(usuario, ['admin'])) {
    return fallo(permiso('Tu rol no puede definir la disponibilidad.'));
  }
  if (!Array.isArray(franjas)) {
    return fallo(entrada('La disponibilidad debe ser una lista de franjas.'));
  }
  const normalizadas: Franja[] = [];
  for (const item of franjas) {
    if (!esObjeto(item) || !diaValido(item.diaSemana) || !horaValida(item.desde) || !horaValida(item.hasta)) {
      return fallo(entrada('Cada franja requiere diaSemana 1..7 y horas HH:mm.'));
    }
    normalizadas.push({ diaSemana: item.diaSemana, desde: item.desde, hasta: item.hasta });
  }
  const profesional = deps.profesionales.buscarPorId(profesionalId);
  if (profesional === undefined) {
    return fallo(noEncontrado(`No existe el profesional ${profesionalId}.`));
  }
  const validadas = validarDisponibilidad(normalizadas);
  if (!validadas.ok) return fallo({ tipo: 'regla', error: validadas.error });
  const actualizado: Profesional = { ...profesional, disponibilidad: validadas.valor };
  const guardado = deps.profesionales.actualizar(actualizado);
  if (!guardado.ok) return fallo({ tipo: 'regla', error: guardado.error });
  return ok(guardado.valor);
}
