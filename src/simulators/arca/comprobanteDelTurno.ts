import type {
  PacienteRepository,
  PrestacionRepository,
} from '../../application/ports/repositorios';
import { pacientePublico } from '../../application/pacientes/pacientePublico';
import type { Turno } from '../../domain/agenda/turno';
import type { Usuario } from '../../domain/shared/rol';
import { CONCEPTO_POR_DEFECTO, type EntradaCuerpoFacturaC, type Receptor } from './facturaC';

/** Datos del turno compartidos por emitir y ver la factura (arca-ver-factura-y-confirmar-emision D3). */

export interface DepsComprobanteDelTurno {
  readonly pacientes: PacienteRepository;
  readonly prestaciones: PrestacionRepository;
}

const ROLES_QUE_OPERAN: readonly Usuario['rol'][] = ['admin', 'recepcion'];

/** Solo recepción y administración emiten y consultan facturas. */
export function puedeOperarFacturas(usuario: Usuario | undefined): usuario is Usuario {
  return usuario !== undefined && ROLES_QUE_OPERAN.includes(usuario.rol);
}

function receptorDe(deps: DepsComprobanteDelTurno, turno: Turno): Receptor {
  const paciente = deps.pacientes.buscarPorId(turno.pacienteId);
  if (paciente === undefined) return { condicion: 'Consumidor Final' };
  return { condicion: 'Consumidor Final', nombre: paciente.nombre, dni: pacientePublico(paciente).dni };
}

export function entradaDelComprobante(
  deps: DepsComprobanteDelTurno,
  turno: Turno,
  ahora: Date,
): EntradaCuerpoFacturaC {
  return {
    turnoId: turno.id,
    concepto: deps.prestaciones.buscarPorId(turno.prestacionId)?.nombre ?? CONCEPTO_POR_DEFECTO,
    receptor: receptorDe(deps, turno),
    ahora,
  };
}
