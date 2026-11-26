import { describe, expect, it } from 'vitest';
import { CASOS_RESOLUCION } from './tema-casos.js';
import { alternarTema, CLAVE_TEMA, esquemaDeColor, normalizarTema, resolverTema } from '../../public/admin/js/tema-calculos.js';

describe('normalizarTema', () => {
  it('dado "claro" u "oscuro" cuando se normaliza entonces se devuelve igual', () => {
    expect(normalizarTema('claro')).toBe('claro');
    expect(normalizarTema('oscuro')).toBe('oscuro');
  });

  it('dado null, vacio, "negro", "OSCURO" o 42 cuando se normaliza entonces es null', () => {
    for (const v of [null, undefined, '', 'negro', 'OSCURO', ' claro', 42, {}, true]) expect(normalizarTema(v)).toBeNull();
  });
});

describe('resolverTema', () => {
  for (const { guardado, prefiereOscuro, esperado } of CASOS_RESOLUCION) {
    it(`dado guardado=${JSON.stringify(guardado) ?? 'undefined'} y prefiereOscuro=${prefiereOscuro} cuando se resuelve entonces es ${esperado}`, () => {
      expect(resolverTema(guardado, prefiereOscuro)).toBe(esperado);
    });
  }
});

describe('alternarTema, esquemaDeColor y CLAVE_TEMA', () => {
  it('dado un tema cuando se alterna entonces pasa al otro', () => {
    expect(alternarTema('claro')).toBe('oscuro');
    expect(alternarTema('oscuro')).toBe('claro');
  });

  it('dado un tema cuando se pide el esquema de color entonces claro es light y oscuro es dark', () => {
    expect(esquemaDeColor('claro')).toBe('light');
    expect(esquemaDeColor('oscuro')).toBe('dark');
  });

  it('dado el modulo cuando se lee la clave entonces es adm.tema', () => {
    expect(CLAVE_TEMA).toBe('adm.tema');
  });
});
