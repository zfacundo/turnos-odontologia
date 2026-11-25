export interface CamposEntradaForm {
  fecha: string;
  procedimiento: string;
  notas: string;
}

export interface ResultadoValidacion {
  valido: boolean;
  errores: { fecha?: string; procedimiento?: string; notas?: string };
}

export function aFechaIso(valorLocal: string): string;
export function validarEntradaForm(campos: CamposEntradaForm, ahoraIso: string): ResultadoValidacion;
export function contadorNotas(cantidad: number): string;
