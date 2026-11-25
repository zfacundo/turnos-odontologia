export const AVISO_SIMULACION = 'SIMULACIÓN — consulta de cobertura simulada, sin padrón real';

export type EstadoAfiliado = 'activo' | 'con_copago' | 'sin_cobertura' | 'error_simulado';

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
