import type { Paciente } from '../../domain/pacientes/paciente';
import { fallo, ok, type ErrorDeRegla, type Result } from '../../domain/shared/result';
import type { PacienteRepository } from '../ports/repositorios';
import { validarPaciente } from './validarPaciente';

export type ErrorActualizarPaciente =
  | { readonly tipo: 'entrada'; readonly mensaje: string }
  | { readonly tipo: 'no-encontrado'; readonly mensaje: 'paciente no encontrado' }
  | { readonly tipo: 'regla'; readonly error: ErrorDeRegla };

function dniLibre(pacientes: PacienteRepository, dniDeseado: string): string {
  for (let n = 99999999; n >= 99000001; n -= 1) {
    const candidato = String(n);
    if (candidato !== dniDeseado && pacientes.buscarPorDni(candidato) === undefined) return candidato;
  }
  return '99000000';
}

export function actualizarPaciente(
  pacientes: PacienteRepository,
  id: string,
  cuerpo: unknown,
): Result<Paciente, ErrorActualizarPaciente> {
  const validacion = validarPaciente(cuerpo);
  if (!validacion.ok) return fallo({ tipo: 'entrada', mensaje: validacion.error.mensaje });

  const actual = pacientes.buscarPorId(id);
  if (actual === undefined) return fallo({ tipo: 'no-encontrado', mensaje: 'paciente no encontrado' });

  const actualizado: Paciente = { id, ...validacion.valor };
  if (actualizado.dni !== actual.dni) {
    const guardado = pacientes.guardar(actualizado);
    if (!guardado.ok) return fallo({ tipo: 'regla', error: guardado.error });
    return ok(guardado.valor);
  }

  const temporal = dniLibre(pacientes, actualizado.dni);
  const guardadoTemporal = pacientes.guardar({ ...actualizado, dni: temporal });
  if (!guardadoTemporal.ok) return fallo({ tipo: 'regla', error: guardadoTemporal.error });
  const guardado = pacientes.guardar(actualizado);
  if (!guardado.ok) {
    pacientes.guardar(actual);
    return fallo({ tipo: 'regla', error: guardado.error });
  }
  return ok(guardado.valor);
}
