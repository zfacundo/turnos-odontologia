import { randomUUID } from 'node:crypto';
import type { OrigenTurno, Turno } from '../../domain/agenda/turno';
import { validarNuevoTurno } from '../../domain/agenda/validarNuevoTurno';
import type { ErrorDeRegla, Result } from '../../domain/shared/result';
import { fallo, ok } from '../../domain/shared/result';
import type { Rol, Usuario } from '../../domain/shared/rol';
import type { Auditoria } from '../ports/auditoria';
import type { Clock } from '../ports/clock';
import type {
  BloqueoRepository,
  PacienteRepository,
  PrestacionRepository,
  ProfesionalRepository,
  SillonRepository,
  TurnoRepository,
} from '../ports/repositorios';

export interface DepsCrearTurno {
  readonly sillones: SillonRepository;
  readonly prestaciones: PrestacionRepository;
  readonly profesionales: ProfesionalRepository;
  readonly bloqueos: BloqueoRepository;
  readonly pacientes: PacienteRepository;
  readonly turnos: TurnoRepository<Turno>;
  readonly clock: Clock;
  readonly auditoria: Auditoria;
}

export interface EntradaCrearTurno {
  readonly pacienteId: string;
  readonly prestacionId: string;
  readonly profesionalId: string;
  readonly sillonId: string;
  readonly inicio: Date;
  readonly origen?: OrigenTurno;
}

export type ErrorCrearTurno =
  | { readonly tipo: 'permiso'; readonly mensaje: string }
  | { readonly tipo: 'entrada'; readonly mensaje: string }
  | { readonly tipo: 'regla'; readonly error: ErrorDeRegla };

const ROLES_QUE_CREAN: readonly Rol[] = ['recepcion', 'admin', 'paciente'];

/** Alta de turno (design D5): resuelve entidades, valida con el dominio puro y persiste. */
export function crearTurno(
  deps: DepsCrearTurno,
  usuario: Usuario | undefined,
  entrada: EntradaCrearTurno,
): Result<Turno, ErrorCrearTurno> {
  if (usuario === undefined || !ROLES_QUE_CREAN.includes(usuario.rol)) {
    return fallo({ tipo: 'permiso', mensaje: 'Tu rol no puede crear turnos.' });
  }
  if (deps.pacientes.buscarPorId(entrada.pacienteId) === undefined) {
    return fallo({ tipo: 'entrada', mensaje: `No existe el paciente ${entrada.pacienteId}.` });
  }
  const prestacion = deps.prestaciones.buscarPorId(entrada.prestacionId);
  if (prestacion === undefined) {
    return fallo({ tipo: 'entrada', mensaje: `No existe la prestación ${entrada.prestacionId}.` });
  }
  const profesional = deps.profesionales.buscarPorId(entrada.profesionalId);
  if (profesional === undefined) {
    return fallo({ tipo: 'entrada', mensaje: `No existe el profesional ${entrada.profesionalId}.` });
  }
  const sillon = deps.sillones.buscarPorId(entrada.sillonId);
  if (sillon === undefined) {
    return fallo({ tipo: 'entrada', mensaje: `No existe el sillón ${entrada.sillonId}.` });
  }
  if (!profesional.activo || !sillon.activo) {
    return fallo({
      tipo: 'regla',
      error: {
        regla: 'RN-CF-04',
        mensaje: 'El profesional y el sillón deben estar activos para crear un turno.',
      },
    });
  }
  const rango = {
    inicio: entrada.inicio,
    fin: new Date(entrada.inicio.getTime() + prestacion.duracionMin * 60 * 1000),
  };
  const validacion = validarNuevoTurno(entrada, {
    prestacion,
    profesional,
    bloqueos: deps.bloqueos.listarEn(rango),
    turnos: deps.turnos.listarActivos({ rango }),
  });
  if (!validacion.ok) return fallo({ tipo: 'regla', error: validacion.error });

  const turno: Turno = {
    id: randomUUID(),
    pacienteId: entrada.pacienteId,
    prestacionId: entrada.prestacionId,
    profesionalId: entrada.profesionalId,
    sillonId: entrada.sillonId,
    inicio: validacion.valor.inicio,
    fin: validacion.valor.fin,
    estado: 'reservado',
    senado: false,
    esSobreturno: false,
    origen: entrada.origen ?? 'recepcion',
    creadoPor: usuario.id,
    creadoEn: deps.clock.ahora(),
  };
  deps.turnos.guardar(turno);
  deps.auditoria.registrar({
    fecha: turno.creadoEn,
    usuarioId: usuario.id,
    rol: usuario.rol,
    accion: 'crear',
    entidad: 'turno',
    entidadId: turno.id,
    detalle: JSON.stringify(turno),
  });
  return ok(turno);
}
