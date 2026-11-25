import { describe, expect, it } from 'vitest';
import {
  cuadrantes,
  CARAS_UI,
  etiquetaEstadoPieza,
  nombrePieza,
  SINTOMAS_UI,
  validarSeleccion,
} from '../../public/admin/js/odontograma-calculos.js';
import {
  CARAS,
  CUADRANTES,
  nombrePieza as nombreDelDominio,
  PIEZAS_FDI,
  SINTOMAS,
} from '../../src/domain/odontograma/piezas';

// spec: panel-reemplaza-agenda-vieja (D8)
describe('cuadrantes', () => {
  it('dado el odontograma cuando se piden los cuadrantes entonces hay 32 piezas FDI en el orden del dominio', () => {
    const planas = cuadrantes().flatMap((c) => c.piezas);
    expect(planas).toHaveLength(32);
    expect(planas).toEqual(PIEZAS_FDI);
  });

  it('dado el odontograma cuando se piden los cuadrantes entonces cada uno coincide con el dominio y trae su numero', () => {
    const del = cuadrantes();
    expect(del.map((c) => c.nombre)).toEqual(CUADRANTES.map((c) => c.nombre));
    expect(del.map((c) => c.numero)).toEqual([1, 2, 3, 4]);
    expect(del[0]?.piezas).toEqual([18, 17, 16, 15, 14, 13, 12, 11]);
    expect(del[3]?.piezas).toEqual([48, 47, 46, 45, 44, 43, 42, 41]);
  });
});

describe('nombrePieza', () => {
  it('dado la pieza 16 cuando se pide el nombre entonces es Primer molar superior derecho', () => {
    expect(nombrePieza(16)).toBe('Primer molar superior derecho');
  });

  it('dado la pieza 36 cuando se pide el nombre entonces es Primer molar inferior izquierdo', () => {
    expect(nombrePieza(36)).toBe('Primer molar inferior izquierdo');
  });

  it('dado cualquiera de las 32 piezas cuando se pide el nombre entonces coincide con el del dominio', () => {
    for (const pieza of PIEZAS_FDI) expect(nombrePieza(pieza)).toBe(nombreDelDominio(pieza));
  });

  it('dado un numero invalido cuando se pide el nombre entonces devuelve vacio', () => {
    expect(nombrePieza(19)).toBe('');
    expect(nombrePieza(0)).toBe('');
  });
});

describe('etiquetaEstadoPieza', () => {
  it('dado cada estado cuando se pide la etiqueta entonces devuelve el texto legible', () => {
    expect(etiquetaEstadoPieza('a_revisar')).toBe('a revisar');
    expect(etiquetaEstadoPieza('hecho')).toBe('hecho');
    expect(etiquetaEstadoPieza(undefined)).toBe('sin marcar');
  });
});

describe('caras y sintomas de la interfaz', () => {
  it('dado el dominio cuando se listan caras y sintomas de la UI entonces cubren exactamente los valores del dominio', () => {
    expect(CARAS_UI.map((c) => c.valor).sort()).toEqual([...CARAS].sort());
    expect(SINTOMAS_UI.map((s) => s.valor).sort()).toEqual([...SINTOMAS].sort());
  });

  it('dado las caras cuando se listan entonces siguen el orden del mockup V M O D L', () => {
    expect(CARAS_UI.map((c) => c.valor)).toEqual(['V', 'M', 'O', 'D', 'L']);
  });
});

describe('validarSeleccion', () => {
  it('dado la pieza 16 sin sintomas cuando se valida entonces pide al menos un sintoma', () => {
    expect(validarSeleccion(16, [])).toEqual({ ok: false, mensaje: 'Seleccioná al menos un síntoma.' });
  });

  it('dado la pieza 16 con un sintoma cuando se valida entonces es valido', () => {
    expect(validarSeleccion(16, ['dolor_masticar'])).toEqual({ ok: true, mensaje: '' });
  });

  it('dado ninguna pieza seleccionada cuando se valida entonces pide elegir una pieza', () => {
    expect(validarSeleccion(undefined, ['dolor_masticar'])).toEqual({ ok: false, mensaje: 'Seleccioná una pieza.' });
  });
});
