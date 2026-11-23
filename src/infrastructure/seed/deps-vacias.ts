import type { Clock } from '../../application/ports/clock';
import type { Deps } from '../../api/deps';
import { AuditoriaEnMemoria } from '../memory/auditoria-en-memoria';
import { BloqueoRepositoryEnMemoria } from '../memory/bloqueo-repository';
import { PacienteRepositoryEnMemoria } from '../memory/paciente-repository';
import { PrestacionRepositoryEnMemoria } from '../memory/prestacion-repository';
import { ProfesionalRepositoryEnMemoria } from '../memory/profesional-repository';
import { SillonRepositoryEnMemoria } from '../memory/sillon-repository';
import { TurnoRepositoryEnMemoria } from '../memory/turno-repository';

/** Dependencias con repositorios en memoria vacios (SEED=false y tests). */
export function crearDepsVacias(clock: Clock): Deps {
  return {
    sillones: new SillonRepositoryEnMemoria(),
    prestaciones: new PrestacionRepositoryEnMemoria(),
    profesionales: new ProfesionalRepositoryEnMemoria(),
    bloqueos: new BloqueoRepositoryEnMemoria(),
    pacientes: new PacienteRepositoryEnMemoria(),
    turnos: new TurnoRepositoryEnMemoria(),
    clock,
    auditoria: new AuditoriaEnMemoria(),
    usuarios: [],
  };
}
