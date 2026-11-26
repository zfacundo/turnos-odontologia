export type Tema = 'claro' | 'oscuro';
export const CLAVE_TEMA: 'adm.tema';
/** Solo 'claro' | 'oscuro' exactos; cualquier otro valor da null. */
export function normalizarTema(valor: unknown): Tema | null;
/** Una elección guardada válida gana; si no, se sigue al sistema. */
export function resolverTema(guardado: unknown, prefiereOscuro: boolean): Tema;
export function alternarTema(actual: Tema): Tema;
export function esquemaDeColor(tema: Tema): 'light' | 'dark';
