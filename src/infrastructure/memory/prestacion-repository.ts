import type { PrestacionRepository } from '../../application/ports/repositorios';
import type { Prestacion } from '../../domain/configuracion/prestacion';

export class PrestacionRepositoryEnMemoria implements PrestacionRepository {
  constructor(private readonly items: readonly Prestacion[] = []) {}

  listar(): Prestacion[] {
    return this.items.map((i) => structuredClone(i));
  }

  buscarPorId(id: string): Prestacion | undefined {
    const i = this.items.find((x) => x.id === id);
    return i === undefined ? undefined : structuredClone(i);
  }
}
