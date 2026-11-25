import type { Turno } from '../../domain/agenda/turno';
import { validarEntrada, type EntradaHistoria } from '../../domain/historia/entrada';
import { fallo, ok, type Result } from '../../domain/shared/result';
import type { Usuario } from '../../domain/shared/rol';
import type { Auditoria } from '../ports/auditoria';
import type { Clock } from '../ports/clock';
import type {
  PacienteRepository,
  ProfesionalRepository,
  TurnoRepository,
} from '../ports/repositorios';
import type { ErrorHistoria } from './errores';
import type { HistoriaRepository } from './puertos';

export interface DepsRegistrarEntrada {
  readonly pacientes: PacienteRepository;
  readonly profesionales: ProfesionalRepository;
  readonly turnos: TurnoRepository<Turno>;
  readonly historia: HistoriaRepository;
  readonly clock: Clock;
  readonly auditoria: Auditoria;
}

/**
 * Alta de una entrada (solo odontólogo, D8). El `profesionalId` sale del usuario, nunca del cuerpo.
 * Orden: permiso → paciente (404) → validación (400 / RN-HC-02) → turno vinculado (RN-HC-01).
 */
export function registrarEntrada(
  deps: DepsRegistrarEntrada,
  usuario: Usuario | undefined,
  pacienteId: string,
  cuerpo: unknown,
): Result<EntradaHistoria, ErrorHistoria> {
  if (usuario === undefined || usuario.rol !== 'odontologo') {
    return fallo({ tipo: 'permiso', mensaje: 'Tu rol no puede registrar entradas de historial clínico.' });
  }
  if (usuario.profesionalId === undefined) {
    return fallo({ tipo: 'permiso', mensaje: 'Tu usuario no tiene un profesional asociado.' });
  }
  if (deps.pacientes.buscarPorId(pacienteId) === undefined) {
    return fallo({ tipo: 'no-encontrado', mensaje: 'paciente no encontrado' });
  }
  const ahora = deps.clock.ahora();
  const datos = validarEntrada(cuerpo, ahora);
  if (!datos.ok) return fallo(datos.error);

  if (datos.valor.turnoId !== undefined) {
    const turno = deps.turnos.buscarPorId(datos.valor.turnoId);
    if (turno === undefined || turno.pacienteId !== pacienteId) {
      return fallo({
        tipo: 'regla',
        error: {
          regla: 'RN-HC-01',
          mensaje: 'El turno vinculado no existe o no pertenece al paciente.',
        },
      });
    }
  }

  const profesional = deps.profesionales.buscarPorId(usuario.profesionalId);
  const entrada: EntradaHistoria = {
    id: deps.historia.siguienteId(),
    pacienteId,
    fecha: datos.valor.fecha,
    profesionalId: usuario.profesionalId,
    profesionalNombre: profesional?.nombre ?? usuario.nombre,
    procedimiento: datos.valor.procedimiento,
    notas: datos.valor.notas,
    ...(datos.valor.turnoId !== undefined && { turnoId: datos.valor.turnoId }),
    creadoPor: usuario.id,
    creadoEn: ahora,
    simulado: true,
  };
  deps.historia.agregar(entrada);
  // S-5: la auditoría nunca guarda procedimiento ni notas.
  deps.auditoria.registrar({
    fecha: ahora,
    usuarioId: usuario.id,
    rol: usuario.rol,
    accion: 'historia-crear',
    entidad: 'paciente',
    entidadId: pacienteId,
  });
  return ok(entrada);
}
