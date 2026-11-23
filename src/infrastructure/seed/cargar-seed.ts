import type { Clock } from '../../application/ports/clock';
import type { Deps } from '../../api/deps';
import type { Bloqueo } from '../../domain/configuracion/bloqueo';
import { validarPrestacion } from '../../domain/configuracion/prestacion';
import { crearIntervaloAlineado } from '../../domain/shared/intervalo';
import { AuditoriaEnMemoria } from '../memory/auditoria-en-memoria';
import { BloqueoRepositoryEnMemoria } from '../memory/bloqueo-repository';
import { PacienteRepositoryEnMemoria } from '../memory/paciente-repository';
import { PrestacionRepositoryEnMemoria } from '../memory/prestacion-repository';
import { ProfesionalRepositoryEnMemoria } from '../memory/profesional-repository';
import { SillonRepositoryEnMemoria } from '../memory/sillon-repository';
import { TurnoRepositoryEnMemoria } from '../memory/turno-repository';
import {
  MOTIVO_URGENCIAS,
  PACIENTES,
  PRESTACIONES,
  PROFESIONALES,
  SEMANAS_DE_BLOQUEOS,
  SILLONES,
  USUARIOS,
} from './datos-seed';

const OFFSET_MS = 3 * 60 * 60 * 1000; // America/Argentina/Buenos_Aires = UTC-03:00 fijo
const DIA_MS = 24 * 60 * 60 * 1000;

const dosDigitos = (n: number): string => String(n).padStart(2, '0');

/** Fecha 'YYYY-MM-DD' (hora del consultorio) del lunes de la semana de `ahora`. */
function lunesDeLaSemana(ahora: Date): number {
  const local = new Date(ahora.getTime() - OFFSET_MS); // sus campos UTC son la hora local
  const diaIso = local.getUTCDay() === 0 ? 7 : local.getUTCDay();
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - (diaIso - 1) * DIA_MS;
}

function bloqueosDeUrgencias(clock: Clock): Bloqueo[] {
  const lunes = lunesDeLaSemana(clock.ahora());
  const bloqueos: Bloqueo[] = [];
  for (let semana = 0; semana < SEMANAS_DE_BLOQUEOS; semana++) {
    for (let dia = 0; dia < 5; dia++) {
      const f = new Date(lunes + (semana * 7 + dia) * DIA_MS);
      const fecha = `${f.getUTCFullYear()}-${dosDigitos(f.getUTCMonth() + 1)}-${dosDigitos(f.getUTCDate())}`;
      const intervalo = crearIntervaloAlineado(
        new Date(`${fecha}T18:30:00-03:00`),
        new Date(`${fecha}T19:00:00-03:00`),
      );
      if (!intervalo.ok) throw new Error(`Seed invalido: ${intervalo.error.mensaje}`);
      bloqueos.push({ id: `bloq-urg-${fecha}`, intervalo: intervalo.valor, motivo: MOTIVO_URGENCIAS });
    }
  }
  return bloqueos;
}

/** Arma las dependencias con los datos ficticios del seed (design D7). */
export function cargarSeed(clock: Clock): Deps {
  for (const p of PRESTACIONES) {
    const r = validarPrestacion(p);
    if (!r.ok) throw new Error(`Seed invalido: ${r.error.mensaje}`);
  }
  return {
    sillones: new SillonRepositoryEnMemoria(SILLONES),
    prestaciones: new PrestacionRepositoryEnMemoria(PRESTACIONES),
    profesionales: new ProfesionalRepositoryEnMemoria(PROFESIONALES),
    bloqueos: new BloqueoRepositoryEnMemoria(bloqueosDeUrgencias(clock)),
    pacientes: new PacienteRepositoryEnMemoria(PACIENTES),
    turnos: new TurnoRepositoryEnMemoria(),
    clock,
    auditoria: new AuditoriaEnMemoria(),
    usuarios: USUARIOS,
  };
}
