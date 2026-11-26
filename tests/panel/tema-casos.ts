/** Tabla de casos de resolucion de tema: fuente unica para tema-calculos.test.ts y la paridad con tema-arranque.js. */
export const CASOS_RESOLUCION: ReadonlyArray<{ guardado: unknown; prefiereOscuro: boolean; esperado: 'claro' | 'oscuro' }> = [
  { guardado: 'claro', prefiereOscuro: true, esperado: 'claro' },
  { guardado: 'claro', prefiereOscuro: false, esperado: 'claro' },
  { guardado: 'oscuro', prefiereOscuro: true, esperado: 'oscuro' },
  { guardado: 'oscuro', prefiereOscuro: false, esperado: 'oscuro' },
  { guardado: null, prefiereOscuro: true, esperado: 'oscuro' },
  { guardado: null, prefiereOscuro: false, esperado: 'claro' },
  { guardado: '', prefiereOscuro: true, esperado: 'oscuro' },
  { guardado: 'negro', prefiereOscuro: false, esperado: 'claro' },
  { guardado: 'OSCURO', prefiereOscuro: false, esperado: 'claro' },
  { guardado: 42, prefiereOscuro: true, esperado: 'oscuro' },
  { guardado: undefined, prefiereOscuro: true, esperado: 'oscuro' },
];
