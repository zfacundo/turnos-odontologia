import type { Clock } from '../../application/ports/clock';
import type {
  PacienteRepository,
  PrestacionRepository,
  TurnoRepository,
} from '../../application/ports/repositorios';
import type { Turno } from '../../domain/agenda/turno';
import { fallo, ok, type ErrorDeRegla, type Result } from '../../domain/shared/result';
import type { Usuario } from '../../domain/shared/rol';
import { armarBorradorFacturaC, validarEmisionFacturaC, type BorradorFacturaC, type FacturaC } from './facturaC';
import { entradaDelComprobante, puedeOperarFacturas } from './comprobanteDelTurno';
import type { FacturaCRepository } from './facturaCRepository';

/**
 * Caso de uso "ver la factura de un turno" (arca-ver-factura-y-confirmar-emision D4).
 * Las dependencias no incluyen auditoria ni guardar/ultimoNumero: consultar no tiene efectos.
 */

export interface DepsVerFacturaC {
  readonly turnos: TurnoRepository<Turno>;
  readonly pacientes: PacienteRepository;
  readonly prestaciones: PrestacionRepository;
  readonly facturas: Pick<FacturaCRepository, 'buscarPorTurno'>;
  readonly clock: Clock;
}

export type VistaFacturaC =
  | { readonly estado: 'emitida'; readonly factura: FacturaC }
  | {
      readonly estado: 'vista-previa';
      readonly emitible: boolean;
      /** Presente solo si `emitible` es false (RN-SM-03). */
      readonly motivo?: ErrorDeRegla;
      readonly factura: BorradorFacturaC;
    };

export interface ErrorVerFacturaC {
  readonly tipo: 'permiso' | 'no-encontrado';
  readonly mensaje: string;
}

/** Orden (gana el primer fallo): rol -> 404 -> factura existente -> borrador. */
export function verFacturaC(
  deps: DepsVerFacturaC,
  usuario: Usuario | undefined,
  turnoId: string,
): Result<VistaFacturaC, ErrorVerFacturaC> {
  if (!puedeOperarFacturas(usuario)) {
    return fallo({ tipo: 'permiso', mensaje: 'Solo recepción o administración pueden ver la factura C.' });
  }
  const turno = deps.turnos.buscarPorId(turnoId);
  if (turno === undefined) return fallo({ tipo: 'no-encontrado', mensaje: `No existe el turno ${turnoId}.` });

  const existente = deps.facturas.buscarPorTurno(turnoId);
  if (existente !== undefined) return ok({ estado: 'emitida', factura: existente });

  const factura = armarBorradorFacturaC(entradaDelComprobante(deps, turno, deps.clock.ahora()));
  const valido = validarEmisionFacturaC(turno);
  if (valido.ok) return ok({ estado: 'vista-previa', emitible: true, factura });
  return ok({ estado: 'vista-previa', emitible: false, motivo: valido.error, factura });
}
