/** Misma union que EstadoTurnoRegistro del puerto; el dominio no importa de application (design D1). */
export type EstadoTurno = 'reservado' | 'confirmado' | 'cancelado' | 'atendido' | 'ausente';

export type OrigenTurno = 'recepcion' | 'whatsapp' | 'telefono';

export interface Turno {
  readonly id: string;
  readonly pacienteId: string;
  readonly prestacionId: string;
  readonly profesionalId: string;
  readonly sillonId: string;
  readonly inicio: Date;
  readonly fin: Date;
  readonly estado: EstadoTurno;
  readonly senado: boolean;
  readonly esSobreturno: boolean;
  readonly origen: OrigenTurno;
  readonly creadoPor: string;
  readonly creadoEn: Date;
  readonly actualizadoEn?: Date;
  readonly motivoCancelacion?: string;
  readonly canceladoPor?: string;
}

/** Lo minimo que la validacion de solapamiento necesita de un turno ya existente. */
export type TurnoExistente = Pick<
  Turno,
  'id' | 'profesionalId' | 'sillonId' | 'pacienteId' | 'inicio' | 'fin' | 'estado'
>;
