import { randomUUID } from 'node:crypto';
import type { Paciente } from '../../domain/pacientes/paciente';
import { fallo, ok, type ErrorDeRegla, type Result } from '../../domain/shared/result';
import type { PacienteRepository } from '../ports/repositorios';
import { validarPaciente } from './validarPaciente';

export type ErrorRegistrarPaciente =
  | { readonly tipo: 'entrada'; readonly mensaje: string }
  | { readonly tipo: 'regla'; readonly error: ErrorDeRegla };

export function registrarPaciente(
  pacientes: PacienteRepository,
  cuerpo: unknown,
): Result<Paciente, ErrorRegistrarPaciente> {
  const validacion = validarPaciente(cuerpo);
  if (!validacion.ok) return fallo({ tipo: 'entrada', mensaje: validacion.error.mensaje });

  const paciente: Paciente = { id: randomUUID(), ...validacion.valor };
  const guardado = pacientes.guardar(paciente);
  if (!guardado.ok) return fallo({ tipo: 'regla', error: guardado.error });
  return ok(guardado.valor);
}
