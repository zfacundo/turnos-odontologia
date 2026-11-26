import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../../../src/api/app';
import { cargarSeed } from '../../../src/infrastructure/seed/cargar-seed';
import { RelojFijo } from '../../../src/infrastructure/clock/clock';

const AVISO = 'SIMULACIÓN — sin validez fiscal';
const ARCHIVO = path.join(__dirname, '..', '..', '..', 'public', 'sim', 'arca.html');
const html = (): string => (existsSync(ARCHIVO) ? readFileSync(ARCHIVO, 'utf8') : '');

describe('pantalla /sim/arca.html', () => {
  it('dado el servidor cuando se pide la pantalla entonces responde 200 con el rotulo de simulacion y el boton Emitir factura C', async () => {
    const app = createApp(cargarSeed(new RelojFijo(new Date('2026-12-01T12:00:00-03:00'))));
    const res = await request(app).get('/sim/arca.html');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain(AVISO);
    expect(res.text).toMatch(/<button[^>]*>\s*Emitir factura C\s*<\/button>/);
  });

  it('dado el HTML de la pantalla cuando se revisan sus llamadas entonces toda llamada fetch es a una ruta relativa del simulador que empieza con /api/sim/arca/facturas', () => {
    const contenido = html();
    const llamadas = [...contenido.matchAll(/fetch\(\s*(['"`])([^'"`]+)\1/g)].map((m) => m[2]);
    expect(llamadas.length).toBeGreaterThan(0);
    for (const llamada of llamadas) expect(llamada).toMatch(/^\/api\/sim\/arca\/facturas/);
    expect(llamadas.some((l) => (l ?? '').startsWith('/api/sim/arca/facturas/'))).toBe(true);
    expect(contenido).not.toMatch(/fetch\(\s*[^'"`]/);
  });

  it('dado el HTML de la pantalla cuando se revisa el pedido entonces se envia con el rol recepcion', () => {
    expect(html()).toMatch(/['"]X-Rol['"]\s*:\s*['"]recepcion['"]/);
  });

  it('dado el HTML de la pantalla cuando se buscan URLs absolutas entonces no hay ninguna', () => {
    const contenido = html();
    expect(contenido).not.toBe('');
    expect(contenido).not.toMatch(/https?:\/\//i);
    expect(contenido).not.toMatch(/(src|href)\s*=\s*['"]\/\//i);
  });
});

// spec: arca-ver-factura-y-confirmar-emision
describe('pantalla /sim/arca.html: ver factura y confirmar emision', () => {
  it('dado el HTML cuando se revisan las acciones entonces Ver factura esta en el mismo grupo que Emitir factura C', () => {
    const grupo = html().match(/<div class="actions">([\s\S]*?)<\/div>/);
    expect(grupo).not.toBeNull();
    expect(grupo?.[1]).toMatch(/<button[^>]*>\s*Ver factura\s*<\/button>/);
    expect(grupo?.[1]).toMatch(/<button[^>]*>\s*Emitir factura C\s*<\/button>/);
  });

  it('dado el HTML cuando se revisa la ventana de confirmacion entonces es un dialog accesible con titulo, Cancelar, Emitir y showModal', () => {
    const c = html();
    const dialogo = c.match(/<dialog[^>]*aria-labelledby="([^"]+)"[^>]*>/);
    expect(dialogo).not.toBeNull();
    expect(c).toMatch(new RegExp('id="' + (dialogo?.[1] ?? '') + '"[^>]*>\s*¿Emitir Factura C\?'));
    expect(c).toMatch(/<button[^>]*>\s*Cancelar\s*<\/button>/);
    expect(c).toMatch(/<button[^>]*id="confirmar-emitir"[^>]*>\s*Emitir\s*<\/button>/);
    expect(c).toContain('showModal(');
  });

  it('dado el HTML cuando se buscan estilos de movimiento entonces respeta prefers-reduced-motion para la ventana', () => {
    expect(html()).toMatch(/@media \(prefers-reduced-motion: reduce\)[^}]*dialog/);
  });

  it('dado el HTML cuando se buscan los textos de la vista previa y la nota entonces estan', () => {
    const c = html();
    expect(c).toContain('VISTA PREVIA — no emitida');
    expect(c).toContain('Este turno ya tiene factura');
  });

  it('dado el HTML cuando se busca innerHTML entonces no aparece', () => {
    expect(html()).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML/);
  });

  it('dado el HTML cuando se revisa el arranque entonces consulta el estado inicial al cargar y maneja el 409 consultando la factura', () => {
    const c = html();
    expect(c).toMatch(/cargarEstadoInicial\(\)/);
    expect(c).toMatch(/status === 409/);
    expect(c).toMatch(/consultar\(\)/);
  });

  it('dado el HTML cuando se revisa la ventana entonces Emitir se deshabilita segun emitible', () => {
    expect(html()).toMatch(/confirmarEmitir\.disabled\s*=\s*!/);
  });
});
