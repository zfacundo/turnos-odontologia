import type { Paciente } from '../../domain/pacientes/paciente';
import { fallo, ok, type Result } from '../../domain/shared/result';
import type { PacienteRepository } from '../ports/repositorios';

export type ErrorBuscarPaciente = {
  readonly tipo: 'no-encontrado';
  readonly mensaje: 'paciente no encontrado';
};

export function listarPacientes(pacientes: PacienteRepository): Paciente[] {
  return pacientes.listar();
}

export function buscarPaciente(
  pacientes: PacienteRepository,
  id: string,
): Result<Paciente, ErrorBuscarPaciente> {
  const paciente = pacientes.buscarPorId(id);
  if (paciente === undefined) {
    return fallo({ tipo: 'no-encontrado', mensaje: 'paciente no encontrado' });
  }
  return ok(paciente);
}
