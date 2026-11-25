import type { Usuario } from '../../domain/shared/rol';
import type {
  BloqueoRepository,
  PrestacionRepository,
  ProfesionalRepository,
  SillonRepository,
} from '../ports/repositorios';

/** Subconjunto de `Deps` que necesitan los casos de uso de configuracion (design D5). */
export interface DepsConfiguracion {
  readonly sillones: SillonRepository;
  readonly prestaciones: PrestacionRepository;
  readonly profesionales: ProfesionalRepository;
  readonly bloqueos: BloqueoRepository;
  readonly usuarios: readonly Usuario[];
}
