export interface CuadranteFdi {
  numero: 1 | 2 | 3 | 4;
  nombre: string;
  piezas: number[];
}
export const CARAS_UI: readonly { valor: 'V' | 'M' | 'O' | 'D' | 'L'; nombre: string }[];
export const SINTOMAS_UI: readonly { valor: string; texto: string }[];
export function cuadrantes(): CuadranteFdi[];
export function nombrePieza(pieza: number): string;
export function etiquetaEstadoPieza(estado: string | undefined): string;
export function validarSeleccion(
  pieza: number | undefined,
  sintomas: readonly string[],
): { ok: boolean; mensaje: string };
