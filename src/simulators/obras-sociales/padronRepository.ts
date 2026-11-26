import type { AfiliadoSimulado, ObraSocialSimulada } from './afiliado';
import { afiliadosDelPadron, obrasSocialesDelPadron } from './padron';

export interface PadronObraSocialRepository {
  buscarPorNumero(nroAfiliado: string): AfiliadoSimulado | undefined;
  listar(): AfiliadoSimulado[];
  listarObrasSociales(): ObraSocialSimulada[];
  buscarObraSocial(codigo: string): ObraSocialSimulada | undefined;
}

export class PadronObraSocialEnMemoria implements PadronObraSocialRepository {
  private readonly afiliados: AfiliadoSimulado[];
  private readonly obrasSociales: ObraSocialSimulada[];

  constructor(
    iniciales: readonly AfiliadoSimulado[] = afiliadosDelPadron(),
    obras: readonly ObraSocialSimulada[] = obrasSocialesDelPadron(),
  ) {
    this.afiliados = iniciales.map((a) => structuredClone(a));
    this.obrasSociales = obras.map((o) => structuredClone(o));
  }

  buscarPorNumero(nroAfiliado: string): AfiliadoSimulado | undefined {
    const afiliado = this.afiliados.find((a) => a.nroAfiliado === nroAfiliado);
    return afiliado === undefined ? undefined : structuredClone(afiliado);
  }

  listar(): AfiliadoSimulado[] {
    return this.afiliados.map((a) => structuredClone(a));
  }

  listarObrasSociales(): ObraSocialSimulada[] {
    return this.obrasSociales.map((o) => structuredClone(o));
  }

  buscarObraSocial(codigo: string): ObraSocialSimulada | undefined {
    const obra = this.obrasSociales.find((o) => o.codigo === codigo);
    return obra === undefined ? undefined : structuredClone(obra);
  }
}
