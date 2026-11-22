import type { ProfesionalRepository } from '../../application/ports/repositorios';
import type { Profesional } from '../../domain/configuracion/profesional';

export class ProfesionalRepositoryEnMemoria implements ProfesionalRepository {
  constructor(private readonly items: readonly Profesional[] = []) {}

  listar(): Profesional[] {
    return this.items.map((i) => structuredClone(i));
  }

  buscarPorId(id: string): Profesional | undefined {
    const i = this.items.find((x) => x.id === id);
    return i === undefined ? undefined : structuredClone(i);
  }
}
