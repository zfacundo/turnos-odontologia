export const ROLES = ['admin', 'recepcion', 'odontologo', 'paciente'] as const;

export type Rol = (typeof ROLES)[number];

export interface Usuario {
  readonly id: string;
  readonly nombre: string;
  readonly rol: Rol;
  /** Solo para rol 'odontologo'. */
  readonly profesionalId?: string;
}

export function esRol(valor: unknown): valor is Rol {
  return typeof valor === 'string' && (ROLES as readonly string[]).includes(valor);
}
