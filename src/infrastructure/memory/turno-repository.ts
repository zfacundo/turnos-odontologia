import type {
  FiltroTurnos,
  TurnoRegistro,
  TurnoRepository,
} from '../../application/ports/repositorios';
import { seSolapan } from '../../domain/shared/intervalo';
import { fallo, ok, type ErrorDeRegla, type Result } from '../../domain/shared/result';

export class TurnoRepositoryEnMemoria implements TurnoRepository {
  private readonly turnos = new Map<string, TurnoRegistro>();

  guardar(turno: TurnoRegistro): void {
    this.turnos.set(turno.id, structuredClone(turno));
  }

  actualizar(turno: TurnoRegistro): Result<TurnoRegistro, ErrorDeRegla> {
    if (!this.turnos.has(turno.id)) {
      return fallo({ regla: 'TURNO_INEXISTENTE', mensaje: `No existe el turno ${turno.id}.` });
    }
    this.turnos.set(turno.id, structuredClone(turno));
    return ok(structuredClone(turno));
  }

  buscarPorId(id: string): TurnoRegistro | undefined {
    const t = this.turnos.get(id);
    return t === undefined ? undefined : structuredClone(t);
  }

  listarActivos(filtro: FiltroTurnos = {}): TurnoRegistro[] {
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
