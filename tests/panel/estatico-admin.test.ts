import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ADMIN = path.join(__dirname, '..', '..', 'public', 'admin');
const css = readFileSync(path.join(ADMIN, 'admin.css'), 'utf8');
const html = readFileSync(path.join(ADMIN, 'index.html'), 'utf8');
const fuentesJs = readdirSync(path.join(ADMIN, 'js'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => ({ nombre: f, texto: readFileSync(path.join(ADMIN, 'js', f), 'utf8') }));

function tokens(): Map<string, string> {
  const raiz = /:root\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
  const mapa = new Map<string, string>();
  for (const m of raiz.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) mapa.set(m[1] as string, (m[2] as string).trim());
  return mapa;
}

function luminancia(hex: string): number {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255) as [number, number, number];
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contraste(a: string, b: string): number {
  const [la, lb] = [luminancia(a), luminancia(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Quita del CSS TODOS los bloques @media que empiezan con la cabecera dada (para analizar el resto). */
function sinBloque(origen: string, cabecera: RegExp): string {
  let resto = origen;
  for (;;) {
    const inicio = resto.search(cabecera);
    if (inicio === -1) return resto;
    let nivel = 0;
    let i = resto.indexOf('{', inicio);
    for (; i < resto.length; i++) {
      if (resto[i] === '{') nivel += 1;
      if (resto[i] === '}') {
        nivel -= 1;
        if (nivel === 0) break;
      }
    }
    resto = resto.slice(0, inicio) + resto.slice(i + 1);
  }
}

describe('tema --adm-* (spec: Tema propio y aislamiento de estilos)', () => {
  it('dado la hoja del panel cuando se leen los tokens de :root entonces todos tienen prefijo --adm-', () => {
    const nombres = [...tokens().keys()];
    expect(nombres.length).toBeGreaterThan(20);
    for (const n of nombres) expect(n.startsWith('--adm-')).toBe(true);
  });

  it('dado la paleta aprobada cuando se leen los tokens entonces estan #001040, #00457A, #0088BE, #97CAD9 y #DCE8EE', () => {
    const valores = [...tokens().values()].map((v) => v.toUpperCase());
    for (const c of ['#001040', '#00457A', '#0088BE', '#97CAD9', '#DCE8EE']) expect(valores).toContain(c);
  });

  it('dado el boton primario cuando se mide el contraste de --adm-on-accent sobre --adm-accent entonces es de al menos 4.5:1', () => {
    const t = tokens();
    expect(contraste(t.get('--adm-on-accent') as string, t.get('--adm-accent') as string)).toBeGreaterThanOrEqual(4.5);
  });

  it('dado cada estado del turno cuando se mide su texto sobre su fondo entonces cumple AA (4.5:1)', () => {
    const t = tokens();
    for (const e of ['reservado', 'confirmado', 'atendido', 'ausente']) {
      expect(contraste(t.get(`--adm-st-${e}-fg`) as string, t.get(`--adm-st-${e}-bg`) as string)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contraste(t.get('--adm-senado-fg') as string, t.get('--adm-senado-bg') as string)).toBeGreaterThanOrEqual(4.5);
  });

  it('dado el texto secundario, los enlaces y el texto sobre el navy cuando se miden entonces cumplen AA', () => {
    const t = tokens();
    expect(contraste(t.get('--adm-text-muted') as string, t.get('--adm-surface') as string)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(t.get('--adm-text-muted') as string, t.get('--adm-bg') as string)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(t.get('--adm-link') as string, t.get('--adm-surface') as string)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(t.get('--adm-on-navy') as string, t.get('--adm-navy') as string)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(t.get('--adm-on-navy-muted') as string, t.get('--adm-navy') as string)).toBeGreaterThanOrEqual(4.5);
    expect(contraste('#FFFFFF', t.get('--adm-blue-700') as string)).toBeGreaterThanOrEqual(4.5);
  });

  it('dado el borde de los controles cuando se mide contra blanco y contra la superficie entonces cumple 3:1 (elementos de interfaz)', () => {
    const t = tokens();
    const borde = t.get('--adm-control-border') as string;
    expect(contraste(borde, '#FFFFFF')).toBeGreaterThanOrEqual(3);
    expect(contraste(borde, t.get('--adm-surface') as string)).toBeGreaterThanOrEqual(3);
  });

  it('dado el foco cuando se mide contra los fondos claros y contra el navy entonces es visible (>= 3:1) y de 3px', () => {
    const t = tokens();
    expect(css).toMatch(/:focus-visible\s*\{\s*outline:\s*3px solid/);
    expect(contraste(t.get('--adm-focus-color') as string, t.get('--adm-surface') as string)).toBeGreaterThanOrEqual(3);
    expect(contraste(t.get('--adm-focus-color') as string, '#FFFFFF')).toBeGreaterThanOrEqual(3);
    expect(contraste(t.get('--adm-focus-on-navy') as string, t.get('--adm-navy') as string)).toBeGreaterThanOrEqual(3);
  });
});

describe('movimiento (spec: Movimiento accesible)', () => {
  const sinReducido = sinBloque(css, /@media \(prefers-reduced-motion: reduce\)/);

  it('dado la hoja cuando se buscan transiciones entonces solo animan transform y opacity (nunca all ni propiedades de layout)', () => {
    const transiciones = [...sinReducido.matchAll(/transition(?:-property)?\s*:\s*([^;}]+)[;}]/g)].map((m) => (m[1] as string).trim());
    expect(transiciones.length).toBeGreaterThan(0);
    for (const t of transiciones) {
      const propiedades = t.split(',').map((p) => (p.trim().split(/\s+/)[0] as string));
      for (const p of propiedades) expect(['transform', 'opacity']).toContain(p);
    }
    expect(css).not.toMatch(/transition\s*:\s*all/);
  });

  it('dado la hoja cuando se buscan keyframes entonces solo mueven transform y opacity', () => {
    const bloques = [...css.matchAll(/@keyframes [\w-]+\s*\{([\s\S]*?\}\s*\})\s*(?=\n|$)/g)].map((m) => m[1] as string);
    expect(bloques.length).toBeGreaterThan(0);
    for (const b of bloques) {
      const props = [...b.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1] as string);
      for (const p of props) expect(['opacity', 'transform', 'from', 'to']).toContain(p);
    }
  });

  it('dado cada duracion definida o usada en la hoja cuando se la mide entonces ninguna supera 300ms', () => {
    const t = tokens();
    for (const [nombre, valor] of t) {
      if (nombre.includes('-dur-')) expect(parseInt(valor, 10)).toBeLessThanOrEqual(300);
    }
    for (const m of sinReducido.matchAll(/(?:transition|animation)[^;{}]*?\b(\d+)ms/g)) {
      expect(Number(m[1])).toBeLessThanOrEqual(300);
    }
  });

  it('dado prefers-reduced-motion cuando se lee su bloque entonces anula animaciones y limita las transiciones a opacidad <= 150ms', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    const bloque = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(bloque).toMatch(/transition-property:\s*opacity/);
    expect(bloque).toMatch(/transition-duration:\s*150ms/);
    expect(bloque).toMatch(/\.btn:active\s*\{\s*transform:\s*none/);
    expect(bloque).toMatch(/\.kpi-enter,\s*\.login-card\s*\{\s*animation:\s*none/);
  });

  it('dado la hoja cuando se buscan estados :hover entonces solo existen dentro de (hover: hover) and (pointer: fine)', () => {
    const fuera = sinBloque(css, /@media \(hover: hover\) and \(pointer: fine\)/);
    expect(css).toMatch(/@media \(hover: hover\) and \(pointer: fine\)/);
    expect(fuera).not.toMatch(/:hover/);
  });

  it('dado la hoja cuando se revisa el cambio de semana y los filtros entonces las celdas y bloques de la grilla no tienen transicion ni animacion', () => {
    const reglasGrilla = css.split('}').filter((r) => /\.(wg-col|wg-head|turno|bloqueo|mini-cal)/.test(r));
    expect(reglasGrilla.length).toBeGreaterThan(0);
    for (const r of reglasGrilla) expect(r).not.toMatch(/transition|animation/);
  });
});

const sinComentarios = (t: string) => t.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('seguridad del cliente (S-3, S-6)', () => {
  it('dado el JS del panel cuando se buscan sinks de HTML entonces ninguno inserta HTML ni evalua codigo', () => {
    for (const { nombre, texto } of fuentesJs) {
      const sinComentarios = texto.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      expect(sinComentarios, nombre).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function\(/);
    }
  });

  it('dado el JS del panel cuando se buscan headers simulados entonces no se usan', () => {
    for (const { nombre, texto } of fuentesJs) {
      expect(sinComentarios(texto), nombre).not.toMatch(/X-Rol|X-Usuario/i);
    }
  });

  it('dado el JS del panel cuando se busca localStorage entonces solo tema.js lo menciona (D4)', () => {
    for (const { nombre, texto } of fuentesJs) {
      if (nombre === 'tema.js') continue;
      expect(sinComentarios(texto), nombre).not.toMatch(/localStorage/i);
    }
    expect(fuentesJs.some((f) => f.nombre === 'tema.js')).toBe(true);
  });

  it('dado tema.js cuando se lee entonces solo usa la clave CLAVE_TEMA (adm.tema) y no toca el token ni sessionStorage', () => {
    const tema = sinComentarios(fuentesJs.find((f) => f.nombre === 'tema.js')?.texto ?? '');
    const claves = [...tema.matchAll(/(?:getItem|setItem|removeItem)\(\s*([^,)]+)/g)].map((m) => (m[1] as string).trim());
    expect(claves.length).toBeGreaterThan(0);
    for (const c of claves) expect(c).toBe('CLAVE_TEMA');
    expect(tema).not.toMatch(/adm\.token|sessionStorage/);
    const calculos = fuentesJs.find((f) => f.nombre === 'tema-calculos.js')?.texto ?? '';
    expect(calculos).toContain("CLAVE_TEMA = 'adm.tema'");
  });

  it('dado tema-arranque.js cuando se lee entonces solo lee la clave adm.tema (misma regla que tema.js)', () => {
    const arranque = sinComentarios(readFileSync(path.join(ADMIN, 'tema-arranque.js'), 'utf8'));
    expect(arranque).toMatch(/localStorage\.getItem\('adm\.tema'\)/);
    expect(arranque.match(/localStorage/g)?.length).toBe(1);
    expect(arranque).not.toMatch(/setItem|removeItem|adm\.token|sessionStorage/);
  });

  it('dado el token de sesion cuando se lee el codigo del panel entonces ni api-admin, sesion ni main mencionan localStorage', () => {
    for (const nombre of ['api-admin.js', 'sesion.js', 'main.js']) {
      expect(sinComentarios(fuentesJs.find((f) => f.nombre === nombre)?.texto ?? ''), nombre).not.toMatch(/localStorage/);
    }
  });

  it('dado cerrar sesion cuando se lee sesion.js y main.js entonces ninguno borra ni nombra adm.tema (la eleccion sobrevive)', () => {
    for (const nombre of ['sesion.js', 'main.js']) {
      expect(sinComentarios(fuentesJs.find((f) => f.nombre === nombre)?.texto ?? ''), nombre).not.toMatch(/adm\.tema|removeItem\(\s*CLAVE_TEMA|\.clear\(\)/);
    }
  });

  it('dado el JS del panel cuando se buscan los archivos de tokens compartidos entonces ninguno los referencia', () => {
    for (const { nombre, texto } of fuentesJs) expect(texto, nombre).not.toMatch(/styles\/tokens\.css|design-system\/tokens/);
    expect(sinComentarios(css)).not.toMatch(/styles\/tokens\.css|design-system\/tokens/);
  });

  it('dado el cliente de API cuando se lee entonces guarda el token en la clave adm.token del almacen de sesion', () => {
    const api = fuentesJs.find((f) => f.nombre === 'api-admin.js')?.texto ?? '';
    expect(api).toContain("'adm.token'");
    const main = fuentesJs.find((f) => f.nombre === 'main.js')?.texto ?? '';
    expect(main).toContain('sessionStorage');
  });

  it('dado el index del panel cuando se lee entonces muestra el rotulo SIMULACION y no tiene campo de contrasena', () => {
    expect(html).toContain('SIMULACIÓN — usuarios ficticios, sin contraseñas');
    expect(html).not.toMatch(/type=["']password["']/i);
    expect(html).toContain('role="alert"');
  });

  it('dado el index del panel cuando se lee entonces la barra lateral tiene boton de menu con aria-expanded y enlace de salto', () => {
    expect(html).toMatch(/id="btn-menu"[^>]*aria-expanded="false"/);
    expect(html).toContain('class="skip-link"');
    expect(html).toContain('lang="es"');
  });
});
