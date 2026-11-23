
export const CUADRANTES = [
  {
    nombre: 'Superior derecho',
    ubicacion: 'superior derecho',
    piezas: [18, 17, 16, 15, 14, 13, 12, 11],
  },
  {
    nombre: 'Superior izquierdo',
    ubicacion: 'superior izquierdo',
    piezas: [21, 22, 23, 24, 25, 26, 27, 28],
  },
  {
    nombre: 'Inferior izquierdo',
    ubicacion: 'inferior izquierdo',
    piezas: [31, 32, 33, 34, 35, 36, 37, 38],
  },
  {
    nombre: 'Inferior derecho',
    ubicacion: 'inferior derecho',
    piezas: [48, 47, 46, 45, 44, 43, 42, 41],
  },
] as const;

export const PIEZAS_FDI: number[] =
  CUADRANTES.flatMap(cuadrante => [...cuadrante.piezas]);

export const CARAS = ['V', 'L', 'M', 'D', 'O'] as const;

export const SINTOMAS = [
  'dolor_masticar',
  'caries_arreglo_roto',
  'dolor_persistente',
  'pieza_faltante',
] as const;

export type Cara = typeof CARAS[number];
export type Sintoma = typeof SINTOMAS[number];
export type EstadoPieza = 'a_revisar' | 'hecho';

export interface PiezaMarcada {
  turnoId: string;
  pieza: number;
  caras?: Cara[];
  sintomas: Sintoma[];
  estado: EstadoPieza;
}

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

export function esPiezaValida(pieza: number): boolean {
  return Number.isInteger(pieza) && PIEZAS_FDI.includes(pieza);
}

export function nombrePieza(pieza: number): string | null {
  if (!esPiezaValida(pieza)) {
    return null;
  }

  const cuadrante = CUADRANTES.find(
    c => c.piezas.some(numero => numero === pieza)
  );

  if (!cuadrante) return null;

  const posicion = pieza % 10;
  const tipo = TIPOS[posicion - 1];

  return `${tipo} ${cuadrante.ubicacion}`;
}

export function sonCarasValidas(caras: unknown): caras is Cara[] {
  return Array.isArray(caras) &&
    caras.every(cara => CARAS.some(valor => valor === cara));
}

export function sonSintomasValidos(
  sintomas: unknown
): sintomas is Sintoma[] {
  return Array.isArray(sintomas) &&
    sintomas.every(sintoma =>
      SINTOMAS.some(valor => valor === sintoma)
    );
}
