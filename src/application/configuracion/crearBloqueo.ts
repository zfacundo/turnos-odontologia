import { randomUUID } from 'node:crypto';
import { validarBloqueo, type Bloqueo } from '../../domain/configuracion/bloqueo';
import { fallo, ok } from '../../domain/shared/result';
import type { Usuario } from '../../domain/shared/rol';
import type { DepsConfiguracion } from './deps';
import { entrada, permiso, textoValido, tieneRol, type ResultadoConfiguracion } from './errores';

export interface DatosBloqueo {
  readonly motivo: unknown;
  readonly desde: unknown;
  readonly hasta: unknown;
  readonly profesionalId?: unknown;
  readonly sillonId?: unknown;
}

function esFecha(valor: unknown): valor is Date {
  return valor instanceof Date && !Number.isNaN(valor.getTime());
}

/** Alta de bloqueo con RBAC por profesional (design D5). */
export function crearBloqueo(
  deps: DepsConfiguracion,
  usuario: Usuario | undefined,
  datos: DatosBloqueo,
): ResultadoConfiguracion<Bloqueo> {
  const esAdminORepcion = tieneRol(usuario, ['admin', 'recepcion']);
  const profesionalId = datos.profesionalId;
  const profesionalIdValido = profesionalId === undefined || typeof profesionalId === 'string';
  const sillonIdValido = datos.sillonId === undefined || typeof datos.sillonId === 'string';
  const propio = usuario?.rol === 'odontologo' && profesionalId === usuario.profesionalId;

  if (!esAdminORepcion && !propio) {
    return fallo(permiso('Tu rol no puede crear este bloqueo.'));
  }
  if (!textoValido(datos.motivo, 'motivo') || !esFecha(datos.desde) || !esFecha(datos.hasta)) {
    return fallo(entrada('motivo, desde y hasta son obligatorios y validos.'));
  }
  if (!profesionalIdValido || !sillonIdValido) {
    return fallo(entrada('profesionalId y sillonId deben ser textos.'));
  }
  if (typeof profesionalId === 'string' && deps.profesionales.buscarPorId(profesionalId) === undefined) {
    return fallo(entrada(`No existe el profesional ${profesionalId}.`));
  }
  if (typeof datos.sillonId === 'string' && deps.sillones.buscarPorId(datos.sillonId) === undefined) {
    return fallo(entrada(`No existe el sillón ${datos.sillonId}.`));
  }
  const candidato: Bloqueo = {
    id: randomUUID(),
    motivo: datos.motivo,
    intervalo: { inicio: datos.desde, fin: datos.hasta },
    ...(typeof profesionalId === 'string' ? { profesionalId } : {}),
    ...(typeof datos.sillonId === 'string' ? { sillonId: datos.sillonId } : {}),
  };
  const validado = validarBloqueo(candidato);
  if (!validado.ok) return fallo({ tipo: 'regla', error: validado.error });
  deps.bloqueos.guardar(validado.valor);
  return ok(validado.valor);
}
