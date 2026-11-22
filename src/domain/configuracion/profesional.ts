/** Dia de la semana ISO: 1 = lunes ... 7 = domingo. */
export type DiaSemana = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Franja semanal en hora del consultorio, formato 'HH:mm'. */
export interface Franja {
  readonly diaSemana: DiaSemana;
  readonly desde: string;
  readonly hasta: string;
}

export interface Profesional {
  readonly id: string;
  readonly nombre: string;
  readonly matricula: string;
  readonly activo: boolean;
  readonly disponibilidad: readonly Franja[];
}
