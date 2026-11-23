import type { Turno } from '../../domain/agenda/turno';
import { calcularHuecos, type Hueco } from '../../domain/agenda/huecos';
import { fallo, ok, type Result } from '../../domain/shared/result';
import type { Usuario } from '../../domain/shared/rol';
import type { Clock } from '../ports/clock';
import type {
  BloqueoRepository,
  PrestacionRepository,
  ProfesionalRepository,
  SillonRepository,
  TurnoRepository,
} from '../ports/repositorios';

export interface DepsConsultarHuecos {
  readonly sillones: SillonRepository;
  readonly prestaciones: PrestacionRepository;
  readonly profesionales: ProfesionalRepository;
  readonly bloqueos: BloqueoRepository;
  readonly turnos: TurnoRepository<Turno>;
  readonly clock: Clock;
}

export interface EntradaConsultarHuecos {
  readonly prestacionId: string;
  readonly profesionalId: string;
  /** Fecha local del consultorio 'YYYY-MM-DD', ya validada por la ruta. */
  readonly fecha: string;
}

export type ErrorConsultarHuecos =
  | { readonly tipo: 'permiso'; readonly mensaje: string }
  | { readonly tipo: 'entrada'; readonly mensaje: string };

const DIA_MS = 24 * 60 * 60 * 1000;

/** Consulta de huecos libres (design D6): solo lectura, sin guardar ni auditar. */
export function consultarHuecos(
  deps: DepsConsultarHuecos,
  usuario: Usuario | undefined,
  entrada: EntradaConsultarHuecos,
): Result<Hueco[], ErrorConsultarHuecos> {
  if (usuario === undefined) {
    return fallo({ tipo: 'permiso', mensaje: 'Indica un rol para consultar la disponibilidad.' });
  }
  const prestacion = deps.prestaciones.buscarPorId(entrada.prestacionId);
  if (prestacion === undefined) {
    return fallo({ tipo: 'entrada', mensaje: `No existe la prestación ${entrada.prestacionId}.` });
  }
  const profesional = deps.profesionales.buscarPorId(entrada.profesionalId);
  if (profesional === undefined) {
    return fallo({ tipo: 'entrada', mensaje: `No existe el profesional ${entrada.profesionalId}.` });
  }
  const inicioDia = new Date(`${entrada.fecha}T00:00:00-03:00`);
  const rango = { inicio: inicioDia, fin: new Date(inicioDia.getTime() + DIA_MS) };
  const sillonIds = deps.sillones
    .listar()
    .filter((s) => s.activo)
    .map((s) => s.id)
    .sort();

  return ok(
    calcularHuecos({
      fecha: entrada.fecha,
      desde: deps.clock.ahora(),
      prestacion,
      profesional,
      sillonIds,
      bloqueos: deps.bloqueos.listarEn(rango),
      turnos: deps.turnos.listarActivos({ rango }),
    }),
  );
}
