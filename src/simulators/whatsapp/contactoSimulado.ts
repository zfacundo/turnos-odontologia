import type { Deps } from '../../api/deps';
import { ErrorDeEntrada } from '../../api/middleware/errores';
import type { Paciente } from '../../domain/pacientes/paciente';
import { pacientePublico } from '../../application/pacientes/pacientePublico';

export interface ContactoSimulado {
  readonly id: string;
  readonly nombre: string;
  readonly telefonoEnmascarado: string;
}

/** Solo telefonos ficticios, mismo formato que la ficha de paciente (C-08). */
const TELEFONO_FICTICIO = /^\+54 9 11 0000-00\d{2}$/;

/** Contacto del WhatsApp simulado sin el teléfono completo. Puro. */
export function contactoPublico(paciente: Paciente): ContactoSimulado {
  return {
    id: paciente.id,
    nombre: paciente.nombre,
    telefonoEnmascarado: pacientePublico(paciente).telefono,
  };
}

/**
 * Resuelve el teléfono del interlocutor a partir de EXACTAMENTE uno de `telefono`
 * (formato ficticio) o `pacienteId` (paciente existente con teléfono). Si no, ErrorDeEntrada.
 */
export function resolverTelefono(deps: Deps, fuente: Record<string, unknown>): string {
  const { telefono, pacienteId } = fuente;
  const hayTelefono = telefono !== undefined;
  const hayPaciente = pacienteId !== undefined;
  if (hayTelefono === hayPaciente) {
    throw new ErrorDeEntrada('Debe indicarse exactamente uno de telefono o pacienteId.');
  }

  if (hayTelefono) {
    if (typeof telefono !== 'string' || !TELEFONO_FICTICIO.test(telefono)) {
      throw new ErrorDeEntrada('telefono debe ser un número ficticio con formato +54 9 11 0000-00NN.');
    }
    return telefono;
  }

  if (typeof pacienteId !== 'string' || pacienteId === '') {
    throw new ErrorDeEntrada('pacienteId debe ser un texto no vacío.');
  }
  const paciente = deps.pacientes.buscarPorId(pacienteId);
  if (!paciente?.telefono) {
    throw new ErrorDeEntrada('El paciente no existe o no tiene teléfono.');
  }
  return paciente.telefono;
}
