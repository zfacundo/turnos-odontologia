import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ADMIN = path.join(__dirname, '..', '..', 'public', 'admin');
const css = readFileSync(path.join(ADMIN, 'admin.css'), 'utf8');
const html = readFileSync(path.join(ADMIN, 'index.html'), 'utf8');
const mainJs = readFileSync(path.join(ADMIN, 'js', 'main.js'), 'utf8');
const agendaJs = readFileSync(path.join(ADMIN, 'js', 'agenda.js'), 'utf8');
const dashboardJs = readFileSync(path.join(ADMIN, 'js', 'dashboard.js'), 'utf8');

const sinComentarios = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '');
const limpio = sinComentarios(css);

const PREFIJO = ':root[data-tema="oscuro"]';
const inicioOscuro = limpio.indexOf(PREFIJO);
const bloqueOscuro = inicioOscuro === -1 ? '' : (/\{([\s\S]*?)\n\}/.exec(limpio.slice(inicioOscuro))?.[1] ?? '');
const cssLocal = sinComentarios(css);

function leerTokens(bloque: string): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const m of bloque.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) mapa.set(m[1] as string, (m[2] as string).trim());
  return mapa;
}

const tokensClaros = leerTokens(/:root\s*\{([\s\S]*?)\n\}/.exec(limpio)?.[1] ?? '');
const tokensOscuros = leerTokens(bloqueOscuro);
/** Tokens efectivos en oscuro = claro ∪ sobrescrituras (D1). */
const efectivos = new Map([...tokensClaros, ...tokensOscuros]);

