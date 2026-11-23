
import { describe, it, expect } from 'vitest';

import {
  CUADRANTES,
  PIEZAS_FDI,
  CARAS,
  esPiezaValida,
  nombrePieza,
  sonCarasValidas,
  sonSintomasValidos,
} from '../../../src/domain/odontograma/piezas';

describe('C-10 - Odontograma FDI', () => {

  it('tiene exactamente 32 piezas', () => {
    expect(PIEZAS_FDI).toHaveLength(32);
    expect(new Set(PIEZAS_FDI).size).toBe(32);
  });

  it('tiene cuatro cuadrantes de ocho piezas', () => {
    expect(CUADRANTES).toHaveLength(4);

    for (const cuadrante of CUADRANTES) {
      expect(cuadrante.piezas).toHaveLength(8);
    }
  });

  it('reconoce la pieza 16', () => {
    expect(esPiezaValida(16)).toBe(true);

    expect(nombrePieza(16))
      .toBe('Primer molar superior derecho');
  });

  it('rechaza las piezas 19 y 51', () => {
    expect(esPiezaValida(19)).toBe(false);
    expect(esPiezaValida(51)).toBe(false);

    expect(nombrePieza(19)).toBeNull();
    expect(nombrePieza(51)).toBeNull();
  });

  it('admite las cinco caras dentales', () => {
    expect(CARAS).toHaveLength(5);

    expect(sonCarasValidas(['V', 'L', 'M', 'D', 'O']))
      .toBe(true);

    expect(sonCarasValidas(['X'])).toBe(false);
  });

  it('valida los síntomas disponibles', () => {
    expect(
      sonSintomasValidos(['dolor_masticar'])
    ).toBe(true);

    expect(
      sonSintomasValidos(['sintoma_inventado'])
    ).toBe(false);
  });

});
