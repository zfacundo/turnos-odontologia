import type { Turno } from '../../domain/agenda/turno';
import { fallo, ok, type ErrorDeRegla, type Result } from '../../domain/shared/result';

/**
 * Dominio puro del simulador de ARCA (C-12, design D1-D6).
 * Sin Express, fs ni reloj: el instante, el id y el paciente llegan desde la capa de aplicacion.
 */

export const AVISO_SIMULACION = 'SIMULACIÓN — sin validez fiscal';

/** Punto de venta ficticio fijo (design D3). */
export const PUNTO_DE_VENTA = '00001';

/** Importe ficticio fijo, en pesos enteros (design D5; pregunta abierta). No es dinero real. */
export const IMPORTE_FACTURA_SIMULADA = 25000;

/** Supuesto del simulador: vencimiento del CAE = emision + 10 dias corridos (design D4). */
export const DIAS_VENCIMIENTO_CAE = 10;

/** Concepto cuando la prestacion del turno no existe (design D5). */
export const CONCEPTO_POR_DEFECTO = 'Prestación odontológica';

export interface Emisor {
  readonly razonSocial: string;
  readonly cuit: string;
  readonly condicionIva: 'Monotributo';
}

/** Emisor ficticio evidente (design D6). */
export const EMISOR_SIMULADO: Emisor = {
  razonSocial: 'Consultorio Ficticio',
  cuit: '20-99999999-0',
  condicionIva: 'Monotributo',
};

export interface Receptor {
  readonly condicion: 'Consumidor Final';
  readonly nombre?: string;
  /** Siempre enmascarado (p. ej. 99****01); nunca el DNI completo. */
  readonly dni?: string;
}

/** Datos del comprobante comunes a la factura emitida y a la vista previa (arca-ver-factura-y-confirmar-emision D2). */
export interface CuerpoFacturaC {
  readonly turnoId: string;
  readonly tipo: 'C';
  /** Fecha de calendario en Argentina, AAAA-MM-DD. */
  readonly fechaEmision: string;
  readonly importe: number;
  readonly concepto: string;
  readonly emisor: Emisor;
  readonly receptor: Receptor;
  readonly simulado: true;
}

export interface FacturaC extends CuerpoFacturaC {
  readonly id: string;
  readonly numero: string;
  readonly cae: string;
  /** Fecha de calendario en Argentina, AAAA-MM-DD. */
  readonly vencimientoCae: string;
  /** Instante del reloj al emitir. */
  readonly emitidaEn: Date;
}

/** Vista previa: el comprobante sin numero, CAE ni vencimiento, y sin id ni emitidaEn. */
export interface BorradorFacturaC extends CuerpoFacturaC {
  readonly numero: null;
  readonly cae: null;
  readonly vencimientoCae: null;
}

export interface EntradaCuerpoFacturaC {
  readonly turnoId: string;
  readonly concepto: string;
  readonly receptor: Receptor;
  readonly ahora: Date;
}

export function armarCuerpoFacturaC(entrada: EntradaCuerpoFacturaC): CuerpoFacturaC {
  return {
    turnoId: entrada.turnoId,
    tipo: 'C',
    fechaEmision: fechaArgentina(entrada.ahora),
    importe: IMPORTE_FACTURA_SIMULADA,
    concepto: entrada.concepto,
    emisor: EMISOR_SIMULADO,
    receptor: entrada.receptor,
    simulado: true,
  };
}

export function armarBorradorFacturaC(entrada: EntradaCuerpoFacturaC): BorradorFacturaC {
  return { ...armarCuerpoFacturaC(entrada), numero: null, cae: null, vencimientoCae: null };
}

/** RN-SM-03 + SU-07: solo se factura un turno atendido. */
export function validarEmisionFacturaC(
  turno: Pick<Turno, 'id' | 'estado'>,
): Result<true, ErrorDeRegla> {
  if (turno.estado !== 'atendido') {
    return fallo({
      regla: 'RN-SM-03',
      mensaje: `Solo se factura un turno atendido (SU-07); el turno está ${turno.estado}.`,
      conflicto: { turnoId: turno.id },
    });
  }
  return ok(true);
}

/** PPPPP-NNNNNNNN (design D3). */
export function formatearNumero(numero: number): string {
  return `${PUNTO_DE_VENTA}-${String(numero).padStart(8, '0')}`;
}

/** CAE ficticio de 14 digitos: AAMMDD + punto de venta en 2 + numero en 6 (design D3). */
export function generarCae(fechaEmision: string, numero: number): string {
  const [anio = '', mes = '', dia = ''] = fechaEmision.split('-');
  const puntoDeVenta = PUNTO_DE_VENTA.slice(-2);
  const numero6 = String(numero).padStart(6, '0').slice(-6);
  return `${anio.slice(-2)}${mes}${dia}${puntoDeVenta}${numero6}`;
}

const OFFSET_MS = 3 * 60 * 60 * 1000; // America/Argentina/Buenos_Aires = UTC-03:00 fijo (design D4)
const DIA_MS = 24 * 60 * 60 * 1000;

function aTexto(utc: Date): string {
  const anio = String(utc.getUTCFullYear());
  const mes = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(utc.getUTCDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Fecha de calendario AAAA-MM-DD en Argentina para un instante. */
export function fechaArgentina(instante: Date): string {
  return aTexto(new Date(instante.getTime() - OFFSET_MS));
}

/** Suma dias corridos a una fecha AAAA-MM-DD. */
export function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const base = Date.UTC(anio ?? 0, (mes ?? 1) - 1, dia ?? 1);
  return aTexto(new Date(base + dias * DIA_MS));
}