function tk(nombre: string): string {
  const v = efectivos.get(nombre);
  if (v === undefined || !/^#[0-9A-Fa-f]{6}$/.test(v)) throw new Error(`token ${nombre} sin hex efectivo (${String(v)})`);
  return v;
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
/** Pares [primer plano, fondo] por nombre de token o hex literal. */
function medir(pares: ReadonlyArray<readonly [string, string]>, minimo: number) {
  for (const [fg, bg] of pares) {
    const a = fg.startsWith('#') ? fg : tk(fg);
    const b = bg.startsWith('#') ? bg : tk(bg);
    expect(contraste(a, b), `${fg} sobre ${bg} (${a} / ${b})`).toBeGreaterThanOrEqual(minimo);
  }
}

interface Regla {
  selectores: string[];
  cuerpo: string;
}
/** Reglas planas (incluye las de dentro de @media); excluye el primer :root, el bloque oscuro y @keyframes. */
function reglas(): Regla[] {
  const sinKeyframes = limpio.replace(/@keyframes [\w-]+\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  const salida: Regla[] = [];
  for (const m of sinKeyframes.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectores = (m[1] as string).split(',').map((s) => s.trim().replace(/\s+/g, ' '));
    if (selectores.some((s) => s === ':root' || s.startsWith(PREFIJO))) continue;
    salida.push({ selectores, cuerpo: m[2] as string });
  }
  return salida;
}
const TODAS = reglas();
const prefijoOscuro = '[data-tema="oscuro"] ';
const sobrescritos = new Set<string>(
  [...limpio.matchAll(/([^{}]+)\{[^{}]*\}/g)]
    .flatMap((m) => (m[1] as string).split(','))
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter((s) => s.startsWith(prefijoOscuro))
    .map((s) => s.slice(prefijoOscuro.length)),
);

describe('bloque oscuro: contraste (spec: Texto AA / Interfaz y foco en tema oscuro)', () => {
  it('dado el bloque :root[data-tema="oscuro"] cuando se lee entonces existe y redefine tokens semanticos pero no los de marca', () => {
    expect(inicioOscuro).toBeGreaterThan(-1);
    expect(tokensOscuros.size).toBeGreaterThan(20);
    for (const marca of ['--adm-navy', '--adm-blue-700', '--adm-blue-500', '--adm-blue-300', '--adm-blue-100']) {
      expect(tokensOscuros.has(marca), marca).toBe(false);
    }
    for (const n of tokensOscuros.keys()) expect(n.startsWith('--adm-'), n).toBe(true);
    expect(bloqueOscuro).toMatch(/color-scheme:\s*dark/);
  });

  it('dado el texto principal cuando se mide sobre cada superficie oscura entonces cumple AA (4.5:1)', () => {
    medir(
      ['--adm-surface', '--adm-bg', '--adm-surface-2', '--adm-sidebar-bg', '--adm-input-bg', '--adm-grid-today', '--adm-sel-bg'].map(
        (bg) => ['--adm-text', bg] as const,
      ),
      4.5,
    );
  });

  it('dado el texto secundario cuando se mide sobre cada superficie oscura entonces cumple AA (4.5:1)', () => {
    medir(
      ['--adm-surface', '--adm-bg', '--adm-surface-2', '--adm-sidebar-bg', '--adm-grid-today', '--adm-grid-closed', '--adm-bloqueo-a', '--adm-bloqueo-b'].map(
        (bg) => ['--adm-text-muted', bg] as const,
      ),
      4.5,
    );
  });

  it('dado los enlaces, el boton primario, el texto del sidebar y el KPI destacado cuando se miden entonces cumplen AA', () => {
    medir(
      [
        ['--adm-link', '--adm-surface'],
        ['--adm-link', '--adm-bg'],
        ['--adm-link', '--adm-surface-2'],
        ['--adm-on-accent', '--adm-accent'],
        ['--adm-on-navy', '--adm-sidebar-bg'],
        ['--adm-on-navy-muted', '--adm-sidebar-bg'],
        ['#FFFFFF', '--adm-blue-700'],
        ['--adm-on-navy-muted', '--adm-blue-700'],
      ],
      4.5,
    );
  });

  it('dado cada estado, el senado, el error y el toast cuando se mide su texto sobre su fondo entonces cumple AA', () => {
    const pares = ['reservado', 'confirmado', 'atendido', 'ausente'].map((e) => [`--adm-st-${e}-fg`, `--adm-st-${e}-bg`] as const);
    medir(
      [
        ...pares,
        ['--adm-senado-fg', '--adm-senado-bg'],
        ['--adm-error-fg', '--adm-error-bg'],
        ['--adm-error-fg', '--adm-surface'],
        ['--adm-error-fg', '--adm-bg'],
        ['--adm-toast-fg', '--adm-toast-bg'],
      ],
      4.5,
    );
  });

  it('dado el borde de controles y el foco cuando se miden contra las superficies oscuras entonces cumplen 3:1', () => {
    medir(
      [
        ...['--adm-surface', '--adm-input-bg', '--adm-bg', '--adm-surface-2'].map((bg) => ['--adm-control-border', bg] as const),
        ...['--adm-surface', '--adm-bg', '--adm-surface-2', '--adm-sidebar-bg', '--adm-input-bg'].map((bg) => ['--adm-focus-color', bg] as const),
        ['--adm-focus-on-navy', '--adm-sidebar-bg'],
        ['--adm-focus-on-navy', '--adm-navy'],
        ['--adm-focus-color', '--adm-blue-700'],
      ],
      3,
    );
  });

  it('dado el borde de cada bloque de estado y el error cuando se mide contra la superficie y el dia actual entonces cumple 3:1', () => {
    const bordes = ['--adm-st-reservado-bd', '--adm-st-atendido-bd', '--adm-st-ausente-bd', '--adm-senado-bd', '--adm-error-bd'];
    medir(bordes.flatMap((b) => [[b, '--adm-surface'] as const, [b, '--adm-grid-today'] as const]), 3);
    medir([['--adm-error-bd', '--adm-input-bg']], 3);
    medir([['--adm-st-confirmado-bg', '--adm-surface'], ['--adm-st-confirmado-bg', '--adm-grid-today']], 3);
  });

  it('dado las barras del dashboard cuando se miden contra la pista entonces cumplen 3:1 (grafico)', () => {
    medir(
      ['reservado', 'confirmado', 'atendido', 'ausente'].map((e) => [`--adm-bar-${e}`, '--adm-surface-2'] as const),
      3,
    );
  });

  it('dado la paleta aprobada cuando se leen los tokens claros entonces sigue intacta (el claro no cambia)', () => {
    const valores = [...tokensClaros.values()].map((v) => v.toUpperCase());
    for (const c of ['#001040', '#00457A', '#0088BE', '#97CAD9', '#DCE8EE']) expect(valores).toContain(c);
    expect(tokensClaros.get('--adm-bg')).toBe('#EEF4F7');
  });
});

describe('bloque oscuro: cobertura de literales y tokens de marca (D8, D9)', () => {
  const LITERALES = ['#E6EEF2', '#F1F7FA', '#F2F5F7', '#EEF2F5', '#E2E9EE', '#E9B9A9', '#A9D6BC'];
  const re = (lit: string) => new RegExp(lit, 'i');

  it('dado la hoja cuando se buscan literales claros fuera de :root entonces cada selector que los usa tiene una sobrescritura [data-tema="oscuro"]', () => {
    const sinCubrir: string[] = [];
    let hallados = 0;
    for (const r of TODAS) {
      const usaLiteral = LITERALES.some((l) => re(l).test(r.cuerpo)) || /background(?:-color)?\s*:\s*#FFFFFF/i.test(r.cuerpo);
      if (!usaLiteral) continue;
      hallados += 1;
      for (const s of r.selectores) if (!sobrescritos.has(s)) sinCubrir.push(s);
    }
    expect(hallados).toBeGreaterThan(8);
    expect(sinCubrir).toEqual([]);
  });

  it('dado los componentes que usan --adm-navy o --adm-blue-100 como fondo o color de texto entonces tienen sobrescritura oscura (salvo los que siguen navy a proposito)', () => {
    // .login-page: el fondo exterior del login sigue navy; .avatar y .brand img son chips claros con texto navy;
    // .wg-head.today .d es texto claro sobre azul de acento.
    const EXENTOS = new Set(['.login-page', '.avatar', '.brand img', '.wg-head.today .d']);
    const sinCubrir: string[] = [];
    for (const r of TODAS) {
      if (!/(?:^|[;\s])(?:background(?:-color)?|color)\s*:\s*var\(--adm-(?:navy|blue-100)\)/.test(r.cuerpo)) continue;
      for (const s of r.selectores) if (!EXENTOS.has(s) && !sobrescritos.has(s)) sinCubrir.push(s);
    }
    expect(sinCubrir).toEqual([]);
  });

  it('dado el selector .sidebar cuando se lee la sobrescritura oscura entonces usa --adm-sidebar-bg y el login conserva su navy exterior', () => {
    expect(limpio).toMatch(/\[data-tema="oscuro"\] \.sidebar\s*\{[^}]*--adm-sidebar-bg/);
    expect(sobrescritos.has('.login-page')).toBe(false);
  });
});

describe('barra superior y foco (D9)', () => {
  it('dado la barra superior clara cuando se mide el foco entonces es >= 3:1 en ambos temas (hoy 1.70:1)', () => {
    const regla = /\.topbar :focus-visible\s*\{\s*outline-color:\s*var\(--adm-focus-color\);?\s*\}/.exec(limpio);
    expect(regla, 'regla .topbar :focus-visible con --adm-focus-color').not.toBeNull();
    // Debe venir DESPUES de la regla original (misma especificidad) para ganar la cascada.
    expect(limpio.lastIndexOf('.topbar :focus-visible')).toBeGreaterThan(limpio.indexOf('.sidebar :focus-visible'));
    const claro = tokensClaros.get('--adm-focus-color') as string;
    expect(contraste(claro, tokensClaros.get('--adm-surface') as string)).toBeGreaterThanOrEqual(3);
    expect(contraste(tk('--adm-focus-color'), tk('--adm-surface'))).toBeGreaterThanOrEqual(3);
    // El valor viejo no cumplia: queda documentado el motivo del arreglo.
    expect(contraste(tokensClaros.get('--adm-focus-on-navy') as string, tokensClaros.get('--adm-surface') as string)).toBeLessThan(3);
  });
});

describe('cambio instantaneo (spec: Cambio instantaneo)', () => {
  it('dado el bloque oscuro y sus sobrescrituras cuando se buscan transition o animation entonces no hay', () => {
    expect(inicioOscuro).toBeGreaterThan(-1);
    const aditivo = limpio.slice(limpio.indexOf('panel-tema-oscuro') === -1 ? inicioOscuro : 0);
    const reglasOscuras = [...aditivo.matchAll(/([^{}]*\[data-tema="oscuro"\][^{}]*)\{([^{}]*)\}/g)].map((m) => m[2] as string);
    expect(reglasOscuras.length).toBeGreaterThan(10);
    for (const cuerpo of reglasOscuras) expect(cuerpo).not.toMatch(/transition|animation/);
    expect(bloqueOscuro).not.toMatch(/transition|animation/);
  });

  it('dado el boton de tema cuando se lee su CSS entonces no declara transiciones propias', () => {
    const reglasBoton = [...limpio.matchAll(/([^{}]*\.tema-btn[^{}]*)\{([^{}]*)\}/g)].map((m) => m[2] as string);
    expect(reglasBoton.length).toBeGreaterThan(0);
    for (const c of reglasBoton) expect(c).not.toMatch(/transition|animation/);
  });
});

describe('index.html: arranque y botones (spec: Sin destello, Controles nativos)', () => {
  const head = /<head>([\s\S]*?)<\/head>/.exec(html)?.[1] ?? '';

  it('dado index.html cuando se lee el head entonces tema-arranque.js es un script clasico sin defer/async/module y aparece antes del link a admin.css', () => {
    const etiqueta = /<script\b[^>]*src="tema-arranque\.js"[^>]*>/.exec(head);
    expect(etiqueta, 'script tema-arranque.js').not.toBeNull();
    expect(etiqueta?.[0]).not.toMatch(/\bdefer\b|\basync\b|type=["']module["']/);
    expect(head.indexOf('tema-arranque.js')).toBeLessThan(head.indexOf('href="admin.css"'));
  });

  it('dado index.html entonces hay dos botones [data-tema-toggle] (login y topbar) con type=button, aria-label "Tema oscuro" y aria-pressed', () => {
    const botones = [...html.matchAll(/<button\b[^>]*data-tema-toggle[^>]*>/g)].map((m) => m[0]);
    expect(botones).toHaveLength(2);
    for (const b of botones) {
      expect(b).toMatch(/type="button"/);
      expect(b).toMatch(/aria-label="Tema oscuro"/);
      expect(b).toMatch(/aria-pressed="(?:false|true)"/);
    }
    const login = html.slice(html.indexOf('id="vista-login"'), html.indexOf('id="vista-shell"'));
    const shell = html.slice(html.indexOf('id="vista-shell"'));
    expect(login).toContain('data-tema-toggle');
    expect(/<header class="topbar">[\s\S]*?<\/header>/.exec(shell)?.[0]).toContain('data-tema-toggle');
    // El icono es decorativo.
    expect(html).toMatch(/data-tema-toggle[^>]*>\s*<svg[^>]*aria-hidden="true"/);
  });
});

describe('main.js y vistas (spec: boton y colores en linea)', () => {
  it('dado main.js cuando se lee entonces importa iniciarTema y lo llama una vez al arrancar con almacen local protegido', () => {
    expect(mainJs).toMatch(/import \{ almacenLocalDeTema, iniciarTema \} from '\.\/tema\.js';/);
    expect(mainJs.match(/iniciarTema\(/g)).toHaveLength(1);
  });

  it('dado agenda.js cuando se buscan los literales del bloqueo entonces el swatch usa var(--adm-bloqueo-a/b) con el literal como fallback', () => {
    expect(agendaJs).toContain('var(--adm-bloqueo-a, #EEF2F5)');
    expect(agendaJs).toContain('var(--adm-bloqueo-b, #E2E9EE)');
  });

  it('dado dashboard.js cuando se buscan los colores de barra entonces usan var(--adm-bar-*) con el color actual como fallback', () => {
    expect(dashboardJs).toContain('var(--adm-bar-reservado, var(--adm-blue-300))');
    expect(dashboardJs).toContain('var(--adm-bar-confirmado, var(--adm-blue-500))');
    expect(dashboardJs).toContain('var(--adm-bar-atendido, var(--adm-blue-700))');
    expect(dashboardJs).toContain('var(--adm-bar-ausente, var(--adm-st-ausente-fg))');
  });
});

describe('boton de tema: estilos', () => {
  it('dado la topbar angosta (390px) cuando se aprieta entonces el boton de tema no se encoge por debajo de 44px (flex: none)', () => {
    expect(cssLocal).toMatch(/\.tema-btn\s*\{[^}]*flex:\s*none/);
  });

  it('dado el CSS cuando se lee .tema-btn entonces el icono mantiene 44px (via .icon-btn) y alterna luna/sol segun el tema', () => {
    expect(cssLocal).toMatch(/\.tema-btn svg\s*\{[^}]*width:\s*20px/);
    expect(cssLocal).toMatch(/\[data-tema="oscuro"\] \.tema-btn \.sol\s*\{\s*display:\s*block/);
    expect(cssLocal).toMatch(/\[data-tema="oscuro"\] \.tema-btn \.luna\s*\{\s*display:\s*none/);
  });
});
