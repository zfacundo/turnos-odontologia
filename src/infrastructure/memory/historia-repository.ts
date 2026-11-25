import type { HistoriaRepository } from '../../application/historia/puertos';
import type { EntradaHistoria } from '../../domain/historia/entrada';

export class HistoriaRepositoryEnMemoria implements HistoriaRepository {
  private readonly entradas: EntradaHistoria[];
  private contador = 0;

  constructor(iniciales: readonly EntradaHistoria[] = []) {
    this.entradas = iniciales.map((e) => structuredClone(e));
    this.contador = this.entradas.length;
  }

  siguienteId(): string {
    this.contador += 1;
    return `hc-${this.contador}`;
  }

  agregar(entrada: EntradaHistoria): void {
    this.entradas.push(structuredClone(entrada));
  }

  listarPorPaciente(pacienteId: string): EntradaHistoria[] {
    return this.entradas
      .filter((e) => e.pacienteId === pacienteId)
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
      .map((e) => structuredClone(e));
  }
}
