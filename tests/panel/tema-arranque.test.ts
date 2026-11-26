import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { resolverTema } from '../../public/admin/js/tema-calculos.js';
import { CASOS_RESOLUCION } from './tema-casos.js';

const ARRANQUE = readFileSync(path.join(__dirname, '..', '..', 'public', 'admin', 'tema-arranque.js'), 'utf8');

interface Entorno {
  atributos: Map<string, string>;
  estilo: { colorScheme: string };
}

/** Ejecuta el script clasico con dobles de window/document/localStorage/matchMedia. */
function correr(opciones: { guardado?: unknown; lanza?: boolean; prefiereOscuro?: boolean; sinMatchMedia?: boolean }): Entorno {
  const atributos = new Map<string, string>();
  const estilo = { colorScheme: '' };
  const raiz = { setAttribute: (k: string, v: string) => void atributos.set(k, v), style: estilo };
  const localStorage = {
    getItem: (k: string) => {
      if (opciones.lanza) throw new Error('SecurityError');
      return k === 'adm.tema' ? (opciones.guardado ?? null) : null;
    },
  };
  const window: Record<string, unknown> = { localStorage };
  if (!opciones.sinMatchMedia) {
    window.matchMedia = (q: string) => ({ matches: q === '(prefers-color-scheme: dark)' && opciones.prefiereOscuro === true });
  }
  vm.runInNewContext(ARRANQUE, { window, document: { documentElement: raiz } });
  return { atributos, estilo };
}

describe('tema-arranque.js (script clasico de <head>)', () => {
  it('dado adm.tema=oscuro cuando corre el arranque entonces html tiene data-tema=oscuro y colorScheme dark', () => {
    const r = correr({ guardado: 'oscuro' });
    expect(r.atributos.get('data-tema')).toBe('oscuro');
    expect(r.estilo.colorScheme).toBe('dark');
  });

  it('dado adm.tema=claro con el sistema en oscuro cuando corre entonces gana la eleccion: claro y light', () => {
    const r = correr({ guardado: 'claro', prefiereOscuro: true });
    expect(r.atributos.get('data-tema')).toBe('claro');
    expect(r.estilo.colorScheme).toBe('light');
  });

  it('dado un localStorage que lanza cuando corre entonces usa matchMedia sin lanzar', () => {
    expect(correr({ lanza: true, prefiereOscuro: true }).atributos.get('data-tema')).toBe('oscuro');
    expect(correr({ lanza: true, prefiereOscuro: false }).atributos.get('data-tema')).toBe('claro');
  });

  it('dado un navegador sin matchMedia y sin eleccion cuando corre entonces queda claro', () => {
    expect(correr({ sinMatchMedia: true }).atributos.get('data-tema')).toBe('claro');
  });

  for (const { guardado, prefiereOscuro } of CASOS_RESOLUCION) {
    it(`paridad con resolverTema: guardado=${JSON.stringify(guardado) ?? 'undefined'}, prefiereOscuro=${prefiereOscuro}`, () => {
      const r = correr({ guardado, prefiereOscuro });
      expect(r.atributos.get('data-tema')).toBe(resolverTema(guardado, prefiereOscuro));
    });
  }
});
