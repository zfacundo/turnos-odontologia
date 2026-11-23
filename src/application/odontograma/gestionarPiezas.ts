
import type {
  Cara,
  Sintoma,
  PiezaMarcada,
} from '../../domain/odontograma/piezas';

export class RepositorioPiezas {
  private datos = new Map<string, Map<number, PiezaMarcada>>();

  listar(turnoId: string): PiezaMarcada[] {
    return [...(this.datos.get(turnoId)?.values() ?? [])].map(
      pieza => ({
        ...pieza,
        caras: [...(pieza.caras ?? [])],
        sintomas: [...pieza.sintomas],
      }),
    );
  }

  buscar(turnoId: string, numero: number): PiezaMarcada | undefined {
    return this.listar(turnoId).find(p => p.pieza === numero);
  }

  guardar(pieza: PiezaMarcada): PiezaMarcada {
    if (!this.datos.has(pieza.turnoId)) {
      this.datos.set(pieza.turnoId, new Map());
    }

    const copia: PiezaMarcada = {
      ...pieza,
      caras: [...(pieza.caras ?? [])],
      sintomas: [...pieza.sintomas],
    };

    this.datos.get(pieza.turnoId)!.set(pieza.pieza, copia);
    return copia;
  }
}

export function agregarPiezaAlTurno(
  repo: RepositorioPiezas,
  turnoId: string,
  pieza: number,
  sintomas: Sintoma[],
  caras: Cara[] = [],
): PiezaMarcada {
  return repo.guardar({
    turnoId,
    pieza,
    sintomas,
    caras,
    estado: 'a_revisar',
  });
}

export function marcarHecho(
  repo: RepositorioPiezas,
  turnoId: string,
  numero: number,
): PiezaMarcada | undefined {
  const existente = repo.buscar(turnoId, numero);

  if (!existente) return undefined;

  return repo.guardar({
    ...existente,
    estado: 'hecho',
  });
}
