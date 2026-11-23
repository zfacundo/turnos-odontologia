import type { Bloqueo } from '../configuracion/bloqueo';
import type { Prestacion } from '../configuracion/prestacion';
import type { Profesional } from '../configuracion/profesional';
import { crearIntervaloAlineado, seSolapan, type Intervalo } from '../shared/intervalo';
import { fallo, ok, type ErrorDeRegla, type Result } from '../shared/result';
import type { TurnoExistente } from './turno';

export interface CandidatoTurno {
  readonly pacienteId: string;
  readonly prestacionId: string;
  readonly profesionalId: string;
  readonly sillonId: string;
  readonly inicio: Date;
}

export interface ContextoValidacion {
  readonly prestacion: Prestacion;
  readonly profesional: Profesional;
  readonly bloqueos: readonly Bloqueo[];
  readonly turnos: readonly TurnoExistente[];
}

const MIN_MS = 60 * 1000;

/** Primer turno activo (RN-AG-10: ignora cancelados), de inicio mas temprano, que cumple el predicado y se solapa con el intervalo. */
function primerConflicto(
  turnos: readonly TurnoExistente[],
  intervalo: Intervalo,
  mismaDimension: (t: TurnoExistente) => boolean,
): TurnoExistente | undefined {
  return turnos
    .filter((t) => t.estado !== 'cancelado' && mismaDimension(t) && seSolapan({ inicio: t.inicio, fin: t.fin }, intervalo))
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())[0];
}

function conflictoDeAgenda(
  dimension: 'profesional' | 'sillon' | 'paciente',
  conflicto: TurnoExistente,
): ErrorDeRegla {
  return {
    regla: dimension === 'paciente' ? 'RN-AG-05' : 'RN-AG-02',
    mensaje: `Se solapa con otro turno del mismo ${dimension} (${conflicto.inicio.toISOString()} a ${conflicto.fin.toISOString()}).`,
    dimension,
    conflicto: { turnoId: conflicto.id },
  };
}

const OFFSET_MS = 3 * 60 * 60 * 1000; // America/Argentina/Buenos_Aires = UTC-03:00 fijo (design D4)

/** Dia ISO (1 = lunes) y minutos desde 00:00 en hora del consultorio. */
function horaLocal(fecha: Date): { dia: number; minutos: number } {
  const local = new Date(fecha.getTime() - OFFSET_MS); // sus campos UTC son la hora local
  const dia = local.getUTCDay() === 0 ? 7 : local.getUTCDay();
  return { dia, minutos: local.getUTCHours() * 60 + local.getUTCMinutes() };
}

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** RN-AG-01: [inicio, fin) contenido en una franja del mismo dia; fin igual al cierre es valido. */
function estaEnFranja(profesional: Profesional, intervalo: Intervalo): boolean {
  const i = horaLocal(intervalo.inicio);
  const f = horaLocal(intervalo.fin);
  if (i.dia !== f.dia) return false;
  return profesional.disponibilidad.some(
    (fr) => fr.diaSemana === i.dia && aMinutos(fr.desde) <= i.minutos && f.minutos <= aMinutos(fr.hasta),
  );
}

/**
 * Validacion pura del alta de un turno (RN-AG-02..05, RN-AG-10, RN-AG-12).
 * Orden, primer fallo gana: alineacion, franja, bloqueo, profesional, sillon, paciente.
 */
export function validarNuevoTurno(
  candidato: CandidatoTurno,
  contexto: ContextoValidacion,
): Result<Intervalo, ErrorDeRegla> {
  const fin = new Date(candidato.inicio.getTime() + contexto.prestacion.duracionMin * MIN_MS);
  const alineado = crearIntervaloAlineado(candidato.inicio, fin);
  if (!alineado.ok) return alineado;
  const intervalo = alineado.valor;

  if (!estaEnFranja(contexto.profesional, intervalo)) {
    return fallo({
      regla: 'RN-AG-04',
      mensaje: 'El turno queda fuera del horario de atencion del profesional.',
    });
  }

  const bloqueo = contexto.bloqueos.find(
    (b) =>
      (b.profesionalId === undefined || b.profesionalId === candidato.profesionalId) &&
      (b.sillonId === undefined || b.sillonId === candidato.sillonId) &&
      seSolapan(b.intervalo, intervalo),
  );
  if (bloqueo !== undefined) {
    return fallo({
      regla: 'RN-AG-04',
      mensaje: `El horario esta bloqueado: ${bloqueo.motivo}.`,
    });
  }

  const conProfesional = primerConflicto(
    contexto.turnos,
    intervalo,
    (t) => t.profesionalId === candidato.profesionalId,
  );
  if (conProfesional !== undefined) return fallo(conflictoDeAgenda('profesional', conProfesional));

  const conSillon = primerConflicto(
    contexto.turnos,
    intervalo,
    (t) => t.sillonId === candidato.sillonId,
  );
  if (conSillon !== undefined) return fallo(conflictoDeAgenda('sillon', conSillon));

  const conPaciente = primerConflicto(
    contexto.turnos,
    intervalo,
    (t) => t.pacienteId === candidato.pacienteId,
  );
  if (conPaciente !== undefined) return fallo(conflictoDeAgenda('paciente', conPaciente));

  return ok(intervalo);
}
