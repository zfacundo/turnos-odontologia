import type { PagoSena } from './pagoSena';

/** Puerto del repositorio de pagos de seña simulados (design D7). */
export interface PagoSenaRepository {
  guardar(pago: PagoSena): void;
  /** Intentos del turno en orden de registro (aprobados y rechazados). */
  listarPorTurno(turnoId: string): PagoSena[];
}

export class PagoSenaRepositoryEnMemoria implements PagoSenaRepository {
  private readonly pagos: PagoSena[] = [];

  guardar(pago: PagoSena): void {
    this.pagos.push(structuredClone(pago));
  }

  listarPorTurno(turnoId: string): PagoSena[] {
    return this.pagos.filter((p) => p.turnoId === turnoId).map((p) => structuredClone(p));
  }
}
