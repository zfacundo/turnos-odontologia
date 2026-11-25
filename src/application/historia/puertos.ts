import type { EntradaHistoria } from '../../domain/historia/entrada';

/** Solo inserción y lectura: sin actualizar ni eliminar (como la auditoría). */
export interface HistoriaRepository {
  /** Id nuevo y único para la próxima entrada (`hc-N`). */
  siguienteId(): string;
  agregar(entrada: EntradaHistoria): void;
  /** Entradas del paciente por `fecha` descendente. */
  listarPorPaciente(pacienteId: string): EntradaHistoria[];
}
