import { consultarHuecos } from '../agenda/consultarHuecos';
import type { Turno } from '../../domain/agenda/turno';
import { fallo, ok, type Result } from '../../domain/shared/result';
import type { Usuario } from '../../domain/shared/rol';
import { pacientePublico } from '../pacientes/pacientePublico';
import type { Clock } from '../ports/clock';
import type {
  BloqueoRepository,
  PacienteRepository,
  PrestacionRepository,
  ProfesionalRepository,
  SillonRepository,
  TurnoRepository,
} from '../ports/repositorios';

export interface DepsResumenDelDia {
  readonly sillones: SillonRepository;
  readonly prestaciones: PrestacionRepository;
  readonly profesionales: ProfesionalRepository;
  readonly bloqueos: BloqueoRepository;
  readonly pacientes: PacienteRepository;
  readonly turnos: TurnoRepository<Turno>;
  readonly clock: Clock;
}

export type EstadoActivo = 'reservado' | 'confirmado' | 'atendido' | 'ausente';

export interface TurnoProximo {
  readonly id: string;
  readonly inicio: Date;
  readonly fin: Date;
  readonly estado: Turno['estado'];
  readonly pacienteNombre: string;
  readonly profesionalNombre: string;
  readonly sillonNombre: string;
  readonly prestacionNombre: string;
}

export interface ResumenDelDia {
  readonly fecha: string;
  readonly turnosDelDia: number;
  readonly porEstado: Record<EstadoActivo, number>;
  readonly senados: number;
  readonly huecosLibres: number;
  readonly proximos: readonly TurnoProximo[];
}

export type ErrorResumen =
  | { readonly tipo: 'permiso'; readonly mensaje: string }
  | { readonly tipo: 'entrada'; readonly mensaje: string };

const OFFSET_MS = 3 * 60 * 60 * 1000; // America/Argentina/Buenos_Aires = UTC-03:00 fijo
const DIA_MS = 24 * 60 * 60 * 1000;
const MAX_PROXIMOS = 5;
const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

function fechaLocal(instante: Date): string {
  return new Date(instante.getTime() - OFFSET_MS).toISOString().slice(0, 10);
}

function esFechaReal(fecha: string): boolean {
  const m = FECHA.exec(fecha);
  if (m === null) return false;
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = new Date(Date.UTC(a, mes - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === mes - 1 && f.getUTCDate() === d;
}

/**
 * Resumen de solo lectura del día (D7). Sin escrituras ni auditoría.
 * `fecha` 'YYYY-MM-DD' en hora del consultorio; si se omite, la del reloj inyectado.
 */
export function resumenDelDia(
  deps: DepsResumenDelDia,
  usuario: Usuario | undefined,
  fecha: string | undefined,
): Result<ResumenDelDia, ErrorResumen> {
  if (usuario === undefined || usuario.rol === 'paciente') {
    return fallo({ tipo: 'permiso', mensaje: 'Tu rol no puede consultar el resumen del panel.' });
  }
  if (usuario.rol === 'odontologo' && usuario.profesionalId === undefined) {
    return fallo({ tipo: 'permiso', mensaje: 'Tu usuario no tiene un profesional asociado.' });
  }
  const ahora = deps.clock.ahora();
  const dia = fecha ?? fechaLocal(ahora);
  if (!esFechaReal(dia)) {
    return fallo({ tipo: 'entrada', mensaje: 'fecha debe tener el formato YYYY-MM-DD y ser una fecha válida.' });
  }

  const propio = usuario.rol === 'odontologo' ? usuario.profesionalId : undefined;
  const inicioDia = new Date(`${dia}T00:00:00-03:00`);
  const rango = { inicio: inicioDia, fin: new Date(inicioDia.getTime() + DIA_MS) };

  // Solo los turnos que EMPIEZAN el día: uno que cruza la medianoche no se cuenta dos veces.
  const turnos = deps.turnos
    .listarActivos({ rango, ...(propio !== undefined && { profesionalId: propio }) })
    .filter((t) => t.inicio.getTime() >= rango.inicio.getTime() && t.inicio.getTime() < rango.fin.getTime())
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

  const porEstado: Record<EstadoActivo, number> = { reservado: 0, confirmado: 0, atendido: 0, ausente: 0 };
  for (const t of turnos) {
    if (t.estado !== 'cancelado') porEstado[t.estado] += 1;
  }

  const proximos = turnos
    .filter((t) => t.inicio.getTime() >= ahora.getTime())
    .slice(0, MAX_PROXIMOS)
    .map((t): TurnoProximo => ({
      id: t.id,
      inicio: t.inicio,
      fin: t.fin,
      estado: t.estado,
      pacienteNombre: nombreDePaciente(deps, t.pacienteId),
      profesionalNombre: deps.profesionales.buscarPorId(t.profesionalId)?.nombre ?? t.profesionalId,
      sillonNombre: deps.sillones.buscarPorId(t.sillonId)?.nombre ?? t.sillonId,
      prestacionNombre: deps.prestaciones.buscarPorId(t.prestacionId)?.nombre ?? t.prestacionId,
    }));

  return ok({
    fecha: dia,
    turnosDelDia: turnos.length,
    porEstado,
    senados: turnos.filter((t) => t.senado).length,
    huecosLibres: contarHuecos(deps, usuario, dia, propio),
    proximos,
  });
}

function nombreDePaciente(deps: DepsResumenDelDia, pacienteId: string): string {
  const paciente = deps.pacientes.buscarPorId(pacienteId);
  return paciente === undefined ? pacienteId : pacientePublico(paciente).nombre;
}

/** Huecos del día para la prestación de menor duración, sumando profesionales activos visibles. */
function contarHuecos(
  deps: DepsResumenDelDia,
  usuario: Usuario,
  fecha: string,
  propio: string | undefined,
): number {
  const corta = [...deps.prestaciones.listar()].sort((a, b) => a.duracionMin - b.duracionMin)[0];
  if (corta === undefined) return 0;
  let total = 0;
  for (const p of deps.profesionales.listar()) {
    if (!p.activo || (propio !== undefined && p.id !== propio)) continue;
    const r = consultarHuecos(deps, usuario, { prestacionId: corta.id, profesionalId: p.id, fecha });
    if (r.ok) total += r.valor.length;
  }
  return total;
}
