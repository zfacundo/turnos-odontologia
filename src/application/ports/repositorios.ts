import type { Bloqueo } from '../../domain/configuracion/bloqueo';
import type { Prestacion } from '../../domain/configuracion/prestacion';
import type { Profesional } from '../../domain/configuracion/profesional';
import type { Sillon } from '../../domain/configuracion/sillon';
import type { Paciente } from '../../domain/pacientes/paciente';
import type { Intervalo } from '../../domain/shared/intervalo';
import type { ErrorDeRegla, Result } from '../../domain/shared/result';

export type EstadoTurnoRegistro = 'reservado' | 'confirmado' | 'cancelado' | 'atendido' | 'ausente';

/** Tipo minimo del turno que necesita el puerto; el Turno completo es de C-02 (design D4). */
export interface TurnoRegistro {
  readonly id: string;
  readonly profesionalId: string;
  readonly sillonId: string;
  readonly pacienteId: string;
  readonly inicio: Date;
  readonly fin: Date;
  readonly estado: EstadoTurnoRegistro;
}

export interface FiltroTurnos {
  readonly profesionalId?: string;
  readonly sillonId?: string;
  readonly pacienteId?: string;
  readonly rango?: Intervalo;
}

export interface TurnoRepository<T extends TurnoRegistro = TurnoRegistro> {
  guardar(turno: T): void;
  actualizar(turno: T): Result<T, ErrorDeRegla>;
  buscarPorId(id: string): T | undefined;
  /** Solo turnos con estado distinto de 'cancelado' (RN-AG-10). */
  listarActivos(filtro?: FiltroTurnos): T[];
}

export interface PacienteRepository {
  guardar(paciente: Paciente): Result<Paciente, ErrorDeRegla>;
  buscarPorId(id: string): Paciente | undefined;
  buscarPorDni(dni: string): Paciente | undefined;
  listar(): Paciente[];
}

export interface SillonRepository {
  listar(): Sillon[];
  buscarPorId(id: string): Sillon | undefined;
}

export interface PrestacionRepository {
  listar(): Prestacion[];
  buscarPorId(id: string): Prestacion | undefined;
}

export interface ProfesionalRepository {
  listar(): Profesional[];
  buscarPorId(id: string): Profesional | undefined;
}

export interface BloqueoRepository {
  listar(): Bloqueo[];
  /** Bloqueos que se solapan con el rango [inicio, fin). */
  listarEn(rango: Intervalo): Bloqueo[];
}
