import { esFinal } from '../../domain/agenda/estados';
import type { Turno } from '../../domain/agenda/turno';
import { validarNuevoTurno } from '../../domain/agenda/validarNuevoTurno';
import { validarVentanaCancelacion } from '../../domain/agenda/ventanaCancelacion';
import type { Result } from '../../domain/shared/result';
import { fallo, ok } from '../../domain/shared/result';
import type { Rol, Usuario } from '../../domain/shared/rol';
import type {
  BloqueoRepository,
  PrestacionRepository,
  ProfesionalRepository,
  SillonRepository,
} from '../ports/repositorios';
import { buscarTurno, type DepsCambiarEstado, type ErrorCambioEstado } from './cambiarEstadoTurno';
import type { PublicadorEventos, TurnoLiberado } from './cancelarTurno';

export interface DepsReprogramarTurno extends DepsCambiarEstado {
  readonly profesionales: ProfesionalRepository;
  readonly sillones: SillonRepository;
  readonly prestaciones: PrestacionRepository;
  readonly bloqueos: BloqueoRepository;
  readonly eventos?: PublicadorEventos;
}

export interface EntradaReprogramarTurno {
  readonly turnoId: string;
  /** undefined = ausente o invalido (lo decide quien parsea; design D1). */
  readonly inicio: Date | undefined;
  readonly profesionalId?: string;
  readonly sillonId?: string;
}

type ResultadoReprogramar = Result<{ turno: Turno; evento: TurnoLiberado }, ErrorCambioEstado>;

/** No se reutiliza validarRol: su Record cerrado no incluye 'reprogramar' (design D2). */
const ROLES_QUE_REPROGRAMAN: readonly Rol[] = ['admin', 'recepcion', 'paciente'];

const MENSAJE_VENTANA = 'Solo se puede reprogramar con 24 horas o más de anticipación.';

const entradaInvalida = (mensaje: string): ErrorCambioEstado => ({ tipo: 'entrada', mensaje });

/**
 * Reprogramacion (RN-AG-08). Orden, primer fallo gana: rol -> entrada -> turno existe ->
 * RN-AG-09 -> RN-AG-06 -> sin cambios -> RN-AG-01..05 (validarNuevoTurno sin el propio turno).
 * Persiste, audita y emite turnoLiberado con el horario anterior.
 */
export function reprogramarTurno(
  deps: DepsReprogramarTurno,
  usuario: Usuario | undefined,
  entrada: EntradaReprogramarTurno,
): ResultadoReprogramar {
  if (usuario === undefined || !ROLES_QUE_REPROGRAMAN.includes(usuario.rol)) {
    return fallo({ tipo: 'permiso', mensaje: 'Tu rol no puede reprogramar turnos.' });
  }
  const inicio = entrada.inicio;
  if (inicio === undefined || Number.isNaN(inicio.getTime())) {
    return fallo(entradaInvalida('El nuevo inicio es obligatorio y debe ser una fecha válida.'));
  }
  if (entrada.profesionalId !== undefined && deps.profesionales.buscarPorId(entrada.profesionalId) === undefined) {
    return fallo(entradaInvalida(`No existe el profesional ${entrada.profesionalId}.`));
  }
  if (entrada.sillonId !== undefined && deps.sillones.buscarPorId(entrada.sillonId) === undefined) {
    return fallo(entradaInvalida(`No existe el sillón ${entrada.sillonId}.`));
  }
  const encontrado = buscarTurno(deps, entrada.turnoId);
  if (!encontrado.ok) return encontrado;
  const turno = encontrado.valor;

  if (esFinal(turno.estado)) {
    return fallo({
      tipo: 'regla',
      error: {
        regla: 'RN-AG-09',
        mensaje: `No se puede reprogramar un turno ${turno.estado}.`,
        conflicto: { turnoId: turno.id },
      },
    });
  }
  const ahora = deps.clock.ahora();
  const ventana = validarVentanaCancelacion(turno, usuario.rol, ahora);
  if (!ventana.ok) return fallo({ tipo: 'regla', error: { ...ventana.error, mensaje: MENSAJE_VENTANA } });

  const profesionalId = entrada.profesionalId ?? turno.profesionalId;
  const sillonId = entrada.sillonId ?? turno.sillonId;
  if (
    inicio.getTime() === turno.inicio.getTime() &&
    profesionalId === turno.profesionalId &&
    sillonId === turno.sillonId
  ) {
    return fallo(entradaInvalida('El nuevo horario es igual al actual.'));
  }

  const prestacion = deps.prestaciones.buscarPorId(turno.prestacionId);
  const profesional = deps.profesionales.buscarPorId(profesionalId);
  if (prestacion === undefined || profesional === undefined) {
    return fallo(entradaInvalida('El turno referencia una prestación o un profesional inexistente.'));
  }
  const rango = { inicio, fin: new Date(inicio.getTime() + prestacion.duracionMin * 60 * 1000) };
  const validacion = validarNuevoTurno(
    { pacienteId: turno.pacienteId, prestacionId: turno.prestacionId, profesionalId, sillonId, inicio },
    {
      prestacion,
      profesional,
      bloqueos: deps.bloqueos.listarEn(rango),
      turnos: deps.turnos.listarActivos({ rango }).filter((t) => t.id !== turno.id),
    },
  );
  if (!validacion.ok) return fallo({ tipo: 'regla', error: validacion.error });

  const actualizado: Turno = {
    ...turno,
    profesionalId,
    sillonId,
    inicio: validacion.valor.inicio,
    fin: validacion.valor.fin,
    actualizadoEn: ahora,
  };
  const guardado = deps.turnos.actualizar(actualizado);
  if (!guardado.ok) return fallo({ tipo: 'regla', error: guardado.error });
  deps.auditoria.registrar({
    accion: 'reprogramar',
    entidad: 'turno',
    entidadId: turno.id,
    fecha: ahora,
    usuarioId: usuario.id,
    rol: usuario.rol,
    detalle: JSON.stringify({ antes: turno, despues: guardado.valor }),
  });

  const evento: TurnoLiberado = {
    tipo: 'turnoLiberado',
    turnoId: turno.id,
    profesionalId: turno.profesionalId,
    sillonId: turno.sillonId,
    inicio: turno.inicio,
    fin: turno.fin,
    fecha: ahora,
  };
  deps.eventos?.publicar(evento);
  return ok({ turno: guardado.valor, evento });
}
