import type { Bloqueo } from '../configuracion/bloqueo';
import type { Prestacion } from '../configuracion/prestacion';
import type { Profesional } from '../configuracion/profesional';
import { BLOQUE_MIN } from '../shared/bloques';
import type { TurnoExistente } from './turno';
import { validarNuevoTurno } from './validarNuevoTurno';

export interface Hueco {
  readonly inicio: Date;
  readonly fin: Date;
  readonly sillonId: string;
}

export interface ContextoHuecos {
  /** Fecha local del consultorio, 'YYYY-MM-DD'. */
  readonly fecha: string;
  /** Limite inferior de inicio (la hora del Clock, inyectada: el dominio no lee el reloj). */
  readonly desde: Date;
  readonly prestacion: Prestacion;
  readonly profesional: Profesional;
  /** Sillones activos, en orden de preferencia. */
  readonly sillonIds: readonly string[];
  readonly bloqueos: readonly Bloqueo[];
  readonly turnos: readonly TurnoExistente[];
}

const PASO_MS = BLOQUE_MIN * 60 * 1000;

/**
 * Paciente centinela (design D4): el string vacio nunca es un pacienteId valido en el alta,
 * asi que no coincide con ningun turno y RN-AG-05 no se dispara al consultar.
 */
const PACIENTE_CONSULTA = '';

/** Dia ISO (1 = lunes) de una fecha 'YYYY-MM-DD', sin depender del TZ del proceso. */
function diaIso(fecha: string): number {
  const [a, m, d] = fecha.split('-').map(Number);
  const dia = new Date(Date.UTC(a ?? 0, (m ?? 1) - 1, d ?? 1)).getUTCDay();
  return dia === 0 ? 7 : dia;
}

/** Instante de 'HH:mm' en la fecha local del consultorio (UTC-03:00 fijo). */
function instante(fecha: string, hhmm: string): Date {
  return new Date(`${fecha}T${hhmm}:00-03:00`);
}

/**
 * Huecos libres de un dia (design D1/D3): genera los inicios alineados de cada franja y deja
 * solo los que validarNuevoTurno acepta en algun sillon; un hueco por inicio, primer sillon libre.
 */
export function calcularHuecos(ctx: ContextoHuecos): Hueco[] {
  const dia = diaIso(ctx.fecha);
  const franjas = ctx.profesional.disponibilidad
    .filter((f) => f.diaSemana === dia)
    .slice()
    .sort((a, b) => a.desde.localeCompare(b.desde));

  const huecos: Hueco[] = [];
  for (const franja of franjas) {
    const hasta = instante(ctx.fecha, franja.hasta).getTime();
    for (let t = instante(ctx.fecha, franja.desde).getTime(); t < hasta; t += PASO_MS) {
      if (t < ctx.desde.getTime()) continue;
      const hueco = primerSillonLibre(ctx, new Date(t));
      if (hueco !== undefined) huecos.push(hueco);
    }
  }
  return huecos;
}

function primerSillonLibre(ctx: ContextoHuecos, inicio: Date): Hueco | undefined {
  for (const sillonId of ctx.sillonIds) {
    const r = validarNuevoTurno(
      {
        pacienteId: PACIENTE_CONSULTA,
        prestacionId: ctx.prestacion.id,
        profesionalId: ctx.profesional.id,
        sillonId,
        inicio,
      },
      {
        prestacion: ctx.prestacion,
        profesional: ctx.profesional,
        bloqueos: ctx.bloqueos,
        turnos: ctx.turnos,
      },
    );
    if (r.ok) return { inicio: r.valor.inicio, fin: r.valor.fin, sillonId };
  }
  return undefined;
}
