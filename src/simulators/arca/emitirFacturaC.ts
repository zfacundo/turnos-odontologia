import { randomUUID } from 'node:crypto';
import type { Auditoria } from '../../application/ports/auditoria';
import type { Clock } from '../../application/ports/clock';
import type {
  PacienteRepository,
  PrestacionRepository,
  TurnoRepository,
} from '../../application/ports/repositorios';
import type { Turno } from '../../domain/agenda/turno';
import { fallo, ok, type ErrorDeRegla, type Result } from '../../domain/shared/result';
import type { Usuario } from '../../domain/shared/rol';
import {
  DIAS_VENCIMIENTO_CAE,
  armarCuerpoFacturaC,
  formatearNumero,
  generarCae,
  sumarDias,
  validarEmisionFacturaC,
  type FacturaC,
} from './facturaC';
import { entradaDelComprobante, puedeOperarFacturas } from './comprobanteDelTurno';
import type { FacturaCRepository } from './facturaCRepository';

/** Caso de uso "emitir Factura C" del simulador de ARCA (design D2, D5-D8). */

export interface DepsEmitirFacturaC {
  readonly turnos: TurnoRepository<Turno>;
  readonly pacientes: PacienteRepository;
  readonly prestaciones: PrestacionRepository;
  readonly facturas: FacturaCRepository;
  readonly clock: Clock;
  readonly auditoria: Auditoria;
}

export type ErrorEmitirFacturaC =
  | { readonly tipo: 'permiso' | 'entrada' | 'no-encontrado'; readonly mensaje: string }
  | { readonly tipo: 'regla'; readonly error: ErrorDeRegla }
  | {
      readonly tipo: 'ya-facturado';
      readonly mensaje: string;
      readonly turnoId: string;
      readonly facturaId: string;
    };

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/** Solo se lee turnoId: el cliente no fija importe ni otros datos (spec "Validación del cuerpo"). */
function parsearTurnoId(cuerpo: unknown): Result<string, ErrorEmitirFacturaC> {
  if (!esObjeto(cuerpo)) return fallo({ tipo: 'entrada', mensaje: 'El cuerpo debe ser un objeto JSON.' });
  const { turnoId } = cuerpo;
  if (typeof turnoId !== 'string' || turnoId === '') {
    return fallo({ tipo: 'entrada', mensaje: 'Falta turnoId o no es un texto.' });
  }
  return ok(turnoId);
}

/** Orden (gana el primer fallo): rol -> entrada -> 404 -> estado -> ya facturado -> armar -> guardar -> auditar. */
export function emitirFacturaC(
  deps: DepsEmitirFacturaC,
  usuario: Usuario | undefined,
  cuerpo: unknown,
): Result<FacturaC, ErrorEmitirFacturaC> {
  if (!puedeOperarFacturas(usuario)) {
    return fallo({ tipo: 'permiso', mensaje: 'Solo recepción o administración pueden emitir la factura C.' });
  }
  const entrada = parsearTurnoId(cuerpo);
  if (!entrada.ok) return entrada;
  const turnoId = entrada.valor;

  const turno = deps.turnos.buscarPorId(turnoId);
  if (turno === undefined) return fallo({ tipo: 'no-encontrado', mensaje: `No existe el turno ${turnoId}.` });

  const valido = validarEmisionFacturaC(turno);
  if (!valido.ok) return fallo({ tipo: 'regla', error: valido.error });

  const existente = deps.facturas.buscarPorTurno(turnoId);
  if (existente !== undefined) {
    return fallo({
      tipo: 'ya-facturado',
      mensaje: 'No se puede emitir: turno ya facturado.',
      turnoId,
      facturaId: existente.id,
    });
  }

  const ahora = deps.clock.ahora();
  const numero = deps.facturas.ultimoNumero() + 1;
  const cuerpoFactura = armarCuerpoFacturaC(entradaDelComprobante(deps, turno, ahora));
  const factura: FacturaC = {
    ...cuerpoFactura,
    id: randomUUID(),
    numero: formatearNumero(numero),
    cae: generarCae(cuerpoFactura.fechaEmision, numero),
    vencimientoCae: sumarDias(cuerpoFactura.fechaEmision, DIAS_VENCIMIENTO_CAE),
    emitidaEn: ahora,
  };

  deps.facturas.guardar(factura);
  deps.auditoria.registrar({
    accion: 'factura_emitida',
    entidad: 'turno',
    entidadId: turnoId,
    fecha: ahora,
    usuarioId: usuario.id,
    rol: usuario.rol,
    detalle: JSON.stringify({
      facturaId: factura.id,
      numero: factura.numero,
      cae: factura.cae,
      importe: factura.importe,
      simulado: true,
    }),
  });
  return ok(factura);
}
