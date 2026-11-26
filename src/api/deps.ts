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
import type { Turno } from '../domain/agenda/turno';
import type { HistoriaRepository } from '../application/historia/puertos';
import type { GeneradorToken, SesionRepository } from '../application/auth/puertos';
import type { Usuario } from '../domain/shared/rol';
import type { PadronObraSocialRepository } from '../simulators/obras-sociales/padronRepository';

export interface Deps {
  readonly sillones: SillonRepository;
  readonly prestaciones: PrestacionRepository;
  readonly profesionales: ProfesionalRepository;
  readonly bloqueos: BloqueoRepository;
  readonly pacientes: PacienteRepository;
  readonly turnos: TurnoRepository<Turno>;
  readonly clock: Clock;
  readonly auditoria: Auditoria;
  /** Usuarios simulados del seed (solo lectura; sin repositorio). */
  readonly usuarios: readonly Usuario[];
  /** Sesiones del login simulado (token opaco en memoria). */
  readonly sesiones: SesionRepository;
  readonly generadorToken: GeneradorToken;
  /** Historial clínico ficticio (solo inserción). */
  readonly historia: HistoriaRepository;
  /** Padrón simulado compartido por la API de obras sociales y el bot de WhatsApp. */
  readonly padron?: PadronObraSocialRepository;
}
