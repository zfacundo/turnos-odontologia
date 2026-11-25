// Cálculos puros del odontograma del panel (panel-reemplaza-agenda-vieja, D8). Sin DOM ni red.
// El mapa FDI y los nombres coinciden con src/domain/odontograma/piezas.ts (lo verifica un test).

const CUADRANTES = [
  { numero: 1, nombre: 'Superior derecho', ubicacion: 'superior derecho', piezas: [18, 17, 16, 15, 14, 13, 12, 11] },
  { numero: 2, nombre: 'Superior izquierdo', ubicacion: 'superior izquierdo', piezas: [21, 22, 23, 24, 25, 26, 27, 28] },
  { numero: 3, nombre: 'Inferior izquierdo', ubicacion: 'inferior izquierdo', piezas: [31, 32, 33, 34, 35, 36, 37, 38] },
  { numero: 4, nombre: 'Inferior derecho', ubicacion: 'inferior derecho', piezas: [48, 47, 46, 45, 44, 43, 42, 41] },
];

const TIPOS = [
  'Incisivo central',
  'Incisivo lateral',
  'Canino',
  'Primer premolar',
  'Segundo premolar',
  'Primer molar',
  'Segundo molar',
  'Tercer molar',
];

/** Caras en el orden del mockup. `valor` es el que acepta la API. */
export const CARAS_UI = [
  { valor: 'V', nombre: 'Vestibular' },
  { valor: 'M', nombre: 'Mesial' },
  { valor: 'O', nombre: 'Oclusal' },
  { valor: 'D', nombre: 'Distal' },
  { valor: 'L', nombre: 'Lingual' },
];

export const SINTOMAS_UI = [
  { valor: 'dolor_masticar', texto: 'Dolor al masticar' },
  { valor: 'caries_arreglo_roto', texto: 'Caries o arreglo roto' },
  { valor: 'dolor_persistente', texto: 'Dolor persistente (posible conducto)' },
  { valor: 'pieza_faltante', texto: 'Pieza faltante (implante)' },
];

/** Los 4 cuadrantes FDI con sus piezas, en el orden del dominio. */
export function cuadrantes() {
  return CUADRANTES.map((c) => ({ numero: c.numero, nombre: c.nombre, piezas: [...c.piezas] }));
}

/** 'Primer molar superior derecho'; vacío si el número no es una pieza FDI. */
export function nombrePieza(pieza) {
  const cuadrante = CUADRANTES.find((c) => c.piezas.includes(pieza));
  if (!cuadrante) return '';
  return `${TIPOS[pieza % 10 - 1]} ${cuadrante.ubicacion}`;
}

/** Texto del estado para el nombre accesible de la pieza. */
export function etiquetaEstadoPieza(estado) {
  if (estado === 'a_revisar') return 'a revisar';
  if (estado === 'hecho') return 'hecho';
  return 'sin marcar';
}

/** Validación previa al PUT: hay pieza elegida y al menos un síntoma. */
export function validarSeleccion(pieza, sintomas) {
  if (pieza === undefined || nombrePieza(pieza) === '') return { ok: false, mensaje: 'Seleccioná una pieza.' };
  if (!Array.isArray(sintomas) || sintomas.length === 0) return { ok: false, mensaje: 'Seleccioná al menos un síntoma.' };
  return { ok: true, mensaje: '' };
}
