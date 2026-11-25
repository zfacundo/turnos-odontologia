/** Duración fija de una sesión simulada: 8 horas, sin renovación deslizante (S-2). */
export const DURACION_SESION_MS = 8 * 60 * 60 * 1000;

export interface Sesion {
  readonly token: string;
  readonly usuarioId: string;
  readonly creadaEn: Date;
  readonly expiraEn: Date;
}

export function crearSesion(token: string, usuarioId: string, creadaEn: Date): Sesion {
  return {
    token,
    usuarioId,
    creadaEn,
    expiraEn: new Date(creadaEn.getTime() + DURACION_SESION_MS),
  };
}

/** Intervalo [creadaEn, expiraEn): a las 8 h exactas la sesión ya venció. */
export function estaVigente(sesion: Sesion, ahora: Date): boolean {
  return ahora.getTime() >= sesion.creadaEn.getTime() && ahora.getTime() < sesion.expiraEn.getTime();
}
