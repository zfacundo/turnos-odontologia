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

  it('dado el HTML de la pantalla cuando se revisan sus llamadas entonces solo hace fetch a la ruta relativa del simulador', () => {
    const contenido = html();
    const llamadas = [...contenido.matchAll(/fetch\(\s*(['"`])([^'"`]+)\1/g)].map((m) => m[2]);
    expect(llamadas).toEqual(['/api/sim/arca/facturas']);
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
