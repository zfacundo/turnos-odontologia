import type { SesionRepository } from '../../application/auth/puertos';
import type { Sesion } from '../../domain/auth/sesion';

export class SesionRepositoryEnMemoria implements SesionRepository {
  private readonly sesiones = new Map<string, Sesion>();

  guardar(sesion: Sesion): void {
    this.sesiones.set(sesion.token, structuredClone(sesion));
  }

  buscar(token: string): Sesion | undefined {
    const sesion = this.sesiones.get(token);
    return sesion === undefined ? undefined : structuredClone(sesion);
  }

  eliminar(token: string): void {
    this.sesiones.delete(token);
  }
}
