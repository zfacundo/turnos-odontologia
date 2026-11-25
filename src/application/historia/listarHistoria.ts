import type { EntradaHistoria } from '../../domain/historia/entrada';
import { fallo, ok, type Result } from '../../domain/shared/result';
import type { Usuario } from '../../domain/shared/rol';
import type { Auditoria } from '../ports/auditoria';
import type { Clock } from '../ports/clock';
import type { PacienteRepository } from '../ports/repositorios';
import type { ErrorHistoria } from './errores';
import type { HistoriaRepository } from './puertos';

export interface DepsListarHistoria {
  readonly pacientes: PacienteRepository;
  readonly historia: HistoriaRepository;
  readonly clock: Clock;
  readonly auditoria: Auditoria;
}

/** Lectura del historial (admin y odontólogo, D8). Audita solo las consultas exitosas. */
export function listarHistoria(
  deps: DepsListarHistoria,
  usuario: Usuario | undefined,
  pacienteId: string,
): Result<EntradaHistoria[], ErrorHistoria> {
  if (usuario === undefined || (usuario.rol !== 'admin' && usuario.rol !== 'odontologo')) {
    return fallo({ tipo: 'permiso', mensaje: 'Tu rol no puede consultar el historial clínico.' });
  }
  if (deps.pacientes.buscarPorId(pacienteId) === undefined) {
    return fallo({ tipo: 'no-encontrado', mensaje: 'paciente no encontrado' });
  }
  deps.auditoria.registrar({
    fecha: deps.clock.ahora(),
    usuarioId: usuario.id,
    rol: usuario.rol,
    accion: 'historia-consultar',
    entidad: 'paciente',
    entidadId: pacienteId,
  });
  return ok(deps.historia.listarPorPaciente(pacienteId));
}
