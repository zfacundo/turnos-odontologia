import type { Sesion } from '../../domain/auth/sesion';

/** Sesiones en memoria, indexadas por token opaco. */
export interface SesionRepository {
  guardar(sesion: Sesion): void;
  buscar(token: string): Sesion | undefined;
  eliminar(token: string): void;
}

export interface GeneradorToken {
  generar(): string;
}
