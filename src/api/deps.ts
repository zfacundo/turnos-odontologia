import type { Auditoria } from '../application/ports/auditoria';
import type { Clock } from '../application/ports/clock';
import type {
  BloqueoRepository,
  PacienteRepository,
  PrestacionRepository,
  ProfesionalRepository,
  SillonRepository,
  TurnoRepository,
} from '../application/ports/repositorios';
import type { Usuario } from '../domain/shared/rol';

export interface Deps {
  readonly sillones: SillonRepository;
  readonly prestaciones: PrestacionRepository;
  readonly profesionales: ProfesionalRepository;
  readonly bloqueos: BloqueoRepository;
  readonly pacientes: PacienteRepository;
  readonly turnos: TurnoRepository;
  readonly clock: Clock;
  readonly auditoria: Auditoria;
  /** Usuarios simulados del seed (solo lectura; sin repositorio). */
  readonly usuarios: readonly Usuario[];
}
