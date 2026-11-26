// Verificación 9.1: Edge headless con prefers-reduced-motion forzado + recorrido real con Tab vía CDP.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://localhost:3123';
const PORT = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const perfil = mkdtempSync(join(tmpdir(), 'edge-a11y-'));
const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${perfil}`,
  '--force-prefers-reduced-motion', '--window-size=1440,900', 'about:blank',
], { stdio: 'ignore' });

let targets;
for (let i = 0; i < 40; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); break; } catch { await sleep(250); }
}
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let n = 0; const pend = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const cdp = (method, params = {}) => new Promise((r) => { const id = ++n; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.result.value;
const key = async (k, code, kc, shift = false) => {
  const mod = shift ? 8 : 0;
  const text = k === 'Enter' ? '\r' : undefined;
  await cdp('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key: k, code, windowsVirtualKeyCode: kc, modifiers: mod, text });
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: kc, modifiers: mod });
};
const tab = (s) => key('Tab', 'Tab', 9, s);
const go = async (url) => { await cdp('Page.navigate', { url }); await sleep(1200); };

// Describe el elemento con foco: etiqueta, texto, ancho del outline y si es visible.
const FOCO = `(() => { const a = document.activeElement; if (!a || a === document.body) return null;
  const cs = getComputedStyle(a); const r = a.getBoundingClientRect();
  return { tag: a.tagName.toLowerCase(), txt: (a.getAttribute('aria-label') || a.textContent || a.value || a.name || '').trim().replace(/\\s+/g,' ').slice(0, 40),
    outline: cs.outlineStyle !== 'none' ? parseFloat(cs.outlineWidth) : 0, boxShadow: cs.boxShadow !== 'none',
    visible: r.width > 0 && r.height > 0 }; })()`;

async function recorrer(nombre, max = 80) {
  await ev('document.activeElement && document.activeElement.blur(); window.scrollTo(0,0)');
  const vistos = []; let primero;
  for (let i = 0; i < max; i++) {
    await tab(); await sleep(40);
    const f = await ev(FOCO); if (!f) continue;
    const firma = f.tag + '|' + f.txt;
    if (primero === firma) break; // dio la vuelta
    primero ??= firma; vistos.push(f);
  }
  const sinFoco = vistos.filter((f) => f.outline < 3 && !f.boxShadow);
  return { pantalla: nombre, focos: vistos.length, sinFocoVisible3px: sinFoco.map((f) => `${f.tag}:${f.txt}`), ocultos: vistos.filter((f) => !f.visible).length };
}

const out = { reducedMotion: null, pantallas: [], movimiento: [], login: null, drawer: null };
await cdp('Page.enable'); await cdp('Runtime.enable');
await go(`${BASE}/admin/#/login`);
out.reducedMotion = await ev(`matchMedia('(prefers-reduced-motion: reduce)').matches`);

// Login solo con teclado: Tab hasta el radio, flechas para elegir, Enter para enviar.
out.pantallas.push(await recorrer('login'));
await ev(`document.querySelector('input[value=u-admin]').focus()`);
await key('ArrowDown', 'ArrowDown', 40); await sleep(50);
const elegido = await ev(`document.querySelector('input[type=radio]:checked')?.value`);
await key('ArrowUp', 'ArrowUp', 38); await sleep(50);
const elegido2 = await ev(`document.querySelector('input[type=radio]:checked')?.value`);
await tab(); await sleep(50);
const enBoton = await ev(FOCO);
await key('Enter', 'Enter', 13); await sleep(1500);
out.login = { conFlechaAbajo: elegido, conFlechaArriba: elegido2, focoAntesDeEnter: enBoton, hash: await ev('location.hash') };

// Animaciones/transiciones con reduced-motion: ninguna > 300 ms ni con transform.
const MOV = `(() => { const ms = (v) => Math.max(...v.split(',').map((x) => x.trim().endsWith('ms') ? parseFloat(x) : parseFloat(x) * 1000));
  const malos = []; for (const el of document.querySelectorAll('*')) { const cs = getComputedStyle(el);
    const t = ms(cs.transitionDuration), a = ms(cs.animationDuration);
    if (t > 300 || (a > 1 && cs.animationName !== 'none') || (cs.transitionProperty.includes('transform') && t > 0))
      malos.push(el.tagName.toLowerCase() + '.' + [...el.classList].join('.') + ' t=' + t + ' a=' + a + ' ' + cs.transitionProperty); }
  return malos.slice(0, 10); })()`;

for (const r of ['dashboard', 'agenda', 'clientes', 'historial', 'historial/pac-01']) {
  await go(`${BASE}/admin/#/${r}`);
  out.pantallas.push(await recorrer(r));
  out.movimiento.push({ pantalla: r, problemas: await ev(MOV) });
}

// Drawer de la agenda: abrir un turno con Enter, Escape cierra y devuelve el foco.
await go(`${BASE}/admin/#/agenda`);
const hayTurno = await ev(`(() => { const b = (document.querySelector('.grid-wrap button') || document.querySelector('#btn-nuevo')); if (!b) return false; b.focus(); return document.activeElement === b; })()`);
if (hayTurno) {
  const origen = await ev(FOCO);
  await key('Enter', 'Enter', 13); await sleep(500);
  const dentro = await ev(FOCO);
  const trampa = [];
  for (let i = 0; i < 25; i++) { await tab(); await sleep(30); trampa.push(await ev(`!!document.activeElement.closest('[role=dialog], .drawer')`)); }
  await key('Escape', 'Escape', 27); await sleep(400);
  out.drawer = { origen, focoInicial: dentro, focoSiempreDentroTras25Tabs: trampa.every(Boolean), focoDevuelto: await ev(FOCO) };
}

// Móvil 390x844 con teclado: botón de menú, Escape cierra.
await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await go(`${BASE}/admin/#/agenda`);
out.movil = { scrollHorizontal: await ev('document.documentElement.scrollWidth > document.documentElement.clientWidth'),
  pantalla: await recorrer('agenda-390', 40), movimiento: await ev(MOV) };

console.log(JSON.stringify(out, null, 2));
ws.close(); edge.kill();
process.exit(0);
