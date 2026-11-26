/** Turno tal como lo devuelve GET /api/turnos (instantes en ISO UTC). */
export interface TurnoPanel {
  id: string;
  pacienteId: string;
  prestacionId: string;
  profesionalId: string;
  sillonId: string;
  inicio: string;
  fin: string;
  estado: 'reservado' | 'confirmado' | 'cancelado' | 'atendido' | 'ausente' | string;
  senado: boolean;
  /** Origen del turno (`whatsapp`, `recepcion`, `telefono`). */
  origen?: 'recepcion' | 'whatsapp' | 'telefono' | string;
}

export interface DiaDeSemana {
  nombre: string;
  /** 'YYYY-MM-DD' */
  fecha: string;
  /** 'dd/mm' */
  corta: string;
  indice: number;
}

export interface CeldaMiniCalendario {
  fecha: string;
  dia: number;
  fueraDeMes: boolean;
  esHoy: boolean;
  enSemana: boolean;
}

export interface FiltrosAgenda {
  profesionalId?: string | undefined;
  sillonId?: string | undefined;
  estado?: string | undefined;
}

export function sumarDias(fecha: string, n: number): string;
export function lunesDeLaSemana(fecha: string): string;
export function rangoDeSemana(lunes: string): { desde: string; hasta: string };
export function diasDeSemana(lunes: string): DiaDeSemana[];
export function etiquetaSemana(lunes: string): string;
export function aHoraLocal(iso: string): { fecha: string; minutos: number };
export function hhmm(minutos: number): string;
export function posicionBloque(
  turno: Pick<TurnoPanel, 'inicio' | 'fin'>,
  lunes: string,
  inicioGrillaMin: number,
): { columna: number; fila: number; filas: number } | undefined;
export function limitesGrilla(
  turnos: readonly Pick<TurnoPanel, 'inicio' | 'fin'>[],
  minimo?: number,
  maximo?: number,
): { inicioMin: number; finMin: number };
export function filtrarTurnos<T extends TurnoPanel>(turnos: readonly T[], filtros: FiltrosAgenda): T[];
export function etiquetaEstado(estado: string): string;
export function terminoAntesDe(turno: Pick<TurnoPanel, 'fin'>, ahoraMs: number): boolean;
export function nombreAccesible(
  turno: TurnoPanel,
  nombres: { paciente: string; prestacion: string },
  ahoraMs?: number,
): string;
export const HORAS_DE_TURNO: readonly string[];
export interface CamposNuevoTurno {
  pacienteId?: string;
  prestacionId?: string;
  profesionalId?: string;
  sillonId?: string;
  /** 'YYYY-MM-DD' */
  fecha?: string;
  /** 'HH:mm' */
  hora?: string;
}
export interface DatosNuevoTurno {
  pacienteId: string;
  prestacionId: string;
  profesionalId: string;
  sillonId: string;
  inicio: string;
}
export function validarNuevoTurno(campos: CamposNuevoTurno): {
  ok: boolean;
  errores: Partial<Record<keyof CamposNuevoTurno, string>>;
  datos?: DatosNuevoTurno;
};
export interface EventoRegistro {
  fecha: string;
  mensaje: string;
}
export function formatearRegistro(eventos: readonly EventoRegistro[]): {
  vacio: boolean;
  textoVacio: string;
  items: { fecha: string; mensaje: string }[];
};
export function miniCalendario(
  anio: number,
  mes: number,
  lunesSeleccionado: string,
  hoy: string,
): { titulo: string; semanas: CeldaMiniCalendario[][] };
export function fechaLocalDe(instante?: string): string;
export function asignarCarriles(
  turnos: readonly Pick<TurnoPanel, 'id' | 'inicio' | 'fin'>[],
): Map<string, { carril: number; carriles: number }>;
export interface AccionFactura {
  visible: boolean;
  habilitado: boolean;
  /** Destino de navegación; solo cuando está habilitada. */
  href: string | undefined;
}
export function accionFactura(rol: string | undefined, turno: Pick<TurnoPanel, 'id' | 'estado'>): AccionFactura;
