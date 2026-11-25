import type { FacturaC } from './facturaC';

/**
 * Puerto del repositorio de facturas C simuladas (design D2).
 * La numeracion sale de lo guardado: un pedido que no guarda no consume numero.
 */
export interface FacturaCRepository {
  guardar(factura: FacturaC): void;
  buscarPorTurno(turnoId: string): FacturaC | undefined;
  /** Mayor numero emitido (la parte NNNNNNNN); 0 si no hay facturas. */
  ultimoNumero(): number;
}

function numeroDe(factura: FacturaC): number {
  return Number(factura.numero.split('-')[1] ?? '0');
}

export class FacturaCRepositoryEnMemoria implements FacturaCRepository {
  private readonly facturas: FacturaC[] = [];

  guardar(factura: FacturaC): void {
    this.facturas.push(structuredClone(factura));
  }

  buscarPorTurno(turnoId: string): FacturaC | undefined {
    const factura = this.facturas.find((f) => f.turnoId === turnoId);
    return factura === undefined ? undefined : structuredClone(factura);
  }

  ultimoNumero(): number {
    return this.facturas.reduce((max, f) => Math.max(max, numeroDe(f)), 0);
  }
}
