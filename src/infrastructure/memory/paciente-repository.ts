import type { PacienteRepository } from '../../application/ports/repositorios';
import type { Paciente } from '../../domain/pacientes/paciente';
import { fallo, ok, type ErrorDeRegla, type Result } from '../../domain/shared/result';

export class PacienteRepositoryEnMemoria implements PacienteRepository {
  private readonly pacientes = new Map<string, Paciente>();

  constructor(iniciales: readonly Paciente[] = []) {
    for (const p of iniciales) {
      const r = this.guardar(p);
      if (!r.ok) throw new Error(`Datos iniciales invalidos: ${r.error.mensaje}`);
    }
  }

  guardar(paciente: Paciente): Result<Paciente, ErrorDeRegla> {
    if (this.buscarPorDni(paciente.dni) !== undefined) {
      return fallo({
        regla: 'DNI_DUPLICADO',
        mensaje: `Ya existe un paciente con DNI ${paciente.dni}.`,
        dimension: 'paciente',
      });
    }
    this.pacientes.set(paciente.id, structuredClone(paciente));
    return ok(structuredClone(paciente));
  }

  buscarPorId(id: string): Paciente | undefined {
    const p = this.pacientes.get(id);
    return p === undefined ? undefined : structuredClone(p);
  }

  buscarPorDni(dni: string): Paciente | undefined {
    for (const p of this.pacientes.values()) {
      if (p.dni === dni) return structuredClone(p);
    }
    return undefined;
  }

  listar(): Paciente[] {
    return [...this.pacientes.values()].map((p) => structuredClone(p));
  }
}
