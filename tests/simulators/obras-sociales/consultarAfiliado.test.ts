import { describe, expect, it } from 'vitest';
import { consultarAfiliado } from '../../../src/simulators/obras-sociales/consultarAfiliado';
import { PadronObraSocialEnMemoria } from '../../../src/simulators/obras-sociales/padronRepository';

const repo = () => new PadronObraSocialEnMemoria();

describe('consultarAfiliado', () => {
  it('dado AF-0001 cuando se consulta entonces devuelve ok con los datos del afiliado activo', () => {
    const resultado = consultarAfiliado(repo(), 'AF-0001');
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor).toMatchObject({ cobertura: 80, copagoPct: 20, estado: 'activo' });
    }
  });

  it('dado un nro ausente cuando se consulta entonces devuelve error de entrada', () => {
    const resultado = consultarAfiliado(repo(), undefined);
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error.tipo).toBe('entrada');
  });

  it('dado un nro con solo espacios cuando se consulta entonces devuelve error de entrada', () => {
    const resultado = consultarAfiliado(repo(), '   ');
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error.tipo).toBe('entrada');
  });

  it('dado AF-9999 cuando se consulta entonces devuelve no-encontrado con el mensaje exacto', () => {
    const resultado = consultarAfiliado(repo(), 'AF-9999');
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error).toEqual({ tipo: 'no-encontrado', mensaje: 'afiliado no encontrado' });
    }
  });

  it('dado AF-0004 cuando se consulta entonces devuelve RN-SM-02 simulada sin dimension ni conflicto', () => {
    const resultado = consultarAfiliado(repo(), 'AF-0004');
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.tipo).toBe('regla');
      if (resultado.error.tipo === 'regla') {
        expect(resultado.error.error.regla).toBe('RN-SM-02');
        expect(resultado.error.error.mensaje).toContain('SIMULACIÓN');
        expect(resultado.error.error.dimension).toBeUndefined();
        expect(resultado.error.error.conflicto).toBeUndefined();
      }
    }
  });

  it('dado AF-0004 y despues AF-0001 cuando se consulta entonces el padrón no se modifica', () => {
    const afiliados = repo();
    expect(consultarAfiliado(afiliados, 'AF-0004').ok).toBe(false);
    const resultado = consultarAfiliado(afiliados, 'AF-0001');
    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.valor.estado).toBe('activo');
  });
});
