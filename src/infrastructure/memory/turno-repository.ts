import type {
  FiltroTurnos,
  TurnoRegistro,
  TurnoRepository,
} from '../../application/ports/repositorios';
import { seSolapan } from '../../domain/shared/intervalo';
import { fallo, ok, type ErrorDeRegla, type Result } from '../../domain/shared/result';

export class TurnoRepositoryEnMemoria<T extends TurnoRegistro = TurnoRegistro>
  implements TurnoRepository<T>
{
  private readonly turnos = new Map<string, T>();

  guardar(turno: T): void {
    this.turnos.set(turno.id, structuredClone(turno));
  }

  actualizar(turno: T): Result<T, ErrorDeRegla> {
    if (!this.turnos.has(turno.id)) {
      return fallo({ regla: 'TURNO_INEXISTENTE', mensaje: `No existe el turno ${turno.id}.` });
    }
    this.turnos.set(turno.id, structuredClone(turno));
    return ok(structuredClone(turno));
  }

  buscarPorId(id: string): T | undefined {
    const t = this.turnos.get(id);
    return t === undefined ? undefined : structuredClone(t);
  }

  listarActivos(filtro: FiltroTurnos = {}): T[] {
    const { profesionalId, sillonId, pacienteId, rango } = filtro;
    return [...this.turnos.values()]
      .filter((t) => t.estado !== 'cancelado')
      .filter((t) => profesionalId === undefined || t.profesionalId === profesionalId)
      .filter((t) => sillonId === undefined || t.sillonId === sillonId)
      .filter((t) => pacienteId === undefined || t.pacienteId === pacienteId)
      .filter((t) => rango === undefined || seSolapan({ inicio: t.inicio, fin: t.fin }, rango))
      .map((t) => structuredClone(t));
  }
}
