import { randomUUID } from 'node:crypto';
import type { Auditoria } from '../../application/ports/auditoria';
import type { Clock } from '../../application/ports/clock';
import type { TurnoRepository } from '../../application/ports/repositorios';
import type { Turno } from '../../domain/agenda/turno';
import { fallo, ok, type ErrorDeRegla, type Result } from '../../domain/shared/result';
import type { Usuario } from '../../domain/shared/rol';
import { MONTO_SENA_SIMULADA, validarPagoSena, type EstadoPagoSena, type PagoSena } from './pagoSena';
import type { PagoSenaRepository } from './pagoSenaRepository';

/** Caso de uso "pagar seña" del simulador de Mercado Pago (design D5, D6). */

export interface DepsPagarSena {
  readonly turnos: TurnoRepository<Turno>;
  readonly pagos: PagoSenaRepository;
  readonly clock: Clock;
  readonly auditoria: Auditoria;
}

export interface EntradaPagarSena {
  readonly turnoId: string;
  readonly resultado: EstadoPagoSena;
}

export type ErrorPagarSena =
  | { readonly tipo: 'permiso' | 'entrada' | 'no-encontrado'; readonly mensaje: string }
  | { readonly tipo: 'regla'; readonly error: ErrorDeRegla };

export interface PagoRegistrado {
  readonly pago: PagoSena;
  readonly turno: Turno;
}

const RESULTADOS: readonly EstadoPagoSena[] = ['aprobado', 'rechazado'];

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function parsearEntrada(cuerpo: unknown): Result<EntradaPagarSena, ErrorPagarSena> {
  const error = (mensaje: string) => fallo<ErrorPagarSena>({ tipo: 'entrada', mensaje });
  if (!esObjeto(cuerpo)) return error('El cuerpo debe ser un objeto JSON.');
  const { turnoId, resultado } = cuerpo;
  if (typeof turnoId !== 'string' || turnoId === '') return error('Falta turnoId o no es un texto.');
  const estado = RESULTADOS.find((r) => r === resultado);
  if (estado === undefined) return error("resultado debe ser 'aprobado' o 'rechazado'.");
  return ok({ turnoId, resultado: estado });
}

const noEncontrado = (turnoId: string) =>
  fallo<ErrorPagarSena>({ tipo: 'no-encontrado', mensaje: `No existe el turno ${turnoId}.` });

/** Orden (gana el primer fallo): rol -> entrada -> turno inexistente -> RN-SM-01 -> registrar. */
export function pagarSena(
  deps: DepsPagarSena,
  usuario: Usuario | undefined,
  cuerpo: unknown,
): Result<PagoRegistrado, ErrorPagarSena> {
  if (usuario === undefined || usuario.rol !== 'paciente') {
    return fallo({ tipo: 'permiso', mensaje: 'Solo el paciente puede pagar la seña.' });
  }
  const entrada = parsearEntrada(cuerpo);
  if (!entrada.ok) return entrada;
  const { turnoId, resultado } = entrada.valor;

  const turno = deps.turnos.buscarPorId(turnoId);
  if (turno === undefined) return noEncontrado(turnoId);

  const valido = validarPagoSena(turno);
  if (!valido.ok) return fallo({ tipo: 'regla', error: valido.error });

  const ahora = deps.clock.ahora();
  let turnoFinal = turno;
  if (resultado === 'aprobado') {
    const actualizado = deps.turnos.actualizar({ ...turno, senado: true, actualizadoEn: ahora });
    if (!actualizado.ok) return noEncontrado(turnoId);
    turnoFinal = actualizado.valor;
  }

  const pago: PagoSena = {
    id: randomUUID(),
    turnoId,
    monto: MONTO_SENA_SIMULADA,
    estado: resultado,
    fecha: ahora,
    simulado: true,
  };
  deps.pagos.guardar(pago);
  deps.auditoria.registrar({
    accion: resultado === 'aprobado' ? 'sena_aprobada' : 'sena_rechazada',
    entidad: 'turno',
    entidadId: turnoId,
    fecha: ahora,
    usuarioId: usuario.id,
    rol: usuario.rol,
    detalle: JSON.stringify({ pagoId: pago.id, monto: pago.monto, simulado: true }),
  });
  return ok({ pago, turno: turnoFinal });
}
