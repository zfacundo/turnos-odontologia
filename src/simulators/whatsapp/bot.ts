import type { Deps } from '../../api/deps';
import { cambiarEstadoTurno } from '../../application/agenda/cambiarEstadoTurno';
import { cancelarTurno } from '../../application/agenda/cancelarTurno';
import { consultarHuecos } from '../../application/agenda/consultarHuecos';
import { crearTurno } from '../../application/agenda/crearTurno';
import { registrarPaciente } from '../../application/pacientes/registrarPaciente';
import type { Turno } from '../../domain/agenda/turno';
import type { Usuario } from '../../domain/shared/rol';
import {
  avanzar,
  diaSiguiente,
  MAX_HORARIOS,
  resolver,
  type Catalogo,
  type Efecto,
  type Entrada,
  type ResultadoEfecto,
  type Respuesta,
  type Salida,
  type Sesion,
  type TurnoResumen,
} from './conversacion';

/** Lo que el bot necesita de la aplicacion: los mismos repositorios y casos de uso que recepcion. */
export type DepsBot = Pick<
  Deps,
  'sillones' | 'prestaciones' | 'profesionales' | 'bloqueos' | 'pacientes' | 'turnos' | 'clock' | 'auditoria'
>;

/** Busqueda de huecos hacia adelante (design D3). */
export const DIAS_DE_BUSQUEDA = 14;
export const MOTIVO_CANCELACION = 'Cancelado por el paciente por WhatsApp (simulación)';
const OFFSET_MS = 3 * 60 * 60 * 1000;
const MAX_PASOS = 10;

/** Usuario simulado del canal (design D5): rol paciente, asi aplica la ventana de 24 h. */
function usuarioBot(telefono: string): Usuario {
  return { id: `whatsapp:${telefono}`, nombre: 'Bot WhatsApp (simulación)', rol: 'paciente' };
}

function fechaLocal(instante: Date): string {
  return new Date(instante.getTime() - OFFSET_MS).toISOString().slice(0, 10);
}

export function catalogoDe(deps: DepsBot): Catalogo {
  return {
    prestaciones: deps.prestaciones.listar().map((p) => ({ id: p.id, codigo: p.codigo, nombre: p.nombre })),
    profesionales: deps.profesionales
      .listar()
      .filter((p) => p.activo)
      .map((p) => ({ id: p.id, nombre: p.nombre })),
  };
}

function resumen(deps: DepsBot, t: Turno): TurnoResumen {
  return {
    id: t.id,
    inicio: t.inicio,
    prestacion: deps.prestaciones.buscarPorId(t.prestacionId)?.nombre ?? t.prestacionId,
    profesional: deps.profesionales.buscarPorId(t.profesionalId)?.nombre ?? t.profesionalId,
    estado: t.estado,
  };
}

function pacientePorTelefono(deps: DepsBot, telefono: string) {
  return deps.pacientes.listar().find((p) => p.telefono === telefono);
}

/** Ejecuta un efecto con los casos de uso reales (RN-WA-02). */
function ejecutar(deps: DepsBot, telefono: string, efecto: Efecto): ResultadoEfecto {
  const usuario = usuarioBot(telefono);
  switch (efecto.tipo) {
    case 'buscarHuecos': {
      let fecha = efecto.desdeFecha ?? fechaLocal(deps.clock.ahora());
      for (let i = 0; i < DIAS_DE_BUSQUEDA; i++, fecha = diaSiguiente(fecha)) {
        const r = consultarHuecos(deps, usuario, {
          prestacionId: efecto.prestacionId,
          profesionalId: efecto.profesionalId,
          fecha,
        });
        if (r.ok && r.valor.length > 0) {
          return {
            tipo: 'buscarHuecos',
            fecha,
            huecos: r.valor.slice(0, MAX_HORARIOS).map((h) => ({ inicio: h.inicio, sillonId: h.sillonId })),
          };
        }
      }
      return { tipo: 'buscarHuecos', huecos: [] };
    }
    case 'identificarPorTelefono':
      return { tipo: 'identificarPorTelefono', pacienteId: pacientePorTelefono(deps, telefono)?.id };
    case 'identificarPorDatos': {
      const existente = deps.pacientes.buscarPorDni(efecto.dni);
      if (existente !== undefined) return { tipo: 'identificarPorDatos', pacienteId: existente.id };
      const r = registrarPaciente(deps.pacientes, { nombre: efecto.nombre, dni: efecto.dni, telefono });
      if (r.ok) return { tipo: 'identificarPorDatos', pacienteId: r.valor.id };
      const error = r.error.tipo === 'regla' ? r.error.error.mensaje : r.error.mensaje;
      return { tipo: 'identificarPorDatos', error };
    }
    case 'reservar': {
      const r = crearTurno(deps, usuario, {
        pacienteId: efecto.pacienteId,
        prestacionId: efecto.prestacionId,
        profesionalId: efecto.profesionalId,
        sillonId: efecto.sillonId,
        inicio: efecto.inicio,
        origen: 'whatsapp',
      });
      if (r.ok) return { tipo: 'reservar', turno: resumen(deps, r.valor) };
      return { tipo: 'reservar', regla: r.error.tipo === 'regla' ? r.error.error.regla : r.error.tipo };
    }
    case 'buscarProximoTurno': {
      const paciente = pacientePorTelefono(deps, telefono);
      if (paciente === undefined) return { tipo: 'buscarProximoTurno' };
      const ahora = deps.clock.ahora().getTime();
      const proximo = deps.turnos
        .listarActivos({ pacienteId: paciente.id })
        .filter((t) => (t.estado === 'reservado' || t.estado === 'confirmado') && t.inicio.getTime() >= ahora)
        .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())[0];
      if (proximo === undefined) return { tipo: 'buscarProximoTurno' };
      return { tipo: 'buscarProximoTurno', turno: resumen(deps, proximo), nombrePaciente: paciente.nombre };
    }
    case 'confirmar': {
      const r = cambiarEstadoTurno(deps, usuario, { turnoId: efecto.turnoId, accion: 'confirmar' });
      return r.ok ? { tipo: 'confirmar' } : { tipo: 'confirmar', regla: r.error.tipo === 'regla' ? r.error.error.regla : r.error.tipo };
    }
    case 'cancelar': {
      const r = cancelarTurno(deps, usuario, { turnoId: efecto.turnoId, motivo: MOTIVO_CANCELACION });
      return r.ok ? { tipo: 'cancelar' } : { tipo: 'cancelar', regla: r.error.tipo === 'regla' ? r.error.error.regla : r.error.tipo };
    }
  }
}

/** Avanza la conversacion y ejecuta los efectos hasta tener una respuesta para el paciente. */
export function procesar(
  deps: DepsBot,
  telefono: string,
  sesion: Sesion,
  entrada: Entrada,
): { sesion: Sesion; respuesta: Respuesta } {
  const catalogo = catalogoDe(deps);
  let salida: Salida = avanzar(sesion, entrada, catalogo);
  for (let i = 0; i < MAX_PASOS && 'efecto' in salida; i++) {
    salida = resolver(salida.sesion, ejecutar(deps, telefono, salida.efecto), catalogo);
  }
  if ('efecto' in salida) throw new Error(`La conversación no llegó a una respuesta (efecto ${salida.efecto.tipo}).`);
  return salida;
}
