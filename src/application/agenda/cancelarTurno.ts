import { validarTransicion } from '../../domain/agenda/estados';
import type { Turno } from '../../domain/agenda/turno';
import { validarVentanaCancelacion } from '../../domain/agenda/ventanaCancelacion';
import type { Result } from '../../domain/shared/result';
import { fallo, ok } from '../../domain/shared/result';
import type { Usuario } from '../../domain/shared/rol';
import {
  aplicarTransicion,
  buscarTurno,
  validarPropiedad,
  validarRol,
  type DepsCambiarEstado,
  type ErrorCambioEstado,
} from './cambiarEstadoTurno';

/** Evento interno emitido al liberar el horario (design D5); lo consumira C-14. */
export interface TurnoLiberado {
  readonly tipo: 'turnoLiberado';
  readonly turnoId: string;
  readonly profesionalId: string;
  readonly sillonId: string;
  readonly inicio: Date;
  readonly fin: Date;
  readonly fecha: Date;
}

export interface PublicadorEventos {
  publicar(evento: TurnoLiberado): void;
}

export interface DepsCancelarTurno extends DepsCambiarEstado {
  readonly eventos?: PublicadorEventos;
}

export interface EntradaCancelarTurno {
  readonly turnoId: string;
  readonly motivo?: string;
}

/**
 * Cancelacion (design D3). Orden, primer fallo gana: rol -> motivo -> turno existe ->
 * propiedad -> RN-AG-09 -> RN-AG-06. Persiste, audita y emite turnoLiberado.
 */
export function cancelarTurno(
  deps: DepsCancelarTurno,
  usuario: Usuario | undefined,
  entrada: EntradaCancelarTurno,
): Result<{ turno: Turno; evento: TurnoLiberado }, ErrorCambioEstado> {
  const rol = validarRol(usuario, 'cancelar');
  if (!rol.ok) return rol;
  const motivo = entrada.motivo?.trim() ?? '';
  if (motivo === '') return fallo({ tipo: 'entrada', mensaje: 'El motivo de cancelación es obligatorio.' });
  const encontrado = buscarTurno(deps, entrada.turnoId);
  if (!encontrado.ok) return encontrado;
  const propiedad = validarPropiedad(rol.valor, encontrado.valor, 'cancelar');
  if (!propiedad.ok) return propiedad;

  const turno = encontrado.valor;
  const transicion = validarTransicion(turno, 'cancelado');
  if (!transicion.ok) return fallo({ tipo: 'regla', error: transicion.error });
  const ahora = deps.clock.ahora();
  const ventana = validarVentanaCancelacion(turno, rol.valor.rol, ahora);
  if (!ventana.ok) return fallo({ tipo: 'regla', error: ventana.error });

  const resultado = aplicarTransicion(
    deps,
    rol.valor,
    turno,
    'cancelar',
    { motivoCancelacion: motivo, canceladoPor: rol.valor.id },
    ahora,
  );
  if (!resultado.ok) return resultado;

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
  return ok({ turno: resultado.valor, evento });
}
