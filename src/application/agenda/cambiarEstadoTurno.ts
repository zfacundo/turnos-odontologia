import { validarTransicion } from '../../domain/agenda/estados';
import type { EstadoTurno, Turno } from '../../domain/agenda/turno';
import type { ErrorDeRegla, Result } from '../../domain/shared/result';
import { fallo, ok } from '../../domain/shared/result';
import type { Rol, Usuario } from '../../domain/shared/rol';
import type { Auditoria } from '../ports/auditoria';
import type { Clock } from '../ports/clock';
import type { TurnoRepository } from '../ports/repositorios';

export interface DepsCambiarEstado {
  readonly turnos: TurnoRepository<Turno>;
  readonly clock: Clock;
  readonly auditoria: Auditoria;
}

export type AccionTurno = 'confirmar' | 'atender' | 'ausente' | 'cancelar';
export type AccionCambioEstado = Exclude<AccionTurno, 'cancelar'>;

export type ErrorCambioEstado =
  | { readonly tipo: 'permiso' | 'entrada' | 'no-encontrado'; readonly mensaje: string }
  | { readonly tipo: 'regla'; readonly error: ErrorDeRegla };

export interface EntradaCambiarEstado {
  readonly turnoId: string;
  readonly accion: AccionCambioEstado;
}

const DESTINO: Readonly<Record<AccionTurno, EstadoTurno>> = {
  confirmar: 'confirmado',
  atender: 'atendido',
  ausente: 'ausente',
  cancelar: 'cancelado',
};

/** Matriz RBAC (design D4). El odontologo ademas debe ser el profesional del turno. */
const ROLES_PERMITIDOS: Readonly<Record<AccionTurno, readonly Rol[]>> = {
  confirmar: ['admin', 'recepcion', 'paciente'],
  cancelar: ['admin', 'recepcion', 'paciente'],
  atender: ['admin', 'recepcion', 'odontologo'],
  ausente: ['admin', 'recepcion', 'odontologo'],
};

const SIN_PERMISO = (accion: AccionTurno): ErrorCambioEstado => ({
  tipo: 'permiso',
  mensaje: `Tu rol no puede ${accion} turnos.`,
});

/** Primer chequeo (antes de buscar el turno): usuario presente y rol habilitado. */
export function validarRol(
  usuario: Usuario | undefined,
  accion: AccionTurno,
): Result<Usuario, ErrorCambioEstado> {
  if (usuario === undefined || !ROLES_PERMITIDOS[accion].includes(usuario.rol)) {
    return fallo(SIN_PERMISO(accion));
  }
  return ok(usuario);
}

export function buscarTurno(deps: DepsCambiarEstado, turnoId: string): Result<Turno, ErrorCambioEstado> {
  const turno = deps.turnos.buscarPorId(turnoId);
  if (turno === undefined) {
    return fallo({ tipo: 'no-encontrado', mensaje: `No existe el turno ${turnoId}.` });
  }
  return ok(turno);
}

/** El odontologo solo opera sobre turnos de su propio profesional. */
export function validarPropiedad(
  usuario: Usuario,
  turno: Turno,
  accion: AccionTurno,
): Result<true, ErrorCambioEstado> {
  if (usuario.rol === 'odontologo' && usuario.profesionalId !== turno.profesionalId) {
    return fallo(SIN_PERMISO(accion));
  }
  return ok(true);
}

/** Nucleo compartido: valida RN-AG-09, persiste con actualizadoEn del reloj y audita (RN-AU-01). */
export function aplicarTransicion(
  deps: DepsCambiarEstado,
  usuario: Usuario,
  turno: Turno,
  accion: AccionTurno,
  extra: Partial<Pick<Turno, 'motivoCancelacion' | 'canceladoPor'>> = {},
  ahora: Date = deps.clock.ahora(),
): Result<Turno, ErrorCambioEstado> {
  const transicion = validarTransicion(turno, DESTINO[accion]);
  if (!transicion.ok) return fallo({ tipo: 'regla', error: transicion.error });
  const actualizado: Turno = { ...turno, ...extra, estado: transicion.valor, actualizadoEn: ahora };
  const guardado = deps.turnos.actualizar(actualizado);
  if (!guardado.ok) return fallo({ tipo: 'regla', error: guardado.error });
  deps.auditoria.registrar({
    accion,
    entidad: 'turno',
    entidadId: turno.id,
    fecha: ahora,
    usuarioId: usuario.id,
    rol: usuario.rol,
    detalle: JSON.stringify({ antes: turno, despues: guardado.valor }),
  });
  return ok(guardado.valor);
}

/** Confirmar / atender / ausente (design D3). Orden: rol -> turno -> propiedad -> transicion. */
export function cambiarEstadoTurno(
  deps: DepsCambiarEstado,
  usuario: Usuario | undefined,
  entrada: EntradaCambiarEstado,
): Result<Turno, ErrorCambioEstado> {
  const rol = validarRol(usuario, entrada.accion);
  if (!rol.ok) return rol;
  const turno = buscarTurno(deps, entrada.turnoId);
  if (!turno.ok) return turno;
  const propiedad = validarPropiedad(rol.valor, turno.valor, entrada.accion);
  if (!propiedad.ok) return propiedad;
  return aplicarTransicion(deps, rol.valor, turno.valor, entrada.accion);
}
