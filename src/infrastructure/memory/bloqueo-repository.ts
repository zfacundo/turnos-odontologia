import type { BloqueoRepository } from '../../application/ports/repositorios';
import type { Bloqueo } from '../../domain/configuracion/bloqueo';
import { seSolapan, type Intervalo } from '../../domain/shared/intervalo';

export class BloqueoRepositoryEnMemoria implements BloqueoRepository {
  constructor(private readonly items: readonly Bloqueo[] = []) {}

  listar(): Bloqueo[] {
    return this.items.map((b) => structuredClone(b));
  }

  listarEn(rango: Intervalo): Bloqueo[] {
    return this.items.filter((b) => seSolapan(b.intervalo, rango)).map((b) => structuredClone(b));
  }
}
