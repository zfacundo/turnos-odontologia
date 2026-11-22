import type { SillonRepository } from '../../application/ports/repositorios';
import type { Sillon } from '../../domain/configuracion/sillon';

export class SillonRepositoryEnMemoria implements SillonRepository {
  constructor(private readonly items: readonly Sillon[] = []) {}

  listar(): Sillon[] {
    return this.items.map((i) => structuredClone(i));
  }

  buscarPorId(id: string): Sillon | undefined {
    const i = this.items.find((x) => x.id === id);
    return i === undefined ? undefined : structuredClone(i);
  }
}
