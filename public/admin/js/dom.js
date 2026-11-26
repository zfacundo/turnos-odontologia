// Helpers de DOM del panel. S-3: los datos de la API se insertan SIEMPRE como nodos de texto
// (textContent); este módulo no expone ningún camino hacia innerHTML.

const PROPIEDADES = new Set(['value', 'checked', 'disabled', 'hidden', 'selected', 'open']);
const NS_SVG = 'http://www.w3.org/2000/svg';

function agregar(padre, hijo) {
  if (hijo === null || hijo === undefined || hijo === false) return;
  if (Array.isArray(hijo)) {
    for (const h of hijo) agregar(padre, h);
    return;
  }
  padre.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
}

/**
 * h('button', { class: 'btn', type: 'button', onClick: fn }, 'Texto', otroNodo)
 * Atributos: `class`, `onXxx` (listener), propiedades booleanas/valor, y el resto como atributo.
 */
export function h(etiqueta, props, ...hijos) {
  const el = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(props ?? {})) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (clave === 'class') el.className = valor;
    else if (clave.startsWith('on') && typeof valor === 'function') el.addEventListener(clave.slice(2).toLowerCase(), valor);
    else if (clave === 'style' && typeof valor === 'object') Object.assign(el.style, valor);
    else if (PROPIEDADES.has(clave)) el[clave] = valor;
    else el.setAttribute(clave, valor === true ? '' : String(valor));
  }
  for (const hijo of hijos) agregar(el, hijo);
  return el;
}

/** Reemplaza todo el contenido de un nodo. */
export function reemplazar(el, ...hijos) {
  el.replaceChildren();
  for (const hijo of hijos) agregar(el, hijo);
  return el;
}

const ICONOS = {
  dashboard: [
    ['rect', { x: 3, y: 3, width: 7, height: 9, rx: 1.5 }],
    ['rect', { x: 14, y: 3, width: 7, height: 5, rx: 1.5 }],
    ['rect', { x: 14, y: 12, width: 7, height: 9, rx: 1.5 }],
    ['rect', { x: 3, y: 16, width: 7, height: 5, rx: 1.5 }],
  ],
  agenda: [
    ['rect', { x: 3, y: 5, width: 18, height: 16, rx: 2 }],
    ['path', { d: 'M3 10h18M8 3v4M16 3v4' }],
  ],
  clientes: [
    ['circle', { cx: 9, cy: 8, r: 3.5 }],
    ['path', { d: 'M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.6.8 2.6 2.6 3 5.2' }],
  ],
  historial: [
    ['path', { d: 'M7 3h8l4 4v14H7z' }],
    ['path', { d: 'M15 3v4h4M10 12h6M10 16h6M4 7v14h3' }],
  ],
  configuracion: [
    ['circle', { cx: 12, cy: 12, r: 3 }],
    ['path', { d: 'M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1' }],
  ],
  menu: [['path', { d: 'M4 7h16M4 12h16M4 17h16' }]],
  // Globo de chat para marcar los turnos reservados por el bot de WhatsApp (simulado).
  whatsapp: [['path', { d: 'M4 20l1.4-4A8 8 0 1 1 8 19z' }]],
};

/** Ícono SVG decorativo (aria-hidden) construido con nodos, no con HTML. */
export function icono(nombre) {
  const svg = document.createElementNS(NS_SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  if (nombre === 'menu') {
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke-width', '2');
  }
  for (const [tag, attrs] of ICONOS[nombre] ?? []) {
    const nodo = document.createElementNS(NS_SVG, tag);
    for (const [k, v] of Object.entries(attrs)) nodo.setAttribute(k, String(v));
    svg.append(nodo);
  }
  return svg;
}

/** Iniciales de un nombre para el avatar ('Admin Ficticio' → 'AF'). */
export function iniciales(nombre) {
  return String(nombre ?? '')
    .replace(/^(Dra?\.)\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

/** Mensaje de error de la API (o de red) como texto para el usuario. */
export function mensajeDe(error) {
  if (error && typeof error === 'object' && typeof error.mensaje === 'string' && error.mensaje !== '') {
    return error.regla ? `${error.regla} — ${error.mensaje}` : error.mensaje;
  }
  return 'Ocurrió un error inesperado. Probá de nuevo.';
}
