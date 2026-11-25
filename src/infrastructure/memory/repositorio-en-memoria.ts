import { fallo, ok, type ErrorDeRegla, type Result } from '../../domain/shared/result';

/**
 * Base mutable en memoria con clonado defensivo (design D3).
 * El orden de `listar()` es el de insercion del `Map` (upsert conserva la posicion).
 */
export abstract class RepositorioEnMemoria<T extends { id: string }> {
  protected abstract readonly codigoInexistente: string;
  private readonly items: Map<string, T>;

  constructor(items: readonly T[] = []) {
    this.items = new Map(items.map((item) => [item.id, structuredClone(item)]));
  }

  listar(): T[] {
    return [...this.items.values()].map((item) => structuredClone(item));
  }

  buscarPorId(id: string): T | undefined {
    const item = this.items.get(id);
    return item === undefined ? undefined : structuredClone(item);
  }

  guardar(item: T): void {
    this.items.set(item.id, structuredClone(item));
  }

  actualizar(item: T): Result<T, ErrorDeRegla> {
    if (!this.items.has(item.id)) {
      return fallo({
        regla: this.codigoInexistente,
        mensaje: `No existe el registro ${item.id}.`,
      });
    }
    this.items.set(item.id, structuredClone(item));
    return ok(structuredClone(item));
  }

  eliminar(id: string): Result<void, ErrorDeRegla> {
    if (!this.items.delete(id)) {
      return fallo({
        regla: this.codigoInexistente,
        mensaje: `No existe el registro ${id}.`,
      });
    }
    return ok(undefined);
  }
}
