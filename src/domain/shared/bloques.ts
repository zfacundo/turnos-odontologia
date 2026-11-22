/** Duracion minima de un bloque de agenda, en minutos. */
export const BLOQUE_MIN = 15;

/**
 * Un instante esta alineado si sus minutos son multiplo de BLOQUE_MIN y segundos/ms son 0.
 * Supuesto: el offset de America/Argentina/Buenos_Aires (-03:00, sin DST) es entero en horas,
 * por lo que los minutos UTC coinciden con los locales y no se depende del TZ del proceso.
 */
export function estaAlineadoA15(fecha: Date): boolean {
  return (
    fecha.getUTCMinutes() % BLOQUE_MIN === 0 &&
    fecha.getUTCSeconds() === 0 &&
    fecha.getUTCMilliseconds() === 0
  );
}
