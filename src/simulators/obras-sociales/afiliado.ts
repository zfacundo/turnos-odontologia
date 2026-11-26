export const AVISO_SIMULACION = 'SIMULACIÓN — consulta de cobertura simulada, sin padrón real';

export type EstadoAfiliado = 'activo' | 'con_copago' | 'sin_cobertura' | 'error_simulado';

export interface ObraSocialSimulada {
  readonly codigo: string;
  readonly nombre: string;
  readonly planes: readonly string[];
  readonly simulado: true;
}

export interface AfiliadoSimulado {
  readonly nroAfiliado: string;
  readonly obraSocial: string;
  readonly plan: string;
  readonly cobertura: number;
  readonly copagoPct: number;
  readonly planes: readonly string[];
  readonly estado: EstadoAfiliado;
  readonly simulado: true;
}

export interface RegistroAfiliado extends AfiliadoSimulado {
  readonly nombrePacienteFicticio: string;
}

export type ErrorRegistroPadron =
  | { readonly tipo: 'entrada'; readonly mensaje: string }
  | { readonly tipo: 'duplicado'; readonly mensaje: string };

export type ResultadoRegistroPadron<T> = { ok: true; valor: T } | { ok: false; error: ErrorRegistroPadron };
