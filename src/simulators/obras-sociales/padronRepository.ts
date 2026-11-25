import type { AfiliadoSimulado } from './afiliado';
import { afiliadosDelPadron } from './padron';

export interface PadronObraSocialRepository {
  buscarPorNumero(nroAfiliado: string): AfiliadoSimulado | undefined;
  listar(): AfiliadoSimulado[];
}

export class PadronObraSocialEnMemoria implements PadronObraSocialRepository {
  private readonly afiliados: readonly AfiliadoSimulado[];

  constructor(iniciales: readonly AfiliadoSimulado[] = afiliadosDelPadron()) {
    this.afiliados = iniciales.map((a) => structuredClone(a));
  }

  buscarPorNumero(nroAfiliado: string): AfiliadoSimulado | undefined {
    const afiliado = this.afiliados.find((a) => a.nroAfiliado === nroAfiliado);
    return afiliado === undefined ? undefined : structuredClone(afiliado);
  }

  listar(): AfiliadoSimulado[] {
    return this.afiliados.map((a) => structuredClone(a));
  }
}
