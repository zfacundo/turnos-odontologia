import { randomUUID } from 'node:crypto';
import type { Auditoria } from '../../application/ports/auditoria';
import type { Clock } from '../../application/ports/clock';
import type {
  PacienteRepository,
  PrestacionRepository,
  TurnoRepository,
} from '../../application/ports/repositorios';
import { pacientePublico } from '../../application/pacientes/pacientePublico';
import type { Turno } from '../../domain/agenda/turno';
import { fallo, ok, type ErrorDeRegla, type Result } from '../../domain/shared/result';
import type { Usuario } from '../../domain/shared/rol';
import {
  CONCEPTO_POR_DEFECTO,
  DIAS_VENCIMIENTO_CAE,
  EMISOR_SIMULADO,
  IMPORTE_FACTURA_SIMULADA,
  fechaArgentina,
  formatearNumero,
  generarCae,
  sumarDias,
  validarEmisionFacturaC,
  type FacturaC,
  type Receptor,
} from './facturaC';
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

const ROLES_QUE_EMITEN: readonly Usuario['rol'][] = ['admin', 'recepcion'];

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

function receptorDe(deps: DepsEmitirFacturaC, turno: Turno): Receptor {
  const paciente = deps.pacientes.buscarPorId(turno.pacienteId);
  if (paciente === undefined) return { condicion: 'Consumidor Final' };
  return { condicion: 'Consumidor Final', nombre: paciente.nombre, dni: pacientePublico(paciente).dni };
}

/** Orden (gana el primer fallo): rol -> entrada -> 404 -> estado -> ya facturado -> armar -> guardar -> auditar. */
export function emitirFacturaC(
  deps: DepsEmitirFacturaC,
  usuario: Usuario | undefined,
  cuerpo: unknown,
): Result<FacturaC, ErrorEmitirFacturaC> {
  if (usuario === undefined || !ROLES_QUE_EMITEN.includes(usuario.rol)) {
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
  const fechaEmision = fechaArgentina(ahora);
  const factura: FacturaC = {
    id: randomUUID(),
    turnoId,
    tipo: 'C',
    numero: formatearNumero(numero),
    cae: generarCae(fechaEmision, numero),
    fechaEmision,
    vencimientoCae: sumarDias(fechaEmision, DIAS_VENCIMIENTO_CAE),
    emitidaEn: ahora,
    importe: IMPORTE_FACTURA_SIMULADA,
    concepto: deps.prestaciones.buscarPorId(turno.prestacionId)?.nombre ?? CONCEPTO_POR_DEFECTO,
    emisor: EMISOR_SIMULADO,
    receptor: receptorDe(deps, turno),
    simulado: true,
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
