import type { Paciente } from '../../domain/pacientes/paciente';

function enmascararDni(dni: string): string {
  return `${dni.slice(0, 2)}****${dni.slice(-2)}`;
}

function enmascararTelefono(telefono: string): string {
  return `${telefono.slice(0, -4)}**${telefono.slice(-2)}`;
}

export function pacientePublico(paciente: Paciente): Paciente {
  return {
    ...paciente,
    dni: enmascararDni(paciente.dni),
    telefono: enmascararTelefono(paciente.telefono),
  };
}
