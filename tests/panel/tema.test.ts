import { describe, expect, it } from 'vitest';
import { iniciarTema } from '../../public/admin/js/tema.js';

class Boton {
  atributos = new Map<string, string>();
  oyentes: Array<() => void> = [];
  setAttribute(k: string, v: string) {
    this.atributos.set(k, v);
  }
  addEventListener(_tipo: string, fn: () => void) {
    this.oyentes.push(fn);
  }
  click() {
    for (const fn of this.oyentes) fn();
  }
}

function escenario(opciones: { temaInicial?: string; guardado?: string | null; almacenLanza?: boolean } = {}) {
  const raiz = {
    attrs: new Map<string, string>([['data-tema', opciones.temaInicial ?? 'claro']]),
    style: { colorScheme: '' },
    getAttribute(k: string) {
      return this.attrs.get(k) ?? null;
    },
    setAttribute(k: string, v: string) {
      this.attrs.set(k, v);
    },
  };
  const botones = [new Boton(), new Boton()];
  const documento = { documentElement: raiz, querySelectorAll: () => botones };
  const guardados = new Map<string, string>();
  if (opciones.guardado != null) guardados.set('adm.tema', opciones.guardado);
  const almacen = {
    getItem: (k: string) => {
      if (opciones.almacenLanza) throw new Error('SecurityError');
      return guardados.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (opciones.almacenLanza) throw new Error('QuotaExceeded');
      guardados.set(k, v);
    },
  };
  const oyentesMq: Array<(e: { matches: boolean }) => void> = [];
  const mq = {
    matches: false,
    addEventListener: (_t: string, fn: (e: { matches: boolean }) => void) => void oyentesMq.push(fn),
  };
  const matchMedia = () => mq;
  const sistema = (matches: boolean) => oyentesMq.forEach((fn) => fn({ matches }));
  const deps = { documento, almacen, matchMedia };
  return { raiz, botones, deps, guardados, sistema };
}

describe('iniciarTema (D6)', () => {
  it('dado el tema fijado por el arranque cuando se inicia entonces aria-pressed de todos los botones lo refleja', () => {
    const oscuro = escenario({ temaInicial: 'oscuro' });
    iniciarTema(oscuro.deps);
    for (const b of oscuro.botones) expect(b.atributos.get('aria-pressed')).toBe('true');
    const claro = escenario({ temaInicial: 'claro' });
    iniciarTema(claro.deps);
    for (const b of claro.botones) expect(b.atributos.get('aria-pressed')).toBe('false');
  });

  it('dado un click cuando se alterna entonces cambia data-tema, color-scheme, aria-pressed y guarda adm.tema (ida y vuelta)', () => {
    const e = escenario();
    iniciarTema(e.deps);
    e.botones[1]?.click();
    expect(e.raiz.getAttribute('data-tema')).toBe('oscuro');
    expect(e.raiz.style.colorScheme).toBe('dark');
    expect(e.guardados.get('adm.tema')).toBe('oscuro');
    for (const b of e.botones) expect(b.atributos.get('aria-pressed')).toBe('true');
    e.botones[0]?.click();
    expect(e.raiz.getAttribute('data-tema')).toBe('claro');
    expect(e.raiz.style.colorScheme).toBe('light');
    expect(e.guardados.get('adm.tema')).toBe('claro');
  });

  it('dado un almacen que lanza cuando se alterna entonces el tema cambia igual y no hay error (Almacenamiento bloqueado)', () => {
    const e = escenario({ almacenLanza: true });
    expect(() => iniciarTema(e.deps)).not.toThrow();
    expect(() => e.botones[0]?.click()).not.toThrow();
    expect(e.raiz.getAttribute('data-tema')).toBe('oscuro');
  });

  it('dado un almacen ausente (null) cuando se alterna entonces el tema cambia igual', () => {
    const e = escenario();
    iniciarTema({ ...e.deps, almacen: null });
    e.botones[0]?.click();
    expect(e.raiz.getAttribute('data-tema')).toBe('oscuro');
  });

  it('dado que no hay eleccion guardada cuando el sistema cambia entonces el panel lo sigue en vivo sin guardar', () => {
    const e = escenario();
    iniciarTema(e.deps);
    e.sistema(true);
    expect(e.raiz.getAttribute('data-tema')).toBe('oscuro');
    expect(e.botones[0]?.atributos.get('aria-pressed')).toBe('true');
    e.sistema(false);
    expect(e.raiz.getAttribute('data-tema')).toBe('claro');
    expect(e.guardados.has('adm.tema')).toBe(false);
  });

  it('dado una eleccion guardada al abrir cuando el sistema cambia entonces se ignora', () => {
    const e = escenario({ temaInicial: 'claro', guardado: 'claro' });
    iniciarTema(e.deps);
    e.sistema(true);
    expect(e.raiz.getAttribute('data-tema')).toBe('claro');
  });

  it('dado que el usuario eligio con un click cuando el sistema cambia entonces la eleccion prevalece', () => {
    const e = escenario();
    iniciarTema(e.deps);
    e.botones[0]?.click();
    e.sistema(false);
    expect(e.raiz.getAttribute('data-tema')).toBe('oscuro');
  });

  it('dado un almacen que lanza al guardar cuando el usuario alterna entonces igual deja de seguir al sistema', () => {
    const e = escenario({ almacenLanza: true });
    iniciarTema(e.deps);
    e.botones[0]?.click();
    e.sistema(false);
    expect(e.raiz.getAttribute('data-tema')).toBe('oscuro');
  });

  it('dado un valor guardado invalido cuando se inicia entonces se trata como sin eleccion (sigue al sistema)', () => {
    const e = escenario({ guardado: 'negro' });
    iniciarTema(e.deps);
    e.sistema(true);
    expect(e.raiz.getAttribute('data-tema')).toBe('oscuro');
  });
});
